# CLAUDE.md — Taktika

Project rulebook. **This file is loaded into context on every session.** Keep it lean — anything that belongs to only one side of the stack goes in `backend/CLAUDE.md` or `frontend/CLAUDE.md`.

---

## 1. What this is

Taktika is a professional networking platform for the football industry, launching in Egypt. Six role-typed users — Player, Coach, Scout, Performance Analyst, Physical Therapist, Club Admin — with structured profiles, career history, a text-and-image feed, search, and 1:1 messaging.

Solo developer, ~13 weeks to launch, infrastructure budget under $30/month.

**Core loop:** register → complete profile → post → discover → message.

**Not in v1:** video, payments, real-time messaging, ranked feed, groups, OAuth, native apps.

---

## 2. Repository layout

```
/
├─ CLAUDE.md              ← this file (universal rules)
├─ backend/               NestJS 11 + Prisma 7 + PostgreSQL 16
│  └─ CLAUDE.md           backend-only conventions
├─ frontend/              Next.js + Tailwind v4 + next-intl
│  └─ CLAUDE.md           frontend-only conventions
└─ docs/
   ├─ prd/                PRD, one file per section (00–29)
   ├─ 02-DATA-MODEL.md
   ├─ 03-ARCHITECTURE.md
   └─ 04-ROADMAP.md
```

Directory names are **lowercase**. This is non-negotiable: Linux and Railway are case-sensitive, macOS is not, and a casing mismatch produces a build that works locally and fails in deployment.

---

## 3. Source of truth

1. `docs/prd/` — what to build. Requirement IDs (`FR-AUTH-3`) are stable; reference them in commits and discussion.
2. This file and the two subdirectory files — how to build it.
3. Section 17 below — every deviation from 1 or 2, with its reason.

If a request contradicts a rule here, **say so before implementing**, don't silently comply and don't silently refuse.

---

## 4. Architecture — applies to every module, no exceptions

**Pragmatic modular monolith. Controller → Service → Prisma.**

No repositories. No use-case classes. No mappers. No 4-layer Clean Architecture, anywhere, including auth and messaging.

Repositories exist to abstract a database you intend to swap. Postgres is not being swapped, and Prisma is already the abstraction. The extra layer costs a file and a mapping function per operation, permanently, and buys nothing.

Cross-module needs are met by **injecting the other module's service and calling a narrow exported method**. Never reach into another module's tables.

---

## 5. Decisions both sides must know

These appear in backend validation *and* frontend rendering. Getting them wrong on one side produces a bug that looks like it lives on the other.

| Rule | Detail |
| --- | --- |
| Role is immutable | Chosen at registration, permanently non-editable. No UI path, no API path. |
| Age is public, date of birth is not | API returns `age: 22`. `dateOfBirth` never appears in any public response, at any nesting level. Users can be 12. |
| Clubs are entities, not accounts | `clubs` is its own table. Deleting a Club Admin must never destroy club history. |
| Asymmetric follows | No requests, no approvals, no pending state. |
| Messaging is ungated | No follow required to send a first message. Rate-limited instead. |
| Cursor pagination everywhere | `(created_at, id)`. Never `OFFSET`, on any list endpoint. |
| 404, not 403, for foreign resources | 403 confirms the resource exists. That's an existence oracle. |
| Errors carry a stable machine `code` | Backend sends `AFFILIATION_ALREADY_OPEN`. Frontend owns both language strings. The API never sends user-facing prose. |
| EXIF stripped from every image | Phone photos carry GPS. Minors post training pictures. |
| Affiliations are date ranges | `start_date` / `end_date`. `end_date IS NULL` = current. Never a scalar `current_club`. |

---

## 6. Workflow

- **Plan before code.** Present the plan, get approval, then implement.
- **Manual approve per file and per command.** Not auto-accept mode.
- **One module at a time**, in the build order (Section 7). Don't start the next before the current one's tests pass.
- **If interrupted mid-task:** run `git status`, then verify each planned file's completion state before continuing. Never resume blind.
- **Commit per logical unit**, not per file and not per session.

---

## 7. Build order

```
common → reference → auth → profiles → career → follows
  → posts → feed → search → messaging → notifications
```

Dependency-driven. Nothing is built against a stub, so nothing needs revisiting when its dependency lands.

---

## 8. Definition of done

A module is done when all of these hold:

