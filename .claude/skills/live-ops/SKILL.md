---
name: live-ops
description: Commands for the live site (siam-library.vercel.app) — read production logs, pull Vercel env vars, migrate the live Neon database, run Playwright against production, use the Neon CLI. Use when deploying, debugging production, or changing the live database.
---

# Live-site operations (Windows PowerShell)

Vercel CLI is installed globally and logged in; the project is already linked in `.vercel/`.
Full background: docs/DEPLOYMENT.md §3–5.

```powershell
git push live main             # deploys production (GitHub integration); vercel --prod = fallback
                               # (`origin` = team repo scheppersstudio/siam-library — deploys nothing)
vercel logs --environment production --since 15m
vercel env pull <file OUTSIDE the repo> --environment production --yes   # never into .env.local
npm run db:deploy              # with DATABASE_URL(_UNPOOLED) from Neon loaded → migrate live DB
$env:E2E_BASE_URL="https://siam-library.vercel.app"; npm run test:e2e   # + SEED_* = live logins
# Neon CLI (`neon`, signed in): always pass the org/project
neon branches list --org-id org-noisy-wave-22191063 --project-id cool-poetry-70535299
```

Never write the live staff passwords into any file.
