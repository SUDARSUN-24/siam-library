# Siam University Library — Book Preview

Students browse the library catalogue, read a short preview of each book (cover, contents,
introduction), see whether it is on the shelf and where, then borrow it in person.
Staff add books, upload page photos from a phone, mark books borrowed/returned and print
QR stickers. Thai + English.

**Stack:** Next.js 16 · TypeScript · Tailwind + shadcn/ui · PostgreSQL + Prisma · Auth.js ·
sharp · Playwright · Docker

## Quick start (Windows)
```powershell
npm install
Copy-Item .env.example .env      # then edit secrets
npm run db:start                 # window 1 — keep open
npm run db:migrate; npm run db:seed; npm run dev   # window 2 → http://localhost:3000
```
Staff area: `/admin` — demo logins are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#5-demo-logins-from-the-seed).

## Documentation
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — local setup, Docker deployment, backups, settings
- [docs/STAFF_GUIDE.md](docs/STAFF_GUIDE.md) — how library staff use the system
- [docs/PLAN.md](docs/PLAN.md) — build phases
- [REPORT.md](REPORT.md) — university project report
- [CLAUDE.md](CLAUDE.md) — developer notes and rules
