# Peluquer-aPaola Web

Landing page + slot-booking system for **Paola Peluquería**, a hair salon in Torrejón del Rey, Guadalajara, Spain. Spanish-language, local-SEO-focused.

## Booking system

| File | Role |
|------|------|
| `booking.html` | 4-step booking page (service → date → slot → confirm) |
| `apps-script.js` | Google Apps Script backend — copy-paste into script.google.com |

**Flow:** client picks a service, picks a date, picks a 1-hour slot → enters name → slot is created in Paola's Google Calendar → WhatsApp opens with a pre-filled confirmation message.

**Backend:** Google Apps Script Web App deployed on Paola's Google account (free tier). Exposes two GET endpoints:
- `?action=slots&date=AAAA-MM-DD` → available slots for that day
- `?action=book&date=...&time=...&service=...&name=...` → creates a Calendar event and blocks the slot

**Wiring:** set `GAS_URL` in `booking.html` line ~`const GAS_URL = ''` to the deployed Web App URL. Until then the page shows static slots (no real-time availability check).

**Owner alerts:** the script must be deployed **under Paola's Google account** ("execute as me") so events land on her calendar. Set `OWNER_EMAIL` (and optionally `CALENDAR_ID`) in `apps-script.js`. On each booking it (1) creates the Calendar event, (2) adds popup reminders, and (3) emails Paola — Google does NOT push-notify the owner for events its own script creates, so the email is what reaches her phone.

**Entry points:** the header/sticky/final "Reservar cita" buttons in `index.html` link to `booking.html`; the WhatsApp/phone CTAs stay as-is.

**Schedule hardcoded in both files:**
- Mon–Fri: 10:00–14:00 and 16:00–20:00 (1-hour slots: 10, 11, 12, 13, 16, 17, 18, 19)
- Saturday: 10:30–14:00 (slots: 10:30, 11:30, 12:30)
- Sunday: closed

## Tech Stack

- Pure HTML5, CSS3, and vanilla JavaScript (ES6+) — no framework, no library
- No package manager, no build step, no npm scripts
- Google Fonts via CDN (Cormorant Garamond + Inter)
- All images embedded as inline base64 data URIs — no external image files
- Schema.org JSON-LD (`HairSalon`) + Open Graph meta tags for SEO

## Running / Developing

No build step required. Open the HTML file directly in a browser:

```bash
# Quick local preview (Python)
python3 -m http.server 8080
# then open http://localhost:8080/index.html  (booking at /booking.html)
```

Or just drag `index.html` into a browser tab.

> **Note:** `index.html` is the canonical, deployed file (Netlify publishes the repo root). A stale `index(4).html` duplicate used to exist — it was removed to avoid editing the wrong file.

## Deployment

Drop `index.html` on any static host (Netlify, GitHub Pages, shared hosting). No build pipeline needed — the file is fully self-contained.

## Testing

No test framework exists. Test manually:

1. Open in browser and scroll through all sections
2. Check mobile at **680px** breakpoint (burger menu, stacked grids)
3. Check tablet at **980px** breakpoint (two-column layouts collapse)
4. Verify FAQ accordion expands/collapses correctly
5. Verify scroll-reveal animations fire on first scroll into view
6. Verify all WhatsApp links open with correct pre-filled message
7. Enable "prefers-reduced-motion" in OS settings — all animations must disable

## Architecture

The landing page lives in **one file**: `index.html` (~775 lines, ~4.3 MB — large due to base64 images). The booking flow lives in `booking.html` + `apps-script.js` (see Booking system above).

### Section map

| Lines | ID | Content |
|-------|----|---------|
| 1–36 | — | `<head>`: meta, OG tags, JSON-LD structured data, Google Fonts |
| 41–386 | — | `<style>`: all CSS |
| 390–411 | `#header` | Sticky nav with burger menu |
| 412–441 | `#inicio` | Hero — h1, CTA buttons, trust badges |
| 442–476 | `#beneficios` | Benefit cards |
| 477–522 | `#servicios` | Service grid + chip tags |
| 523–542 | `#resultados` | Photo gallery |
| 543–571 | `#proceso` | Step-by-step how-it-works |
| 572–594 | `#salon` | Owner bio (Paola Morán Palan) |
| 595–631 | `#faq` | FAQ accordion |
| 632–681 | `#horario` | Hours + location map |
| 682–705 | `#reservar` | Final CTA section |
| 706–735 | — | Footer (3-column grid) |
| 736–743 | — | Sticky mobile WhatsApp bar |
| 744–770 | — | `<script>`: all JavaScript |

### JavaScript (lines 744–770)

All JS is inline at the bottom of `<body>`, no external file:

- **Dynamic year:** `document.getElementById('yr').textContent = new Date().getFullYear()`
- **Scroll nav:** toggles `.scrolled` on `#header` after 40px scroll
- **Burger menu:** toggles `.open` on nav; closes on any anchor click
- **FAQ accordion:** `querySelectorAll('.faq-item')` — expand one, collapse others via `maxHeight`
- **Scroll-reveal:** `IntersectionObserver` at `threshold: 0.12` adds `.in` to `.reveal` elements

## Coding Conventions

### CSS

- **Custom properties** defined in `:root` — always use vars for color/spacing:
  - `--ink` (`#0E0C10`) — background
  - `--copper` (`#C08552`) — primary accent
  - `--plum` (`#6B4E8C`) — secondary accent
  - `--cream` — light text/background tones
  - `--maxw: 1180px`, `--r` (border-radius)
- **Layout:** CSS Grid throughout; `.wrap` centers content (`max-width: var(--maxw); margin: 0 auto; padding: 0 22px`)
- **Naming:** component-style flat classes — `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-wa`, `.bcard`, `.svc`, `.chip`, `.faq-item`
- **Two breakpoints only:** `@media(max-width:980px)` and `@media(max-width:680px)`
- **Accessibility:** always include `@media(prefers-reduced-motion:reduce)` when adding animations

### HTML

- Semantic elements: `<header>`, `<nav>`, `<section>`, `<footer>`, `<article>`
- Section IDs match nav anchor links (`#inicio`, `#servicios`, etc.)
- All copy is in Spanish

### Booking links

All CTAs use WhatsApp deep links:
```html
<a href="https://wa.me/34642078029?text=Hola%2C%20quiero%20reservar%20cita">...</a>
```
Never add a different booking system without confirming with the owner.

### Adding images

Images are base64-encoded and inlined directly in `<img src="data:image/jpeg;base64,...">`. To add a new image, convert it to base64 and inline it — do not add external image files or `<img src="./images/...">` references, as there is no asset pipeline.
