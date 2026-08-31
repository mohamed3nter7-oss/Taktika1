# Taktika Design System

Taktika is a professional networking platform for the football industry — LinkedIn's structure applied to a domain LinkedIn serves badly. It connects six professional roles (Player, Coach, Scout, Performance Analyst, Physical Therapist, Club Admin) through role-typed profiles, structured career history, a shared content feed, search, and direct messaging. The core loop is register → complete profile → connect → post → be found.

**Scope:** web, desktop-first, **dark-only**, bilingual EN/AR with full RTL. Primary market is Egypt, so mid-range Android performance and Arabic typography are first-class constraints, not afterthoughts.

## Sources

| Source | Detail |
|---|---|
| `uploads/materials-1787528820056-i0cy.md` | **Taktika — Design System v1.0**, owner Mohamed (Product Owner / Lead Engineer). 1,034 lines: foundations, 19 component specs, Tailwind v4 theme, pre-merge checklist, common-failures table. This is the authoritative source and every value here is copied from it verbatim. |
| Codebase | None provided. |
| Figma | None provided. |
| Logos / imagery | None provided — see `assets/README.md`. |

Where the spec and this implementation could disagree, the spec wins. Substitutions I had to make are listed under **Gaps and substitutions** at the end.

## Design principles

Five, in resolution order.

1. **Professional structure, athletic accents.** The skeleton is calm and professional. Football personality enters only through football-native elements — position chips, licence tiers, club crests, affiliation timelines — never through loud colour, italics or motion. A scout evaluating players for three hours must not be visually fatigued.
2. **Colour carries meaning, never decoration.** Accent green means interactive. Red means destructive or failed. Role colours mean profession. A colour used for atmosphere is a colour that has lost its meaning.
3. **One primary action per view.** At most one filled accent button per screen.
4. **Bilingual is structural, not cosmetic.** Logical properties only. RTL is a mirroring pass, not a translation pass.
5. **Density is balanced.** Readable for long sessions, dense enough to scan twenty profiles. When in doubt, add space.

---

# Content fundamentals

**Voice: a competent colleague, not a brand.** The product speaks like a club professional writing to another professional — direct, specific, no hype. Football vocabulary is used correctly and without explanation (regains, eccentric strength deficit, U19, senior minutes); the audience knows the domain.

**Casing.** Sentence case everywhere — buttons, labels, headings, nav, toasts. Title Case appears nowhere. The single exception is the overline, which is uppercase 12px with 0.06em tracking (`Who to follow`, `My clubs`, `Trending clubs`), used only as a rail section marker.

**Person.** Second person for anything the user does or owns: "Share an update to start building your profile", "Your career history is now visible to scouts", "Write a message". First person only where the content belongs to the user as a collection: "My clubs". Never the corporate we.

**Buttons: verb first, sentence case, 1–3 words.** "Send message", "Create post", "Follow", "Delete post". Not "OK", not "Message Sending", not "Submit".

**Errors say what to do, not what went wrong.** "Enter a valid email address", not "Invalid input". They appear below the field, on blur — never per keystroke.

**Empty states are invitations, never apologies.** Name the space, one line of explanation, one action: *No posts yet / Share an update to start building your profile / [Create post]*. Never "Nothing here yet" with no path forward.

**Destructive copy names the consequence.** The confirm button repeats the verb — "Delete post", not "Confirm" — and the description states what is lost: "This removes the post and its comments. It cannot be undone."

**Placeholders show a valid example**, never a repeat of the label: `name@club.com`, `9`, "Match report, trial news, a question for the network…".

**Numbers are written out and grouped** (`1,240 followers`), always in tabular figures, never abbreviated to `1.2k` — a scout comparing profiles needs the real value.

**Privacy shapes copy.** The UI shows **age, never date of birth**. That is the protection for the 12–17 cohort and it holds at the presentation layer too.

**No emoji. Anywhere.** Not in UI copy, not in empty states, not as icons or bullets. The register is professional and the product is bilingual — emoji read differently across the two audiences and add nothing here.

**Arabic is a first-class translation, not a mirror of English idiom.** Role labels are fixed: لاعب, مدرب, كشاف, محلل أداء, أخصائي علاج طبيعي, نادي. Position codes stay Latin (ST, CB, GK) in both languages by product decision, wrapped in `dir="ltr"`.

---

# Visual foundations

**Colour.** Dark-only. Surfaces are `--surface-base` `#0A0F0C` (page), `--surface-raised` `#111814` (cards — the default content plane), `--surface-overlay` `#161E19` (modals, dropdowns), `--surface-sunken` `#070A08` (inputs, wells). The base is not neutral black: it carries a barely perceptible green cast that ties the whole surface to the accent, deliberately below conscious notice. Accent is a deep emerald `#16A34A`, chosen over brighter greens because the lower luminance leaves contrast headroom for hover and pressed states, and because saturated neon reads consumer/gaming rather than professional. **`--color-accent` is illegal as text** — it fails AA at body size (3.4:1); accent text uses `--color-accent-text` `#4ADE80` (8.9:1). Success shares the accent hex on purpose. Six role colours exist, muted, and are legal in `RoleBadge` only.