1. Acceptance criteria from the PRD section pass as automated e2e tests.
2. **Tests verified non-vacuous** — comment out the implementation, confirm the test fails, restore. A test that passes against a broken implementation is worse than no test, because it's trusted.
3. Error paths return the documented codes from PRD Section 13.
4. No new `any` types, no new lint suppressions.
5. Any deviation is logged in Section 17.

---

## 9. Language

Mohamed works in English and Arabic (Egyptian dialect) interchangeably. Match the language of the message. Prefers short, direct answers — decision first, then reasoning. Pushback is expected, not tolerated.

---

## 17. Divergence log

Every deviation from the PRD or from these rules, with its reason. An undocumented deviation is indistinguishable from a bug six months later — that's the entire purpose of this section.

Format:

```
### D-001 — <short title>
**PRD ref:** FR-XXX-N / Section N
**Decided:** <date>
**Divergence:** what was built instead
**Reason:** why
**Reversal cost:** trivial / migration / rewrite
```

### D-001 — bcrypt cost 12, not argon2id
**PRD ref:** `backend/CLAUDE.md` § Validation and security
**Decided:** 2026-08-25
**Divergence:** The rule specified argon2id at 19 MiB / t=2 / p=1 and prohibited bcrypt outright. What exists is bcrypt at cost factor 12: hashed in `auth.service.ts`, documented on `users.password_hash` in `schema.prisma`, and pinned by a unit test asserting the `$2[aby]$12$` prefix. The rule has been rewritten to specify bcrypt cost 12 as the V1 standard. The "never SHA" half of the prohibition is unchanged and still stands.
**Reason:** bcrypt at cost 12 is adequate for the V1 threat model. Moving to argon2id is not a config swap — it needs a verify-then-rehash-on-login path so existing hashes keep working, and that is deferred work. The doc/code contradiction was the actual risk here, not the algorithm: a rule the entire codebase visibly ignores teaches everyone to discount the rest of the file.
**Reversal cost:** migration — verify-then-rehash-on-login, plus the unit test and the `schema.prisma` comment.

### D-002 — Error envelope wraps in `success` / `error` and carries `correlationId`
**PRD ref:** `backend/CLAUDE.md` § API conventions
**Decided:** 2026-08-25
**Divergence:** The rule specified a flat `{ statusCode, code, message, details? }`. `AllExceptionsFilter` emits `{ success: false, error: { code, message, details, correlationId } }` — nested under `error`, no `statusCode` in the body, `details` always present as an array rather than optional, and an added `correlationId`. The rule has been rewritten to document the emitted shape.
**Reason:** `correlationId` in the error body is required for support and observability — it is echoed in the `X-Correlation-Id` header and written to the request's log line, so a user can quote one string and have the failure located. The frontend axios interceptor is already built against this shape, and the e2e suite asserts it, so the flat form was never the real contract.
**Reversal cost:** migration — the filter, the e2e assertions and the frontend axios interceptor have to change together.

### D-003 — `certifications` has no `credential_url` column
**PRD ref:** FR-PROF-4 / PRD 9.2
**Decided:** 2026-08-25
**Divergence:** PRD 9.2 lists `credential_url` on a certification. There is no such column on `Certification` in `schema.prisma`, no field on `CreateCertificationDto`/`UpdateCertificationDto`, and none in `CERTIFICATION_SELECT`. A client sending one gets a 400 from `forbidNonWhitelisted`. The same section's `title` / `issuing_organization` are likewise named `name` / `issuer` in the schema, which is authoritative.
**Reason:** The column belongs to V2 certification verification, not to V1 storage. A URL nobody validates, fetches, or displays a trust signal against is an unverified string that reads to a user as if the platform vouched for it — the credibility claim is exactly what a scout is evaluating, so shipping the field ahead of the verification path is worse than omitting it. Adding it later has no backfill path: rows created before the column exists cannot have their credential URLs recovered, and every certification predating V2 stays null regardless of when the column lands. That cost is the same whether it is added now or later, so it is not a reason to add it early.
**Reversal cost:** migration — a forward migration adding the nullable column, plus the two DTOs and `CERTIFICATION_SELECT`.

**Caveat on this entry.** Until now the divergence was asserted in exactly one place: a source comment at `backend/src/modules/career/dto/certification.dto.ts:13-15`, citing "PRD 9.2". **`docs/prd/` does not exist in this repository** — nor does `docs/` — so that citation cannot be verified here, and the PRD's actual wording on `credential_url` is unconfirmed. Root `CLAUDE.md` §2/§3 name `docs/prd/` as the source of truth; either it was never migrated from the old project or it lives outside version control. Resolving that is a prerequisite to trusting this entry's PRD reference, not a detail.

