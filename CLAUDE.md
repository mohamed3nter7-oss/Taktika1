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

### D-017 — the application shell is reinstated, with a reduced nav set
**PRD ref:** §17 D-011 / Claude Design `PlayerProfileScreen.dc.html`
**Decided:** 2026-08-27
**Divergence:** D-011 shipped the profile without `TopNav` or `LeftRail`. Both are now built, at `app/[locale]/(app)/layout.tsx`, but with fewer items than the design reference: nav is **Feed, Network, Messages** plus a notification bell in the top bar, and **Feed, Network, Saved posts, Messages** in the rail. Dropped from the reference: `Saved profiles`, `Shortlists`, the rail clubs list, and the notification **count**.
**Reason:** the original objection to the shell was dead targets, and that objection is answered by trimming the target list rather than by omitting the shell. Every remaining link points at a module in the §7 build order, so it is a promise the roadmap already makes. `Saved profiles` and `Shortlists` are on no roadmap at all, and a nav link is a product promise. The notification count is a different kind of claim: a hardcoded `3` in every screenshot asserts a feature that does not exist, so the bell renders without a badge.
**`Saved posts` is the one soft edge, and it is deliberate.** Bookmarks are anticipated in the API conventions as a PUT/DELETE toggle-write with the same shape as follow, but they are **not** a module in §7. If bookmarks never get a module, this link has to come out.
**Search renders and does nothing.** No form, no submit, no results — the `search` module does not exist. It is presentational because the bar's proportions depend on it, not because typing into it does anything.
**Boundary, stated because it is the point:** the layout owns the page frame — container, gutters, vertical rhythm, and the gap between rail and content — and a page owns only its own columns. `profile/[id]/page.tsx` moved unchanged except for deleting six frame classes from its `<main>`, which it only ever carried because no shell existed.
**Consequence: `TopNav` and `LeftRail` are Client Components,** which is an exception to "default to Server Components" with a concrete cause rather than a stylistic one. The links must be route-aware (`usePathname`), and a Lucide icon is a function component, which React refuses to serialize across the server/client boundary — so the icons cannot be passed in as props from a server parent. **`next build` does not catch that**: the profile route is dynamic, so nothing rendered the shell at build time and only the running server surfaced it.
**Viewer identity is `mocks/viewer.ts`, deliberately not a profile fixture** — a scout, so the shell cannot agree with `/profile/own` by accident and hide a broken owner state.
**Not built:** the mobile bottom tab bar. Below `tablet` the rail is simply hidden and there is no nav, which is honest about being unfinished; a stub would be the dead target this entry exists to avoid.
**Reversal cost:** trivial — delete the route group and two components; the page moves back untouched.

### D-018 — the post options menu is built; C-6 partially reversed
**PRD ref:** §17 C-6 (profile build) / Claude Design `components/content/PostCard.jsx`
**Decided:** 2026-08-27
**Divergence:** C-6 dropped both of `PostCard`'s trailing controls — the save/bookmark toggle and the options menu. The **options menu is now built**, author-only, with Edit post and Delete post. The **save control is still dropped**: no field in the contract backs it, which was the original reason and has not changed.
**Reason:** the menu's actions are operations on a post the viewer owns, which the `posts` module will provide; the save control needs a `saved` field that no endpoint returns. Different objections, so different outcomes.
**Both actions are no-ops** — they log and close. `posts` is not built.
**Ownership is a caller decision.** `PostCard` takes an explicit `canManage` prop rather than comparing ids internally. `PostList` supplies it from `isOwnProfile`, because on a profile page every post belongs to the profile owner. A feed list will compute it per post from viewer id against author id, and `PostCard` will not change.
**Delete does not confirm yet, on purpose.** A confirmation dialog needs a focus trap, `inert` on the background, scroll lock and focus restoration, and a focus trap that is subtly wrong looks completely fine to anyone testing with a mouse. The primitive is an open decision, so Delete carries a `TODO` rather than an improvised dialog.
**Reversal cost:** trivial — one prop and one component.

### D-019 — the corner badge glyph size is derived here, because the spec never set one
**PRD ref:** Claude Design `components/identity/Avatar.jsx` + `RoleBadge.jsx`
**Decided:** 2026-08-27
**Divergence:** The design system sizes the avatar's corner slot at 40% of the avatar and never specifies the glyph inside it, so the glyph fell through to `RoleBadge`'s 14px default — 29% fill at `xl`, which reads as a rendering bug rather than a design. The derived rule is **glyph = 50% of the slot**:

| Avatar | Slot | Glyph |
| --- | --- | --- |
| `xl` 120px | `size-12` 48px | `size-6` 24px |
| `lg` 56px | `size-6` 24px | `size-3` 12px |

`lg`'s slot was already rounded up from the spec's 22.4px, because 22 is off the 4px unit; 12px is the 50% that follows from 24. The spec's own table paired a 20px glyph with a 22px slot, which is 91% fill and would swallow the 2px ring.
**Mechanism:** `Avatar`'s `badge` prop is a render function `(glyphSize) => ReactNode`. The slot owner derives the glyph size and hands it over, so the 50% rule lives in exactly one place, and `ui/` still knows nothing about roles.
**Nothing on screen changes at `lg`** — it is currently unused.
**Reversal cost:** trivial — two numbers in one map.

### D-020 — "Message", not "Send message"
**PRD ref:** Claude Design `_ds/.../readme.md` § Content fundamentals
**Decided:** 2026-08-27
**Divergence:** The design system's copy rule is "buttons: verb first, sentence case, 1–3 words", and it offers *"Send message"* as its worked example. The button reads **"Message"**.
**Reason:** the rule stands; the example was wrong. "Message" is already a verb, and "Send message" describes an outcome the click does not produce — it opens a conversation, it does not send anything. A button that names an action it does not perform is the same defect as a dead link, just quieter.
**The message key was renamed with its value** (`profile.sendMessage` → `profile.message`). A key called `sendMessage` holding `"Message"` is the drift that teaches the next reader to distrust the file.
**The design system document should be corrected** — its example, not its rule.
**Reversal cost:** trivial — one key, two locale files, one call site.

### D-021 — uploads proxy through the server; no presign in v1
**PRD ref:** `POST /posts/images/presign` (FR-POST image upload)
**Decided:** 2026-08-29
**Divergence:** The PRD specifies a presigned-URL endpoint: the server signs a PUT, the client uploads straight to the bucket, the server never sees the bytes. That endpoint is not built and `StorageService` has no method that could back it. The surface is four methods — `put`, `delete`, `exists`, `publicUrl` — and `@aws-sdk/s3-request-presigner` is deliberately not installed. V1 uploads proxy through the server.

**Reason: EXIF, and it is not a performance trade.** Phone photos carry GPS coordinates, and the users posting training pictures include twelve-year-olds. Root §5 lists EXIF stripping as a hard guarantee, not a best-effort one, and a guarantee is only as strong as its weakest path. A presigned PUT is a path the server cannot inspect: the client holds a signed URL and writes whatever bytes it likes directly to the bucket. A well-behaved client would call `sharp` first; a modified one, a replayed URL, or simply a bug would not — and nothing on the server would know. Stripping afterwards does not close it either, because the un-stripped original is publicly readable from the moment the PUT completes until the worker gets to it. Proxying makes the strip structural: there is no way to put an object in the bucket except through code that has already run `sharp`.

**Secondary benefit, worth stating because it compounds:** the server stores the processed ~200KB WebP rather than the ~5MB original. That is a permanent reduction in both stored bytes and read egress, against a sub-$30/month infrastructure budget (root §1). A presign design stores the original and pays for it on every read, forever.

**The cost, stated plainly:** every image byte crosses the API container twice. That is real, and it is the thing that will eventually argue for presign — at which point the argument has to answer the EXIF objection, not out-run it.

**Reversal cost: low** — add a presign method to `StorageService` (plus the `@aws-sdk/s3-request-presigner` package) and a post-upload sanitize worker. Note the worker is not optional in that design: without it, presign silently removes the guarantee this entry exists to keep.

**Named by role, never by vendor.** Supabase Storage is the development provider and Cloudflare R2 is the launch provider. Both speak S3 with SigV4, so this is ONE implementation swapped by configuration — not an interface with two classes (§4). Every environment variable and every symbol is `STORAGE_*`; a `SUPABASE_*` name would make the R2 migration a change to every file that reads one. All seven values are validated at boot by `validateStorageEnv`, so a misconfiguration stops the process instead of surfacing as a failed upload three weeks later.

### D-022 — `posts.author_role` is denormalised from `users.role`
**PRD ref:** FR-FEED-2 / PRD A.4 (3NF exceptions)
**Decided:** 2026-08-29
**Divergence:** `posts` carries `author_role user_role NOT NULL`, duplicating `users.role`. This is the **third** documented 3NF exception, after `likes_count` and `comments_count`.

