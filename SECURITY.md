# Security

The staff tools that change school data ask for a `@browardschools.com` email and send a one-time code. That covers the testing-roster upload, STAR settings, Mission Control, laptop count, room and phone responses, and coupon tools. The old shared key is not accepted.

Student pages stay open. The testing locator, homepage, media hours, and the student kiosk, bathroom pass, and tutor station do not ask anyone to sign in.

## What is protected

| Data | Where it lives | Who can reach it |
| --- | --- | --- |
| Testing assignments, student roster, staff directory, kiosk rows | `private` schema | No anon policies. The browser uses one-student RPCs. Roster replace runs only inside the edge function after a district session. |
| Audit trail | `private.audit_log` | No anon or authenticated grants. The edge function writes it with the service role. |
| Laptop checkout kiosk | `public.laptop_checkins` | RLS is on. The public kiosk still inserts and reads rows so checkout works. This is not the student roster. |
| School calendar, bell schedule, media hours | `data/*.csv` and `data/media-center.json` that are tracked | Public pages. These files are not student records. |

Every table in `public` and `private` has Row Level Security enabled. A table with RLS and no policy is closed to the anon and authenticated API roles.

## How upload auth works

1. The upload page asks for an email. Anything that is not exactly `@browardschools.com` is stopped in the browser.
2. A matching address gets an email one-time code from Supabase Auth.
3. New accounts are also rejected in the database by `private.restrict_staff_signup`, after that hook is turned on (see `WALKTHROUGH.md`).
4. Each staff API calls `auth.getUser` on the bearer token. No user, or a non-district email, is rejected. A shared key header is ignored.
5. A successful or failed replace is written to `private.audit_log` with the staff email, row count, and time.

The service-role key stays in the Supabase edge-function environment. It is not in the website.

## Config

`js/supabase-config.js` is gitignored. It holds the project URL and the publishable anon key only. Copy `js/supabase-config.example.js`, or run `npm run config` with `SUPABASE_URL` and `SUPABASE_ANON_KEY` set.

`.env` is gitignored. `data/*.csv` is gitignored except the three public schedule files the site serves:

- `data/calendar-2026-2027.csv`
- `data/bell-schedule.csv`
- `data/academic-testing-2026-2027.csv`

## Student file still in git history

`data/laptop-eligible.csv` is not in the current tree. It was added in commit `20711eb611b3d49212376d915da237896d89d8a3` and later deleted, so the file is still recoverable with:

```bash
git show 20711eb611b3d49212376d915da237896d89d8a3:data/laptop-eligible.csv
```

Do not run that command on a shared machine if you do not need the file. To remove it from history, use a fresh mirror clone and rewrite. This changes every commit that touched the file, including `20711eb6`. Do not force-push until you have decided to.

```bash
brew install git-filter-repo
git clone --mirror https://github.com/rjrmt/flhs-help.git flhs-help-mirror.git
cd flhs-help-mirror.git
git filter-repo --invert-paths --path-glob '**/laptop-eligible.csv'
```

Check the rewrite, then stop. A later force-push, only after you say so, would be:

```bash
git push --force --mirror
```

BFG is the other option, also from a mirror clone:

```bash
brew install bfg
git clone --mirror https://github.com/rjrmt/flhs-help.git
java -jar bfg.jar --delete-files laptop-eligible.csv flhs-help.git
cd flhs-help.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

After a force-push, everyone reclones. GitHub may keep the old blob until their cache is cleared. Open a GitHub support request to purge cached views of that file. Rotate nothing that was inside the CSV; it was student roster data, not an API key.