### D-004 — list envelope is `{ data, nextCursor }` (resolved, no standing divergence)
**PRD ref:** `backend/CLAUDE.md` § API conventions
**Decided:** 2026-08-25
**Divergence:** None standing. This entry records one that existed briefly and is now closed. `CareerService` shipped in 89c59a8 returning `{ items, nextCursor }` from `GET /users/me/certifications` and `GET /users/:id/affiliations`, against a documented and already-implemented `{ data, nextCursor }`. `ReferenceService` had used `{ data, nextCursor }` across all four of its endpoints since it was built, and `reference.e2e-spec.ts` asserts `body.data` in roughly eighteen places including the two-page keyset walk. Career was the outlier, not the doc. Corrected in the same session, before any consumer existed: two return statements in `career.service.ts` and a doc comment that had claimed the wrong shape was "the §5 envelope".
**Reason:** `data` is the standard, and it is the standard because it was already shipped, tested, and documented — a second key naming the same thing costs a permanent lookup at every call site for nothing. The argument advanced for `items` was that `data` implies offset metadata (`total`, `page`, `pageCount`) that keyset pagination never computes. That objection is real against a `{ data, meta }` envelope but does not apply here: there is no `meta`, and `nextCursor` sits directly beside `data`, which is unambiguously keyset. Nothing in the shape implies a total or a page number.
**Reversal cost:** trivial today — six return statements and the reference e2e assertions. It stops being trivial the moment a frontend consumer or a second paginated module exists, which is why it was settled now rather than after `posts`/`feed`.

**How this survived review.** The audit that ported `career` checked the envelope against a comment in `career.service.ts` that asserted conformance, rather than against `ReferenceService`, which is the only thing that actually establishes the convention. A comment claiming to follow a rule is not evidence that it does — verify against the implementation that set the precedent.

### D-005 — career lists are single-page with a hard cap of 100
**PRD ref:** `backend/CLAUDE.md` § API conventions / root §5 "Cursor pagination everywhere"
**Decided:** 2026-08-26
**Divergence:** §5 says keyset pagination on every list endpoint. `GET /users/me/certifications` and `GET /users/:id/affiliations` implement none. Neither route declares a `cursor` or `limit` parameter, both pass `take: CAREER_LIST_CAP` (100) to `findMany`, and both return `nextCursor: null` unconditionally. The key is structurally present and always null.
**Reason:** Both sets are naturally bounded per user — a person holds a handful of certifications and a career's worth of club stints, not an unbounded stream — so there is no page to be second. `GET /users/:id` already embeds both lists whole, which a keyset here would contradict while adding a second cursor codec for no consumer. The cap is a blast-radius limit, not a page size: it bounds a pathological or malicious row count without pretending to paginate. Deliberately NOT the `?limit=` the convention describes, because a limit that cannot be continued past is worse than an honest ceiling.
**Consequence, stated plainly:** a user with more than 100 certifications or affiliations silently cannot see the rest, and no `nextCursor` tells them so. That is accepted for V1 at these volumes and is the thing that must change first if it stops being true.
**First real keyset implementation lands in the `follows` module**, where the sets genuinely are unbounded. That is where the shared cursor codec gets built; `common/pagination/cursor.ts` currently serves only `GET /reference/clubs`.
**Reversal cost:** trivial — add the query DTO, thread the cursor through, and return a real `nextCursor`. The envelope already has the key, so no response shape changes and no consumer breaks.

**Test coverage.** `career.e2e-spec.ts` carries a characterization test pinning this behaviour, named so that its failure reads as "pagination arrived" rather than "a test broke". The cap itself is NOT covered — no test creates 101 rows — so a regression that drops or changes `take` would go unnoticed.

### D-006 — the graph module is `follows`, and it is built before `posts`
**PRD ref:** §7 Build order / `frontend/.docs/03-ARCHITECTURE.md` line 27
**Decided:** 2026-08-26
**Divergence:** §7 named the graph module `social` and placed it after `posts` and `feed`. It is named `follows` and is built immediately after `career`. §7 has been rewritten to match; the architecture doc has NOT been edited and still carries the old order.
**Reason:** Two separate corrections.

