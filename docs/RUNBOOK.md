# When something breaks — runbook

For whoever gets the call (today: the owner, SUDARSUN-24). Read top to bottom; most problems
are found in the first 5 minutes.

| | |
|---|---|
| Live site | https://siam-library.vercel.app |
| Health check | https://siam-library.vercel.app/api/health → `{"status":"ok"}` = app **and** database work |
| Hosting status | https://www.vercel-status.com |
| Database status | https://neonstatus.com |
| Uptime alerts | GitHub issues titled `[uptime] Site is down` in `SUDARSUN-24/siam-library` |
| Who can deploy | the owner (SUDARSUN-24) — `git push origin main` |

Commands below are for PowerShell in `C:\Projects\siam-library`, with the Vercel and Neon
CLIs signed in (`vercel whoami`, `neon me`). Neon commands need
`--org-id org-noisy-wave-22191063 --project-id cool-poetry-70535299`.

## 1. The first 5 minutes

1. **Ask the caller** — which page, what they see (ask for a screenshot), phone or PC,
   since when, and whether it is everyone or one person.
2. **Open the health check.** `ok` → the site and database are up, the problem is in one
   page or one feature (go to §2). `error` or no answer → the site or database is down.
3. **Look at the status pages** (table above). If Vercel or Neon reports an outage, nothing in
   our code can fix it: tell the library (see §5) and wait.
4. **Was there a deploy just before it started?** `vercel ls --environment production`.
   If yes, roll back first and investigate after (§3).
5. **Read the errors:** `vercel logs --environment production --since 30m`.

## 2. What they see → what to do

| What they see | Likely cause | What to do |
|---|---|---|
| Nothing loads on the **library's domain**, but `siam-library.vercel.app` works | Domain settings (DNS) changed | Ask university IT to check the DNS record for the domain; send them the record shown in Vercel → Project → Settings → Domains |
| Error page on every page, health check says `error` | Database unreachable | Neon status page; `vercel logs` shows the database error; check Neon console that the project is not suspended (compute-hour limit on the free plan) |
| It broke right after a deploy | Bug in the new version | Roll back (§3), then fix in code and deploy again |
| First page takes 2–3 seconds after a quiet time | The database wakes up (scales to zero after 5 idle minutes) | Normal, not a fault |
| Book photos are missing, text works | Photo storage (Vercel Blob) or its token | `vercel logs` filtered to `/api/uploads`; check `BLOB_READ_WRITE_TOKEN` in Vercel env vars; check `PREVIEW_ACCESS` is `public` |
| Search shows an error | Search index / `pg_trgm` extension missing | `vercel logs`; migration `*_catalogue_search` must be applied (`npm run db:deploy` with the live URL, DEPLOYMENT.md §3) |
| Staff: "too many attempts" | Login rate limit (5 wrong per email+IP, 10 per email, in 15 min) | Wait 15 minutes — it resets itself. Never turn the limit off |
| Staff forgot their password | — | Owner sets a new one: `npm run user:create` with the live `DATABASE_URL` (DEPLOYMENT.md §3, "Change a live password"). The staff member types it, not you |
| Staff lost their phone (two-step login) | — | Use a backup code. None left: `npm run user:reset-2fa -- <email>` with the live `DATABASE_URL` |
| A book shows wrong details or status | Data, not a bug | Staff fix it in `/admin`. A bug only if it will not save |
| Staff cannot upload a page photo | File too big / not an image / storage | Photos must be real images ≤ 10 MB, ≤ 10 pages per book; otherwise `vercel logs` |
| A QR sticker opens "not found" | The book's code was changed or the book deleted | Check the book in `/admin`; reprint the sticker |
| A push to `main` did not deploy | Build failed (often a migration) or commit author not SUDARSUN-24 | Vercel → Deployments → the failed build log. The old version keeps running meanwhile |
| Data deleted or overwritten by mistake | — | **Act fast**: §4. The free database plan keeps only **6 hours** of history |

