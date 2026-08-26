# backend/CLAUDE.md

NestJS 11 · Prisma 7 · PostgreSQL 16 · Railway.

Rules that apply to both frontend and backend live in the **root `CLAUDE.md`**. Do not duplicate them here.

---

## Module structure

Every module looks the same. Deviating costs more than it saves.

```
src/modules/<name>/
├─ <name>.module.ts
├─ <name>.controller.ts
├─ <name>.service.ts
├─ dto/
│  ├─ create-<thing>.dto.ts
│  └─ update-<thing>.dto.ts
└─ entities/          only if response shaping needs a class
```

Shared code in `src/common/`: guards, decorators, interceptors, filters, pipes, the Prisma service.

**Controller** — HTTP only. Route, validate the DTO, apply guards, call one service method, return. No `if` statements about business rules. No Prisma.

**Service** — everything else. Business rules, transactions, authorisation decisions, Prisma calls.

---

## Prisma

- `PrismaService` extends `PrismaClient`, injected wherever needed. One instance.
- Use the typed API. Raw SQL only via `$queryRaw` tagged templates — **never** string concatenation.
- `$transaction` for any operation touching more than one table where partial success is wrong.
- `select` explicitly on read paths that return to the client. `include` pulls whole rows and leaks fields you forgot about.

### Migrations are immutable once applied

Prisma checksums applied migrations. Editing one produces a `P3018` failure that costs an afternoon to unpick.

- Schema change → new forward migration. Always.
- Never edit a migration that has run anywhere.
- If history diverges, recreate the migration with the exact recorded timestamp rather than editing in place.
- Local dev DB: Postgres 16 in Docker, host port **5433**, named volume so data survives container rebuilds.

### `prisma migrate dev` is not a diagnostic

It is a write. It applies every pending migration first, then generates a new migration file
from whatever it believes the difference to be — and that file can be destructive. Running it
"just to see what it thinks" has already, in this repository, applied a migration and written a
file that dropped three GIN indexes (root `CLAUDE.md` §17 D-009), and separately proposed an
`ALTER TYPE` recreate over two enum values (D-008). Both appeared as unannounced extra hunks
attached to an unrelated change.

**To inspect, use `prisma migrate diff`.** It is read-only, and `--exit-code` makes it a gate
(0 empty, 2 non-empty, 1 error):

```bash
npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script --exit-code
```

That answers "does `schema.prisma` match the live database" — i.e. what `migrate dev` would
propose. To answer "does `schema.prisma` match what the migration history builds", use
`--from-migrations ./prisma/migrations`; it needs `datasource.shadowDatabaseUrl` in
`prisma.config.ts`, which is deliberately not committed — set it for the run and remove it.

Run **both** before trusting a schema change. The first alone cannot catch a declaration that
matches the database but differs from the migration that created it, which is precisely the
case that turns into a silent drop-and-recreate later.

When `migrate dev` genuinely is the right command, read the file it produced before applying
it. Every hunk that is not the change you intended is a bug report.

---

## Testing

**`npm run test:e2e` is the only entry point.** Running `npx jest --config ./test/jest-e2e.json` directly bypasses the `--experimental-vm-modules` flag that Prisma 7's WASM compiler requires, and fails with an error that doesn't mention any of this.

- e2e runs against **real Postgres**, not an in-memory fake. This project's correctness lives in partial unique indexes, CHECK constraints, and triggers — a fake has none of them, so the suite would pass against a schema with every constraint removed.
- Each suite gets its own email subdomain (`@auth-test.local`, `@career-test.local`) so parallel workers don't collide on unique constraints.
- Unit tests only for genuinely complex pure logic: age computation, affiliation overlap, cursor encode/decode. Unit-testing a service that just calls Prisma tests Prisma.
- Rate limits will fire during rapid test registration. Restart the backend to clear in-memory throttler state.

---

## Validation and security

