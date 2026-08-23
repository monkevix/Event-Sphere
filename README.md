# EventSphere — College Event Management Portal

> **Campus Events, Simplified** — a dark-themed, mobile-first front-end for discovering, viewing and registering for events at **Chitkara University, Punjab**. Built as a Front-End Engineering (FEE) academic project — **view + register only**, no user-generated event creation.

---

## 1. Live Preview

No build step, no backend. Open directly in the browser:

```bash
# entry with animated splash
open loading.html   # waits ~2.4s then fades to index.html

# or jump straight in
open index.html
open events.html
open event-details.html?id=codesphere-hackathon
```

`loading.html` → `index.html` is an auto-redirect (meta-refresh fallback + JS `setTimeout(2400) → fade → location.replace('index.html')`) styled to match the site theme in `css/style.css:loading`.

---

## 2. Pages (8 HTML + splash)

| File | Purpose | Key UI |
|------|---------|--------|
| `loading.html` | Splash: logo pulse + amber `progress-fill` → fade + redirect to `index.html` (body `loading-page`) | `style.css` loading block, `progress-bar`, dots |
| `index.html` | Hero (“Discover and join events your college will remember” — Chitkara), Featured (4), Upcoming (3), Categories grid (5 linked to `events.html?filter=`), Why-Choose (4), Stats (120+ / 15k+ / 40+ Clubs), How-It-Works (3 steps), FAQ accordion, Newsletter | Real images (`images/*` + `has-image` class), inline icons `#i-*` |
| `events.html` | All 12 events, searchable + filterable + sortable | `searchInput`, `filterPills`, `sortSelect`, `resultsCount`, `eventsGrid`/`registeredGrid`, 2-row toolbar (`css/style.css:1654`) |
| `event-details.html?id=<slug>` | Dynamic hero: poster, price, organizer, tags, 3 expandable sections (Schedule / What to bring / Rules), aside snapshot, Register toggle, Share (copy + Web Share API), **You might also like** (always 3, fallback filler) | Reads `EVENTSPHERE_EVENTS` from `js/events.js`, uses `encodeURI(image)` |
| `categories.html` | 5 detailed cards (Technical/Cultural/Sports/Workshops/Competitions) with live counts from dataset + helper strip + 4-step explainer + stats band | `categories-page-grid`, JS populates `.category-count` |
| `about.html` | Our Story, Mission (3 checks), 3 stat cards, Principles (4), Timeline (2024→2026 “Live at Chitkara”), Team (6 cards), CTA band | Reworded to avoid “publish your own event” |
| `contact.html` | Form (name/email/subject/message, inline validation, success/error boxes), Info cards (Email/Phone/**Campus Office — Chitkara address** / Visit Hours), Map pin, FAQ teaser | No captcha (removed on request), stores to `localStorage: eventsphere_messages` |
| `signin.html` / `signup.html` | Auth forms, `form-card` layout, captcha via `js/captcha.js`, show/hide errors with `.has-error` | Uses `js/auth.js` + `js/captcha.js`, guest/auth UI toggle |

All pages share: fixed `site-header` (blur, scroll border), responsive `nav-toggle` hamburger (`js/main.js`), skip-link (`a11y`), centered footer (`footerGrid` 1.4fr 1fr 1fr 1fr → 1fr at `< 480px`), toast (`#globalToast`), newsletter validation, `js/icons.js` + `js/auth.js` + `js/main.js`.

---

## 3. Features at a glance

- **12 curated events, 5 categories** — Technical / Cultural / Sports / Workshops / Competitions, each with `pill-*` colour (tech blue, cultural purple, sports green, workshop amber, competition red).
- **Search + filter + sort (no reload)** — `events.html:searchInput` filters title/description/venue/organizer/category; pills toggle `active`; sort by date asc/desc, name A→Z, popularity; `resultsCount`, `emptyState`, `clearFilters`, URL supports `?filter=Technical`, `?search=`, `?q=`.
- **Registration (localStorage demo)** — requires `isLoggedIn()`; `toggleRegistration(id)` persists in `localStorage: eventsphere_registrations`; button text `Join → Joined` (`btn-outline` → `btn-secondary`), `Registered — tap to cancel` on details, `Your Registrations` strip on `events.html`.
- **Auth (localStorage demo)** — `js/auth.js` keys `eventsphere_users`, `eventsphere_session`; `registerUser`/`loginUser`/`logoutUser` + `getCurrentUser`/`isLoggedIn`; `main.js` injects `navUserChip` (initials avatar), handles `Logout`, `storage` sync across tabs. Passwords plain-text by design (demo only, flagged in code).
- **Real posters** — all 12 events now carry `image: "images/…"` (see §7) rendered with `object-fit: cover` via `.event-poster.has-image` + `.details-poster.has-image` (`css/style.css:735,1787`). Fallback icon `ESIcon(name, size)` from `js/icons.js` if no image.
- **Inline SVG icons** — no icon pack: `js/icons.js:2` defines 32 `symbol` entries (`calendar, clock, pin, users, code, music, trophy … check`) injected hidden, used as `<svg class="icon"><use href="#i-…">` or `ESIcon("code","1.9rem")`. Sizing via `1em`.
- **Related events** — `event-details.html:212` guarantees exactly 3 cards (same-category first, then nearest dates filler) to avoid awkward 1-2 layout; grid `3col@>901px`.
- **Loading splash** — `loading.html` full-viewport centred on `var(--color-bg)` with amber gradient, pulse logo, `loadingFill` animation (0→100% over 2.2s), `dotsBlink` + progress `aria-valuenow` sync, then fade to `index.html`.
- **Chitkara-aware** — Campus Office + map pin updated to the real official address (§10); hero subtext, stats (“40+ Departments & Clubs”), about mission, categories, etc. stripped of any “create your own event” copy for professor review.

---

## 4. Tech Stack

- **HTML5 semantic** + **CSS3** single-file `css/style.css` (≈2200 lines), no preprocessor, no npm.
- **Vanilla JS (4 modules, IIFE, `window.*` globals)** — `auth.js`, `events.js`, `icons.js`, `main.js`, `captcha.js` (only `signin/signup`).
- **Fonts:** `Karla` (body, 400/500/600/700) + `Unbounded` (display, 500–800), loaded via `fonts.googleapis.com`.
- **No dependencies, no bundler** — open any `*.html` file via `file://` or a static server.

---

## 5. Design System (`css/style.css:11`)

```css
--color-bg: #08090d; --color-surface: #13161f; --color-border: #262b3a;
--color-accent: #f59e0b; --color-accent-hover: #fbbf24; --color-gradient-amber: linear-gradient(135deg, #f59e0b, #f97316, #ec4899);
Karla + Unbounded; radii 8/12/18/20; max-width 1280px; nav-height 68px;
```

Dark by default; `body.light-mode` variables provided (unused). Shared tokens: `shadow-sm/md/card/lift`, `transition-base/ease`. Components: `.btn` variants (`primary` amber gradient / `secondary` outline / `ghost` / `outline`), `.pill`, `.event-card`, `.feature-card`, `.category-card`, `.stats-band`, `.faq-item[open]`, `.form-card`, `.toast`, `.skip-link`, `.step-num`, `.icon`, `.loading-*` etc.

---

## 6. Folder Structure

```
fee-project/
├── loading.html          # splash → index.html (2.4s, fade, meta fallback)
├── index.html            # home
├── events.html           # all + toolbar
├── event-details.html    # dynamic ?id=
├── categories.html       # 5 detailed category cards
├── about.html
├── contact.html
├── signin.html
├── signup.html
├── README.md             # this file
├── css/
│   └── style.css         # single stylesheet (header → loading, ~2200 lines)
├── images/               # 12 posters (all wired)
│   ├── hackathon1.jpeg       # codesphere-hackathon
│   ├── concert.jpeg          # rhythm-nite
│   ├── session.jpeg          # uiux-sprint
│   ├── public-speaking.jpeg  # debate-cup  (fixed from space → hyphen)
│   ├── sports.jpeg           # premier-league
│   ├── aiexpo.jpg            # ai-robotics-expo
│   ├── bigfest.jpg           # zenith-fest
│   ├── pitchdeck.jpg         # startup-pitch
│   ├── clgphotograph.jpeg    # photo-walk
│   ├── latenight-hackathon.jpeg # codegolf
│   ├── yogamat.jpg           # wellness-workshop
│   └── esports.jpg           # esports-showdown
└── js/
    ├── auth.js           # localStorage users/sessions
    ├── captcha.js        # math captcha for signin/signup only
    ├── events.js         # window.EVENTSPHERE_EVENTS[12]
    ├── icons.js          # 32-symbol sprite + ESIcon()
    └── main.js           # nav, scroll, auth UI, toast, newsletter, registrations
```

Assets are grouped: `css/` for styles, `js/` for scripts, `images/` for posters, HTML at root (entry `loading.html` → `index.html`). All hrefs are `css/style.css`, `js/*.js`, `images/*` relative from root.

---

## 7. Events Dataset (`js/events.js:2`)

```js
window.EVENTSPHERE_EVENTS = [{ id, title, category, pill, date, displayDate, time, endTime,
  venue, price, poster, icon, image, attendees, description, longDescription, organizer, tags[] } …]
```

| # | id | Category | Price | Icon | Image |
|---|----|----------|-------|------|-------|
| 1 | `codesphere-hackathon` | Technical | Free | `code` | `hackathon1.jpeg` |
| 2 | `rhythm-nite` | Cultural | ₹99 | `music` | `concert.jpeg` |
| 3 | `uiux-sprint` | Workshops | Free | `pen` | `session.jpeg` |
| 4 | `debate-cup` | Competitions | Free | `mic` | `public-speaking.jpeg` |
| 5 | `premier-league` | Sports | ₹199/team | `trophy` | `sports.jpeg` |
| 6 | `ai-robotics-expo` | Technical | Free | `cpu` | `aiexpo.jpg` |
| 7 | `zenith-fest` | Cultural | ₹299 | `sparkles` | `bigfest.jpg` |
| 8 | `startup-pitch` | Technical | Free | `rocket` | `pitchdeck.jpg` |
| 9 | `photo-walk` | Cultural | Free | `camera` | `clgphotograph.jpeg` |
| 10 | `codegolf` | Competitions | Free | `terminal` | `latenight-hackathon.jpeg` |
| 11 | `wellness-workshop` | Workshops | Free | `heart` | `yogamat.jpg` |
| 12 | `esports-showdown` | Sports | ₹149/team | `gamepad` | `esports.jpg` |

Add a new event by pushing one object — `events.html` counters, `categories.html` counts, `event-details.html`, and related logic pick it up automatically.

---

## 8. Key Scripts

| Script | Global API | Storage |
|--------|-----------|--------|
| `auth.js` | `registerUser({name,email,password})`, `loginUser({email,password})`, `logoutUser()`, `getCurrentUser()`, `isLoggedIn()` | `eventsphere_users[]`, `eventsphere_session` |
| `main.js` | `showToast(msg, tone?)`, `getRegistrations()→string[]`, `isRegistered(id)→bool`, `toggleRegistration(id)→newBool` | `eventsphere_registrations[]` |
| `icons.js` | `ESIcon(name, size?)→svg string`, injects `#es-icon-sprite` | — |
| `captcha.js` | `initCaptcha(containerId)→{validate(), clearError(), showError(), regenerate()}` | — |
| `events.js` | `window.EVENTSPHERE_EVENTS` (12) | — |

`contact.html` also uses `localStorage: eventsphere_messages[]` for “Send a message”; `newsletter` toast is in-memory only.

---

## 9. Forms & Validation

- **signin/signup:** name/email/password, email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`, password ≥6, duplicate-email check, inline `.has-error` + `error-text`, captcha required (simple math), submit → `registerUser`/`loginUser` → toast → redirect.
- **contact:** name/email/subject (`select`: Registration help / Event info / Feedback / Technical / Other) / message ≥10 chars → inline validation → `eventsphere_messages` → success box + `showToast`; **no captcha** (removed per requirement).
- **newsletter (any page):** single email field, same regex → toast, button `Subscribed ✓` disabled 2.5s.

---

## 10. Campus Details (real, verified 2026-01)

> `contact.html:info-card + map-pin` now points to:

```
Chitkara University, Punjab
Chandigarh–Patiala National Highway (NH-64),
Village Jhansla, Tehsil Rajpura,
District Patiala, Punjab — 140401
```

Source: `chitkara.edu.in/rti` + `chitkara.edu.in/admissions/admission-helpline` (statutory address; also listed as NH-7). Map link: `https://maps.google.com/?q=Chitkara+University+Punjab+Jhansla+Rajpura` (label “Chitkara University, Rajpura — NH-64”). Visit Hours card: Mon–Sat 9–5 IST, Student Help Desk, Admin Block.

---

## 11. How to Run / Evaluate Quickly

1. Double-click `loading.html` — see the amber progress → auto-lands on `index.html`.
2. `index.html` → scroll Featured/Upcoming → click any `Register` or `Details` → `event-details.html?id=…`.
3. Try `events.html`: type `concert`, toggle `Technical`, change sort to `Popularity`, clear filters, observe `resultsCount`.
4. Without login: `Join` → toast “Please sign in” → `signin.html`. Create account at `signup.html` (solve captcha) → returns logged in, chip appears in nav (`avatar` initials). Then `Join`/`Register for this event` toggles.
5. Visit `categories.html?filter=…`, `about.html#team`, `contact.html` (fill form, check toast + map link).
6. No server needed; to serve properly: `npx serve .` or `python -m http.server` at the project root.

---

## 12. Professor Notes (FEE scope)

- **View + register only.** No route or UI lets users create/publish events; every “organize / publish / host your event / Become a Partner” string removed (`index:host`, `about:Organizer superpowers`, `contact:select`, amber partner card, FAQ, stats labels, meta descriptions). Events are curated by the university/college clubs.
- **Single-page spec for FEE:** pure HTML/CSS/JS, no React/build, no backend, no DB; persistence is `localStorage` only (easy to clear via DevTools → Application).
- **Accessibility:** `skip-link` (Tab → visible), semantic `main#main-content`, `header/nav/section/footer`, `aria-label`, `role=alert/status`, `aria-current=page` on active link, `prefers-reduced-motion` disables float/fill.
- **Responsiveness:** `980px` collapses `details-layout/about-grid/contact-layout` to 1col, `899px` toggles hamburger, `640px` single-column cards, `480px` single footer col; toast spans edge on mobile.

---

## 13. Conventions

- Filenames: lowercase, hyphens (`public-speaking.jpeg` was renamed from `public speaking.jpeg` to fix the broken image on `event-details.html:debate-cup`).
- Commits / file edits preserve window line endings; run `js/*` checks with `node --check js/<file>.js` (all 5 pass).
- Images should be ≥736 px wide, ideally 16:9 (`1200×675`+), centre-cropped; all current files in `images/` are JPEG 11–138 KB.

---

## 14. Limitations & Next Steps (not required for submission)

- Passwords stored plain in `localStorage` (demo only — would need hashing + backend).
- No real email/newsletter delivery; no protected routes.
- `eventsphere_registrations` is per-browser, not per-user; swapping users on same browser shares device registrations.
- Could add pagination for >100 events or skeleton loaders; could extract loading splash into `index.html` as an overlay instead of a separate `loading.html`.

---

*© 2026 EventSphere — built for academic purposes for FEE at Chitkara University, Punjab. Fonts via Google Fonts; palette/teal accents adapted for the dark theme.*