*Name.* `social` is a category, not a boundary. A category-named module accrues whatever is vaguely social — likes, blocks, mentions, mutes — because nothing about the name argues against it. `follows` owns the `follows` table and the four routes over it, which is a boundary that fits in a sentence. Note this resolves a contradiction rather than creating one: D-005 already committed to the name `follows` in writing ("First real keyset implementation lands in the `follows` module"), so §7 and §17 disagreed before this entry existed. The PRD agrees too — its requirement IDs are `FR-FOLW`, and "Social graph" there is a feature heading, not a module name.

*Order.* `follows` has no dependency on `posts`. `feed` has a hard dependency on `follows` — a feed is a query over the follow graph — so the original order had `feed` built before the thing it reads from existed. Moving `follows` earlier makes the sequence dependency-driven again, which is what §7 claims to be.

**Reversal cost:** trivial for the ordering (nothing was built against it). The name is a directory rename plus imports.

### D-007 — two keyset implementations coexist; `follows` is the template
**PRD ref:** `backend/CLAUDE.md` § API conventions / root §5 "Cursor pagination everywhere"
**Decided:** 2026-08-26
**Divergence:** The codebase now contains two different keyset predicates. `FollowsService` builds the ordering comparison as a SQL row-value, `(created_at, follower_id) < ($1, $2)`, in a `$queryRaw` tagged template. `ReferenceService.listClubs` builds it through the Prisma typed API, which can only emit the OR-decomposed form `a > $1 OR (a = $1 AND b > $2)`. Both return correct results. They do not plan the same way.

**Reason:** Prisma cannot express a row-value comparison, and the difference is not cosmetic. Measured with `EXPLAIN` against the existing `idx_posts_feed` before either was written:

| Form | Plan |
| --- | --- |
| row-value | `Index Only Scan`, comparison under **`Index Cond`**, no Sort |
| OR-decomposed | `Bitmap Heap Scan`, comparison under **`Filter`**, plus a **`Sort`** |

The OR form reads every row matching the leading column and sorts them to return twenty. On `clubs` that is bounded and static, so it is fine. On a follow graph, a feed, or a search result it is a table scan wearing an index's name.

**The template for `posts`, `feed` and `search` is `follows`, specifically:** a covering index carrying the full ordering tuple; every column in the same direction (a mixed-direction index cannot satisfy a row-value comparison and pushes the tiebreak back into a `Filter`); a composite cursor whose columns match the index columns exactly; and the timestamp carried as **text**, never as a JavaScript `Date` — see D-007's companion note below.

**Timestamp precision, the non-obvious half.** `created_at` is `timestamptz(6)`; a JS `Date` is millisecond. Encoding a cursor through a `Date` truncates downward, so a cursor taken from a row at `.123789` reads `.123000`, and a sibling row at `.123456` is *greater* than the cursor — it fails the comparison on that page and on every page after it, and is never returned to anyone. The failure is a silent omission, not a duplicate, and no boundary-collision test can find it: truncation preserves equality, so rows *sharing* a timestamp still page correctly. `follows.e2e-spec.ts` covers it with rows separated by microseconds inside a single millisecond.

**Outstanding debt, logged not fixed:** `ReferenceService.listClubs` keeps the OR form. It is bounded by the fact that reference tables are small, static, and read rarely. It should be migrated when something makes that untrue, and it must not be copied.

**Reversal cost:** trivial — `follows` is the only consumer of the raw form and nothing depends on the plan shape.

### D-008 — `schema.prisma` had lost two enum values; resolved toward the migration history
**PRD ref:** PRD 7.2 / `frontend/.docs/02-DATA-MODEL.md`
**Decided:** 2026-08-26
**Divergence:** None standing. This entry records drift that existed and is now closed. `PlayerPosition` in `schema.prisma` listed ten values; `20260806153229_init` creates the `player_position` type with **twelve**, and the live database has twelve. The two missing were `LEFT_MIDFIELDER` and `RIGHT_MIDFIELDER`. Resolved by adding them back to `schema.prisma` — a schema-file edit only, with no migration, because the history and the database already agreed with each other and only the schema file disagreed with both.

**Reason:** Resolved toward the history rather than the file because the positions are product-correct. A left midfielder is not a left winger — different defensive responsibility, different position on the pitch, different player. With the values absent, the nearest registration option is `LEFT_WINGER`, so every left midfielder on the platform would be recorded as a winger. That corrupts scout position filtering, which is the core value loop (PRD FR-SRCH-2 filters on role-specific attributes, position first). Deleting the values would have required a destructive `ALTER TYPE` recreate; adding them to the file required nothing.

