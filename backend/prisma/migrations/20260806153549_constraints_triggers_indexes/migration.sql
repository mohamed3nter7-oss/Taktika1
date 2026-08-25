-- ============================================================
-- Constraints, triggers, and indexes that Prisma cannot express
-- natively (CHECK constraints, partial indexes, extensions,
-- trigger functions). Applied on top of the init migration.
-- ============================================================

-- ============ EXTENSIONS ============
-- Trigram similarity, chosen over tsvector for names: stemming does nothing for
-- proper nouns, and Egyptian names arrive as Mohamed / Mohammed / Muhammad.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Normalises Arabic diacritics and Latin accents so alef-with-hamza and plain
-- alef match. Not used by any index here yet -- reserved for the search module.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============ CHECK CONSTRAINTS ============
-- The app layer ALSO validates these (for good error messages); the database is
-- the last line that a second write path cannot bypass.
ALTER TABLE follows
  ADD CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id);

-- Canonical participant ordering; with the unique (a,b) index this makes
-- duplicate conversations structurally impossible in either insertion order.
ALTER TABLE conversations
  ADD CONSTRAINT chk_participant_order CHECK (participant_a_id < participant_b_id);

ALTER TABLE club_affiliations
  ADD CONSTRAINT chk_affiliation_dates CHECK (end_date IS NULL OR end_date > start_date);

ALTER TABLE certifications
  ADD CONSTRAINT chk_certification_dates
  CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date > issue_date);

-- 4 positional slots. Combined with UNIQUE (post_id, position) from the Prisma
-- schema, this caps a post at 4 images STRUCTURALLY -- no counting trigger needed.
-- "position" is quoted: it is a col_name_keyword in PostgreSQL.
ALTER TABLE post_images
  ADD CONSTRAINT chk_post_image_position CHECK ("position" >= 0 AND "position" <= 8);

-- Content must be non-empty after trimming.
ALTER TABLE posts
  ADD CONSTRAINT chk_post_content_not_blank CHECK (length(btrim(content)) > 0);
ALTER TABLE comments
  ADD CONSTRAINT chk_comment_content_not_blank CHECK (length(btrim(content)) > 0);
ALTER TABLE messages
  ADD CONSTRAINT chk_message_content_not_blank CHECK (length(btrim(content)) > 0);

-- Catches any write path that forgets to lowercase the email.
ALTER TABLE users
  ADD CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email));

-- ============ PARTIAL INDEXES ============
-- THE feed index: newest first, live posts only -- soft-deleted rows should not
-- occupy the index at all. Supports keyset pagination on (created_at, id).
CREATE INDEX idx_posts_feed ON posts (created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- "Current" affiliation lookups from the club side = rows where end_date IS NULL.
-- The user side is served by uq_affiliation_one_current_per_club below, whose
-- leading column is user_id -- a separate (user_id) index would be redundant.
CREATE INDEX idx_affiliations_current ON club_affiliations (club_id)
  WHERE end_date IS NULL;

-- A user may hold only ONE open affiliation per club at a time.
CREATE UNIQUE INDEX uq_affiliation_one_current_per_club
  ON club_affiliations (user_id, club_id) WHERE end_date IS NULL;

-- Unread notification badge -- runs on every page load.
CREATE INDEX idx_notifications_unread ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Unread message count per conversation.
CREATE INDEX idx_messages_unread ON messages (conversation_id, sender_id)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- Live refresh tokens only.
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens (user_id)
  WHERE revoked_at IS NULL;

-- Open moderation queue.
CREATE INDEX idx_reports_open ON reports (created_at)
  WHERE status = 'PENDING';

-- ============ TRIGRAM SEARCH INDEXES ============
CREATE INDEX idx_users_full_name_trgm ON users USING GIN (full_name gin_trgm_ops);
-- Both the Latin and Arabic club names must resolve to the same club.
CREATE INDEX idx_clubs_name_en_trgm ON clubs USING GIN (name_en gin_trgm_ops);
CREATE INDEX idx_clubs_name_ar_trgm ON clubs USING GIN (name_ar gin_trgm_ops);

-- ============ COUNTER TRIGGERS ============
-- Triggers, not application code: a trigger cannot be bypassed by a second
-- write path, a manual SQL fix, or a seed script.

-- Likes are hard-deleted rows: INSERT/DELETE only.
CREATE OR REPLACE FUNCTION sync_post_likes_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

-- Comments are SOFT deleted: the counter reflects VISIBLE comments, so the
-- deleted_at transition must move it in both directions.
CREATE OR REPLACE FUNCTION sync_post_comments_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = NEW.post_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comments_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();

-- Follow counts: both directions, same transaction as the follow row.
CREATE OR REPLACE FUNCTION sync_follow_counts() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- Inbox ordering. Monotonic guard: an out-of-order insert can never move
-- last_message_at backwards.
CREATE OR REPLACE FUNCTION sync_conversation_last_message() RETURNS trigger AS $$
BEGIN
  UPDATE conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id
     AND (last_message_at IS NULL OR last_message_at < NEW.created_at);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION sync_conversation_last_message();

-- ============ STRUCTURAL RULE TRIGGERS ============
-- Single-level replies: a reply may not have a parent that itself has a
-- parent, and must belong to the same post. Requires a lookup, so not a CHECK.
CREATE OR REPLACE FUNCTION enforce_single_level_replies() RETURNS trigger AS $$
DECLARE
  grandparent UUID;
  parent_post UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT parent_comment_id, post_id INTO grandparent, parent_post
    FROM comments WHERE id = NEW.parent_comment_id;
  IF grandparent IS NOT NULL THEN
    RAISE EXCEPTION 'Comment replies are limited to one level'
      USING ERRCODE = 'check_violation';
  END IF;
  IF parent_post <> NEW.post_id THEN
    RAISE EXCEPTION 'Reply must belong to the same post as its parent'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_level_replies
BEFORE INSERT OR UPDATE OF parent_comment_id ON comments
FOR EACH ROW EXECUTE FUNCTION enforce_single_level_replies();

-- ============ RECONCILIATION HELPERS ============
-- Counters can drift after a manual fix or a restore. Call from a scheduled
-- job (@nestjs/schedule) -- weekly is enough at this scale. Triggers are the
-- write path; reconciliation is the safety net.
CREATE OR REPLACE FUNCTION reconcile_post_counters() RETURNS void AS $$
BEGIN
  UPDATE posts p SET
    likes_count    = COALESCE((SELECT count(*) FROM post_likes l WHERE l.post_id = p.id), 0),
    comments_count = COALESCE((SELECT count(*) FROM comments c
                                WHERE c.post_id = p.id AND c.deleted_at IS NULL), 0);
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reconcile_user_follow_counts() RETURNS void AS $$
BEGIN
  UPDATE users u SET
    followers_count = COALESCE((SELECT count(*) FROM follows f WHERE f.following_id = u.id), 0),
    following_count = COALESCE((SELECT count(*) FROM follows f WHERE f.follower_id = u.id), 0);
END $$ LANGUAGE plpgsql;