**Elevation is lightness, never shadow.** There is no shadow system. Shadows are nearly invisible on a near-black surface and cost more than they return, so depth is communicated by stepping up a surface token. Maximum two levels above base at once — a dropdown inside a modal is the limit. The only shadow-like value in the system is a 2px `--surface-raised` ring separating a corner role badge from the avatar beneath it.

**Type.** Inter for Latin, Cairo for Arabic, both self-hosted in production with `display: swap` and per-script subsetting. Modular scale at ratio 1.2 rounded to whole pixels: 40/32/24/20/17/15/13/12. **Three weights only — 400, 500, 600.** 700 is banned on Latin because light-on-dark text blooms optically; where Arabic needs it, Cairo 700 maps to Inter 600. Any number that updates or sits in a column uses tabular figures. Arabic gets +1px size, +2px line-height, and letter-spacing that is never negative — negative tracking disconnects joined letterforms, which is a legibility failure rather than a style preference.

**Spacing.** 4px grid, nine values (4, 8, 12, 16, 20, 24, 32, 48, 64). Card padding 20px default / 16px compact, 16px between cards, 24px between column groups.

**Layout.** Three columns inside a 1240px centred container: 240px rail / 520–640px feed / 300px rail, 24px gaps, 64px sticky top nav, rails sticky at 88px. The feed is capped at 640px because at 15px body text that is roughly 75 characters — above about 80 the eye loses its place. Below 1024px the right rail drops; below 768px the layout is one column with a 56px bottom tab bar. Fixed elements: the top nav (`--z-nav`), both rails (`--z-sticky`), the mobile tab bar, and the toast stack at bottom inline-end (`--z-toast`). Z-index is a six-step token scale; raw z-index values are never written.

**Backgrounds.** Flat token colours. No gradients, no photography, no textures, no repeating patterns, no full-bleed hero imagery, no noise or grain. The only non-flat surface in the entire system is the `--surface-image-plate` `#E8EDE9` light plate behind user-uploaded images — mandatory, because club crests and certificates are overwhelmingly transparent PNGs with dark linework and vanish on a dark background.

**The pitch line.** One 1px horizontal rule in accent at 24% alpha, directly beneath the profile header, **once per page maximum**. It references a pitch marking and it is the entire athletic-personality budget of the visual system. No pitch textures, no stadium photography, no angular jersey shapes.

**Corner radii, graduated.** 6px chips and tags, 8px buttons and inputs, 12px cards, modals and images, full-round for badges, avatars and icon buttons. Softness sits where elements repeat most (badges, avatars) while structure stays measured — credible to a club director, approachable to a seventeen-year-old academy player. Inner radius is always smaller than its container's.

**Cards** are `--surface-raised`, one 1px `--border-default` hairline, 12px radius, 20px padding, no shadow. Interactive cards go to `--border-strong` on hover over 120ms; non-interactive cards have no hover state at all, because a hover response on a non-clickable surface is a false affordance. A Card is never nested in a Card — internal structure uses `--border-subtle` dividers.

**Borders** are alpha over the foreground (6% / 11% / 18%), so one token reads correctly on every surface rather than needing a variant per background.

**Transparency and blur.** Used twice, and only twice: the modal scrim at `rgba(0,0,0,0.7)`, and the `+N` overlay on the fourth image of a post grid at `rgba(0,0,0,0.6)`. There is no frosted glass, no backdrop blur, no translucent nav. Transparency in borders is a token-authoring technique, not a visual effect. **Opacity is never used to mute text** — it multiplies against whatever is behind it and the same "muted" grey drifts across surfaces; use `--text-muted`.

**Motion.** 120ms hover / focus / colour, 200ms dropdowns and toasts, 300ms modals and drawers. `--ease-out` `cubic-bezier(.16, 1, .3, 1)` for entering, `--ease-in-out` `cubic-bezier(.4, 0, .2, 1)` for moving or resizing. **Only `transform` and `opacity` animate** — anything else forces layout every frame and drops frames on the mid-range Android hardware most of the market uses. No bounce, no spring, no overshoot, no parallax, no scroll-triggered animation. Modals fade with `scale(0.96 → 1)`; toasts slide in from the inline end; skeletons pulse 0.5 → 1 opacity. `prefers-reduced-motion` collapses everything to 0.01ms globally.

**Hover states** are a surface step, not an opacity change: filled accent goes to `--color-accent-hover`, transparent buttons pick up a `--surface-raised` background, ghost buttons also lift their text from secondary to primary, cards go to `--border-strong`, inputs go to `--border-strong`.

**Press states** are `transform: scale(0.98)` on every button, plus `--color-accent-pressed` on filled accent. Nothing else moves on press.

**Focus** is one treatment everywhere: `:focus-visible`, 2px `--color-accent` outline, 2px offset, radius inherited. `outline: none` without a replacement is a defect, not a style.

