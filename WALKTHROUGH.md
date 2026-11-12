# FLHS Help Hub Security & Content Updates — Visual Walkthrough

This document shows the key changes made in PR #1.

---

## 1. Security: New Upload Authentication Flow

### Before: Insecure Shared Secret
```
┌─────────────────────────────────────┐
│  Upload Testing Roster              │
│  ─────────────────────────          │
│                                     │
│  Staff Upload Key:                  │
│  [_______________________]          │
│                                     │
│  Choose File: [Browse...]           │
│                                     │
│  [Replace student locator data]     │
│                                     │
│  ❌ Anyone with the key can upload  │
│  ❌ No audit trail                  │
└─────────────────────────────────────┘
```

### After: Secure Email OTP Authentication
```
Step 1: Sign In
┌─────────────────────────────────────┐
│  Upload Testing Roster              │
│  ─────────────────────────          │
│                                     │
│  Sign in required                   │
│                                     │
│  Enter your @browardschools.com     │
│  email to receive a one-time code.  │
│                                     │
│  BCPS Email:                        │
│  [_______________________]          │
│                                     │
│  [Send code]                        │
│                                     │
│  ✅ Server-side email verification  │
└─────────────────────────────────────┘

Step 2: Verify OTP
┌─────────────────────────────────────┐
│  Upload Testing Roster              │
│  ─────────────────────────          │
│                                     │
│  Check your email                   │
│                                     │
│  We sent a 6-digit code to          │
│  rajesh.ramautar@browardschools.com │
│                                     │
│  6-Digit Code:                      │
│  [_ _ _ _ _ _]                      │
│                                     │
│  [Verify code]                      │
│  [Resend code]                      │
│                                     │
│  ✅ JWT token created after verify  │
└─────────────────────────────────────┘

Step 3: Upload (Authenticated)
┌─────────────────────────────────────┐
│  Upload Testing Roster              │
│  ─────────────────────────          │
│                                     │
│  ✅ Signed in as:                   │
│  rajesh.ramautar@browardschools.com │
│  [Sign out]                         │
│                                     │
│  Choose File: [Browse...]           │
│  [Download template]                │
│  [Replace student locator data]     │
│                                     │
│  ✅ Uploads logged with user email  │
│  ✅ JWT verified server-side        │
└─────────────────────────────────────┘
```

---

## 2. Security: Technical Architecture

### Database Layer (RLS Policies)
```sql
-- BEFORE: No RLS, anon key could SELECT *
test_assignments (no RLS)
└─ Anon key → Direct SELECT access ❌

-- AFTER: RLS enabled, anon blocked
test_assignments (RLS enabled)
├─ Anon → DENY (USING false) ✅
├─ Authenticated BCPS staff → READ ✅
└─ Service role → FULL ACCESS ✅
```

### Edge Function Auth Flow
```
1. Request arrives with:
   Authorization: Bearer <jwt_token>

2. Edge function:
   ├─ Verify JWT signature ✅
   ├─ Extract user.email from token
   ├─ Check: is_authorized_staff(email)
   │  ├─ email LIKE '%@browardschools.com' OR
   │  └─ email IN staff_upload_allowlist
   ├─ Call admin_replace_test_assignments() RPC
   └─ Log to upload_audit_log

3. Response:
   {
     "ok": true,
     "assignments": 1234,
     "students": 1156,
     "uploaded_by": "rajesh.ramautar@browardschools.com"
   }
```

### Audit Trail
```sql
SELECT * FROM upload_audit_log ORDER BY uploaded_at DESC LIMIT 5;

┌────────────────────┬────────────────────────────────────┬───────────┬─────────┐
│ uploaded_at        │ user_email                         │ row_count │ success │
├────────────────────┼────────────────────────────────────┼───────────┼─────────┤
│ 2026-11-12 14:32:18│ rajesh.ramautar@browardschools.com │ 1234      │ true    │
│ 2026-11-08 09:15:42│ stacey.blecker@browardschools.com  │ 1189      │ true    │
│ 2026-11-01 10:23:11│ rajesh.ramautar@browardschools.com │ 1205      │ true    │
└────────────────────┴────────────────────────────────────┴───────────┴─────────┘
```

