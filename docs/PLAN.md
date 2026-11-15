# Build plan — Siam University Library Book Preview

## Phase 1 — Folder, git, CLAUDE.md, docs outline
- [x] Create `C:\Projects\siam-library` with Next.js (App Router, TypeScript, Tailwind)
- [x] Initialise shadcn/ui and add base components
- [x] Install Prisma, Auth.js, zod, sharp, qrcode, bcryptjs, Playwright, embedded-postgres
- [x] Write CLAUDE.md, docs/PLAN.md, docs/DEPLOYMENT.md, docs/STAFF_GUIDE.md outlines
- [x] `npm run build` passes, commit

## Phase 2 — Database, Docker, seed
- [x] Prisma schema: Shelf, Book, PreviewPage, User (+ enums)
- [x] Local PostgreSQL via embedded-postgres (`npm run db:start`, UTF-8 cluster)
- [x] First migration
- [x] Seed: 3 shelves, 18 books (6 per shelf, 6 Thai + 12 English), 7 text pages each, 4 borrowed
- [x] Seed: 1 admin + 1 staff demo account
- [x] Dockerfile + docker-compose.yml (app + postgres) + .env.example
- [x] `npm run build` passes, commit

## Phase 3 — Student pages
- [x] Layout, fonts (IBM Plex Sans Thai, Noto Serif Thai), colours
- [x] Generated book covers
- [x] Home: search (title, author, ISBN, contents), shelf cards, filters, book grid
- [x] Book page: cover, status + due date, location, details, page viewer
- [x] Viewer: prev/next, arrow keys, swipe, thumbnails, end page
- [x] Shelf page
- [x] Checked at 390 px and 1360 px (fixed mobile overflow, Thai letter-spacing and justification)
- [x] `npm run build` passes, commit

## Phase 4 — Staff login and admin
- [x] Auth.js credentials login (bcrypt), JWT session with role
- [x] Server-side role checks on every admin page and action (user re-read from DB)
- [x] Books list with one-click borrowed / returned (+14 days)
- [x] Add / edit book form (zod), next free code suggested per shelf
- [x] Preview photo upload (phone camera or gallery), reorder, delete; WebP compression
- [x] Delete book — ADMIN role only
- [x] Login rate limit (done here, inside `authorize()`)
- [x] Checked in a headless browser: wrong password, login, toggle, add book, upload, fake image rejected
- [x] `npm run build` passes, commit

## Phase 5 — QR codes, Thai/English, security, mobile polish
- [x] QR code on book and shelf pages; printable A4 sticker sheet (`/admin/qr`), localhost warning
- [x] Thai / English toggle across all pages (cookie, works without JS)
- [x] Security headers + nonce-based CSP (proxy), PREVIEW_ACCESS checked in `canViewPreview()`
- [x] Verified on the production build: headers, CSP (no violations), students-only mode locks text + photos (403), path traversal → 404
- [x] Mobile polish: site icon, card photo covers respect PREVIEW_ACCESS, print layout
- [x] `npm run build` passes, commit

## Phase 6 — Tests and final docs
- [x] Playwright: search, open book, flip pages (incl. swipe), staff login, rate limit, borrow/return, add book + photos, QR sheet, security
- [x] 56 tests (desktop + mobile): 53 passed, 3 skipped by design — run twice, repeatable
- [x] Login limiter fixed: counts failures only; per-email limit that can't be bypassed
- [x] `npm run user:create` script for real staff accounts / password resets
- [x] Finish DEPLOYMENT.md and STAFF_GUIDE.md, README.md
- [x] Write REPORT.md
- [x] `npm run build` passes, commit

## Phase 7 — Deploy on Vercel
- [x] Neon Postgres via Vercel Marketplace; pooled URL for the app, direct URL for Prisma CLI (`prisma.config.ts`)
- [x] `PhotoStorage` interface: disk (local/Docker) + private Vercel Blob (when `BLOB_READ_WRITE_TOKEN` is set)
- [x] Login rate limiter moved to the database (`LoginThrottle`)
- [x] Browser compresses photos below 4 MB on Vercel (4.5 MB body limit); test with a >4.5 MB photo
- [x] `.vercelignore`; production env vars (new AUTH_SECRET, site URL); migrate + seed Neon with new passwords
- [x] `vercel --prod`; NEXT_PUBLIC_SITE_URL set to the real URL and redeployed (QR codes → live site)
- [x] Playwright against the live site: 53 passed, 3 skipped; test data removed
- [x] DEPLOYMENT.md §3, REPORT.md §7, CLAUDE.md updated

## Phase 8 — Catalogue for thousands of books (2026-11-15)
- [x] Home is a starting point: hero search, shelf cards and category tiles with counts, three
      sideways rows of up to 10 books (New arrivals, Available now, Thai books) with "See all →"
- [x] `/books` catalogue: filters (shelf, category, language, available only) in a sidebar /
      bottom sheet on phones, sort (best match, shelf order, title, newest), 24 per page with
      page numbers; everything in the URL. Old `/?q=…&shelf=…` links redirect there
- [x] `/shelf/[code]` and new `/category/[slug]` reuse the catalogue layout (shelf keeps row headings)
- [x] Search in Postgres: each word must match title / other title / author / publisher /
      category (also by its Thai name) / code / ISBN / preview text; typo tolerance with pg_trgm
      (`<%`, threshold 0.45); GIN trigram indexes + B-tree indexes for every browse order
- [x] Live suggestions under the search bar (`/api/suggest`, top 5, after 2 characters,
      200 ms debounce, ARIA combobox: ↑/↓, Enter, Esc)
- [x] `npm run seed:bulk` — fake books for LOCAL load tests; refuses any non-localhost database
- [x] Load test, 5,000 books, production build on the dev PC: home 55 ms, `/books` and
      shelf/category pages 15–25 ms, full searches ~70 ms, suggestions ~40 ms
- [x] Playwright locally: 93 passed, 7 skipped (Thai typo test runs only against the live site)
- Known: the Windows Postgres of `npm run db:start` builds trigrams from ASCII only, so Thai
  typo tolerance is verified on Neon (probe: `ฐานข้อมุล` ≈ `ฐานข้อมูล`, similarity 0.5), not locally

## Not done / not verified
- [ ] Build and run the Docker images on the university server (no Docker on the dev PC)
- [ ] Connect the Git repository to Vercel (automatic deploys); separate DB branch for preview deploys
- [ ] Test on real phones and print stickers on real A4 label paper
- [ ] Staff account management page (CLI script only)
- [ ] Thai translations for form validation messages
