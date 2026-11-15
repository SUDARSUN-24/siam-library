# Deployment — Siam University Library Book Preview

**Live site:** https://siam-library.vercel.app (Vercel `sin1` + Neon Postgres Singapore +
Vercel Blob; deploys automatically from GitHub `main`, see §3).
Local development (§1) still works exactly as before; Docker (§4) is the self-hosted alternative.

## 1. Run locally (Windows, PowerShell)

Requirements: **Node.js 20.9+** (developed on Node 26) and Git. No PostgreSQL or Docker
install is needed for local development — `npm run db:start` runs a real PostgreSQL
server from the `embedded-postgres` npm package.

```powershell
cd C:\Projects\siam-library
npm install
Copy-Item .env.example .env        # first time only — then edit .env (see section 2)

# Window 1 — database (leave it open)
npm run db:start                   # PostgreSQL on localhost:5433, data in .\.pgdata

# Window 2 — app
npm run db:migrate                 # first time / after schema changes
npm run db:seed                    # 18 demo books + demo logins (safe to re-run)
npm run dev                        # http://localhost:3000
```

Production-mode build on your PC: `npm run build` then `npm start`.

To try the site on a phone on the same Wi-Fi, open `http://<your-PC-IP>:3000`
(the IP is printed by `npm run dev` as "Network"). For QR codes to work on phones, set
`NEXT_PUBLIC_SITE_URL` to that address and restart.

### Run the tests
```powershell
npx playwright install chromium    # first time only
npm run test:e2e                   # needs db:start running and the seed loaded
```

## 2. Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/siam_library` | PostgreSQL connection used by the app (docker-compose builds its own; on Vercel the **pooled** Neon URL) |
| `DATABASE_URL_UNPOOLED` | *(Vercel/Neon only)* | **Direct** Neon connection used by Prisma CLI (`migrate deploy`). Unset locally → falls back to `DATABASE_URL` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `library` / *strong password* / `siam_library` | Database account created by docker-compose |
| `AUTH_SECRET` | 32+ random characters | Signs staff login sessions. Generate: `npx auth secret` |
| `AUTH_TRUST_HOST` | `true` | Needed behind Docker / a reverse proxy |
| `NEXT_PUBLIC_SITE_URL` | `https://library.siam.edu` | Address printed inside QR codes; also turns on HSTS / secure cookies when `https://`. **Set before printing stickers.** `NEXT_PUBLIC_*` values are baked in at build time — after changing it, rebuild (Docker) or redeploy (Vercel) |
| `PREVIEW_ACCESS` | `public` | `public` = anyone can read previews; `students` = signed-in users only (see §7) |
| `UPLOAD_DIR` | `./uploads` | Folder for page photos (outside `public/`) when Blob is not used |
| `BLOB_READ_WRITE_TOKEN` | *(Vercel only)* | When set, page photos go to the **private** Vercel Blob store instead of `UPLOAD_DIR` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | | Only used by `npm run db:seed` |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | | Only used by `npm run db:seed` |

`.env` and `.env.local` are git-ignored (and excluded from `vercel deploy` by `.vercelignore`).
Never commit real secrets.

> `vercel link` / `vercel env pull` write a `.env.local`. Next.js loads `.env.local` **over**
> `.env`, so never pull Production values into it — local dev would then use the live
> database. Pull them to a file outside the project when you need them (see §3).

## 3. Deploying on Vercel

This is how the live site https://siam-library.vercel.app runs.

| Piece | Service | Notes |
|---|---|---|
| App | Vercel (Next.js, serverless functions in `sin1` / Singapore — `vercel.json` `regions`) | Project `siam-library`; build = `next build`, `postinstall` runs `prisma generate` |
| Source | GitHub `SUDARSUN-24/siam-library`, connected to the Vercel project | Push to `main` → production deploy; any other branch → preview deploy |
| Database | **Neon** project `siam-library-db-sg` (free plan, `ap-southeast-1` / Singapore), added through the Vercel Marketplace | Branch `main` = production. Same region as `sin1`, so each query is fast |
| Preview database | Neon branch **`preview`** (child of `main`) | Its URLs are set for the Vercel **Preview** environment only |
| Page photos | **Vercel Blob**, store `siam-library-photos` (Production) and `siam-library-photos-preview` (Preview), both **private**, `sin1` | Not reachable by URL — served only through `/api/uploads/[file]` after `canViewPreview()` |
| Rate limit | `LoginThrottle` table in Neon | Works across serverless instances |

The site first ran in `iad1` with a `us-east-1` database; it was moved to Singapore
(new Neon project in `ap-southeast-1`, `regions: ["sin1"]`) because the users are in Thailand.

### What changed in the code for Vercel
- **Database URLs.** The app connects with the pooled `DATABASE_URL`. Prisma CLI uses
  `DATABASE_URL_UNPOOLED` (direct) through `prisma.config.ts`. Prisma 7 removed
  `directUrl` from `schema.prisma`; the config file's `datasource.url` replaces it.
