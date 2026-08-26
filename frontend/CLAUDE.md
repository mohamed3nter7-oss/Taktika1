# frontend/CLAUDE.md

**Installed and in use:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · next-intl 4 · lucide-react · Vercel.

**Named by this file but not yet installed:** Zustand, axios, react-hook-form + zod, TanStack Query. They arrive with the work that needs them — the first API call, the first form. The conventions below still describe how they are to be used when they land; treat those sections as a decision already made, not as a description of what exists.

Rules that apply to both frontend and backend live in the **root `CLAUDE.md`**. Do not duplicate them here.

---

## Server vs Client Components

Default to **Server Components**. Add `'use client'` only when the component needs state, effects, event handlers, or browser APIs.

| Surface | Type | Why |
| --- | --- | --- |
| Profile page | Server | Indexable, better first paint, no auth needed to read |
| Feed (initial page) | Server | Same |
| Search results | Server | Filters live in the URL, so they're shareable and back-navigable |
| Post composer | Client | Form state, upload progress |
| Message thread | Client | Polling, optimistic sends |
| Like button | Client | Optimistic toggle |
| Any form | Client | react-hook-form |

Marking a parent `'use client'` makes its entire subtree client-side. Push the directive as far down as possible.

---

## Data

- **Initial render:** server-side `fetch` in the Server Component.
- **Mutations and polling:** TanStack Query in Client Components.
- **Zustand:** only for genuinely global client state — session, locale, unread counts. Server data does not belong in a client store; it goes stale and you end up writing invalidation logic that TanStack Query already has.

---

## Validation

**zod schemas are shared with the backend DTOs.** One source of truth, so client and server rules cannot drift. If a rule exists in only one place, it will eventually exist in neither.

Client validation is UX, not security. The backend validates independently and is the authority.

---

## Auth

- Access token in **memory only**. Never `localStorage` — anything in `localStorage` is readable by any script on the page, including a compromised dependency.
- Refresh token is an httpOnly cookie; the client never touches it.
- axios response interceptor: on 401, call `/auth/refresh` once, retry the original request, and queue concurrent 401s so a burst produces one refresh rather than five.

### The registration refresh trap

After `POST /auth/register/profile` returns success, **call `POST /auth/refresh` before navigating.** The token in memory still carries `PENDING_PROFILE` and every write will 403 until it's reissued.

Symptom if missed: registration appears to work, then posting is broken. Debugging goes to the posts module and finds nothing wrong.

---

## i18n and RTL

- next-intl, **as-needed prefix**: English unprefixed at `/feed`, Arabic at `/ar/feed`.
- All copy in `messages/en.json` and `messages/ar.json`. No hardcoded strings, including error text, button labels, and empty states.
- **Arabic copy is written, not machine-translated.** Translated UI copy reads as foreign and undermines credibility in the primary market.
- Error codes from the API map to localised strings on this side. The API never sends user-facing prose.

### RTL is structural, not a stylesheet

Use logical properties everywhere:

| Use | Not |
| --- | --- |
| `ms-4` / `me-4` | `ml-4` / `mr-4` |
| `ps-4` / `pe-4` | `pl-4` / `pr-4` |
| `start-0` / `end-0` | `left-0` / `right-0` |
| `text-start` | `text-left` |
| `border-s` / `border-e` | `border-l` / `border-r` |

Directional icons (arrows, chevrons, back buttons) mirror in RTL. Logos and images do not.

Retrofitting RTL is a full CSS rewrite of every component. Doing it from the start costs only the discipline of the table above.

---

## Config-driven roles

Six roles, one shared UI. Role-specific screens are **data-driven variants**, never six parallel implementations.

`roleConfig` holds per-role field definitions, labels, icons, and validation. Registration, profile view, profile edit, and search filters all render from it. Adding a role should require a config entry and nothing else.

If you find yourself writing `if (role === 'PLAYER')` in a component, the difference belongs in the config.

---

## Styling

