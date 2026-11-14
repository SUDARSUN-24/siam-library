# Siam University Library — Book Preview

@AGENTS.md

## Project summary
A demo website for Siam University Library. Students browse books online, read a short
5–10 page preview (cover, table of contents, introduction), check whether a copy is on the
shelf, then borrow it in person at the library counter. Library staff log in to add books,
upload photos of preview pages, and mark books borrowed / returned. Every book and shelf
has a QR code that opens its page — most students arrive from a QR scan on their phone.

Student: Sudasun, B.Sc. Information Technology, Siam University (university project).

## Tech stack
- Next.js 16 (App Router, Turbopack, `src/` dir) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (radix-nova style, lucide icons)
- PostgreSQL + Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg` driver adapter)
- Auth.js v5 (`next-auth@5 beta`) — Credentials provider, JWT session, bcrypt hashes (`bcryptjs`)
- sharp (resize + WebP), `qrcode` (SVG QR codes), zod (validation)
- Playwright (end-to-end tests)
- Docker + docker-compose (app + postgres) for the university server
- Local dev database: `embedded-postgres` (real PostgreSQL binaries from npm — no admin install, no Docker needed)

## Folder structure
```
prisma/              schema.prisma, migrations/, seed.ts, seed-data.ts
scripts/             dev-db.ts (starts embedded PostgreSQL on port 5433)
src/app/             routes (App Router)
  page.tsx           home: search, shelves, filters, book grid
  book/[code]/       book page + preview viewer
  shelf/[code]/      shelf page
  admin/             staff area (login required)
  api/               route handlers (uploads, served images)
src/components/      UI components (ui/ = shadcn)
src/lib/             db, auth, validation, i18n, config, qr, rate-limit, uploads
tests/               Playwright tests
uploads/             uploaded preview photos (git-ignored, Docker volume)
docs/                PLAN.md, DEPLOYMENT.md, STAFF_GUIDE.md
```

## Commands (Windows PowerShell)
```powershell
npm install                 # install dependencies
npm run db:start            # start local PostgreSQL (keep this window open)
npm run db:migrate          # apply migrations (dev)
npm run db:seed             # load 18 demo books + demo logins
npm run dev                 # http://localhost:3000
npm run build               # production build (must pass after each phase)
npm run lint                # ESLint (next build no longer lints)
npm run test:e2e            # Playwright tests (needs db running + seeded)
docker compose up -d --build   # full stack on a server
```

## Coding rules
- Next 16: `params` / `searchParams` are Promises — always `await` them. `middleware.ts` is now `src/proxy.ts`.
- Read `node_modules/next/dist/docs/` before using an unfamiliar Next API (see AGENTS.md).
- Server Components by default; add `"use client"` only for interactivity (viewer, upload, toggles).
- All DB access through `src/lib/db.ts` (single Prisma client). No raw SQL except search.
- All UI strings come from `src/lib/i18n.ts` (Thai + English). Never hard-code one language.
- Colours/fonts via CSS variables in `globals.css` — off-white `#f5f2ec`, ink `#1d2433`, crimson `#9b1c2e`.
- Mobile-first: design at 375 px, then widen.
- Keep components small; shared helpers in `src/lib/`.

## Security rules
- Every admin page calls `requireStaff()` / `requireAdmin()` on the server; every admin
  Server Action and admin route handler checks again — the proxy redirect is only a convenience.
- Validate every input with zod (`src/lib/validation.ts`) before touching the DB.
- Login is rate-limited (`src/lib/rate-limit.ts`): 5 attempts / 15 min per IP + email.
- Uploads: images only (checked by sharp decoding, not just MIME), max 10 MB, max 10 pages
  per book, re-encoded to WebP, random filenames (`crypto.randomUUID`), stored outside `public/`.
- Secrets only in `.env` (git-ignored). `.env.example` lists every variable with dummy values.
- Security headers set in `next.config.ts` (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- Who may read previews is decided in ONE place: `canViewPreview()` in `src/lib/access.ts`,
  driven by the `PREVIEW_ACCESS` setting (`public` now; `students` later).
- Never log passwords or session tokens.

## Current status
Phase 4 complete — staff login (Auth.js credentials, JWT 8 h, rate-limited), `/admin`
books list with one-click borrowed/returned, add/edit book, page photo upload/reorder/delete
(`POST /api/admin/books/[id]/pages`, one file per request), delete book (ADMIN only).
Student pages from Phase 3 are done. Docker files are written but NOT tested on this
machine (no Docker installed). Next: Phase 5 (QR sheet, security headers, polish).

Auth layout: `src/auth.ts` (Auth.js config), `src/lib/auth-session.ts` (`requireStaff`,
`requireAdmin`, `assertStaff` for actions, `getStaffUser` for route handlers),
`src/proxy.ts` (cookie-only redirect, not a security boundary).

Notes:
- Prisma 7: client is generated to `src/generated/prisma` (git-ignored); import from
  `@/generated/prisma/client`. Config lives in `prisma.config.ts` (seed command too).
- Text page markup is documented at the top of `prisma/seed.ts` and `src/components/page-text.tsx`.
- `cacheComponents` / `partialPrefetching` are OFF in next.config.ts on purpose: every
  page reads the language cookie and live loan status, so all routes render dynamically.
- Thai typography: never use letter-spacing or `text-align: justify` on Thai. Use the
  `eyebrow` and `prose-justify` utilities (globals.css) — they only apply to `:lang(en)`.
- Grids that hold horizontally-scrolling children need `grid-cols-[minmax(0,1fr)]` /
  `min-w-0`, or the page overflows on phones.
- `NEXT_PUBLIC_SITE_URL` is read on the server only (QR codes), so it can be changed at
  runtime without rebuilding.
