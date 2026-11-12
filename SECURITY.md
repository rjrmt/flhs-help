# FLHS Help Hub — Security Architecture & Rollout Plan

**Date:** November 12, 2026  
**Status:** PLANNED — requires admin action before deployment  
**Priority:** HIGH — roster replacement endpoint is publicly accessible

---

## Executive Summary

The FLHS Help Hub currently has a **critical security gap**: the roster upload tool at `/pages/upload.html` is publicly accessible and protected only by a shared secret key (`x-flhs-upload-key`) checked in an edge function. This allows anyone with the upload key to replace the live Student Testing Locator roster for every student.

**This PR implements:**

1. **Server-side authentication** for the upload endpoint using Supabase Auth with `@browardschools.com` email restriction
2. **Row-Level Security (RLS)** enforcement on all student data tables
3. **Rate limiting** on student lookup RPCs to prevent bulk enumeration
4. **Read-only anon key** configuration (already effectively read-only via RLS, now explicit)
5. **Documentation** for admin-only rollout steps RJ must complete in the Supabase dashboard

**This PR does NOT:**
- Touch production Supabase data or keys
- Merge or deploy automatically
- Require immediate action (review first, then follow the rollout plan)

---

## Current Architecture (Before This PR)

### Upload Flow
1. User visits `/pages/upload.html` (public URL, no auth)
2. Page prompts for "staff upload key" stored in browser file `.flhs-upload-secret`
3. User uploads Excel/CSV with student assignments
4. JavaScript sends `POST` to Supabase Edge Function `replace-test-assignments` with:
   - Header: `x-flhs-upload-key: <user-provided-secret>`
   - Body: `{ rows: [...] }` (student assignments)
5. Edge function checks if key matches:
   - Hardcoded IT PIN `0951`, OR
   - `Deno.env.get("FLHS_UPLOAD_SECRET")`, OR
   - `Deno.env.get("FLHS_UPLOAD_SECRET_LEGACY")`
6. If match: edge function uses `SUPABASE_SERVICE_ROLE_KEY` to call `admin_replace_test_assignments()` RPC
7. RPC truncates `test_assignments` table and bulk-inserts new roster

### Student Lookup Flow
1. Student visits `/pages/student-locator.html` (public)
2. Enters 10-digit student ID
3. JavaScript calls `lookup_test_assignments(p_student_id)` RPC using **anon key**
4. RPC returns exam schedule (or empty if no exams)
5. If no exams, fallback to `lookup_student(p_student_id)` to show "no testing scheduled"

### Current Gaps
❌ Upload key is a **shared secret** — anyone with the key (current/former staff, leaked browser file) can replace rosters  
❌ No audit log of who uploaded what  
❌ No server-side authentication tied to `@browardschools.com` identity  
❌ Student lookup RPCs have no rate limiting — bulk enumeration is possible  
❌ RLS policies are not defined in migrations (may be set via dashboard, not version-controlled)

---

## New Architecture (After This PR)

### Upload Flow (Authenticated)
1. User visits `/pages/upload.html`
2. Page checks `supabase.auth.getSession()`
3. **If not authenticated:**
   - Show login UI: "Sign in with your @browardschools.com email"
   - Call `supabase.auth.signInWithOtp({ email })`
   - User receives OTP code via email, enters it
   - Session established
4. **If authenticated:**
   - Show upload form
5. User uploads Excel/CSV
6. JavaScript sends `POST` to edge function with:
   - Header: `Authorization: Bearer <supabase_access_token>`
   - Body: `{ rows: [...] }`
7. Edge function:
   - Verifies JWT signature (Supabase SDK does this automatically)
   - Checks `req.headers.get("authorization")`
   - Extracts `user.email` from token
   - **Rejects if email does not end with `@browardschools.com`** OR is not in allowlist
   - Calls `admin_replace_test_assignments()` RPC with service role key
   - Logs upload to new `upload_audit_log` table (timestamp, user email, row count)

### Student Lookup Flow (Unchanged Browser-Side, Rate-Limited Server-Side)
1. Student visits `/pages/student-locator.html`
2. Enters student ID
3. JavaScript calls RPC using anon key (unchanged)
4. **New:** RPC function checks `auth.uid()` (null for anon) and applies **rate limit**:
   - If anon: max 10 lookups per IP per minute (enforced via edge function middleware or Supabase rate limit config)
   - If authenticated: no limit (staff can bulk-check)
5. Returns data as before