**Why it was silent.** `prisma migrate deploy` does not run drift detection — it applies unapplied migrations and reports "Database schema is up to date!", which is what `migrate status` said throughout. Only `migrate dev` diffs the schema file against the database, and it surfaces the problem as a *warning attached to an unrelated migration*: the enum removal appeared while generating an index migration for `follows`. Had that migration been accepted unread, an unrelated destructive `ALTER TYPE` would have shipped inside it.

**Enum ordering is not drift, and that is a trap — amended.** The values were first placed after `ATTACKING_MIDFIELDER`, which is where they belong in footballing terms. The database has them after `DEFENSIVE_MIDFIELDER`. Prisma proposes no migration for the difference — verified — so the mismatch would have persisted indefinitely without ever failing anything. They have since been **moved to match the database**, and the reason is that the database is the side that cannot move: a Postgres enum's ordering is `enumsortorder`, fixed when `CREATE TYPE` runs, and changing it means recreating the type and rewriting every column that uses it. Between a file that can be edited freely and a type that cannot, the file follows.

**The consequence, and it is the actionable half:** `ORDER BY primary_position` sorts by `enumsortorder`, which is now an arbitrary historical artefact rather than anything meaningful — `LEFT_MIDFIELDER` sorts before `CENTRAL_MIDFIELDER` for no reason a user would recognise. **Nothing may `ORDER BY` this column, or any other enum column, to produce a user-facing order.** Display ordering belongs in an explicit map in application code, where it can be changed in a commit instead of a migration, and where it can differ per locale. The same applies to every enum in this schema; `PlayerPosition` is merely the one that surfaced it.

**Reversal cost:** trivial — two lines in `schema.prisma`.

**A second drift surfaced while fixing this one** — three GIN indexes `schema.prisma` did not declare. Closed in D-009.

### D-009 — the GIN trigram indexes are declared in `schema.prisma`, not left to raw SQL
**PRD ref:** `backend/CLAUDE.md` § Prisma / `schema.prisma` header
**Decided:** 2026-08-26
**Divergence:** None standing. This entry closes a standing destructive proposal. `schema.prisma`'s header listed "pg_trgm + unaccent extensions and GIN trigram indexes" among the things not expressible in Prisma, so `idx_users_full_name_trgm`, `idx_clubs_name_en_trgm` and `idx_clubs_name_ar_trgm` existed only in `20260806153549`. All three are now declared on `User` and `Club` with `type: Gin` and `ops: raw("gin_trgm_ops")`, and the header comment has been corrected.

**Reason:** the comment was **out of date, not wrong when written**. `type:` and `ops:` left preview in Prisma 4 and need no feature flag. The cost of the stale comment was not cosmetic: an index absent from `schema.prisma` is an index Prisma believes should not exist, so **every `prisma migrate dev` proposed dropping all three**, and it proposed it as a silent extra hunk attached to whatever migration was actually being written. It surfaced here inside an unrelated index migration for `follows`. Accepting that migration unread — which is the normal way people accept migrations — would have deleted the three indexes the `search` module (FR-SRCH-1/3) is built on, on a search path chosen specifically because Egyptian names arrive as Mohamed / Mohammed / Muhammad. The failure mode is a search feature that silently degrades to a sequential scan, with no error anywhere.

**The distinction the corrected comment now draws is exact:** `CREATE EXTENSION` remains hand-written SQL. Declaring an index that *uses* the extension does not. Conflating the two is what produced a three-year-stale blind spot in the file that is supposed to be the schema's source of truth.

**Verified with `prisma migrate diff`, not `migrate dev`** — twice, both empty, both exit code 0:

```
--from-config-datasource --to-schema ./prisma/schema.prisma   -> "-- This is an empty migration."
--from-migrations ./prisma/migrations --to-schema ...          -> "-- This is an empty migration."
```

The first proves `schema.prisma` matches the live database; the second proves it matches what the migration history builds. Both were necessary: a declaration that differs from `migration.sql` in any detail produces a drop-and-recreate rather than silence, and only the second diff would have caught that.

**Reversal cost:** trivial — three `@@index` lines.

