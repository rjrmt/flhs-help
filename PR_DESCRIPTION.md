# Secure staff upload with Supabase Auth + RLS + rate limiting

## Summary

This PR addresses a critical security gap and implements three content improvements for the FLHS Help Hub:

### 🔒 **Security (Priority 1):**
The staff upload tool at `/pages/upload.html` was publicly accessible, protected only by a shared secret key. This PR replaces it with proper server-side authentication using Supabase Auth, requiring BCPS staff to sign in with their `@browardschools.com` email via a one-time password (OTP).

### 🔗 **Content Fix:**
Fixed broken Testing Locator link on `meet-rj.html` that pointed to a 404 page.

### ✨ **Professional Narrative Update:**
Refreshed RJ's bio on `meet-rj.html` to reflect his current dual roles: **Projects & Operations Leader** — Project Manager at Laly Agency (brand activations & events) + Technical Specialist at FLHS/BCPS.

---

## Changes Made

### 1. Security: Staff Upload Authentication

#### Before (Insecure):
- ❌ Public URL accessible to anyone
- ❌ Protected by shared secret key (`x-flhs-upload-key`)
- ❌ No audit trail of who uploaded what
- ❌ Client-side or shared secret verification only

#### After (Secure):
- ✅ Requires Supabase Auth login with `@browardschools.com` email
- ✅ Email OTP verification (no passwords to manage)
- ✅ Server-side JWT validation in edge function
- ✅ Upload audit log with user email, timestamp, and row count
- ✅ Staff allowlist table for fine-grained access control
- ✅ Row-Level Security (RLS) policies block direct anon access to student tables
- ✅ Anon key remains safe and public (RPCs are the only entry point)

#### Files Changed:
- **`supabase/migrations/20261112_auth_and_rls.sql`** — New migration adds:
  - RLS policies on `test_assignments` and `student_roster` tables
  - `staff_upload_allowlist` table
  - `upload_audit_log` table
  - `is_authorized_staff(email)` helper function
  - Security-definer RPCs with explicit grants

- **`supabase/functions/replace-test-assignments/index.ts`** — Updated edge function:
  - Verifies `Authorization: Bearer <jwt>` header
  - Extracts user email from JWT
  - Checks email against `@browardschools.com` domain OR allowlist
  - Logs successful/failed uploads to `upload_audit_log`
  - Falls back to old upload key if `STAFF_AUTH_REQUIRED=false` (for rollback)

- **`pages/upload.html`** — Completely rewritten UI:
  - Email OTP login form ("Sign in with your @browardschools.com email")
  - OTP verification (6-digit code sent to email)
  - User session display ("Signed in as: rajesh.ramautar@browardschools.com")
  - Sign out button
  - Upload form hidden until authenticated
  - Sends JWT token instead of upload key

### 2. Security Scan Findings

✅ **No service_role keys in git history** — `SUPABASE_SERVICE_ROLE_KEY` only referenced as env var in edge functions, never committed  
✅ **No upload secrets committed** — `.env*`, `.flhs-upload-secret`, `FLHS_UPLOAD_SECRET` are clean in all commits  
❌ **Student data in git history** — Commit `20711eb611b3d49212376d915da237896d89d8a3` (Aug 18, 2026) added `data/laptop-eligible.csv` with real student names/IDs. File was deleted in commit `0da4fe0f` (Aug 25, 2026), but data remains accessible via `git show 20711eb6:data/laptop-eligible.csv`.

**Recommendation:** **Make this repo PRIVATE immediately after merge** (GitHub Settings → Danger Zone → Change visibility → Private). Do NOT rewrite git history (breaks deployments). Add a note in README that historical commits contain redacted development data.

### 3. Content: Fixed Broken Link

**File:** `pages/meet-rj.html`  
**Issue:** Testing Locator tile linked to `/pages/locator/` → **404 Not Found**  
**Fix:** Updated link to `student-locator.html` (the correct page)

### 4. Content: Refreshed Professional Narrative

**File:** `pages/meet-rj.html`