## 3. Roll back a bad deploy

```powershell
vercel ls --environment production          # newest first; pick the last good one
vercel rollback <url-of-the-last-good-deployment> --yes
vercel rollback status                       # wait until it says done
```
The site serves the old version within a minute. Then fix the code, test locally
(`npm run build`, `npm run lint`, `npm run test:e2e`) and deploy again with `git push origin main`.
A rollback does **not** undo database migrations — that is why every migration must work
with the previous code too (CLAUDE.md, "Migrations").

## 4. Restore data that was deleted by mistake

1. Ask staff to **stop editing**. Note the time just **before** the mistake (Thailand time
   is UTC+7; Neon wants UTC).
2. Restore `main` to that time, keeping the current state as a backup branch:
   ```powershell
   neon branches restore main ^self@2026-11-18T03:00:00Z --preserve-under-name main_before_restore --org-id org-noisy-wave-22191063 --project-id cool-poetry-70535299
   ```
3. Check the site. Everything changed **after** that time is gone from `main` (but still in
   `main_before_restore`) — tell staff what to re-enter.
4. Photos live in Vercel Blob, not in the database; a deleted book's photos are deleted too
   and cannot be restored from Neon.

If unsure, ask Claude to do this with you — it is the one step that changes the live data.

## 5. What to tell the library

- **When it starts:** "We know about the problem with ___ and are working on it. Next
  update by ___ ." (Give a time, even if it is only 30 minutes away.)
- **If it is Vercel or Neon:** "The hosting company has an outage (link to the status
  page). The site comes back by itself when they fix it; your data is safe."
- **When fixed:** "Fixed at ___ . The cause was ___ . We have ___ so it does not happen again."

## 6. Getting help from Claude

Open Claude Code in `C:\Projects\siam-library` and say, in your own words:
- what the library sees (paste the screenshot), and since when;
- what the health check showed;
- anything you already tried.

Claude reads the logs, the database state and the recent changes, explains the cause in
simple words, fixes it and tests it; you approve each step, including the deploy.

## 7. After it is fixed

Add a line to the log below. Repeated causes show what to improve.

| Date | What happened | Cause | Fix | Downtime |
|---|---|---|---|---|
| | | | | |

## Uptime monitor

- **What:** GitHub Actions workflow `.github/workflows/uptime.yml` in
  `SUDARSUN-24/siam-library`. It checks `/api/health` and the home page every
  30 minutes from 06:00 to 22:00 Thailand time, 3 tries 20 seconds apart.
- **Alert:** if a check still fails after 3 tries it opens the issue
  `[uptime] Site is down` (one at a time; later failures add a comment) and closes it with
  "Back up at …" when the site answers again. Everyone **watching** the repo gets an email,
  and a phone notification with the GitHub Mobile app. Keep the repo on Watch → All activity
  and email on for issues (github.com/settings/notifications).
- **Run it now:** `gh workflow run uptime.yml -R SUDARSUN-24/siam-library` (or the
  "Run workflow" button on the repo's Actions tab).
- **Pause it:** `gh workflow disable uptime.yml -R SUDARSUN-24/siam-library`
  (`enable` to resume).
- **Why not more often:** each check wakes the database for about 5 minutes. On Neon's free
  plan (100 compute-hours a month) checks every 5 minutes would keep it awake all month and
  use up the limit, which takes the site down. This schedule uses about 20 compute-hours.
  On a paid Neon plan it costs about $2 a month.
- **Cost on GitHub:** each run counts as 1 minute of the 2,000 free Actions minutes a month
  for private repos (about 960 a month).
- **Limits:** GitHub may start scheduled runs 5–15 minutes late, and nothing runs at night.
  For SMS or phone-call alerts, use a paid monitoring service (for example Better Stack or
  UptimeRobot) once the library pays for hosting.