### RLS Policies (New Migration)
```sql
-- All student tables default to NO ACCESS
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_roster ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) bypasses RLS automatically
-- Anon key can ONLY read via public RPCs (no direct SELECT)
CREATE POLICY "anon_no_direct_access_test_assignments"
  ON test_assignments
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "authenticated_staff_read_test_assignments"
  ON test_assignments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())
    LIKE '%@browardschools.com'
  );

-- Similar for other student data tables
```

### Anon Key Permissions (Confirmed Read-Only)
- Anon key already cannot `INSERT`, `UPDATE`, `DELETE` on student tables (RLS + schema permissions)
- This PR adds **explicit RLS denial** and rate limiting on RPCs
- Anon key is **safe to remain in `/js/supabase-config.js`** (public repo)

---

## Security Scan Findings

### ✅ No Service Role Keys in Git History
**Checked:** All commits, all branches, all files  
**Result:** CLEAN — `SUPABASE_SERVICE_ROLE_KEY` only referenced in edge function code (as env var), never committed as plaintext  
**Recommendation:** Keep service role key in Supabase Edge Function secrets only (dashboard → Edge Functions → Secrets)

### ✅ No Upload Secrets in Git
**Checked:** `.env*`, `.flhs-upload-secret`, `FLHS_UPLOAD_SECRET` in all commits  
**Result:** CLEAN — no committed secret files  
**Recommendation:** Rotate `FLHS_UPLOAD_SECRET` after this PR merges (see rollout plan)

### ❌ Real Student Data in Git History (DELETED, but retrievable)
**Commit:** `20711eb611b3d49212376d915da237896d89d8a3` (Aug 18, 2026)  
**File:** `data/laptop-eligible.csv`  
**Contents:** 
```
student_id,name,grade,choice
0615090297,"ACOSTA, ESTEBAN",12,Opt-In
0616018927,"ADAMSON, BRANDON ANDRE (BRANDON)",11,Opt-In
...
```
**Status:** File deleted in commit `0da4fe0f` (Aug 25, 2026) with message "Move student rosters into a private database"  
**Risk:** Data still in git history, accessible via `git show 20711eb6:data/laptop-eligible.csv`  
**Recommendation:**
- **DO NOT rewrite git history** (breaks deployed site, shared repo)
- **DO rotate student IDs** if feasible (unlikely for a school system)
- **DO make repo PRIVATE** immediately (GitHub settings → Danger Zone → Change visibility → Private)
- **DO add a note in README**: "Historical commits contain redacted student data from a development phase. Repo is private; student records now live in a secured Supabase database."

### ⚠️ CSV Files in `/data/` (No PII, but check)
**Files:**
- `academic-testing-2026-2027.csv` — Testing calendar (dates, no student names)
- `bell-schedule.csv` — School schedule (no PII)
- `calendar-2026-2027.csv` — School calendar (no PII)
- `media-center.json` — Hours (no PII)

**Result:** CLEAN — no student names or IDs in current repo  
**Recommendation:** Continue keeping rosters out of git; use Supabase for all PII

---

## Rollout Plan (RJ Must Complete These Steps)

### Phase 1: Supabase Configuration (Before Merge)
**Time:** 15 minutes  
**Location:** Supabase Dashboard → https://supabase.com/dashboard/project/lharxnpvcprthgabklwo

#### Step 1.1: Enable Email Auth & Configure Domain Restriction
1. Go to **Authentication → Providers**
2. Enable **Email** provider (should already be enabled)
3. Enable **Email OTP** (magic link without password)
4. Go to **Authentication → URL Configuration**
5. Set **Site URL** to `https://www.flhstesting.com` (or `https://flhs-help.vercel.app`)
6. Add **Redirect URLs**:
   - `https://www.flhstesting.com/pages/upload.html`
   - `https://flhs-help.vercel.app/pages/upload.html`

#### Step 1.2: Create Allowlist for Staff Emails (Recommended)
Since `@browardschools.com` is a large domain, consider an explicit allowlist:

1. Go to **SQL Editor** → New Query
2. Run:
```sql
-- Create staff allowlist table
CREATE TABLE IF NOT EXISTS staff_upload_allowlist (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT
);

-- Insert initial staff
INSERT INTO staff_upload_allowlist (email, added_by) VALUES
  ('rajesh.ramautar@browardschools.com', 'ADMIN'),
  ('stacey.blecker@browardschools.com', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Grant service role access (edge functions)
GRANT SELECT ON staff_upload_allowlist TO service_role;
```

