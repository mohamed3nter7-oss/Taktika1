# Data Model — Taktika v1

PostgreSQL 16. Normalised to 3NF. Every design choice below exists to prevent a specific anomaly, and each is named.

## 1. Modelling rules

1. **Every entity gets a surrogate primary key** (`uuid`, generated app-side). Natural keys (email, username) get unique indexes but never become foreign-key targets — natural keys change, and cascading that change through the graph is an update anomaly.
2. **Time-varying facts are stored as time-varying.** A player's club is `club_affiliations(start_date, end_date)`, never `players.current_club`. A scalar `current_club` cannot answer "who played for Zamalek in 2021" and forces a destructive update on every transfer.
3. **Entities are entities.** A club is a row, not a string repeated across profiles. Repeating a name creates an update anomaly (rename the club → N rows to fix) and an insert anomaly (a club cannot exist until someone plays for it).
4. **Closed sets are enums; open sets are reference tables.** `preferred_foot` is an enum (three values, never grows). `positions` and `cities` are tables (they grow, and are seeded per country).
5. **Role-specific fields live in role extension tables**, one per role, `user_id` as both PK and FK. A single wide `users` table with 40 mostly-null columns is a 3NF violation — those columns depend on the role, not on the user key.
6. **Soft delete for user content** (`deleted_at`), hard delete for join rows. Content is threaded into other users' feeds and notifications; ripping it out mid-conversation is a delete anomaly.

## 2. Entity map

```
users ──1:1── player_profiles / coach_profiles / scout_profiles /
      │        analyst_profiles / therapist_profiles / club_admin_profiles
      │
      ├──1:N── club_affiliations ──N:1── clubs
      ├──1:N── certifications
      ├──1:N── posts ──1:N── post_images
      │              ├─1:N── post_likes
      │              └─1:N── post_comments
      ├──N:N── follows (follower_id, following_id)
      ├──N:N── conversations ── conversation_participants ──1:N── messages
      ├──1:N── notifications
      ├──1:N── blocks
      └──1:N── reports

countries ──1:N── cities
positions (reference)          player_positions (N:N with player_profiles)
```

## 3. Core tables

### users
`id`, `email` (unique, citext), `password_hash`, `username` (unique), `role` (enum, immutable), `status` (enum: `PENDING_VERIFICATION | PENDING_PROFILE | ACTIVE | SUSPENDED | DELETED`), `first_name`, `last_name`, `date_of_birth`, `headline`, `bio`, `avatar_url`, `country_id` FK, `city_id` FK, `email_verified_at`, `created_at`, `updated_at`, `deleted_at`.

- `date_of_birth` is stored and **never serialised to the public API**. Age is computed in the query or a view.
- `city_id` must belong to `country_id`. Postgres cannot express this with a plain FK; enforce it in the service layer (a shared `ReferenceService`) or with a composite FK on `(city_id, country_id)` against a unique index on `cities(id, country_id)`. Prefer the composite FK — it makes the invariant the database's problem, not the application's.

### Role extension tables
One per role. `user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`.

- `player_profiles`: `preferred_foot` (enum), `height_cm`, `weight_kg`, `jersey_number`
- `coach_profiles`: `licence_tier` (enum), `specialisation` (enum), `years_experience`
- `scout_profiles`: `organisation`, `coverage_region`, `focus` (enum)
- `analyst_profiles`: `analysis_type` (enum), `software` (text[] or a join table if it must be filterable — if you will ever filter on it, make it a join table)
- `therapist_profiles`: `qualification`, `specialisation`, `years_practice`
- `club_admin_profiles`: `club_id` FK, `job_title`

Player positions are N:N: `player_positions(user_id, position_id, is_primary)`, PK `(user_id, position_id)`. A player has multiple positions; a comma-separated string is a 1NF violation and unfilterable.

### clubs
`id`, `name`, `short_name`, `country_id`, `city_id`, `founded_year`, `logo_url`, `level` (enum), `created_by_user_id` (nullable, `ON DELETE SET NULL`), `created_at`.

`ON DELETE SET NULL` is the whole point: **the club survives its creator.** Cascading here would delete a club and every affiliation history attached to it when one admin closes an account.

### club_affiliations
`id`, `user_id` FK CASCADE, `club_id` FK RESTRICT, `role_at_club` (enum), `start_date`, `end_date` (nullable), `created_at`.

- `CHECK (end_date IS NULL OR end_date >= start_date)`
- Partial unique index enforcing **one open stint per user per club**:
  ```sql
  CREATE UNIQUE INDEX uq_affiliation_one_current_per_club
    ON club_affiliations (user_id, club_id) WHERE end_date IS NULL;
  ```
  Scoped per club on purpose — a coach at one club and a scout at another simultaneously is legitimate. A duplicate open stint at the *same* club is not, and returns `409 AFFILIATION_ALREADY_OPEN`.
- `ON DELETE RESTRICT` on `club_id` prevents deleting a club that holds career history.

### certifications
`id`, `user_id` FK CASCADE, `name`, `issuing_body`, `issue_date`, `expiry_date` (nullable), `is_verified` (default false, unused in v1), `created_at`.

