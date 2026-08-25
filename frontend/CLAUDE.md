# frontend/CLAUDE.md

Next.js (App Router) · TypeScript · Tailwind v4 · next-intl · Zustand · axios · react-hook-form + zod · Vercel.

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

- Tailwind v4, CSS-first config. Design tokens as CSS variables in the global stylesheet, not scattered arbitrary values.
- Dark-first: pitch green on near-black. Primary accent `#16A34A`.
- Typography: Cairo for Arabic, Inter for English.
- No arbitrary values (`w-[347px]`) unless there's a real reason. They defeat the token system.

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
