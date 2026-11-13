# Supabase setup for the roster upload

Do this in the FLHS Ops project (`lharxnpvcprthgabklwo`) before relying on the upload page. Nothing here merges the pull request.

## 1. Project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and the project **FLHS Ops**.
2. Confirm the URL is `https://lharxnpvcprthgabklwo.supabase.co`.
3. In **Project Settings → API**, copy the project URL and the **anon / publishable** key. Leave the **service_role** key in that screen. Do not paste it into the website, GitHub, or `.env` if that file is ever committed.

## 2. Apply the database change

In **SQL Editor**, run the file `supabase/migrations/20261112_auth_and_rls.sql` from this branch.

That script:

- Turns Row Level Security on for every `public` and `private` table.
- Adds `private.audit_log`.
- Adds `private.restrict_staff_signup` for the Auth hook.
- Adds `public.admin_record_audit`, executable only by `service_role`.

It does not replace the existing testing-roster function and it does not truncate any table.

## 3. Auth settings

1. Open **Authentication → Providers → Email**.
2. Turn **Email** on.
3. Turn **Confirm email** on if it is not already.
4. Leave password sign-in off if you only want the one-time code. The upload page uses **Email OTP**.
5. Under **Authentication → URL configuration**, set **Site URL** to `https://www.flhshelp.com`. Add `http://localhost:3000` as a redirect URL so local sign-in can finish.
6. Under **Authentication → Rate limits**, keep the default OTP limit so a public page cannot request codes in a loop.

## 4. Allowed domain

The browser rejects any address that is not exactly `@browardschools.com`. The roster upload, STAR settings, Mission Control, laptop count, room and phone tracker, and coupon tools all check the same rule on the signed-in user. Student pages do not ask anyone to sign in.

Also turn on the database hook so a non-district address cannot create an account by calling the Auth API directly:

1. Open **Authentication → Hooks**.
2. Choose **Before user created**.
3. Select **Postgres**.
4. Set the function to `private.restrict_staff_signup`.
5. Save and enable the hook.

The URI form, if the screen asks for one, is:

```text
pg-functions://postgres/private/restrict_staff_signup
```

## 5. Environment variables

On your machine:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
SUPABASE_URL=https://lharxnpvcprthgabklwo.supabase.co
SUPABASE_ANON_KEY=the_publishable_anon_key
```

Then:

```bash
npm run config
```

That writes `js/supabase-config.js`, which is gitignored. Refresh the local site.

On Vercel, for the preview of this branch and later for production:

1. Project → **Settings → Environment Variables**.
2. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Preview and Production.
3. Set the build command to `npm run config` so the file exists before the static files are published.
4. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The edge function already receives it from Supabase.

## 6. Deploy the upload function

From a machine logged into the Supabase CLI:

```bash
supabase functions deploy replace-test-assignments --project-ref lharxnpvcprthgabklwo
```

Or deploy the same function from the Supabase dashboard using `supabase/functions/replace-test-assignments/index.ts`. `verify_jwt` stays on. The function still checks that the token belongs to a district user, because the anon key is also a JWT.

## 7. Check it

1. Open `/pages/upload.html`.
2. Enter a non-district email such as `person@gmail.com`. The page should refuse to send a code.
3. Call the Auth OTP endpoint directly with that same address. With the hook enabled, the response is 403.
4. Sign in with your own `@browardschools.com` address, enter the code from email, and upload a small roster file. The locator for one of those student IDs should show the new row, and `private.audit_log` should have your email.
5. Call `replace-test-assignments` with no session, and again with only the old upload key. Both should be 401.
6. Open the homepage, the testing locator, and Meet RJ. They should load without signing in. The Testing Locator tile on Meet RJ goes to `student-locator.html`.

## 8. History cleanup, later

`data/laptop-eligible.csv` is still in git history at commit `20711eb6`. The exact rewrite steps are in `SECURITY.md`. Do not force-push until you decide to.