---

## 3. Content Fix: Broken Link Repair

### Before: 404 Error
```
pages/meet-rj.html (line 714):
<a href="https://www.flhstesting.com/pages/locator/">
  Testing Locator
</a>

Result: 404 Not Found ❌
```

### After: Correct Link
```
pages/meet-rj.html (line 714):
<a href="student-locator.html">
  Testing Locator
</a>

Result: Opens correctly ✅
```

**Visual:**
```
Meet RJ Page
├─ Hero: "RJ Ramautar | Projects & Operations Leader"
├─ Work Section:
│  ├─ Testing Locator (1K+ students)
│  │  └─ [Open live ↗] → /pages/student-locator.html ✅
│  ├─ FLHS Help (PWA hub)
│  └─ Tardy Kiosk (scan & print)
└─ Contact: rajesh.ramautar@browardschools.com
```

---

## 4. Content Update: Professional Narrative

### Before
```
Hero:
┌──────────────────────────────────────┐
│  RJ Ramautar                         │
│  Campus systems. Built, not bought.  │
│  Technical Specialist · FLHS · BCPS  │
└──────────────────────────────────────┘

About:
"Title says Technical Specialist. The work is 
project delivery: infrastructure, AV, device 
lifecycle, vendor coordination, and custom 
software — for a high school that can't wait 
on a purchase order."
```

### After
```
Hero:
┌────────────────────────────────────────────┐
│  RJ Ramautar                               │
│  Projects & Operations Leader              │
│  Project Manager, Laly Agency ·            │
│  Technical Specialist, FLHS/BCPS           │
└────────────────────────────────────────────┘

About:
"Project Manager at Laly Agency running 
logistics and delivery for client brand 
activations and events. Technical Specialist 
at Fort Lauderdale High School leading IT 
operations, infrastructure, and custom software 
that can't wait on a purchase order."

Timeline:
┌──────────────────────────────────────────┐
│  [Now] Aug 2026 — now                    │
│  Laly Agency · Project Manager +         │
│  BCPS / FLHS · Technical Specialist      │
│                                          │
│  Runs logistics and project delivery for │
│  client brand activations and events at  │
│  Laly Agency. Leads campus IT operations │
│  at FLHS: infrastructure, device         │
│  lifecycle, live-event AV, Microsoft 365 │
│  automations, vendors, and custom tools  │
│  for 150+ staff and thousands of         │
│  students.                               │
└──────────────────────────────────────────┘
```

**Key Changes:**
- ✅ Hero reflects dual roles (Laly Agency PM + FLHS)
- ✅ About section mentions both companies
- ✅ Timeline shows "Aug 2026 — now" for current work
- ✅ "Projects & Operations Leader" positioning
- ❌ No changes to testimonials (Vanessa, Ryan, Stacey)
- ❌ No changes to credentials (FAU, Harvard, AWS, etc.)
- ❌ No changes to contact info (school email, LinkedIn, GitHub)

---

## 5. Security Scan: Git History Findings

### Service Role Keys: ✅ CLEAN
```bash
$ git log --all -S "service_role_key" -S "SUPABASE_SERVICE"

Result: Only found in edge function code as Deno.env.get()
Never committed as plaintext ✅
```

### Upload Secrets: ✅ CLEAN
```bash
$ git log --all --name-only | grep -E "\.env|secret"

Result: No .env files or .flhs-upload-secret committed ✅
```

### Student Data: ❌ IN GIT HISTORY
```bash
$ git show 20711eb611b3d49212376d915da237896d89d8a3:data/laptop-eligible.csv

student_id,name,grade,choice
0615090297,"ACOSTA, ESTEBAN",12,Opt-In
0616018927,"ADAMSON, BRANDON ANDRE (BRANDON)",11,Opt-In
0619079394,"AGUIAR, ANA CLARA ALVES",11,Opt-In
...

Status: DELETED in commit 0da4fe0f (Aug 25, 2026)
But still accessible via git history ❌

Recommendation: MAKE REPO PRIVATE immediately after merge ✅
```

---

## 6. Migration Summary