**Reason:** FR-FEED-2's `?role=` filter. Without the column the filter is a join predicate sitting ABOVE the index scan — the planner reads every post newest-first and discards non-matching authors until it has twenty, so the cost of the filter scales with how rare the role is. With it, `idx_posts_role_feed (author_role, created_at DESC, id DESC) WHERE deleted_at IS NULL` makes the filter the index's own leading column.

**Why the standard objection does not apply.** Denormalisation is normally rejected because the copy drifts. Role is IMMUTABLE by root §5 — chosen at registration, no UI path and no API path — so there is no operation that can make these two values disagree. **That immutability is the entire justification, and it is a precondition, not a nicety: the day role becomes editable, this column becomes a bug and must be dropped or backfilled in the same commit.**

**Where the value comes from: the verified JWT `role` claim, not a `users` read.** The same invariant licenses both. A 15-minute access token's `role` cannot be stale for a field nothing can change, and `AuthenticatedUser` is already the only identity source in the application (§9) — reading `users.role` on every create would add a round trip to buy a guarantee immutability already provides. The claim is signed and verified before the handler runs, so it is not client-controlled.

**NOT NULL with no DEFAULT, deliberately.** `NOT NULL` catches a create path that FORGETS the column: the insert fails loudly. It does **not** catch a WRONG value — a hardcoded `PLAYER`, or the club's role instead of the author's, satisfies the constraint and is silently wrong forever. A `DEFAULT` would convert the loud failure into exactly that silent one. The only real guard is the test: `posts.author_role` is asserted EQUAL to `users.role`, read as a column, for at least two different roles.

**Applied to an empty table** — `SELECT count(*) FROM posts` returned 0 immediately before the migration was written, so there is no backfill and no `USING` clause.

**Reversal cost:** migration — drop the column and the index, and move the `?role=` filter back to a join.

### D-023 — partial indexes stay in raw SQL; the complement to D-009
**PRD ref:** `backend/CLAUDE.md` § Prisma / §17 D-009
**Decided:** 2026-08-29
**Divergence:** `idx_posts_role_feed` and `idx_posts_author` are created in `20260829223800_posts_author_role_and_keyset_indexes/migration.sql` and are **not** declared in `schema.prisma`. Read alone, D-009 says the opposite — that an index absent from `schema.prisma` is one Prisma proposes to DROP on every `migrate dev`. Both are true, and **stating either half without the other misleads**:

| | |
| --- | --- |
| Prisma **can** express it (GIN + `ops`) | declare it in `schema.prisma`, or `migrate dev` proposes DROPPING it — D-009 |
| Prisma **cannot** express it (partial) | leave it in SQL; Prisma never sees it, so it is never proposed for drop |

**Reason:** Prisma has no `where` argument on `@@index`, so a partial index is not expressible at all. The brief for this module asked for both `WHERE deleted_at IS NULL` and an `@@index` declaration; those two requirements are mutually exclusive, and the partial predicate is the half worth keeping. Without it, `deleted_at` is not in the index and becomes a heap Filter — which costs the Index Only Scan.

**Verified, not reasoned.** `idx_posts_feed`, `idx_affiliations_current` and `idx_notifications_unread` have been live and absent from `schema.prisma` since `20260806153549`, and both `migrate diff` directions return empty (exit 0). Prisma does not see them.

**The consequence that matters for review: `migrate diff` cannot confirm these indexes exist.** An empty diff proves only that the expressible parts — the `author_role` column, and the drop of the old `posts_author_id_created_at_idx` — are in sync. It is silent about the two partial indexes, in both directions. The only check that covers them is `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'posts'`, and that is now part of this migration's acceptance rather than optional.

**Mitigation for the blind spot D-009 closed.** The `Post` model carries a comment block naming all three raw-SQL indexes with their definitions copied character for character from their migrations. A schema file silent about three indexes is the same blind spot in a different shape; the comment is what keeps it discoverable.

**Reversal cost:** trivial — but reversing means dropping the `WHERE` clause, which trades the Index Only Scan for a heap Filter.

### D-024 — content is always required; image-only posts are not permitted
**PRD ref:** FR-POST-1 / PRD 9.4
**Decided:** 2026-08-29
**Divergence:** `content` is required on `POST /posts` and on `PATCH /posts/:id`, 1–3000 characters after trimming. A post carrying only images is not expressible, now or after the image commit lands.

**Reason:** the platform's unit of value is a professional statement, not a photograph. A scout reading a feed is evaluating what someone says about a match, a session or a signing; an image supports that claim and does not replace it. Permitting image-only posts would also make the feed's text-search path (FR-SRCH) structurally unable to see part of the corpus, and would leave screen-reader users with a post that has no readable content at all — there is no alt-text field in the v1 schema, so an image-only post is an empty post to anyone not looking at it.

