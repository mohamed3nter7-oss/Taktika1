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
common → reference → auth → profiles → career → posts
  → feed → social → search → messaging → notifications
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
