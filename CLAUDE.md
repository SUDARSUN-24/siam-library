# Siam University Library — Book Preview

@AGENTS.md

## Project summary
A demo website for Siam University Library. Students browse books online, read a short
5–10 page preview (cover, table of contents, introduction), check whether a copy is on the
shelf, then borrow it in person at the library counter. Library staff log in to add books,
upload photos of preview pages, and mark books borrowed / returned. Every book and shelf
has a QR code that opens its page — most students arrive from a QR scan on their phone.

Student: Sudasun, B.Sc. Information Technology, Siam University (university project).

**Live site (main target): https://siam-library.vercel.app** — Vercel (`sin1` Singapore) +
Neon Postgres (Singapore) + private Vercel Blob. GitHub `SUDARSUN-24/siam-library` is
connected: push to `main` = production deploy, other branches = preview deploys (own Neon
branch + own Blob store). Local dev must keep working too. See docs/DEPLOYMENT.md §3.

## Tech stack
- Next.js 16 (App Router, Turbopack, `src/` dir) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (radix-nova style, lucide icons; `cn` from the `cn` package)
- PostgreSQL + Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg` driver adapter)
- Auth.js v5 (`next-auth@5 beta`) — Credentials provider, JWT session (8 h), bcrypt (`bcryptjs`)
- sharp (verify + resize + WebP), `qrcode` (SVG QR codes), zod (validation)
- Playwright (end-to-end tests, desktop Chrome + Pixel 7)
- **Hosting: Vercel** (project `siam-library`, functions in `sin1` via `vercel.json`),
  **Neon** Postgres project `siam-library-db-sg` (`ap-southeast-1`, via Vercel Marketplace;
  branch `main` = Production, branch `preview` = Preview env only), **Vercel Blob** private
  stores `siam-library-photos` (Production) and `siam-library-photos-preview` (Preview)
- Docker + docker-compose (app + postgres) — alternative for a university server
- Local dev database: `embedded-postgres` (real PostgreSQL from npm — no install, no Docker)

## Folder structure
```
prisma/                    schema.prisma, migrations/, seed.ts, seed-data.ts (18 books)
scripts/dev-db.ts          local PostgreSQL on port 5433 (UTF-8), data in .pgdata/
scripts/create-user.ts     create staff account / reset password (asks for password)
src/auth.ts                Auth.js config (login, rate limit, role in JWT)
src/proxy.ts               per-request CSP nonce + cookie-only /admin redirect
src/app/
  (site)/                  public: page.tsx (home), book/[code], shelf/[code]
  admin/login/             login page + action
  admin/(panel)/           staff pages (layout calls requireStaff): books, books/new,
                           books/[id], qr
  admin/actions.ts         staff Server Actions (toggle, save, delete, pages)
  actions/locale.ts        language toggle
  api/admin/books/[id]/pages   photo upload (one file per POST)
  api/uploads/[file]       serves photos from storage — disk or private Blob (access-checked)
  api/auth/[...nextauth]   Auth.js