**The trimming is load-bearing, not cosmetic.** `chk_post_content_not_blank` (`length(btrim(content)) > 0`) is the real line and cannot be bypassed by a second write path. The DTO's `@Transform` trims BEFORE `@Length` runs, so `"   "` is a 400 VALIDATION_ERROR from the pipe rather than a raw 23514 surfacing as a 500 — the same reasoning as `assertNotSelf` in `FollowsService`. Verified by source mutation: removing the transform turns two tests red.

**Consequence when images land:** the image commit adds `imageKeys` as an OPTIONAL field beside a still-required `content`. It does not relax this.

**Reversal cost:** trivial — make `content` optional and add a cross-field validator requiring at least one of content/images. The CHECK constraint would have to be dropped in a migration, which is where it stops being trivial.

### D-025 — no edit window; a post is editable at any age
**PRD ref:** PRD POST-6
**Decided:** 2026-08-29
**Divergence:** POST-6 specifies that editing is permitted for 30 minutes after publication. `PATCH /posts/:id` enforces no window at all — a post is editable by its author indefinitely. `edited_at` is set on every edit.

**Reason:** the window solves a problem this product does not have. A 30-minute limit exists on platforms where a post's engagement is the thing being protected — where editing after the fact could bait-and-switch an audience that already reacted. Here the corpus is professional history: a career claim, a match observation, a coaching note. Those are exactly the things that need correcting *later*, when the author notices an error, and a typo in a scout's public statement is not something to lock in after half an hour.

**What replaces it is disclosure, not prevention.** `edited_at` is on the wire and is non-null forever once set, so a reader can always see that a post was changed. That is the honest control: the platform does not pretend an edit did not happen, and it does not pretend the original is recoverable either — **there is no revision history in v1, so the previous text is gone.** That is the accepted cost and the thing to revisit if editing is ever abused.

**Reversal cost:** trivial — one comparison against `created_at` in `PostsService.update`, plus an error code.

### D-026 — the create idempotency key is dropped
**PRD ref:** FR-POST-1 (client-generated idempotency key, 60-second dedupe)
**Decided:** 2026-08-29
**Divergence:** The PRD specifies a client-generated key on `POST /posts`, deduplicated for 60 seconds. It is not built. `CreatePostDto` declares no such field, and with `forbidNonWhitelisted` a client sending one gets a 400.

**Reason:** there is nowhere to put it. A 60-second window is a TTL, and the two things that express a TTL are a cache and a sweep job. There is no Redis (root §1 caps infrastructure under $30/month, and the throttler is deliberately in-memory for the same reason), and a unique index cannot express "unique for 60 seconds" — it would either reject the key forever, which is a different and worse contract, or require a scheduled delete that is itself a piece of infrastructure to run, monitor and get wrong.

**What replaces it:** a disabled submit button on the client, which is where accidental double-submits actually come from.

**The consequence, stated plainly:** a determined double-submit creates two posts, and **nothing on the server prevents it.** A user who double-clicks fast enough, or a client that retries a timed-out request, gets two identical posts and must delete one. The rate limit (5/min) bounds the damage to a handful, not to one.

**Reversal cost:** low, and it rises with scale — the key needs a store with a TTL. If Redis arrives for the throttler or the feed, this comes with it and costs a middleware; if it never arrives, this needs a table plus a sweep job and stops being low.

### D-027 — the `images` KEY ships now; it is empty only until the image commit
**PRD ref:** FR-POST image upload / §17 D-021
**Decided:** 2026-08-29
**Divergence:** `PostView.images` is on the wire from the first commit and is `[]` in this commit, because `posts` ships text-only here. No endpoint writes `post_images`, `sharp` is not installed, and `modules/media` is untouched by this commit.

**Read this the right way round.** What is permanent is the KEY, not the emptiness. Images ARE being built — the `post_images` table, the 4-slot CHECK constraint and the storage seam (D-021) all already exist, and the image commit fills the array. This entry records the ORDER of two commits, not a decision to omit images from the product.

**Reason:** the key exists now so that adding images later is ADDITIVE rather than a breaking change. A client that ships against this contract renders an empty gallery today and a populated one after the image commit, with no version negotiation and no field appearing from nowhere. Omitting the key and adding it later would force every consumer to handle its absence.

**This is the same argument D-021 makes about the upload path** and depends on it: images proxy through the server so `sharp` can strip EXIF, which is why the image commit is a separate piece of work with its own worker-shaped decisions rather than a field added to this DTO.

**Reversal cost:** trivial — the key is already there; the image commit fills it.
