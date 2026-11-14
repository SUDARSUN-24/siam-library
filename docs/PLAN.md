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
- [ ] Layout, fonts (IBM Plex Sans Thai, Noto Serif Thai), colours
- [ ] Generated book covers
- [ ] Home: search (title, author, ISBN, contents), shelf cards, filters, book grid
- [ ] Book page: cover, status + due date, location, details, page viewer
- [ ] Viewer: prev/next, arrow keys, swipe, thumbnails, end page
- [ ] Shelf page
- [ ] `npm run build` passes, commit

## Phase 4 — Staff login and admin
- [ ] Auth.js credentials login (bcrypt), JWT session with role
- [ ] Server-side role checks on every admin page and action
- [ ] Books list with one-click borrowed / returned (+14 days)
- [ ] Add / edit book form (zod)
- [ ] Preview photo upload (phone camera), reorder, delete; WebP compression
- [ ] `npm run build` passes, commit

## Phase 5 — QR codes, Thai/English, security, mobile polish
- [ ] QR code on book page; printable sticker sheet for books and shelves
- [ ] Thai / English toggle across all pages
- [ ] Login rate limit, security headers, PREVIEW_ACCESS setting
- [ ] Mobile polish
- [ ] `npm run build` passes, commit

## Phase 6 — Tests and final docs
- [ ] Playwright: search, open book, flip pages, staff login, add book
- [ ] Finish DEPLOYMENT.md and STAFF_GUIDE.md
- [ ] Write REPORT.md
- [ ] `npm run build` passes, commit