- Tailwind v4, CSS-first config. **Every token lives in `src/app/globals.css` under `@theme`** — ported by value from the Claude Design system. Nothing from that project's `styles.css` or `_ds_bundle.js` is imported; they are a parallel styling system and would fight Tailwind.
- **Dark-only**, not dark-first: `color-scheme: dark`, one palette, no `prefers-color-scheme` branch. Pitch green on near-black. Primary accent `#16A34A`. A light theme is a second design, not a second value per token — see D-012.
- `--color-accent` is **illegal as text** (3.4:1, fails AA). `--color-accent-text` `#4ADE80` is the only accent value legal on text.
- Typography: Cairo for Arabic, Inter for English. **Three weights only — 400, 500, 600.**
- **No arbitrary values, ever.** Not "unless there's a real reason" — the `@theme` namespace resets make most of them impossible and `npm run check:conventions` fails the rest.

### The namespace resets are the enforcement

`globals.css` resets each Tailwind namespace (`--color-*: initial`, `--font-weight-*: initial`, …) before redefining it. This is deliberate: with `--color-*` reset, `bg-red-500` does not exist, so "no hardcoded colours" is a compile-time property rather than a review comment. With `--font-weight-*` reset, `font-bold` does not exist, which is the design system's ban on 700-weight Latin enforced by the compiler.

Two consequences to know before editing that file:

- Keyword colours must survive by name. `--color-transparent`, `--color-current` and `--color-inherit` are re-added explicitly after the reset; removing them breaks `border-transparent` and `*-current`.
- Radii are **reassigned**, not extended: `rounded-lg` is 12px here, not Tailwind's 8px, and `rounded-xl` no longer exists.

### Spacing

`--spacing` is 4px, so the design system's nine steps are exactly `1 2 3 4 5 6 8 12 16`.

Those nine are mandatory for margin, padding and gap **between** components. **Within** a component, padding may use half-steps (`0.5`, `2.5`) on the same 4px unit — a badge's 2px vertical padding rounded up to 4px is a degraded badge. Nothing may use a value off the 4px unit. See D-015.

## Component architecture

Three layers, and the boundaries are the point:

```
components/ui/       design-system primitives — zero domain knowledge
components/domain/   football-aware, composed from ui/
app/…/page.tsx       composes domain/ and does nothing else
```

- **`ui/` knows nothing about football.** A `Badge` takes a `variant`, never a role. An `Avatar` takes a `badge` slot, never a `role`.
- **`domain/` composes `ui/` and never restyles it.** If a domain component needs to override a primitive's classes, the primitive is missing a prop — add the prop. This is also why `cn()` is a plain join and not `tailwind-merge`: there should be no conflicting utilities to resolve, and needing to resolve one is the signal.
- **`role-badge.tsx` is the only file permitted to use role colours.** They arrive through `data-role` and the cascade.

Push `'use client'` as far down as it goes. On the profile page only three files carry it — the tablist, the tab container that owns the selected value, and `PostCard`. The About and Career panels are rendered on the server and handed to the client tab container as slots, so they never ship to the browser.

## Verification

`npm run check:conventions` fails the build-adjacent rules that a type checker cannot see: physical direction utilities, arbitrary Tailwind values, inline `style={{}}` objects, hardcoded colours outside `globals.css`, and any key present in one locale file but not the other. Run it with `npm run lint` and `npm run build`.

---

## Every screen ships four states

Loading, empty, error, success. See PRD Section 15 for the per-screen matrix.

Unspecified states are how products ship broken — the happy path always gets built, the other three get improvised at 2am. Empty states carry a next action, not just an illustration.

---

## Images

Upload is **direct browser → R2** via a presigned URL. The file never passes through the API.

1. `POST /uploads/presign` → `{ uploadUrl, key }`
2. `PUT` the file to `uploadUrl`, with a per-file progress bar
3. Send `key` with the post or profile update

Validate type and size client-side before requesting the presign, so a rejected file fails fast instead of after an upload.