### D-010 — `isFollowing` is computed in two places (debt, not resolved)
**PRD ref:** FR-FOLW / this module
**Decided:** 2026-08-26
**Divergence:** The same wire field is derived by two independent code paths. `GET /users/:id` resolves it through `viewerFollowSelect` in `follows.map.ts` — a filtered relation on the `users` aggregate root, existence-probed with `take: 1`. `GET /users/:id/followers` and `/following` resolve it in `FollowsService.hydrate` — one `follow.findMany` over the page's ids, mapped to a `Set`. Neither calls the other.

**Reason it exists:** the two reads have genuinely different shapes. The profile embed needs one boolean for one user and gets it free as a relation of a row it is already fetching; the list route needs *n* booleans for a page and must not issue *n* queries. Collapsing them today would mean either an extra round trip on every profile view or a helper awkward enough to obscure both call sites.

**Reason it is debt anyway:** two implementations of one field diverge, and this pair has already demonstrated it. `follows.e2e-spec.ts` now pins both, but those tests were not written from review — the list-route test existed and read as if it covered the field, while the profile path had no test that bound to its filter at all. **Source mutation found it: replacing `followerId: viewerId` with `followerId: undefined` in `follows.map.ts` left all 185 tests green.** Prisma drops an `undefined` where-value rather than matching nothing, so the probe silently became "does *anyone* follow this user", returning `true` for every user with at least one follower. Every existing test used a target whose only follower was the viewer, so none could tell the difference. A test now covers exactly that arrangement.

**Consolidation path when a third consumer appears** (post authors and search hits both need this field, so it will): one exported method on `FollowsService` — `followedSubset(viewerId, ids): Promise<Set<string>>` — with the profile embed passing a single-element array. That makes the *n*-query shape the only shape, keeps the anti-N+1 property in one place, and costs the profile read one extra query. That trade is currently not worth it and becomes worth it the moment a third caller exists.

**Reversal cost:** trivial today, and the tests pinning both paths are what keep it trivial.

### D-011 — the player profile ships without the application shell
**PRD ref:** `frontend/.docs/03-ARCHITECTURE.md` / Claude Design `PlayerProfileScreen.dc.html`
**Decided:** 2026-08-27
**Divergence:** The design screen is a full three-column app: a 64px `TopNav` (Feed / Network / Messages / Alerts, viewer avatar, notification count) and a 240px `LeftRail` (Feed / Saved profiles / Shortlists / Messages plus a clubs list) around the content column. Neither is built. The page renders the 604px content column and the 300px rail as a centred pair.
**Reason:** Nothing behind either would work. There is no feed, no search, no messaging and no session, so every control in both would be a dead target — and a dead target in a nav bar is worse than an absent one, because it teaches the user the product is broken rather than unfinished. The content column keeps the exact width the 1240px container gives it (1240 − 48 padding − 240 − 300 − 48 gaps = 604), so when the shell does land the profile does not reflow. `--container-content: 604px` in `globals.css` carries that arithmetic.
**Also dropped with it:** the rail clubs list, "Saved profiles", "Shortlists", the notification count, and `PostCard`'s save and post-options controls. No field in the profile data contract backs any of them.
**Reversal cost:** trivial — the two components and a wrapper. No existing markup changes.

### D-012 — dark-only, not dark-first
**PRD ref:** `frontend/CLAUDE.md` § Styling
**Decided:** 2026-08-27
**Divergence:** The rule said "Dark-first: pitch green on near-black". The design system document says **dark-only**, and that is what is built: `color-scheme: dark`, one palette, no `prefers-color-scheme` branch, and the `create-next-app` light default deleted from `globals.css`. The rule has been rewritten to say dark-only.
**Reason:** "Dark-first" implies a light theme arrives later, and none of the ported tokens have light values — surfaces are defined as an elevation ladder in lightness (`#0A0F0C` → `#111814` → `#161E19`), borders are alpha over the foreground, and the accent was chosen at a luminance that leaves contrast headroom *downward*. A light theme is not a second value per token; it is a second design. Writing "dark-first" invites someone to add `dark:` variants that will never be exercised and a `prefers-color-scheme` block that silently renders unreadable text.
**Consequence, stated plainly:** a user whose OS is set to light gets the dark UI. That is intended.
**Reversal cost:** rewrite — a light palette has to be designed, not derived.