src/components/            book-cover, preview-viewer, page-text, admin/*, ui/ (shadcn)
src/lib/                   db, auth-session (guards), access (PREVIEW_ACCESS), validation,
                           dict (all strings), i18n (locale cookie), books (queries),
                           config, qr, uploads (sharp), storage (disk | Vercel Blob),
                           rate-limit (DB table LoginThrottle), admin-data
tests/                     Playwright specs + helpers
uploads/                   page photos when Blob is not used (git-ignored; Docker volume)
.vercelignore              keeps .env*, .pgdata, uploads out of `vercel deploy` (root-anchored!)
docs/                      PLAN.md, DEPLOYMENT.md, STAFF_GUIDE.md;  REPORT.md at root
```

## Commands (Windows PowerShell)
```powershell
npm install                 # install dependencies (runs prisma generate)
npm run db:start            # start local PostgreSQL (keep this window open)
npm run db:migrate          # create/apply migrations (dev)
npm run db:seed             # 18 demo books + demo logins (re-runnable)
npm run dev                 # http://localhost:3000
npm run build               # production build (must pass after every change)
npm run lint                # ESLint (next build no longer lints)
npm run test:e2e            # Playwright (needs db running + seeded; reuses :3000)
npm run user:create -- <email> <name> <ADMIN|STAFF>
docker compose up -d --build   # full stack on a server (see docs/DEPLOYMENT.md)

# Vercel (CLI is installed globally and logged in; project already linked in .vercel/)
git push origin main           # deploys production (GitHub integration); vercel --prod = fallback
vercel logs --environment production --since 15m
vercel env pull <file OUTSIDE the repo> --environment production --yes   # never into .env.local
npm run db:deploy              # with DATABASE_URL(_UNPOOLED) from Neon loaded → migrate live DB
$env:E2E_BASE_URL="https://siam-library.vercel.app"; npm run test:e2e   # + SEED_* = live logins
# Neon CLI (`neon`, signed in): always pass the org/project
neon branches list --org-id org-noisy-wave-22191063 --project-id cool-poetry-70535299
```
Commits must be authored by the GitHub account that owns the Vercel project (SUDARSUN-24),
or Vercel (Hobby) blocks the deployment — see docs/DEPLOYMENT.md §3.
Demo logins (LOCAL seed only): admin@library.siam.edu / SiamAdmin2026! · staff@library.siam.edu / SiamStaff2026!
The live site uses the same emails with different random passwords — never write those into a file.

## Coding rules
- Next 16: `params` / `searchParams` are Promises — always `await` them. Middleware is `src/proxy.ts`.
- Read `node_modules/next/dist/docs/` before using an unfamiliar Next API (see AGENTS.md).
- Server Components by default; `"use client"` only for interactivity (viewer, upload, selects).
- All DB access through `src/lib/db.ts` (single Prisma client). No raw SQL.
- All UI strings live in `src/lib/dict.ts` (Thai + English; TS enforces both). Server code
  gets them via `getDict()`; client components get `t` as a prop or import `dictionaries`.
- Colours as CSS variables in `globals.css` — off-white `#f5f2ec`, ink `#1d2433`, crimson `#9b1c2e`.
- Mobile-first: check at 390 px. Grids holding horizontally-scrolling children need
  `grid-cols-[minmax(0,1fr)]` / `min-w-0`, or the page overflows on phones.
- Thai typography: never letter-space or justify Thai. Use the `eyebrow` and `prose-justify`
  utilities (they only apply to `:lang(en)`); give book text the book's own `lang`.
- `cacheComponents` / `partialPrefetching` are OFF on purpose: every page reads the
  language cookie and live loan status, so all routes render dynamically.
- Prisma 7: client generated to `src/generated/prisma` (git-ignored); import from
  `@/generated/prisma/client`. Config in `prisma.config.ts` (seed command too).
- Text page markup (`#`, `##`, `###`, `>`, `toc: Title::page`) is documented in
  `src/components/page-text.tsx`.
- After adding routes, `npx next typegen` refreshes `PageProps`/`RouteContext` types.
- If the dev server reports "X is not a function" after editing a module, restart it (stale HMR).
- Prisma 7 `migrate dev` does NOT regenerate the client — run `npx prisma generate` after it.
- Nothing may depend on local disk or long-running processes (Vercel is serverless):
  photos go through `storage` (src/lib/storage.ts), shared state goes in the database.
- Prisma 7 has no `directUrl`: the CLI uses `DATABASE_URL_UNPOOLED ?? DATABASE_URL`
  (prisma.config.ts); the app uses the pooled `DATABASE_URL` (src/lib/db.ts).

## Security rules
- Every admin page calls `requireStaff()` / `requireAdmin()`; every Server Action calls
  `assertStaff()` (ADMIN-only actions: `assertStaff("ADMIN")`); route handlers use
  `getStaffUser()`. These re-read the user from the DB. The proxy redirect is NOT security.
- Validate every input with zod (`src/lib/validation.ts`) before touching the DB.
- Login rate limit (in `authorize()`, failures only, 15 min): 5 per email+IP, 10 per email
  (any IP — cannot be bypassed by forging X-Forwarded-For), 50 per IP. Stored in the
  database (`LoginThrottle`) so it holds across serverless instances.
- Uploads: must decode with sharp (MIME not trusted), ≤10 MB, ≤10 pages/book, re-encoded to
  WebP (strips EXIF/GPS), random `uuid.webp` names, stored outside `public/` (disk) or in the
  PRIVATE Blob store as `pages/<uuid>.webp`, served only through `/api/uploads/[file]`
  (access-checked) which accepts only `uuid.webp` names. On Vercel (request body ≤4.5 MB)
  the browser compresses each photo below 4 MB (`config.clientUploadBytes`).
- Secrets only in `.env` / `.env.local` (git-ignored) and Vercel env vars. `.env.example`
  lists every variable with dummy values.
- CSP with per-request nonce in `src/proxy.ts` (never add inline `<script>`; inline
  `style=` is allowed). Other headers (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, HSTS on https) in `next.config.ts`.
- Who may read previews is decided in ONE place: `canViewPreview()` in `src/lib/access.ts`
  (`PREVIEW_ACCESS` = `public` now; `students` later). Anything showing page text or
  photos — including book cards — must call it.
- Never log passwords or session tokens.

## Current status
**All 6 phases complete + Phase 7: live on Vercel** (see docs/PLAN.md).
- Live: https://siam-library.vercel.app — Playwright against it (2026-11-15): 55 passed, 3 skipped.
- Student pages, staff admin, uploads, QR sheet, Thai/English, security headers done.
- Playwright: 58 tests (29 × desktop + mobile) → 55 passed, 3 skipped by design; repeatable.
- GitHub auto-deploy verified (commit 26ffa17 deployed itself); preview deploys use the
  Neon `preview` branch (verified) and the preview Blob store.
- Docs: DEPLOYMENT.md, STAFF_GUIDE.md, REPORT.md written.

Known gaps / not verified:
- Docker images were never built or run (Docker not installed on the dev PC).
- Only emulated phones tested; QR stickers not printed on real paper.
- No web UI for staff accounts (use `npm run user:create`).
- Book-form validation messages are translated (zod issues → `dict.ts`, forms `noValidate`).
- End-of-preview text says the counter is on the ground floor — placeholder; confirm with the library.
