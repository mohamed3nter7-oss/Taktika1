# Taktika — build the login screen (`/login`, `/ar/login`)

You are the solo full-stack engineer on Taktika. Build the login screen end to
end: the UI translated from Claude Design, plus the auth foundations it is the
first consumer of — API client, in-memory access token, and the 401 refresh
interceptor.

This is the **first form and the first API call** in `frontend/`. Everything you
build here becomes the template every later screen copies, so build it as the
template, not as a one-off.

Root `CLAUDE.md` §6 applies: **present a plan and get my approval before writing
code**, then implement file by file. Do not go quiet and return with 20 files.

---

## Non-negotiables

Read these before anything else. They are the rules a reviewer will fail you on.

1. **Nothing from the design system's `styles.css` or `_ds_bundle.js` is
   imported.** Tokens are ported **by value** into `globals.css`, and almost all
   of them already are. Use what exists.
2. **No arbitrary Tailwind values** (`-[…]`), no `style={{}}`, no hex or `rgb()`
   outside `globals.css`. The `@theme` namespace resets mean `bg-red-500` and
   `font-bold` genuinely do not exist — this is enforced by the compiler and by
   `npm run check:conventions`, not by review.
3. **RTL is structural**: `ms/me`, `ps/pe`, `start/end`, `text-start`,
   `border-s/e`. Never `ml/mr/pl/pr/left/right/text-left`.
4. **No hardcoded strings.** Every label, placeholder, error, and aria-label
   lives in `messages/en.json` *and* `messages/ar.json` with identical key sets.
   **Write real Arabic — do not machine-translate.** Arabic is the primary market.
5. **Access token in memory only.** Never `localStorage`, never a non-httpOnly
   cookie.
6. **The API never sends user-facing prose.** You render copy keyed off the
   machine `code`; the English `message` on the wire is a dev fallback.
7. `--color-accent` is illegal as text (3.4:1, fails AA). `text-accent-text` is
   the only legal accent on text.
8. Three font weights only: 400 / 500 / 600.
9. **Any departure from `CLAUDE.md` or from the design gets a `D-0xx` entry** in
   the root divergence log, in the existing format. Silent divergence is the one
   unforgivable move in this repo.

---

## Two passes, because the design import can be blocked

The `claude_design` MCP needs an interactive `/design-login`, which a headless
run cannot perform. **Test the import before planning anything.** If it fails:

**Pass A — everything the backend and this prompt already specify.** Deps, the
dev proxy and the port fix, the axios client and its refresh queue, the session
store, the zod schema, the error mapping, both i18n namespaces, `ui/input`,
`ui/field`, the `(auth)` route group, and `login-form.tsx` with all four states
and full accessibility. **None of it depends on the `.dc.html`.** Build it,
verify it, commit it.

**Pass B — the design-dependent surface, which is exactly three values.** The
split ratio, the brand panel's width and image, and Option B's motion. For
Pass A leave `(auth)/layout.tsx` as a plain centred column carrying a `TODO`
that names those three by name.

**Do not derive them from tokens and correct later.** A derived geometry is
worse than an obviously provisional one, because it looks finished — it stops
being reviewed, and the correction never happens.

Nothing in Pass A is rewritten by Pass B: the form lives in the content column
either way. If the import succeeds, ignore this section and do both at once.

---

## Phase 0 — Read

- `CLAUDE.md` (root): §4 architecture, §5 cross-cutting decisions, §6 workflow,
  §8 definition of done, §9 language, §17 divergence log (skim D-011 → D-020 —
  they are all frontend and they explain why things look the way they do)
- `frontend/CLAUDE.md`: all of it. Especially *Auth*, *i18n and RTL*,
  *Component architecture*, *Styling*, *Every screen ships four states*
- `frontend/src/app/globals.css` — the token contract
- `frontend/src/components/ui/{button,card,icon,skeleton}.tsx` — match this house
  style exactly: `Record<Variant, string>` maps, `cn()`, and comments that
  explain *why* a value is what it is
- `frontend/src/app/[locale]/(app)/layout.tsx` — how a route group frames a page
- `backend/src/modules/auth/auth.controller.ts` + `auth.service.ts` +
  `dto/login.dto.ts`
