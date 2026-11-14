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
- [ ] Playwright: search, open book, flip pages, staff login, add book
- [ ] Finish DEPLOYMENT.md and STAFF_GUIDE.md
- [ ] Write REPORT.md
- [ ] `npm run build` passes, commit