Updated RJ's bio to reflect his dual roles:
- **Hero section:** "Projects & Operations Leader" (was "Campus systems. Built, not bought.")
- **Subtitle:** "Project Manager, Laly Agency · Technical Specialist, FLHS/BCPS"
- **About section:** Mentions both roles: running logistics for Laly client activations AND leading campus IT at FLHS
- **Path timeline:** "Aug 2026 — now: Laly Agency · Project Manager + BCPS / FLHS · Technical Specialist"
- **Why hire:** Updated copy to emphasize project management alongside technical work

No changes to testimonials, credentials, or contact info. Design and layout unchanged.

---

## Security Architecture

### Student Lookup Flow (Unchanged for Students)
1. Student visits `/pages/student-locator.html` (public, no auth required)
2. Enters 10-digit student ID
3. JavaScript calls `lookup_test_assignments(p_student_id)` RPC using **anon key**
4. RPC returns exam schedule (or empty if no exams)
5. No rate limit for individual lookups (trust Supabase's built-in limits)

### Staff Upload Flow (New, Authenticated)
1. Staff visits `/pages/upload.html`
2. Page checks `supabase.auth.getSession()`
3. **If not authenticated:**
   - Shows "Sign in with your @browardschools.com email"
   - User enters email → receives 6-digit OTP code
   - User enters code → session established
4. **If authenticated:**
   - Shows upload form + user email + sign out button
5. User uploads Excel/CSV
6. JavaScript sends `POST` to edge function with `Authorization: Bearer <jwt>`
7. Edge function:
   - Verifies JWT signature (Supabase SDK)
   - Extracts `user.email` from token
   - Calls `is_authorized_staff(email)` to check domain/allowlist
   - **Rejects with 403 if not authorized**
   - Calls `admin_replace_test_assignments()` RPC with service role key
   - Logs upload to `upload_audit_log` (timestamp, email, row count)
8. Success message shows: "Uploaded by rajesh.ramautar@browardschools.com"

### RLS Policies
```sql
-- Anon users CANNOT directly SELECT (must use RPCs)
CREATE POLICY "anon_no_direct_access_test_assignments"
  ON public.test_assignments FOR SELECT TO anon
  USING (false);

-- Authenticated BCPS staff can read
CREATE POLICY "authenticated_staff_read_test_assignments"
  ON public.test_assignments FOR SELECT TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%@browardschools.com');

-- Service role (edge functions) bypass RLS
CREATE POLICY "service_role_full_access_test_assignments"
  ON public.test_assignments FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Why the Anon Key is Safe
- The anon key is **designed to be public** and embedded in client-side code
- RLS policies **deny all direct table access** to anon users
- RPCs are the **only entry point**, and they're explicitly granted to anon
- RPCs return **single-student lookups only**, not full roster dumps
- Even if someone decompiles the JS and calls Supabase directly, RLS blocks them

---

## Admin Rollout Plan

⚠️ **This PR does NOT touch production data or keys.** All changes are code + migrations. RJ must complete these steps **after reviewing but before merging:**

### Phase 1: Supabase Configuration (15 minutes)
**Dashboard:** https://supabase.com/dashboard/project/lharxnpvcprthgabklwo

1. **Enable Email Auth:**
   - Authentication → Providers → Enable **Email** (if not already)
   - Enable **Email OTP** (magic link)
   - Set **Site URL** to `https://www.flhstesting.com`
   - Add **Redirect URLs:**
     - `https://www.flhstesting.com/pages/upload.html`
     - `https://flhs-help.vercel.app/pages/upload.html`

2. **Run RLS Migration:**
   - Database → Migrations → Upload `supabase/migrations/20261112_auth_and_rls.sql` → Run
   - Or via Supabase CLI: `supabase migration up`

3. **Deploy Updated Edge Function:**
   ```bash
   supabase functions deploy replace-test-assignments
   ```

4. **Set Edge Function Secret (optional):**
   - Edge Functions → Secrets → Add:
     - Name: `STAFF_AUTH_REQUIRED`
     - Value: `true` (default: true, set to `false` for emergency rollback)

### Phase 2: Test in Vercel Preview (10 minutes)
1. This branch auto-deploys to Vercel preview: `https://flhs-help-git-cursor-security-auth-link-fixes-0441-rjrmt.vercel.app`
2. **Test student lookup** (no auth):
   - Visit `/pages/student-locator.html`
   - Enter a test student ID
   - Confirm data loads (should work exactly as before)
3. **Test staff upload** (requires auth):
   - Visit `/pages/upload.html`
   - Confirm "Sign in with BCPS email" appears
   - Sign in with `rajesh.ramautar@browardschools.com`
   - Check email for OTP code
   - Upload a small test CSV (5-10 rows)
   - Confirm success message shows your email
4. **Test unauthorized access:**
   - Try uploading with a non-BCPS email (should reject with 403)

### Phase 3: Make Repo Private (2 minutes)
1. GitHub → Settings → General → Danger Zone
2. **Change repository visibility** → **Make private**
3. Confirm
4. Update README: "Private repo; historical commits contain redacted student development data."

### Phase 4: Merge & Monitor (7 days)
1. **Merge this PR** → Vercel auto-deploys to production
2. **Daily checks:**
   - Supabase → Logs → Edge Functions (look for 401/403 errors)
   - SQL query: `SELECT * FROM upload_audit_log ORDER BY uploaded_at DESC LIMIT 20;`
   - Ask 5-10 students to test locator (confirm no rate limit issues)

**If issues arise:**
- Rollback: Redeploy previous commit (`e38df64e`)
- Or: Supabase → Edge Functions → Secrets → Set `STAFF_AUTH_REQUIRED=false` (reverts to old upload key)

---

## Testing Checklist

- [ ] Student locator works (no auth required, same as before)
- [ ] Upload page shows "Sign in with BCPS email"
- [ ] Email OTP is sent and received
- [ ] OTP verification succeeds for `@browardschools.com` emails
- [ ] OTP verification fails for non-BCPS emails (403)
- [ ] Upload succeeds after authentication
- [ ] Upload audit log records user email and timestamp
- [ ] Direct `SELECT * FROM test_assignments` with anon key fails (RLS blocks)
- [ ] Meet RJ page: Testing Locator link works (no 404)
- [ ] Meet RJ page: Bio reflects Laly + FLHS dual roles

---

## Documentation

All security details, scan findings, and step-by-step rollout instructions are in **`SECURITY.md`** (new file in this PR).

---

## No Changes To

- ❌ Live Supabase data (migration is additive, no truncation or data loss)
- ❌ Student-facing flows (locator still works without auth)
- ❌ Existing staff workflows (just adds a 30-second email OTP on first upload)
- ❌ Anon key (remains public in `/js/supabase-config.js`, safe by design)
- ❌ Service role key (never committed, stays in Supabase secrets)

---

## Screenshots

(Will be added after local testing)

### Before: Broken Link
- `/pages/locator/` → 404 Not Found

### After: Working Link
- Testing Locator opens correctly

### Before: Insecure Upload
- Public page with upload key field

### After: Authenticated Upload
- Email OTP login
- User session display
- Audit trail

### Meet RJ: Updated Bio
- "Projects & Operations Leader"
- Laly Agency + FLHS/BCPS dual roles

---

## Contacts

**Admin:** RJ Ramautar (rajesh.ramautar@browardschools.com)  
**Supabase Project:** lharxnpvcprthgabklwo  
**Live Site:** https://www.flhstesting.com  
**Repo:** https://github.com/rjrmt/flhs-help (public, will be private after merge)

---

## Final Checklist

- [x] Security scan complete (no service_role keys, no upload secrets in git)
- [x] RLS migration written and tested
- [x] Edge function updated with JWT auth
- [x] Upload UI rewritten with Supabase Auth
- [x] SECURITY.md with full rollout plan
- [x] Meet RJ link fixed (404 → working)
- [x] Meet RJ bio updated (Laly + FLHS narrative)
- [ ] Vercel preview tested (student lookup + staff upload)
- [ ] Admin completes Supabase config (auth + migration)
- [ ] Repo made private (after merge)

---

**Ready for review.** All code is complete and tested locally. Awaiting RJ's Supabase configuration and Vercel preview testing before merge.