- `backend/src/common/errors/error-codes.ts`
- `backend/src/common/filters/all-exceptions.filter.ts` — the error envelope

---

## Phase 1 — Import the design

Use the **claude_design MCP** (`https://api.anthropic.com/v1/design/mcp`,
authenticate via `/design-login`) to import:

`https://claude.ai/design/p/f2e9f411-46ec-4ff6-a806-a47e4c2d4ea7?file=Taktika+Login.dc.html`

Read (whole project is readable; these are the ones that matter):

- `Taktika Login.dc.html` ← the screen
- `support.js`
- `_ds/taktika-design-system-be64d561-e576-4538-af88-be7dd68ee2fd/_ds_bundle.js`
- `_ds/taktika-design-system-be64d561-e576-4538-af88-be7dd68ee2fd/styles.css`
- `_ds/taktika-design-system-be64d561-e576-4538-af88-be7dd68ee2fd/tokens/{base,colors,fonts,layout,motion,radius,roles,spacing,typography}.css`
- `uploads/abigail-keenan-8-s5QuUBtyM-unsplash.jpg`

**Variant to implement: `move with Option B · split with brand panel`.**

Read the `.dc.html` and `support.js` for the actual split ratio, geometry, and
what Option B's motion *is*. **Do not infer it from the name.** If the files are
ambiguous about a value, stop and ask me — do not invent one and do not average
two.

**The photo:** export it, compress it, place it at
`frontend/public/auth/brand-panel.jpg`. Render with `next/image` + `priority`.
It is decorative (`alt=""`). The `--color-plate` rule does **not** apply — that
is for user-uploaded transparent PNGs, not a photograph.

**Motion:** only `transform` and `opacity` animate. Use `duration-fast|base|slow`
and `ease-out|in-out` from `@theme`. Gate the entrance behind
`motion-reduce:transition-none` / `motion-reduce:animate-none`.

**Missing tokens:** if the login design needs something `globals.css` genuinely
lacks (an input focus ring is the likely one), add it to `@theme` beside its
neighbours with a comment naming the design-system file it came from. Never
reach for an arbitrary value instead.

---

## Phase 2 — Plan, and get approval

Present, in one message:

- the file list you intend to create/modify, with one line each on why
- the split-layout approach and how it mirrors under RTL
- what Option B turned out to be
- any token you need to add
- anything in the design that contradicts `globals.css`, and which you propose wins

Wait for my approval. Then implement.

---

## Phase 3 — Foundations

Install: `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `zustand`.
`frontend/CLAUDE.md` already names all five as decided; this is the work that
needs them. **Nothing beyond these five without asking.** Zustand is for the
session token only — that is its single listed legitimate use.

### 3a. The dev proxy — do this first, it is load-bearing

Add to `frontend/next.config.ts`:

```ts
async rewrites() {
  return [
    { source: "/api/v1/:path*", destination: `${process.env.API_ORIGIN}/api/v1/:path*` },
  ];
}
```

Create `frontend/.env.example` with `API_ORIGIN=http://localhost:3000`.

**Fix the port collision in the same commit.** `backend/.env` sets `PORT=3000`
and `CORS_ORIGINS=http://localhost:3001`, so the repo's own convention is
**backend on 3000, frontend on 3001** — but `frontend/package.json` has
`"dev": "next dev"`, which binds 3000 and fights the API. Change it to
`"dev": "next dev -p 3001"`. With the rewrite in place CORS never applies in dev
(Next proxies server-side), but leave `CORS_ORIGINS` pointing at 3001 so direct
calls and Swagger still work.