**Imagery colour vibe.** There is no art direction to state, because the product has no first-party imagery — every image is user-uploaded (headshots, crests, licence certificates). The system's job is containment, not treatment: light plate behind, hairline border, `object-fit: contain` for crests and `cover` for photos, `aspect-ratio` reserved before load so the feed never shifts. No filters, no duotone, no grain overlays are applied to user images.

---

# Iconography

**Set: Lucide, 0.544.0, loaded from `https://unpkg.com/lucide-static@0.544.0/icons/` — a flagged substitution.** The source spec names icons but never names a set, and the names it uses are mixed: `clipboard-list`, `binoculars`, `shield` and `chevron-down` are Lucide; `ball-football`, `heartbeat` and `chart-line` are not. Lucide is the closest match to what the spec implies (2px stroke, 24px grid, rounded caps, outline-only) and it is CDN-available, so the whole set resolves consistently. No icon assets were provided to copy in.

Three role glyphs had to be mapped:

| Spec name | Used instead | Reason |
|---|---|---|
| `ball-football` (Player) | `shirt` | Lucide has no soccer ball; `football` is the American ball, which would be wrong in this product. A jersey is football-native and unambiguous. |
| `heartbeat` (Physio) | `heart-pulse` | Same glyph, Lucide's name. |
| `chart-line` (Analyst) | `chart-line` | Exists in Lucide 0.5xx. No change. |

**If Taktika has its own icon set, send it — these three should be replaced first.**

**Delivery.** Icons render through the `Icon` component, which applies the SVG as a CSS mask so the glyph always takes `currentColor`. Nothing in this system inlines raw SVG paths, and there is no icon font. Sizes track the type they sit beside: 12px in badges, 14px in role badges, 16px with 13px text, 18px with 15px text, 20px in nav and 40px icon buttons, 24px in 44px touch buttons, 48px in empty states.

**Colour.** Icons inherit text colour and follow the same rules — `--text-secondary` at rest, `--text-primary` on hover, `--color-accent-text` when active, semantic text colours inside badges and toasts. An icon is never the only carrier of meaning: every role badge pairs its glyph with a text label, and every icon-only button carries an `aria-label` plus a tooltip.

**Mirroring in RTL.** Chevrons, back arrows, progress indicators and drawer directions mirror. Media controls, crests, numbers, time-axis charts, checkmarks and external-link glyphs do not.

**Emoji and unicode as icons: never.** No emoji anywhere. Unicode is used as a typographic separator only — the middle dot in "Striker · Al Ahly · 2h ago", and en dashes in date ranges.

---

# Index

| Path | What it is |
|---|---|
| `styles.css` | Global entry point. `@import` list only — link this one file. |
| `tokens/` | `fonts.css`, `colors.css`, `roles.css`, `typography.css`, `spacing.css`, `radius.css`, `motion.css`, `layout.css`, `base.css` |
| `components/` | React primitives, grouped by concern (below) |
| `ui_kits/web-app/` | Click-through recreation of the product's four core views — see its README |
| `guidelines/` | 17 foundation specimen cards (Colors, Type, Spacing, Brand) |
| `assets/` | Empty by design — see `assets/README.md` |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent Skills wrapper for use outside this project |

## Components

Every family the source spec defines, and nothing it does not.

**`components/core/`** — `Button`, `IconButton`, `Card` (+ `CardDivider`), `Badge`, `Skeleton` (+ `SkeletonPost`), `EmptyState`, `Icon`
**`components/forms/`** — `Input`, `Select`, `Textarea`
**`components/identity/`** — `Avatar`, `RoleBadge`, `PositionChip`, `ClubCrest`
**`components/content/`** — `PostCard`, `ProfileHeader`
**`components/navigation/`** — `TopNav`, `BottomTabBar`, `LeftRail`, `Tabs`
**`components/feedback/`** — `Modal`, `Toast` (+ `ToastStack`)

### Intentional additions

- **`Icon`** — the spec names icons but defines no wrapper. Without one, every component would inline SVG or hardcode a URL. One line of reason: it exists so `currentColor` and the size scale are enforced in one place.
- **`CardDivider`, `SkeletonPost`, `ToastStack`** — not separate families, just the spec's own described sub-parts (the `--border-subtle` divider inside a Card, the post-shaped skeleton, the max-three toast stack) given names so they cannot be improvised differently at each call site.

## Gaps and substitutions

1. **No logo.** None was provided and none was invented. The wordmark is set in Inter 600 with an accent full stop. **Send a real mark and I will wire it into `TopNav`, `thumbnail.html` and the UI kit.**
2. **Fonts are loaded from the Google Fonts CDN**, not self-hosted binaries — no font files were provided. Production per the spec is `next/font/local` with subsetting (Latin for Inter, Arabic for Cairo). **Send the woff2 files and I will convert `tokens/fonts.css` to real `@font-face` rules.**
3. **Icons are Lucide from CDN**, with the three role-glyph mappings above.
4. **No imagery of any kind** — crests, avatars and post images all render their fallbacks in the UI kit.
5. **Not recreated:** registration/onboarding screens, notification settings, and a full RTL pass of the app. The spec defines their rules but not their layouts; the bidi rules are demonstrated in the Type > Arabic & bidi card. **Tell me which of these to build next.**