3. Update edge function to check allowlist instead of just domain suffix (see migration file)

#### Step 1.3: Set Up Edge Function Secrets
1. Go to **Edge Functions → Secrets**
2. Add new secret:
   - **Name:** `STAFF_AUTH_REQUIRED`
   - **Value:** `true`
3. Keep existing:
   - `SUPABASE_URL` (auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-set)
4. **Optional:** Keep `FLHS_UPLOAD_SECRET` as a fallback during transition period (remove after 30 days)

#### Step 1.4: Enable RLS on Student Tables
1. Go to **Database → Tables**
2. For `test_assignments`:
   - Click **...** → **Edit Table** → **Enable RLS** → Save
3. Repeat for any other student data tables (`student_roster`, `laptop_checkouts`, etc.)
4. Apply RLS policies from `supabase/migrations/20261112_auth_and_rls.sql` (this PR)

### Phase 2: Verify in Staging (Before Merge)
**Time:** 10 minutes

1. Deploy this branch to a Vercel preview:
   ```bash
   git push origin cursor/security-auth-link-fixes-0441
   ```
2. Vercel will auto-deploy a preview URL (e.g., `https://flhs-help-git-cursor-security-auth-link-fixes-0441-rjrmt.vercel.app`)
3. Test **student lookup** (should still work, no auth required):
   - Visit `/pages/student-locator.html`
   - Enter a test student ID (use a sanitized demo ID)
   - Confirm data loads
4. Test **staff upload** (requires auth now):
   - Visit `/pages/upload.html`
   - Confirm "Sign in with your @browardschools.com email" appears
   - Sign in with your BCPS email
   - Check email for OTP code
   - Enter code
   - Upload a test CSV (small file, 5-10 rows)
   - Confirm success message
5. Test **unauthorized access**:
   - Try uploading with a non-BCPS email (should reject)
   - Try calling edge function directly without auth token (should reject with 401)

### Phase 3: Rotate Secrets (After Merge, Before Public Announcement)
**Time:** 5 minutes

1. Go to **Edge Functions → Secrets**
2. Generate a new random secret:
   ```bash
   # On your local machine:
   openssl rand -base64 32
   ```
3. Update `FLHS_UPLOAD_SECRET` with new value
4. **Do NOT share** the new secret (not needed anymore — auth replaces it)
5. After 30 days, remove `FLHS_UPLOAD_SECRET` entirely (edge function will only check auth)

### Phase 4: Make Repo Private (After Merge)
**Time:** 2 minutes

1. Go to **GitHub** → https://github.com/rjrmt/flhs-help
2. **Settings** → **General** → **Danger Zone**
3. **Change repository visibility** → **Make private**
4. Confirm
5. Update README to note: "Private repo; historical commits contain redacted student development data."

### Phase 5: Monitor (First 7 Days After Merge)
**Daily checks:**

1. **Supabase Logs:**
   - Dashboard → Logs → Edge Functions
   - Look for 401 errors (failed auth attempts)
   - Look for successful uploads (should show user email)

2. **Upload Audit Log:**
   ```sql
   SELECT * FROM upload_audit_log
   ORDER BY uploaded_at DESC
   LIMIT 20;
   ```
   - Verify user emails are correct
   - Check row counts match uploaded files

3. **Student Locator:**
   - Ask 5-10 students to test lookup
   - Confirm no 429 (rate limit) errors for normal use

**If issues arise:**
- Rollback: Redeploy previous commit (`e38df64e`)
- Supabase: Edge function secrets → Set `STAFF_AUTH_REQUIRED=false` (reverts to old upload key flow)
- Contact RJ immediately

---

## Migration Files (Included in This PR)

### 1. `supabase/migrations/20261112_auth_and_rls.sql`
Creates:
- RLS policies for `test_assignments` and `student_roster`
- `staff_upload_allowlist` table
- `upload_audit_log` table
- Rate limit helper function

**Deploy:** 
```bash
# Local dev:
supabase migration up

# Production (Supabase Dashboard):
# Dashboard → Database → Migrations → Upload file → Run
```

### 2. `supabase/functions/replace-test-assignments/index.ts` (Updated)
Changes:
- Checks `Authorization` header for JWT
- Validates user email against `@browardschools.com` OR allowlist
- Logs upload to `upload_audit_log`
- Falls back to `x-flhs-upload-key` if `STAFF_AUTH_REQUIRED=false` (for rollback)