- **Photo storage** (`src/lib/storage.ts`): one `PhotoStorage` interface, two
  implementations — local disk (`UPLOAD_DIR`) and private Vercel Blob (`pages/<uuid>.webp`),
  chosen by whether `BLOB_READ_WRITE_TOKEN` is set. sharp still verifies and re-encodes
  every photo to WebP before it is stored.
- **Upload size.** Vercel rejects request bodies over 4.5 MB. On Vercel the browser
  compresses each photo below **4 MB** before upload (smaller size / lower JPEG quality
  until it fits). A Playwright test uploads a noisy 3000×4000 photo (well over 4.5 MB) to prove it.
- **Login rate limit** moved from memory to the database (`src/lib/rate-limit.ts`).
- `.vercelignore` keeps `.env*`, `.pgdata/`, `uploads/` etc. out of CLI uploads. Its
  patterns start with `/` — a bare `uploads/` also matched `src/app/api/uploads/` and
  silently removed the image route from the deployment.

### Production environment variables
Set in Vercel → Project → Settings → Environment Variables (Production):

| Variable | Source |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (+ other `PG*` / `POSTGRES_*`) | added automatically by the Neon integration |
| `BLOB_READ_WRITE_TOKEN` | added automatically when the Blob store is connected (Production + Preview only, so local dev keeps using disk) |
| `AUTH_SECRET` | random 48 bytes, stored as *sensitive* |
| `AUTH_TRUST_HOST` | `true` |
| `PREVIEW_ACCESS` | `public` |
| `NEXT_PUBLIC_SITE_URL` | `https://siam-library.vercel.app` |

### Preview environment variables
Preview deployments get **their own** values, so they never touch production data:

| Variable | Preview value |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | pooled / direct URL of Neon branch `preview` (sensitive) |
| `BLOB_READ_WRITE_TOKEN` (+ `BLOB_STORE_ID`) | store `siam-library-photos-preview` |
| `AUTH_SECRET` | its own random value (sensitive) — production sessions are not valid on previews |
| `AUTH_TRUST_HOST`, `PREVIEW_ACCESS` | `true`, `public` |
| `NEXT_PUBLIC_SITE_URL` | `https://siam-library.vercel.app` (QR codes always point to the live site) |

The Neon integration's own `PG*` / `POSTGRES_*` variables exist for Production only. How
the preview branch was made (Neon CLI, `npm i -g neonctl`, command `neon`):
```powershell
$o = '--org-id','org-noisy-wave-22191063','--project-id','cool-poetry-70535299'
neon branches create --name preview --parent main @o        # copy of production data
neon connection-string preview --pooled @o | vercel env add DATABASE_URL preview --sensitive
neon connection-string preview @o          | vercel env add DATABASE_URL_UNPOOLED preview --sensitive
```
The branch is a copy of production at the moment it was created (books, and staff
accounts with the passwords they had then). To refresh it from production:
`neon branches reset preview --parent @o`. After a schema change, run `npm run db:deploy`
against the preview branch as well (load its direct URL into `DATABASE_URL_UNPOOLED`).

### First-time setup (what was done)
```powershell
npm i -g vercel
vercel login
vercel link --yes --project siam-library
# Database: Vercel dashboard → Storage → Create Database → Neon (free) → connect to the project
#   (or: vercel integration add neon — needs the Neon terms accepted in the browser first)
vercel blob create-store siam-library-photos --access private --yes --environment production --environment preview
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))" | vercel env add AUTH_SECRET production --sensitive
# ...then AUTH_TRUST_HOST, PREVIEW_ACCESS, NEXT_PUBLIC_SITE_URL the same way
vercel --prod
```

### Migrations and seed against Neon
Pull the Production variables to a file **outside** the project, load them into the
shell, and run Prisma from your PC:
```powershell
vercel env pull $env:TEMP\siam-prod.env --environment production --yes
Get-Content $env:TEMP\siam-prod.env | ForEach-Object {
  if ($_ -match '^(DATABASE_URL(_UNPOOLED)?)="(.*)"$') { Set-Item "env:$($Matches[1])" $Matches[3] } }
npm run db:deploy                      # prisma migrate deploy (uses the direct URL)
# Seed only once, with NEW strong passwords (never the demo ones):
$env:SEED_ADMIN_EMAIL="admin@library.siam.edu"; $env:SEED_ADMIN_PASSWORD="<strong random>"
$env:SEED_STAFF_EMAIL="staff@library.siam.edu"; $env:SEED_STAFF_PASSWORD="<strong random>"
npm run db:seed
Remove-Item $env:TEMP\siam-prod.env    # it contains the database password
```
Re-running the seed **replaces the 18 demo books** (and their loan status) — do not run it
once staff have started editing real data. To add or reset a staff account on the live site,
load the variables the same way and run `npm run user:create -- <email> <name> <ADMIN|STAFF>`.

Migrations are **not** run during the Vercel build, so a deploy never changes a database
by itself. After a schema change: `npm run db:deploy` against the production database
(and the `preview` branch) first, then push.

### Deploying an update
```powershell
npm run build; npm run lint     # must pass locally
git push origin main            # Vercel builds and deploys production automatically
git push origin my-branch       # → preview deployment (preview database + photo store)
vercel logs --environment production --since 15m    # runtime errors
```
`vercel --prod` from the PC still works as a manual fallback.

