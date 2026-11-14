# Deployment — Siam University Library Book Preview

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
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/siam_library` | PostgreSQL connection (docker-compose builds its own) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `library` / *strong password* / `siam_library` | Database account created by docker-compose |
| `AUTH_SECRET` | 32+ random characters | Signs staff login sessions. Generate: `npx auth secret` |
| `AUTH_TRUST_HOST` | `true` | Needed behind Docker / a reverse proxy |
| `NEXT_PUBLIC_SITE_URL` | `https://library.siam.edu` | Address printed inside QR codes. **Set before printing stickers.** Read at runtime — no rebuild needed |
| `PREVIEW_ACCESS` | `public` | `public` = anyone can read previews; `students` = signed-in users only (see §6) |
| `UPLOAD_DIR` | `./uploads` | Folder for page photos (outside `public/`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | | Only used by `npm run db:seed` |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | | Only used by `npm run db:seed` |

`.env` is git-ignored. Never commit real secrets.

## 3. Deploy on a university server with Docker

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

## 4. Backups
```bash
# database
docker compose exec db pg_dump -U library siam_library > backup-$(date +%F).sql
# page photos
docker run --rm -v siam-library_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```
Restore: `cat backup.sql | docker compose exec -T db psql -U library siam_library`.
(The volume name prefix is the folder name; check with `docker volume ls`.)

## 5. Demo logins (from the seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@library.siam.edu` | `SiamAdmin2026!` |
| Staff | `staff@library.siam.edu` | `SiamStaff2026!` |

These come from `SEED_*` in `.env`. **Change them (or don't seed) on a public server.**
Admin can do everything Staff can, plus delete books.

## 6. Switching previews to students-only
Set `PREVIEW_ACCESS=students` and restart. The book page then shows a lock message and
page photos return 403 to anyone not signed in. The rule lives in one function,
`canViewPreview()` in `src/lib/access.ts`. Today only staff can sign in; to let students
in, add a student login (e.g. university SSO through another Auth.js provider) — no other
code needs to change.

## 7. Notes and limits
- The login rate limiter is in memory: fine for one app container; it resets when the app
  restarts. Use Redis or the database if you ever run several app containers.
- IP-based limits rely on `X-Forwarded-For`; the per-email limit (10 failures / 15 min)
  is the real brute-force protection and cannot be bypassed by forging that header.
