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
(Libraries and versions: see `package.json`.) `cn` comes from the `cn` package, not a local util.
- **Hosting: Vercel** (project `siam-library`, functions in `sin1` via `vercel.json`),
  **Neon** Postgres project `siam-library-db-sg` (`ap-southeast-1`, via Vercel Marketplace;
  branch `main` = Production, branch `preview` = Preview env only), **Vercel Blob** private
  stores `siam-library-photos` (Production) and `siam-library-photos-preview` (Preview)

`.vercelignore` keeps `.env*`, `.pgdata`, `uploads` out of `vercel deploy` — its patterns are
root-anchored (`/uploads/`, not `uploads/` — that would also drop `src/app/api/uploads/`).

## Commands (Windows PowerShell)
```powershell
npm run db:start            # start local PostgreSQL (keep this window open)
npm run db:migrate          # create/apply migrations (dev)
npm run db:seed             # 18 demo books + demo logins (re-runnable)
npm run seed:bulk           # +2,000 fake books, LOCAL ONLY (refuses non-localhost); `-- 5000`, `-- --remove`
npm run build               # production build (must pass after every change)
npm run lint                # ESLint (next build no longer lints)
npm run test:e2e            # Playwright (needs db running + seeded; reuses :3000)
npm run user:create -- <email> <name> <ADMIN|STAFF>
npm run user:reset-2fa -- <email>   # lost phone: turns two-step login off for that account
docker compose up -d --build   # full stack on a server (see docs/DEPLOYMENT.md)
git push origin main           # deploys production (GitHub integration); vercel --prod = fallback
                               # production builds run `prisma migrate deploy` first (scripts/vercel-build.mjs)
```
Live-site operations (logs, env pull, migrating the live DB, E2E against live, Neon CLI): the
`live-ops` skill. `vercel env pull` only ever to a file OUTSIDE the repo — never into `.env.local`.
Commits must be authored by the GitHub account that owns the Vercel project (SUDARSUN-24),
or Vercel (Hobby) blocks the deployment — see docs/DEPLOYMENT.md §3.
Demo logins (LOCAL seed only): admin@library.siam.edu / SiamAdmin2026! · staff@library.siam.edu / SiamStaff2026!
Local admin also needs a code: seed sets its 2FA secret from `SEED_ADMIN_TOTP_SECRET` (.env, local only).
The live site uses the same emails with different random passwords — never write those
(or any 2FA secret) into a file.

## Coding rules
- Next 16: `params` / `searchParams` are Promises — always `await` them. Middleware is `src/proxy.ts`.
- Read `node_modules/next/dist/docs/` before using an unfamiliar Next API (see AGENTS.md).
- Server Components by default; `"use client"` only for interactivity (viewer, upload, selects).
- All DB access through `src/lib/db.ts` (single Prisma client). No raw SQL — the one exception
  is the search in `src/lib/search.ts` (pg_trgm operators), parameterized `Prisma.sql` only.
- Public catalogue: home = starting point (counts + 3 rows of 10); the full list is `/books`
  (filters/sort/page in the URL, src/lib/catalogue.ts), reused by `/shelf/[code]` and
  `/category/[slug]` via `loadCatalogue()` + `<CatalogueView>`. Load only one page (24) of books.
- Local Postgres (Windows build) makes trigrams from ASCII only → Thai typo tolerance works on
  Neon (Linux) but not locally; Thai still matches by substring everywhere.
- All UI strings live in `src/lib/dict.ts` (Thai + English; TS enforces both). Server code
  gets them via `getDict()`; client components get `t` as a prop or import `dictionaries`.
