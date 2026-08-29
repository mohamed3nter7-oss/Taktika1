-- ============================================================
-- posts: denormalised author_role + the two partial keyset indexes.
--
-- Hand-written, following 20260826120000_follows_keyset_indexes. `migrate dev`
-- is a write, not a diagnostic (backend/CLAUDE.md): it applies pending
-- migrations first, then generates a file from whatever difference it believes
-- exists, and that file has twice in this repository carried an unrelated
-- destructive hunk (root CLAUDE.md D-008, D-009).
--
-- Two of the three statements below are NOT expressible in schema.prisma.
-- Prisma has no `where` argument on @@index, so a PARTIAL index cannot be
-- declared there. That is the complement to D-009, not a contradiction of it:
--   Prisma CAN express it (GIN + ops)  -> declare it, or migrate dev drops it
--   Prisma CANNOT express it (partial) -> leave it here; Prisma never sees it
-- Recorded as D-023, with the pg_indexes evidence.
-- ============================================================

-- ============ A1: author_role ============
-- Denormalised from users.role. The third documented 3NF exception after
-- likes_count and comments_count (D-022).
--
-- No DEFAULT, deliberately. NOT NULL alone catches a write path that FORGETS
-- the column -- the insert fails loudly. A default would convert that loud
-- failure into a silent wrong value, which is the failure mode this column
-- cannot survive: the whole justification for denormalising is that the value
-- can never drift from users.role, and a defaulted row has drifted on arrival.
--
-- Safe with no backfill and no USING clause because posts is empty; verified
-- by SELECT count(*) immediately before this migration was written.
ALTER TABLE posts ADD COLUMN author_role user_role NOT NULL;

-- ============ A2: the role-filtered feed index ============
-- FR-FEED-2's ?role= filter. Without this the predicate sits ABOVE the index
-- scan: the planner reads every post newest-first and discards non-matching
-- authors until it has twenty.
--
-- Every column DESC, matching ORDER BY created_at DESC, id DESC exactly. A
-- mixed-direction index cannot satisfy a row-value comparison and pushes the
-- tiebreak into a Filter (D-007).
CREATE INDEX idx_posts_role_feed ON posts (author_role, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- ============ A3: replace the author index ============
-- The Prisma-generated index carried (author_id, created_at DESC) and no id
-- tiebreak, so (created_at, id) < ($1, $2) could not become an Index Cond --
-- the tiebreak fell into a Filter and Postgres added a Sort. That is exactly
-- the plan shape D-007 exists to prevent, and GET /users/:id/posts would have
-- inherited it.
DROP INDEX "posts_author_id_created_at_idx";

CREATE INDEX idx_posts_author ON posts (author_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