### D-013 — role keys follow `schema.prisma`, not the design system
**PRD ref:** PRD 7.2 / Claude Design `components/identity/roleConfig.js`
**Decided:** 2026-08-27
**Divergence:** The design system's `ROLE_CONFIG` keys the six roles as `PLAYER`, `COACH`, `SCOUT`, `ANALYST`, `PHYSIO`, `CLUB`. `UserRole` in `schema.prisma` is `PLAYER`, `COACH`, `SCOUT`, `ANALYST`, `PHYSICAL_THERAPIST`, `CLUB_ADMIN`. `frontend/src/lib/role-config.ts`, the `[data-role]` blocks in `globals.css` and the `roles.*` message keys all use the **schema** names.
**Reason:** the role key is a wire value. It arrives from the API on every profile, post author and search hit, and it is what `data-role` is set to. A presentation-layer alias means a translation table at every boundary, and the day someone forgets it the role badge silently falls through to the neutral default rather than erroring — a wrong colour, not a crash. `PHYSIO` and `CLUB` are also lossy: a Club Admin is a person administering a club, not the club, and `clubs` is a separate table precisely because those are different things (root §5).
**Note:** the *labels* still differ per locale and stay in `messages/*.json`; only the keys are unified. The design system document has the same two keys wrong and should be corrected there too.
**Reversal cost:** trivial — six keys in three places.

### D-014 — fonts via `next/font/google`, not `next/font/local`
**PRD ref:** Claude Design `_ds/.../readme.md` § Gaps and substitutions
**Decided:** 2026-08-27
**Divergence:** The design system specifies Inter and Cairo self-hosted through `next/font/local` with per-script subsetting. They are loaded with `next/font/google` in `[locale]/layout.tsx`, subset `latin` and `arabic` respectively.
**Reason:** no woff2 binaries were provided — the design system flags this as an open gap on its own side, where the fonts come from the Google Fonts CDN. `next/font/google` downloads and self-hosts at build time, so the runtime result is the same as `next/font/local`: no CDN request, no third-party connection, no layout shift. What is lost is manual subsetting control, which matters for Cairo's Arabic range on mid-range Android. That is a byte-budget question to revisit with real font files, not a correctness one.
**Reversal cost:** trivial — two `next/font` calls, once the woff2 files exist.

### D-015 — the 4px grid governs layout spacing; component internals may use half-steps
**PRD ref:** Claude Design `_ds/.../readme.md` § Visual foundations, Spacing
**Decided:** 2026-08-27
**Divergence:** The design system names nine spacing values (4 8 12 16 20 24 32 48 64) and states the grid as universal. Three components use half-steps on the same 4px unit: `Badge` at 2px vertical padding, `RoleBadge` at 10px horizontal, `ClubCrest` at 2px inset, and the 2px label/value gap in the About and certification rows. These are the design system's own values — its component specs already use them while its foundations text says they do not exist.
**Reason:** the grid is a layout instrument. It governs the space *between* things, where a consistent rhythm is what makes a page scannable. Component-internal padding on a small element is a different problem: rounding a badge's 2px vertical padding to 4px makes a 12px-text pill visibly chunky and breaks its alignment with the 20px text beside it. That degrades the component to satisfy a rule not written for it. Material and Carbon both draw the line in the same place.
**The amendment, precisely:** the nine steps are mandatory for margin, padding and gap **between** components. Within a component, padding may use half-steps (`0.5`, `2.5`) on the same 4px unit. Nothing may use a value off that unit. The design system document should be amended to say so — it is the doc that is wrong here, not the padding.
**Reversal cost:** trivial — four class changes, at a visible cost to three components.

### D-016 — no `danger` button variant
**PRD ref:** Claude Design `components/core/Button.jsx`
**Decided:** 2026-08-27
**Divergence:** `ui/button.tsx` implements `primary`, `secondary`, `ghost` and `link`. The design system also defines `danger`.
**Reason:** nothing on this page destroys anything, and the design system's `danger` hover and pressed values are raw hexes — `#E33B3B` and `#B91C1C` — with no tokens behind them and no stated relationship to `--color-danger` `#DC2626`. Every other variant derives its states from its base token (`--color-accent` → `-hover` → `-pressed`). Shipping `danger` now would mean either inventing two tokens or hardcoding two colours, both to support a control that does not exist yet.
**When it lands:** derive `--color-danger-hover` and `--color-danger-pressed` from `--color-danger` the way the accent triple is derived, and add them to `globals.css` as tokens before writing the variant.
**Reversal cost:** trivial — one variant entry and two tokens.