- Colours only as CSS variables in `globals.css` (one place; measured contrast ratios in its comment).
  Bright and light — NO dark backgrounds: Siam red `#c41e3a` / hover `#a3172f` (buttons, links,
  active, footer), sun `#f5b301` (badges, underline, dots — never text), soft tints for sections
  (`sun-soft` hero, `sky-soft`, `mint-soft`, `rose-soft`, `lilac-soft`; `page` behind catalogue
  cards), accent hues `hue-blue/orange/raspberry/teal/violet` for icons. White cards on top.
  Utilities: `section-title`, `surface`; `.on-color` = white focus outline (red footer). Shelf
  colours via `shelfInk()` (white text), `tint()` (light band), `readableOn()` (src/lib/colors.ts).
  Before/after screenshots: `docs/design/`.
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
- Migrations: Vercel PRODUCTION builds apply them automatically (scripts/vercel-build.mjs,
  set in vercel.json) before `next build` — so every migration must be backward-compatible
  with the code still running. Preview deploys don't migrate: `npm run db:deploy` on the
  Neon `preview` branch by hand.
- Prisma 7 has no `directUrl`: the CLI uses `DATABASE_URL_UNPOOLED ?? DATABASE_URL`
  (prisma.config.ts); the app uses the pooled `DATABASE_URL` (src/lib/db.ts).

## Security rules
- Every admin page calls `requireStaff()` / `requireAdmin()`; every Server Action calls
  `assertStaff()` (ADMIN-only actions: `assertStaff("ADMIN")`); route handlers use
  `getStaffUser()`. These re-read the user from the DB. The proxy redirect is NOT security.
- Staff pages are noindex: robots meta tag in the admin layouts + `X-Robots-Tag` and
  `Cache-Control: no-store` from src/proxy.ts for every `/admin/*` response.
- **Two-step login (TOTP)** is required for ADMIN (`TWO_FACTOR_REQUIRED_ROLES`): until it is
  on, `getStaffUser`/`assertStaff` refuse and `requireStaff` redirects to `/admin/security`
  (the only page allowed, via `requireStaffForSecurity`). Code check + its rate limit live in
  src/lib/two-factor.ts, called from `authorize()` after the password. TOTP secrets are
  encrypted with a key from `AUTH_SECRET` (src/lib/totp.ts).
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
- Never log passwords or session tokens. Never print a password in command output, and never
  pipe or pass one to a script: `npm run user:create` takes it only as hidden terminal input
  (refuses non-TTY stdin), so the OWNER runs it — give them the command (DEPLOYMENT.md §3).

## Current status
**All 6 phases complete + Phase 7: live on Vercel + Phase 8: catalogue for thousands of books**
(details and test results: docs/PLAN.md).
- 2026-11-18: brighter redesign of the public site (sunny hero with bookshelf illustration and
  3 steps, coloured section tints, red footer; no navy). Shelf colours A `#1f63d6`, B `#c2410c`,
  C `#c2185b` (data migrations `*_shelf_colours`, `*_bright_shelf_colours`).
  Book page: "Find it at" card + colourful detail tiles; catalogue: coloured filter groups, shelf
  letters, category icons (fixed colour per category: `categoryStyle()` in category-tile.tsx).
- 2026-11-15: `/books` catalogue (filters, sort, 24/page), category pages, home rows, pg_trgm
  search + live suggestions (`/api/suggest`). Playwright locally: 93 passed / 7 skipped.
  Migration `*_catalogue_search` (pg_trgm + indexes) applied to Neon preview + main.
- 2026-11-15: two-step login (TOTP) live. Staff area at the fixed `/admin` (login
  `/admin/login`, linked from the public footer). The secret-path experiment (`ADMIN_PATH`)
  was removed again. Playwright 66 tests locally: 62 passed / 4 skipped.
- Last full live Playwright run was before `/admin` came back (65/5 of 70); it needs the
  live passwords (owner only). The add-book test skips on live until the admin's 2FA
  secret is available (it is on the owner's phone).

Known gaps / not verified:
- Docker images were never built or run (Docker not installed on the dev PC).
- Only emulated phones tested; QR stickers not printed on real paper.
- No web UI for staff accounts (use `npm run user:create`).
- Book-form validation messages are translated (zod issues → `dict.ts`, forms `noValidate`).
- End-of-preview text says the counter is on the ground floor — placeholder; confirm with the library.
- Footer contact (university address) and e-resource links (ThaiLIS, ThaiJO, Google Scholar) are
  placeholders chosen for the redesign — confirm with the library.
