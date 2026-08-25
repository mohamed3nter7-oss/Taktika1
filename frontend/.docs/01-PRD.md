# Product Requirements Document — Taktika v1

| Field | Value |
| --- | --- |
| Version | 1.0 (initial) |
| Status | Draft for approval |
| Owner | Product Owner / Lead Engineer (solo) |
| Capacity | 1 engineer, 30–40 hrs/week |
| Target | Public launch, 13 weeks from kickoff |
| Market | Egypt first, MENA next |
| Platform | Responsive web (Next.js), REST API (NestJS), bilingual EN/AR with RTL |

---

## 1. Problem

Football careers in Egypt and MENA are coordinated through WhatsApp groups, Instagram DMs, and personal favours. The consequences are concrete:

- A capable left-back in a third-tier club has **no addressable channel** to a scout.
- A newly licensed fitness coach has **no verifiable public record** of their credentials.
- A club looking for a video analyst has **no searchable index** of them.

The information exists. It is just unstructured, unsearchable, and non-portable. Value leaks at every hop.

## 2. Solution (one paragraph)

A professional network for the football industry. Six role-typed profiles (Player, Coach, Scout, Performance Analyst, Physical Therapist, Club Admin), each with the fields their role actually needs; structured career history and credentials so people are comparable and filterable; a shared feed of text-and-image posts to give people a reason to return between career events; search and filtering to turn the profile corpus into a discovery tool; and direct messaging to close the loop from discovery to conversation.

**The core loop:** register → complete profile → post → discover → message.

## 3. What v1 is not

Not a marketplace. Not a booking system. Not e-commerce. Not a video platform. Not a transfer-management SaaS. No algorithmic ranking. No payments.

Each exclusion is a cost and scope decision, not an oversight. The binding constraint is one engineer and a small infrastructure budget; every feature added to v1 is subtracted from auth, profiles, feed, and messaging — the four things the entire platform stands on.

## 4. Design principles

1. **Football-native, not football-flavoured.** If a field could appear unchanged on LinkedIn, question whether it earns its place. Positions, preferred foot, licence tiers, and affiliation history *are* the product.
2. **Structure over free text.** Free text cannot be filtered, aggregated, or verified. Anything users will one day search on becomes an enum or reference table on day one.
3. **Credibility is the moat.** In an industry full of inflated claims, the platform that makes claims checkable wins. v1 builds the structure verification will later attach to.
4. **Ship the loop, not the polish.** A complete ugly loop beats a beautiful half-loop.
5. **No irreversible shortcuts.** Features may be deferred; data-model correctness may not. A missing feature costs a sprint. A wrong schema costs a rewrite.

## 5. Roles

Six roles. **Role is chosen at registration and is permanently non-editable** — it determines profile shape, and mutating it would orphan role-specific data. Users who genuinely change roles create a second account.

| Role | Primary job-to-be-done | Distinguishing profile fields |
| --- | --- | --- |
| Player | Be found by scouts and clubs | positions, preferred foot, height, weight, current club |
| Coach | Prove licences and track record | licence tier, specialisation, coaching history |
| Scout | Find and contact talent efficiently | affiliated org, region of coverage, focus |
| Performance Analyst | Show tooling and analytical depth | analysis type, software proficiency |
| Physical Therapist | Prove qualifications | qualification, specialisation, years of practice |
| Club Admin | Represent a club and post from it | manages a Club entity |

**Clubs are entities, not users.** A club is a row in `clubs`, referenced by affiliations and managed by one or more Club Admin accounts. Deleting an admin account must never destroy club history. This single decision prevents the most expensive delete anomaly in the schema.

## 6. Functional requirements

### 6.1 Authentication (FR-AUTH)

| ID | Requirement |
| --- | --- |
| AUTH-1 | Email + password registration. Password hashed with argon2id. |
| AUTH-2 | Email verification required before posting or messaging. |
| AUTH-3 | JWT access token (15 min) + rotating refresh token (30 d) stored in an httpOnly cookie. |
| AUTH-4 | Refresh-token reuse detection revokes the whole token family. |
| AUTH-5 | Role selected at registration; immutable thereafter. |
| AUTH-6 | Role-aware minimum age: **12** for Player, **18** for all other roles. DOB collected at registration. |
| AUTH-7 | Forgot-password / reset-password by single-use expiring token. |
| AUTH-8 | Rate limits on register, login, forgot-password (per IP and per email). |
| AUTH-9 | Registration is a two-phase flow: account creation, then role-specific profile completion. Until profile completion, the account is `PENDING_PROFILE` and gated out of the app. |

### 6.2 Profiles (FR-PROF)

| ID | Requirement |
| --- | --- |
| PROF-1 | Every user has a base profile: name, headline, bio, city, country, avatar. |
| PROF-2 | Each role has one extension table holding only its own fields. |
| PROF-3 | Public profiles expose a **computed integer age**, never raw date of birth. Privacy decision for minor players; preserves the scouting signal without publishing birth dates. |
| PROF-4 | Career history: club affiliations with `start_date` / `end_date`. `end_date IS NULL` means current. Self-asserted in v1. |
| PROF-5 | Certifications: name, issuing body, issue date, optional expiry. Carries an unused `is_verified` flag for v2. |
| PROF-6 | Profile view counter is an **anonymous aggregate**. Users never see *who* viewed them. |
| PROF-7 | Unique, immutable-by-default public `username` slug for profile URLs. |

### 6.3 Feed and posts (FR-POST)