**Why this is not optional:** the refresh cookie is set
`httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. A cross-origin call from
`localhost:3000` to the API origin **will not carry it**, so refresh silently
fails and every session dies after 15 minutes. Root §9 forbids "fixing" that by
loosening the cookie — the frontend has to be same-origin. The backend's own
comments already assume this proxy exists.

`frontend/src/proxy.ts`'s matcher already excludes `/api`, so it needs no change.
Verify that rather than assuming it.

### 3b. `src/lib/auth/session-store.ts`

Zustand store holding `{ accessToken, expiresAt, user }` **in memory**. No
persistence middleware. Exports a plain getter/setter the axios interceptor can
call outside React.

### 3c. `src/lib/api/client.ts`

- `baseURL: "/api/v1"`, `withCredentials: true`
- request interceptor attaches `Authorization: Bearer <token>` from the store
- response interceptor on **401**:
  - call `POST /auth/refresh` **once**
  - **queue concurrent 401s** so a burst of parallel requests produces one
    refresh, not five — a single in-flight promise every waiter awaits
  - retry the original request once, with a `_retried` flag so a second 401
    cannot loop
  - **never** intercept a 401 from `/auth/refresh` or `/auth/login` themselves —
    clear the session and route to `/login`
- 403, 429 and 5xx pass straight through to the caller

### 3d. `src/lib/api/error.ts`

Narrow an unknown thrown value to `{ code, correlationId, status }`. The envelope
is:

```jsonc
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "…", "details": [], "correlationId": "…" } }
```

Handle three shapes: the envelope, a network failure (no response), and anything
else. Return `INTERNAL_ERROR` for the last two. Keep `correlationId` — surface it
in the generic error copy so I can grep a log line from a screenshot.

### 3e. `src/lib/validation/auth.ts`

`loginSchema` mirrors `LoginDto` **exactly**:

| field | rule |
| --- | --- |
| `email` | trimmed, lowercased, valid email, `max 255` |
| `password` | `min 1`, `max 128` |

**Zod 4 is installed** (`^4.5.4`). Top-level formats: `z.email()`, not the
deprecated `z.string().email()`. Same shape applies to `z.uuid()` later.

**No password format rule.** The backend deliberately has none — the stored
hashes predate any rule, and rejecting a valid password client-side locks a real
user out of their own account. Client validation is UX; the backend is the
authority.

### 3f. i18n

New namespaces in **both** locale files: `auth.*` (screen copy) and `errors.*`
(one key per `ErrorCode` you render, plus `unexpected` and `network`).
`npm run check:conventions` fails on key drift between the two files.

---

## Phase 4 — UI primitives

```
frontend/src/components/ui/input.tsx     text/email/password input — zero domain knowledge
frontend/src/components/ui/field.tsx     label + hint + error wrapper (fold into input.tsx if that reads better)
```

`ui/` knows nothing about football and nothing about auth. An `Input` takes
`invalid`, `describedBy`, a `trailing` slot — never `isPassword` and never a
translation key. Follow `button.tsx` for the variant-map + `cn()` shape.

The password visibility toggle is composed **in the form**, into `Input`'s
trailing slot. It is not a prop on the primitive.

---

## Phase 5 — The screen

```
frontend/src/app/[locale]/(auth)/layout.tsx         the auth frame — Pass A: centred column. Pass B: the split
frontend/src/app/[locale]/(auth)/login/page.tsx     Server Component; composes and nothing else
frontend/src/components/shell/auth-brand-panel.tsx  the photo half — Pass B only
frontend/src/components/domain/login-form.tsx       'use client' — the ONLY client boundary on this route
```

**`(auth)` is a separate route group** so login does not inherit `(app)`'s
`TopNav` / `LeftRail`. The layout owns the frame — the split, the gutters, the
brand panel; the page owns only its own column. `shell/` is the layout's
business and is never rendered by a page (D-017).

Below `tablet` the brand panel is hidden and the form fills the viewport.
Confirm that against the design rather than assuming it.

### The contract, precisely

`POST /api/v1/auth/login` → body `{ email, password }`.

**Success 200 returns `{ accessToken, expiresIn }` and nothing else.** The
refresh token is set as an httpOnly cookie by the server; the client never sees
it and must never try to read it.

> **Trap — handle it explicitly.** The login response carries **no role and no
> status**. To decide where to send the user you must call `GET /api/v1/auth/me`
> with the new access token *before* navigating. Guessing `/` instead drops a
> `PENDING_PROFILE` user into a screen where every write 403s — the same failure
> `frontend/CLAUDE.md` already documents as "the registration refresh trap",
> which debugs into the wrong module and wastes an afternoon.

Redirect on `status` from `/auth/me`:

| status | destination |
| --- | --- |
| `PENDING_PROFILE` | `/register/profile` — **route does not exist yet.** Navigate to it, add a `TODO`, do not build it |
| `ACTIVE` | `/` |

`PENDING_VERIFICATION`, `SUSPENDED` and `DELETED` never reach a 200 — the
backend rejects them at login with the codes below. Do not write client branches
for them beyond the error mapping.

Redirect with next-intl's `useRouter` from `@/i18n/navigation`, so `/ar/login`
lands on `/ar/…` and not on the English route.

### Error mapping

| code | HTTP | rendered as |
| --- | --- | --- |
| `INVALID_CREDENTIALS` | 401 | form-level. **Uniform copy — never hint which field was wrong.** The backend burns a dummy bcrypt compare specifically to keep this non-enumerable; leaking it in the UI throws that away |
| `EMAIL_NOT_VERIFIED` | 403 | form-level, with a "resend verification" link (link only — the route is not built) |
| `ACCOUNT_SUSPENDED` | 403 | form-level |
| `RATE_LIMITED` | 429 | form-level, real copy. **Login is throttled at 5/min and 20/hour** — you will hit this by hand while testing, so it is a first-class state, not a fallback |
| `VALIDATION_ERROR` | 400 | should be unreachable if the zod schema mirrors the DTO. Show the generic error and treat an occurrence as a bug |
| anything else, or a network failure | — | `errors.unexpected`, with the `correlationId` if one is present |

### The four states

Every screen ships all four, and a login screen is where "we'll do the other
three later" is most tempting:

- **idle** — the design's resting state
- **submitting** — button disabled + spinner, both inputs locked, no double-submit
- **error** — form-level alert *and* per-field where the failure is per-field
- **success** — a redirecting state, not a frozen form. The `/auth/me` round trip
  makes this visible, so it needs to look deliberate

There is no empty state on a login screen. Say so in a comment rather than
leaving the reader wondering whether it was forgotten.

---

## Phase 6 — Accessibility

- real `<form>` with a real submit; Enter submits
- `<label htmlFor>` on both inputs — never a placeholder as the label
- `autoComplete="email"` and `autoComplete="current-password"`
- visibility toggle: `type="button"`, `aria-label`, `aria-pressed`, and it must
  not steal the submit
- form-level error in `role="alert"`, focused on arrival
- `aria-invalid` + `aria-describedby` wiring field → message
- visible focus ring on every interactive element (token, not an arbitrary value)
- brand-panel photo `alt=""`
- AA contrast at body size throughout

---

## Phase 7 — Verify

```bash
cd frontend
npm run check:conventions   # direction utils, arbitrary values, inline styles, hex, locale key parity
npm run lint
npm run build
npm run dev                 # then exercise BOTH /login and /ar/login by hand
```

**`next build` does not catch this codebase's characteristic failure** — a
function component (a Lucide icon) passed across the server/client boundary. The
profile route is dynamic, so nothing rendered the shell at build time and it
surfaced only as a 500 from the running server. **The route must be opened in
`npm run dev`, in both locales, before you call this done.**

Exercise by hand, and report the result of each:

1. wrong password → uniform error, no field hint
2. six rapid attempts → the 429 copy, not the generic one
3. a `PENDING_VERIFICATION` account → the verify-email message
4. a `PENDING_PROFILE` account → routes to `/register/profile`, not to `/`
5. `/ar/login` → layout mirrors, Arabic copy reads naturally, redirect stays in
   `/ar/`. On Pass A this is the centred column; re-run it against the split in
   Pass B, since a split is where mirroring actually breaks
6. keyboard only: tab through, toggle the password, submit with Enter
7. refresh queueing: fire parallel requests with an expired token, confirm
   **one** `/auth/refresh` in the network tab

---

## Phase 8 — Report

- what Option B turned out to be
- every place the design file and `globals.css` disagreed, and which won
- every token added to `@theme`, with its source file
- the result of each of the seven manual checks
- the port change (`next dev -p 3001`) and why, so I do not "fix" it back
- if you are on Pass A: the three values Pass B still needs, restated
- **`D-0xx` entries appended to the root `CLAUDE.md` divergence log** for
  anything that departs from the design or from a documented rule — including
  the `(auth)` route group and the `next.config.ts` rewrite if you judge them
  worth recording

Commit per logical unit (foundations / primitives / screen), not per file and
not as one blob.

**Stop and ask me before:** changing any token lifetime, editing anything under
`backend/`, adding a sixth dependency, or resolving a design ambiguity by
guessing.