### posts / post_images / post_likes / post_comments
- `posts`: `id`, `author_id` FK CASCADE, `content` (text, ≤3000), `post_type` (enum, one value at launch), `created_at`, `updated_at`, `deleted_at`
- `post_images`: `id`, `post_id` FK CASCADE, `url`, `position` (0–3), `width`, `height`
- `post_likes`: PK `(post_id, user_id)` — the composite PK makes double-liking impossible at the storage layer. No application check needed, no race condition.
- `post_comments`: `id`, `post_id`, `author_id`, `content`, `created_at`, `deleted_at`

Like and comment counts are **denormalised counters** on `posts`, maintained by triggers. This is a deliberate, documented 3NF exception: `COUNT(*)` per post on every feed render is the first query to fall over, and a trigger keeps the counter transactionally exact.

### follows
PK `(follower_id, following_id)`, both FK CASCADE, `created_at`. `CHECK (follower_id <> following_id)`.

### conversations / conversation_participants / messages
- `conversations`: `id`, `created_at`, `last_message_at`
- `conversation_participants`: PK `(conversation_id, user_id)`, plus `last_read_at`
- `messages`: `id`, `conversation_id` FK CASCADE, `sender_id` FK, `content`, `created_at`, `read_at`

Modelled as N:N rather than `messages(sender_id, recipient_id)` even though v1 is strictly 1:1. Group chat then becomes an additive change instead of a migration of every historical message. Unread count derives from `last_read_at`, not a stored integer.

To prevent duplicate 1:1 threads, add a `participant_key` on `conversations` — the two sorted user IDs, unique. Without it, two users clicking "message" simultaneously create two threads.

### notifications
`id`, `recipient_id` FK CASCADE, `actor_id` FK CASCADE, `type` (enum), `entity_id`, `entity_type`, `is_read`, `created_at`.

### blocks / reports
- `blocks`: PK `(blocker_id, blocked_id)`
- `reports`: `id`, `reporter_id`, `target_type`, `target_id`, `reason` (enum), `note`, `status` (enum), `created_at`

### Reference tables
`countries(id, iso_code, name_en, name_ar)`, `cities(id, country_id, name_en, name_ar)`, `positions(id, code, name_en, name_ar, group)`. Seeded for Egypt and Saudi Arabia at launch. Bilingual names live in columns, not a translations table — three reference tables and two locales do not justify the join.

## 4. Indexes

```sql
-- feed: the hottest query in the product
CREATE INDEX idx_posts_feed ON posts (created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_author ON posts (author_id, created_at DESC) WHERE deleted_at IS NULL;

-- comments and likes
CREATE INDEX idx_comments_post ON post_comments (post_id, created_at) WHERE deleted_at IS NULL;

-- social graph, both directions
CREATE INDEX idx_follows_following ON follows (following_id, created_at DESC);

-- messaging
CREATE INDEX idx_messages_conv ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_participants_user ON conversation_participants (user_id);

-- discovery
CREATE INDEX idx_users_discovery ON users (role, country_id, city_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_users_search ON users USING GIN (search_vector);

-- notifications
CREATE INDEX idx_notif_unread ON notifications (recipient_id, created_at DESC) WHERE is_read = false;

-- affiliations
CREATE INDEX idx_affiliations_club ON club_affiliations (club_id, start_date DESC);
```

Two rules behind these: index the columns you **filter and sort by together**, in that order; and use **partial indexes** wherever a `WHERE` clause is always present (`deleted_at IS NULL`, `is_read = false`) — a partial index is smaller, hotter in cache, and faster.

`search_vector` is a generated column: `to_tsvector('simple', first_name || ' ' || last_name || ' ' || coalesce(headline,''))`. `'simple'` rather than `'english'` because the corpus is bilingual and Arabic has no Postgres stemmer.

## 5. Anomalies prevented — the checklist

| Anomaly | Where it would have happened | Prevention |
| --- | --- | --- |
| Update | Renaming a club stored as text on every profile | `clubs` as an entity |
| Delete | Deleting a Club Admin destroying club history | `created_by_user_id ON DELETE SET NULL`; `club_id ON DELETE RESTRICT` |
| Insert | A club cannot exist before a player joins it | `clubs` independently insertable |
| Duplicate | Double-like from a double-click | Composite PK on `post_likes` |
| Duplicate | Two conversation threads for one pair | Unique `participant_key` |
| Duplicate | Two open stints at the same club | Partial unique index |
| 1NF | Comma-separated positions | `player_positions` join table |
| Consistency | A city in the wrong country | Composite FK `(city_id, country_id)` |

## 6. Conscious denormalisation

Only two, both documented:

1. **`posts.like_count` / `comment_count`** — trigger-maintained. Justified by feed read volume.
2. **`conversations.last_message_at`** — trigger-maintained. Sorting the inbox otherwise requires a correlated subquery per conversation.

Everything else stays normalised. Add denormalisation when a slow query proves it, never in anticipation.

## 7. Migration discipline

Migration files are **immutable once applied** — Prisma checksums them, and editing an applied migration produces a `P3018` failure. If history diverges, recreate the migration with the exact recorded timestamp rather than editing in place. Every schema change ships as a new forward migration.