> **Commit author must be the Vercel account owner.** On the Hobby plan Vercel blocks
> any deployment (Git push *or* CLI from this repo) whose commit author is a different
> GitHub user ("the commit author doesn't have permission to create deployments").
> Commit with an email that belongs to the GitHub account `SUDARSUN-24`
> (`git config user.email <that email>`).

### Testing the live site
```powershell
$env:E2E_BASE_URL="https://siam-library.vercel.app"
$env:SEED_ADMIN_EMAIL="admin@library.siam.edu"; $env:SEED_ADMIN_PASSWORD="<live admin password>"
$env:SEED_STAFF_EMAIL="staff@library.siam.edu"; $env:SEED_STAFF_PASSWORD="<live staff password>"
npm run test:e2e       # no local server is started when E2E_BASE_URL is set
```
The tests restore what they change (book A-002 borrowed → returned; the test book and its
photos are deleted). If a run fails half-way, check the admin list for a leftover
"Playwright Test Novel" and delete it (ADMIN account), or the QR/home counts will be off.

### Vercel limits to know
- Function request body: 4.5 MB (handled by browser compression).
- Free (Hobby) plan is for non-commercial use. The Neon free plan suspends the database
  when idle, so the first request after a quiet period can take a second or two longer.
- Preview deployments use their **own** Neon branch and Blob store (see above) and are
  protected by Vercel Authentication.

## 4. Deploy on a university server with Docker (alternative)

> **Not yet tested:** the Dockerfile and docker-compose.yml were written for this
> project but could not be run on the development PC (Docker is not installed there).
> Test them on the server before announcing the site.

Requirements: a Linux server with Docker Engine + Docker Compose plugin.

```bash
git clone <repository-url> siam-library
cd siam-library
cp .env.example .env
nano .env        # set POSTGRES_PASSWORD, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, seed passwords
docker compose up -d --build
docker compose logs -f app          # wait for "Ready"
```

What happens:
- `db` — PostgreSQL 17, data in the `pgdata` volume, **not** published to the host.
- `app` — on start runs `prisma migrate deploy`, then `next start` on port 3000.
  Page photos are stored in the `uploads` volume.

Load demo data (optional — skip for a real catalogue):
```bash
docker compose exec app npm run db:seed
```

Create real staff accounts (asks for the password interactively):
```bash
docker compose exec app npm run user:create -- librarian@siam.edu "Khun Somsri" STAFF
docker compose exec app npm run user:create -- it-admin@siam.edu "IT Admin" ADMIN
```
Running the same command again for an existing email resets that person's password.

### HTTPS (recommended)
Put the app behind the university's reverse proxy (nginx, Apache or Caddy) with a TLS
certificate, forwarding to `http://127.0.0.1:3000`. Example nginx block:

```nginx
server {
    listen 443 ssl;
    server_name library.siam.edu;
    # ssl_certificate ... ; ssl_certificate_key ... ;
    client_max_body_size 12m;            # page photos are up to 10 MB
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # overwrite, don't append
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then set `NEXT_PUBLIC_SITE_URL=https://library.siam.edu`, change the port mapping in
`docker-compose.yml` to `"127.0.0.1:3000:3000"` so the app is only reachable through
nginx, and run `docker compose up -d --build` (rebuilding also enables the HSTS header).

### Updating
```bash
git pull
docker compose up -d --build        # migrations run automatically on start
```

## 5. Backups (Docker)
```bash
# database
docker compose exec db pg_dump -U library siam_library > backup-$(date +%F).sql
# page photos
docker run --rm -v siam-library_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```
Restore: `cat backup.sql | docker compose exec -T db psql -U library siam_library`.
(The volume name prefix is the folder name; check with `docker volume ls`.)

## 6. Demo logins (local / Docker seed only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@library.siam.edu` | `SiamAdmin2026!` |
| Staff | `staff@library.siam.edu` | `SiamStaff2026!` |

These come from `SEED_*` in `.env`. **Change them (or don't seed) on a public server.**
They do **not** work on the live Vercel site, which was seeded with different, randomly
generated passwords (not written in any file — ask the project owner).
Admin can do everything Staff can, plus delete books.

## 7. Switching previews to students-only
Set `PREVIEW_ACCESS=students` and restart (Vercel: change the variable and redeploy). The book page then shows a lock message and
page photos return 403 to anyone not signed in. The rule lives in one function,
`canViewPreview()` in `src/lib/access.ts`. Today only staff can sign in; to let students
in, add a student login (e.g. university SSO through another Auth.js provider) — no other
code needs to change.

## 8. Notes and limits
- The login rate limiter stores its counters in the database (`LoginThrottle` table), so
  it holds across Vercel's serverless instances and app restarts. Expired rows are cleaned
  up automatically.
- IP-based limits rely on `X-Forwarded-For`. Vercel sets this header itself (clients
  cannot forge it there); behind your own nginx it depends on the proxy. The per-email
  limit (10 failures / 15 min) is the real brute-force protection either way.