Global pipe, non-negotiable:

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

`forbidNonWhitelisted` is what closes mass assignment. A client sending `"role": "CLUB_ADMIN"` to a profile endpoint gets a 400, not a silent privilege escalation.

- `role` and `status` are **never** accepted from a request body, on any endpoint.
- Ownership checks live in the service, never the controller, and return **404** on failure.
- Passwords: **bcrypt, cost factor 12.** This is the V1 standard. Never SHA, never any fast general-purpose hash. The cost factor is load-bearing in three places and they move together or not at all: the constant in `auth.service.ts`, the `$2[aby]$12$` prefix a unit test asserts so the cost cannot be quietly lowered to speed up a suite, and the column comment on `users.password_hash` in `schema.prisma`. argon2id remains the intended V2 target — root `CLAUDE.md` §17 D-001 records why it was deferred.
- Refresh tokens stored **hashed**. A database leak must not yield usable tokens.
- A serialisation interceptor strips `email`, `passwordHash`, `dateOfBirth`, `status` from public responses. Defence in depth — individual DTOs already exclude them, but one forgotten DTO on one new endpoint leaks PII.
- Never log a password, token, or email address.

---

## Guards

- `JwtAuthGuard` — validates the access token.
- `ProfileCompleteGuard` — **reads `status` from the JWT claim, not the database.** A guard that queries adds a round trip to every authenticated endpoint in the application.

Consequence worth knowing before you debug it: after `POST /auth/register/profile` succeeds, the client's existing access token still says `PENDING_PROFILE`. The client must call `/auth/refresh` immediately. This presents as "registration works but posting is broken" and sends debugging in entirely the wrong direction.

---

## API conventions

- Base path `/api/v1`. Plural nouns.
- `camelCase` in payloads, `snake_case` in the database. Prisma's `@map` handles the boundary.
- Error envelope — every failure, produced by `AllExceptionsFilter` and nowhere else:

  ```json
  {
    "success": false,
    "error": {
      "code": "AFFILIATION_ALREADY_OPEN",
      "message": "for developers, never rendered to a user",
      "details": [],
      "correlationId": "95b8619d-58ed-4281-8b8e-7fcaf4616a53"
    }
  }
  ```

  `code` is the contract. `message` is a developer aid and is never shown to users — the frontend owns both language strings. `details` carries the `ValidationPipe`'s per-constraint list and is `[]` otherwise, never absent. There is no `statusCode` in the body; the HTTP status already carries it. `correlationId` is a UUID, echoed in the `X-Correlation-Id` response header and written to that request's log line, so a user can quote one string and have the failure found.

  **This shape is asserted by the e2e suite.** Changing any key is a breaking API change: the filter, the e2e assertions and the frontend axios interceptor have to move in the same commit. See root `CLAUDE.md` §17 D-002.
- Pagination: request `?cursor=&limit=20`, response `{ data: [], nextCursor: string | null }`.

  **End of list is `nextCursor === null`, and nothing else.** A page may contain fewer rows
  than `limit` and still have more pages behind it: the keyset window is taken over the
  owning table, while rows are dropped afterwards during hydration when the referenced user
  is no longer ACTIVE. `GET /users/:id/followers` returning 2 rows for `limit=5` with a live
  cursor is correct, not the last page. A client that infers the end from `data.length`
  stops early and silently — and the shorter the page, the likelier it does.

  The keyset itself is unaffected by that filtering: the cursor tracks the window, so
  nothing is skipped or repeated. `follows` is the reference implementation; root
  `CLAUDE.md` §17 D-007 records the predicate form to copy and the one not to.
- Likes and follows use `PUT` / `DELETE`, so a double-tap is a no-op rather than an error.

---

## What not to build

No repository layer. No use-case classes. No mappers. No DDD aggregates. No event bus. No CQRS.

If a module seems to need one of these, the module is probably doing too much — say so rather than adding the layer.
