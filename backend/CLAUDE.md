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
- Passwords: argon2id, 19 MiB / t=2 / p=1. Never bcrypt, never SHA.
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
- Error envelope: `{ statusCode, code, message, details? }`. `code` is the contract; `message` is for developers, never shown to users.
- Pagination: request `?cursor=&limit=20`, response `{ data: [], nextCursor: string | null }`.
- Likes and follows use `PUT` / `DELETE`, so a double-tap is a no-op rather than an error.

---

## What not to build

No repository layer. No use-case classes. No mappers. No DDD aggregates. No event bus. No CQRS.

If a module seems to need one of these, the module is probably doing too much — say so rather than adding the layer.