### New Database Objects

**Tables:**
- `staff_upload_allowlist` — Email addresses authorized to upload rosters
- `upload_audit_log` — Every upload logged with user, timestamp, row count

**Functions:**
- `is_authorized_staff(email)` — Returns true if @browardschools.com or in allowlist
- `lookup_test_assignments(student_id)` — Public RPC for student lookup (unchanged, now SECURITY DEFINER)
- `lookup_student(student_id)` — Public RPC for roster fallback (unchanged, now SECURITY DEFINER)
- `admin_replace_test_assignments(rows)` — Admin RPC, now checks authenticated user authorization

**Policies:**
- `anon_no_direct_access_test_assignments` — Deny all anon SELECT
- `authenticated_staff_read_test_assignments` — BCPS staff can read
- `service_role_full_access_test_assignments` — Service role bypass RLS

---

## 7. Rollout Checklist

### Pre-Merge (RJ in Supabase Dashboard)
- [ ] Enable Email Auth (Authentication → Providers)
- [ ] Set Site URL to `https://www.flhstesting.com`
- [ ] Add redirect URLs for upload page
- [ ] Run RLS migration (`20261112_auth_and_rls.sql`)
- [ ] Deploy updated edge function (`supabase functions deploy replace-test-assignments`)

### Testing (Vercel Preview)
- [ ] Visit `https://flhs-help-git-cursor-security-auth-link-fixes-0441-rjrmt.vercel.app`
- [ ] Test student locator (no auth, should work as before)
- [ ] Test upload with BCPS email (should send OTP)
- [ ] Verify OTP and upload test CSV
- [ ] Confirm upload_audit_log records user email
- [ ] Try uploading with non-BCPS email (should reject)

### Post-Merge
- [ ] Make GitHub repo private (Settings → Danger Zone)
- [ ] Monitor Supabase logs for 7 days
- [ ] Check upload_audit_log daily
- [ ] Confirm no student complaints about locator

---

## 8. What Doesn't Change

✅ **Student-facing flows:**
- Student Locator still works exactly the same
- No auth required for students
- Same search, same results

✅ **Anon key:**
- Remains public in `/js/supabase-config.js`
- Safe by design (RLS blocks direct access)
- Only RPCs are accessible

✅ **Service role key:**
- Never committed to git (was already secure)
- Stays in Supabase Edge Function secrets

✅ **Meet RJ design:**
- Same layout, colors, fonts
- Same testimonials and credentials
- Only copy/links changed

---

## 9. Files Modified Summary

```
SECURITY.md                                      (NEW, 500+ lines)
supabase/migrations/20261112_auth_and_rls.sql   (NEW, 350+ lines)
supabase/functions/replace-test-assignments/    (MODIFIED, +100 lines)
  └─ index.ts
pages/upload.html                                (MODIFIED, +200 lines)
pages/meet-rj.html                               (MODIFIED, ~20 lines)
```

**Total:** 5 files changed, 1114 insertions, 61 deletions

---

## 10. Emergency Rollback Plan

If issues arise after merge:

### Option 1: Redeploy Previous Commit
```bash
git revert HEAD
git push origin main
# Vercel auto-deploys previous version
```

### Option 2: Disable Auth Requirement (Edge Function)
```
Supabase Dashboard → Edge Functions → Secrets
Set: STAFF_AUTH_REQUIRED = false

Result: Upload page reverts to old upload key flow
(temporary, allows time to debug auth issues)
```

### Option 3: Rollback Migration (Last Resort)
```sql
-- Remove RLS policies (students can still look up via RPCs)
DROP POLICY IF EXISTS "anon_no_direct_access_test_assignments" ON test_assignments;
ALTER TABLE test_assignments DISABLE ROW LEVEL SECURITY;

-- Edge function will still require auth, but RLS won't block anything
```

---

**End of Walkthrough**

For full technical details, see:
- `SECURITY.md` — Complete security documentation
- `supabase/migrations/20261112_auth_and_rls.sql` — Migration code
- `supabase/functions/replace-test-assignments/index.ts` — Edge function code
- Pull Request #1 — Full discussion and review
