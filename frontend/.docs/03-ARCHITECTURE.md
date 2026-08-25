# Architecture & Engineering Standards — Taktika v1

## 1. Shape of the system

```
Next.js (Vercel)  ──REST/JSON──►  NestJS (Railway)  ──►  PostgreSQL 16
      │                                  │
      └──────────────────────────────────┴──►  Cloudflare R2 (images)
```

**Modular monolith, one deployable backend.** Microservices for a solo engineer are a tax with no payer: distributed transactions, N pipelines, N logging setups, and cross-service debugging, all to solve a scaling problem that does not exist at 300 users. Module boundaries inside the monolith are what actually matter, and they are enforced by folder structure and narrow exported services. If a module ever needs to leave, it leaves along a boundary that is already clean.

## 2. Backend layering

**Controller → Service → Prisma. Three layers, no exceptions.**

- **Controller** — HTTP only: routing, DTO validation, guards, serialisation. No business logic.
- **Service** — all business rules, all transactions, all authorisation decisions.
- **Prisma** — called directly from the service.

**No repositories, no use-case classes, no mappers, no 4-layer Clean Architecture.** Repositories exist to abstract the database so it can be swapped; Postgres is not being swapped, and Prisma is already the abstraction. Adding the layer buys nothing and costs a file and a mapping function per operation, forever. This applies to *every* module — auth and messaging included. Consistency here is worth more than local optimisation.

Cross-module needs are met by **injecting the other module's service and calling a narrow exported method** — not by reaching into another module's tables.

### Module list (build order)

`common` → `reference` → `auth` → `profiles` → `career` → `posts` → `feed` → `social` → `search` → `messaging` → `notifications`

Order is dependency-driven: nothing is built before what it depends on exists, so no module is written against a stub.

## 3. Frontend

Next.js App Router. Server Components for anything read-heavy and public (profiles, feed, search results — better first paint and SEO); Client Components only where interaction demands it (composer, messaging, forms).

- **Data fetching**: server-side `fetch` for initial render, TanStack Query for client-side mutations and polling.
- **Client state**: Zustand, only for genuinely global state (session, locale, unread counts). Server data does not belong in a client store.
- **Forms**: react-hook-form + zod. **The zod schema is shared with the backend DTO** — one source of truth for validation, no drift between client and server rules.
- **Styling**: Tailwind, CSS-first config. Dark-first, mobile-first, RTL-first — all three are cheap at the start and expensive to retrofit.
- **i18n**: next-intl, as-needed locale prefix.

## 4. Auth flow (the part that is easy to get wrong)

1. `POST /auth/register` → user created with status `PENDING_VERIFICATION`, verification email sent.
2. `GET /auth/verify-email?token=` → status becomes `PENDING_PROFILE`.
3. `POST /auth/login` → access token (15 min, memory) + refresh token (30 d, httpOnly cookie).
4. `POST /auth/register/profile` → role extension row created, status becomes `ACTIVE`.
5. **The client must call `/auth/refresh` immediately after step 4** — the existing access token still carries `PENDING_PROFILE` and will keep failing the profile guard until reissued. This is the single most common bug in this flow.

Refresh tokens rotate on every use and are tracked in families. Presenting an already-used token means it leaked: revoke the entire family. Store token *hashes*, never the tokens.

`ProfileCompleteGuard` reads status from the JWT claim, not the database — a guard that queries on every request adds a round trip to every endpoint in the app.

## 5. API conventions

- REST, `/api/v1/...`, plural nouns.
- Cursor pagination everywhere. `OFFSET` degrades linearly and skips rows when data shifts mid-scroll.
- Consistent error envelope: `{ statusCode, code, message, details? }`. `code` is a stable machine-readable string (`AFFILIATION_ALREADY_OPEN`) so the frontend can localise without parsing English prose.
- **404, not 403, for resources the caller does not own.** 403 confirms the resource exists, which leaks the existence of private data.
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` — a field not in the DTO is rejected, which is what closes mass-assignment (a client sending `role: 'ADMIN'` to a profile-update endpoint).

## 6. Images

Direct-to-R2 upload via presigned URL. The image never passes through the API server — routing it through the backend burns request time and memory for zero benefit. Client requests a presigned URL, uploads to R2, then sends the resulting key to the API. Validate MIME type and size before issuing the URL, and re-encode server-side or strip EXIF to remove GPS data from uploads.

## 7. Testing

- **e2e is the primary safety net**, run against a real Postgres in Docker — not an in-memory fake. Fakes do not have constraints, and constraints are where this schema's correctness lives.
- **Tests must be non-vacuous.** Standard verification: revert the implementation, confirm the test fails, restore. A test that passes against a broken implementation is worse than no test, because it is trusted.
- **Suite isolation**: unique email subdomains and country codes per suite, verified under parallel workers.
- Unit tests only for genuinely complex pure logic (age computation, affiliation overlap). Unit-testing a service that just calls Prisma tests Prisma.

## 8. Environments and cost

| Concern | Choice | Monthly |
| --- | --- | --- |
| Frontend | Vercel (Hobby) | $0 |
| Backend + DB | Railway | ~$10–20 |
| Images | Cloudflare R2 | ~$0 (zero egress fees) |
| Email | Resend free tier | $0 |
| Local dev | Docker Compose (Postgres 16, named volume) | $0 |

R2 over S3 specifically for zero egress. On an image-heavy social feed, egress — not storage — is the bill that surprises people.

## 9. Working conventions

- **Decision log.** Every architectural decision, every deviation from the PRD, and every conscious trade-off is written down with its rationale. A deviation that is not documented is indistinguishable from a bug six months later.
- **Plan before code.** Review the plan, then execute. Approve changes file by file rather than in bulk.
- **Flag conflicts before implementing, not after.** If a request contradicts a logged decision, surface it first.
- If an implementation run is interrupted mid-task, run `git status` and verify each planned file's completion state before resuming. Never resume blind.