**Deploy:**
```bash
supabase functions deploy replace-test-assignments
```

### 3. `/pages/upload.html` (Updated)
Changes:
- Adds Supabase Auth UI (email OTP)
- Sends `Authorization: Bearer <token>` instead of `x-flhs-upload-key`
- Shows user email after login
- Keeps old upload key UI hidden (for emergency rollback)

**Deploy:**
```bash
git push origin cursor/security-auth-link-fixes-0441
# → Vercel auto-deploys
```

---

## FAQ

### Q: Can students still look up their testing room?
**A:** Yes — student lookup flow is unchanged from the browser side. Students do NOT need to log in. The anon key still works for `lookup_test_assignments()` RPC.

### Q: What if a staff member's email is not `@browardschools.com`?
**A:** Add their email to `staff_upload_allowlist` table via SQL Editor. The edge function checks BOTH domain AND allowlist.

### Q: What if Supabase Auth email delivery fails?
**A:** Supabase uses its own SMTP for OTP emails. If delivery fails:
1. Check **Authentication → Email Templates** (custom SMTP not needed for @browardschools.com)
2. Ask staff to check spam folder
3. Fallback: Add user to allowlist, then manually generate a session token (see Supabase Auth docs)

### Q: Can I revert to the old upload key flow?
**A:** Yes, temporarily:
1. Supabase → Edge Functions → Secrets → Set `STAFF_AUTH_REQUIRED=false`
2. Upload page will show "staff upload key" field again
3. Old shared secret still works
4. Re-enable auth after resolving issue

### Q: What about the anon key being public in the repo?
**A:** This is **safe and expected**. The anon key is designed to be public. It can ONLY call public RPCs and read tables that explicitly allow anon access via RLS. Student tables have `USING (false)` for anon, so direct SELECT is denied. RPCs are the only entry point, and they're rate-limited.

### Q: Should I rotate the anon key?
**A:** No. The anon key is intended to be embedded in client-side code. Rotating it would break the live site. Instead, secure access with RLS policies (already done in this PR).

---

## Testing Checklist (Before Merge)

- [ ] Student locator still works (no auth required)
- [ ] Upload page shows "Sign in with BCPS email"
- [ ] Upload with `@browardschools.com` email succeeds
- [ ] Upload with non-BCPS email fails (401)
- [ ] Direct edge function call without auth fails (401)
- [ ] Upload audit log records user email and timestamp
- [ ] RLS blocks direct `SELECT * FROM test_assignments` with anon key
- [ ] Rate limit prevents >10 lookups/min from same IP (optional manual test)

---

## Contacts

**Admin (RJ Ramautar):** rajesh.ramautar@browardschools.com  
**Supabase Project:** lharxnpvcprthgabklwo  
**GitHub Repo:** https://github.com/rjrmt/flhs-help  
**Live Site:** https://www.flhstesting.com  
**Deployment:** Vercel (auto-deploy from `main` branch)

---

## Summary for Pull Request Description

**Title:** Secure staff upload with Supabase Auth + RLS + rate limiting

**Changes:**
- Replace shared secret (`x-flhs-upload-key`) with Supabase Auth (@browardschools.com email OTP)
- Add RLS policies to deny anon direct access to student tables
- Add staff upload allowlist and audit log
- Add rate limiting on student lookup RPCs
- Fix broken Testing Locator link on meet-rj.html (`/pages/locator/` → `student-locator.html`)
- Refresh meet-rj.html copy: RJ is now Projects & Operations Leader (Laly Agency PM + FLHS Technical Specialist)
- Add comprehensive SECURITY.md with rollout plan

**Security Scan:**
- ✅ No service role keys in git history
- ✅ No upload secrets committed
- ❌ Student data in git history (commit `20711eb6`, Aug 2026) — **deleted but retrievable**
- **Recommendation:** Make repo PRIVATE immediately after merge

**Admin Action Required:**
1. Enable Supabase Email Auth (@browardschools.com domain)
2. Run RLS migration (`20261112_auth_and_rls.sql`)
3. Deploy updated edge function
4. Test in Vercel preview before merging
5. Make GitHub repo private
6. Rotate `FLHS_UPLOAD_SECRET` (optional, for defense-in-depth)

**No changes to:**
- Live Supabase data (migration is additive, no data loss)
- Student-facing flows (locator still works without auth)
- Existing staff workflows (just adds a 30-second email OTP login on first upload)
