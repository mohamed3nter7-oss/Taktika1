-- ============================================================
-- Covering keyset indexes for the two follow list directions.
--
-- Hand-written rather than generated: `prisma migrate dev` also wants to drop
-- LEFT_MIDFIELDER / RIGHT_MIDFIELDER from the player_position enum, which is
-- pre-existing drift between the live database and schema.prisma and has
-- nothing to do with follows. Bundling an enum rewrite into an index migration
-- is how an unrelated destructive change ships unnoticed.
--
-- The CHECK constraint (chk_no_self_follow) and the counter trigger
-- (trg_follow_counts / sync_follow_counts) are NOT here: both were applied in
-- 20260806153549_constraints_triggers_indexes and migrations are immutable.
-- ============================================================

-- Redundant once the composite below exists: `following_id` is its leading
-- column, so every read this index served is served there too. Keeping it
-- would cost a second index write on every follow and unfollow for nothing.
DROP INDEX "follows_following_id_idx";

-- "who follows X" — GET /users/:id/followers
CREATE INDEX "idx_follows_following"
  ON "follows" ("following_id", "created_at" DESC, "follower_id" DESC);

-- "who X follows" — GET /users/:id/following
--
-- The primary key (follower_id, following_id) does NOT make this redundant. It
-- serves the equality filter on follower_id but carries no created_at, so the
-- ordered read planned a Sort. Verified by EXPLAIN before this was written.
--
-- Every column DESC, matching ORDER BY created_at DESC, <tiebreak> DESC
-- exactly. Uniform direction is what lets the row-value comparison
-- `(created_at, follower_id) < (?, ?)` become an Index Cond on an Index Only
-- Scan; a mixed-direction index degrades the tiebreak into a Filter.
CREATE INDEX "idx_follows_follower"
  ON "follows" ("follower_id", "created_at" DESC, "following_id" DESC);