| ID | Requirement |
| --- | --- |
| POST-1 | Post = text (max 3000 chars) + up to 4 images. **No video in v1.** |
| POST-2 | Global chronological feed, filterable by author role and country. No ranking algorithm. |
| POST-3 | Cursor-based pagination (`created_at`, `id`), never `OFFSET`. |
| POST-4 | Like and unlike. One like per user per post, enforced by a composite primary key. |
| POST-5 | Flat comments — no nested replies in v1. |
| POST-6 | Author can edit within 30 minutes and delete at any time. Delete is a soft delete. |
| POST-7 | Posts carry a `post_type` discriminator, single-valued at launch, to make promoted/opportunity posts an additive migration later. |
| POST-8 | Report a post or user. Reports land in a queue; moderation is manual via a database view. |

### 6.4 Discovery (FR-SRCH)

| ID | Requirement |
| --- | --- |
| SRCH-1 | Search users by name, headline, and username. |
| SRCH-2 | Filter by role, country, city, and role-specific attributes (position, licence tier). |
| SRCH-3 | Postgres full-text search with a GIN index on a generated `tsvector`. No Elasticsearch in v1 — it doubles infra cost for a corpus of a few thousand rows. |
| SRCH-4 | Search clubs by name and country. |

### 6.5 Social graph (FR-FOLW)

| ID | Requirement |
| --- | --- |
| FOLW-1 | **Asymmetric follow**, not mutual connections. No accept/reject flow, no pending state, no extra screens. |
| FOLW-2 | Follower and following counts shown on profiles. |
| FOLW-3 | Self-follow rejected by a CHECK constraint. |

### 6.6 Messaging (FR-MSG)

| ID | Requirement |
| --- | --- |
| MSG-1 | 1:1 conversations only. No group chat. |
| MSG-2 | **Ungated** — no follow required to message. Discovery is worthless if the first contact is blocked. |
| MSG-3 | Text only. |
| MSG-4 | Delivery is **polling-based** in v1 (client polls every ~5 s while the thread is open). Real-time is v1.1. |
| MSG-5 | Per-conversation unread counts and per-message read receipts. |
| MSG-6 | Block a user: blocks messaging in both directions and hides the blocker's posts from the blocked user. |
| MSG-7 | Rate limit on messages to non-followers, to blunt the abuse path opened by MSG-2 and the age floor of 12. |

### 6.7 Notifications (FR-NOTF)

In-app only. Types: new follower, like, comment, new message. No email digests, no push. `PROFILE_VIEWED` deliberately does not exist.

### 6.8 Internationalisation (FR-I18N)

EN/AR from day one, with full RTL. Locale prefix is *as-needed* — English unprefixed (`/feed`), Arabic prefixed (`/ar/feed`). Retrofitting RTL later is a full CSS rewrite, which is why it is in v1 despite the schedule cost.

## 7. Non-functional requirements

| Area | Target |
| --- | --- |
| Performance | p95 API < 400 ms; feed page < 200 ms at 10k posts |
| Availability | Best-effort single region. No HA in v1. |
| Security | argon2id, httpOnly cookies, Helmet, CORS allowlist, DTO validation on every input, rate limiting, no PII in logs |
| Privacy | DOB never public; profile views anonymous; account deletion cascades user content but preserves clubs |
| Cost | Under ~$30/month at launch scale |
| Accessibility | Keyboard navigable, WCAG AA contrast |
| Testing | e2e coverage on every module. Tests must be non-vacuous — verified by reverting the implementation and confirming failure. |

## 8. Success criteria (90 days post-launch)

- 300+ complete profiles across all six roles, none below 5% of the base.
- 40% week-4 retention of the launch cohort.
- **25+ conversations initiated between users who did not previously know each other.** This is the real metric — the only direct evidence the platform created value that did not exist before.
- Infrastructure spend under $30/month.

## 9. Deferred, with reasoning

| Feature | Deferred to | Why |
| --- | --- | --- |
| Video uploads | v2 | Storage plus egress plus transcoding is the single largest cost line. Kills the budget alone. |
| Real-time messaging | v1.1 | Websockets add a Redis adapter, connection lifecycle, and presence state. Polling delivers 90% of the value at 10% of the cost. |
| Personalised / ranked feed | v2 | Needs a graph and engagement data that do not exist at launch. |
| Groups / communities | v2 | A second social primitive; roughly a module in itself. |
| OAuth login | v1.1 | Email/password is sufficient; OAuth adds provider-account linking complexity. |
| Verification badges | v2 | Needs a human operations process, not code. Schema is ready. |
| Monetisation | v2 | Charging before liquidity kills a network. All three intended paths (club subscriptions, verification, promoted posts) need only additive migrations. |

## 10. Top risks

| Risk | Mitigation |
| --- | --- |
| Cold-start liquidity (scouts need players, players need scouts) | Narrow seeding through real Egyptian football contacts, not broad acquisition |
| Minors on an ungated messaging platform | Age floor, message rate limits, blocking, reporting, a documented takedown path |
| Solo-founder bus factor | Everything documented; decision log in `CLAUDE.md`; no undocumented tribal knowledge |
| Scope creep | The release-tag contract in this PRD is binding, not aspirational |
| Fake credentials | Structure now, `is_verified` wired but unused, verification as a v2 product |

## 11. Open decisions (need an answer before build)

1. **Default country on registration** — hard-default to Egypt, or leave unselected? Affects the funnel and data quality.
2. **Club creation by Club Admins** — can an admin create a new club at registration, or only pick from a seeded list? Free creation means duplicate clubs and a manual merge problem forever; a seeded-only list blocks legitimate small clubs at signup.
3. **Is polling-based messaging an acceptable *user-facing* launch state**, or purely an internal build-order step? This determines whether polling UX fallbacks need designing.
4. **Certification `credential_url`** — include now, or defer? Adding it later has no backfill path for existing rows.
