-- Migration: Staff authentication and row-level security for student data
-- Date: 2026-11-12
-- Purpose: Replace shared upload secret with Supabase Auth + RLS

-- ============================================================================
-- 1. Enable RLS on student data tables
-- ============================================================================

-- Test assignments table (if not already RLS-enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'test_assignments'
  ) THEN
    -- Table doesn't exist yet; create it
    CREATE TABLE public.test_assignments (
      id BIGSERIAL PRIMARY KEY,
      student_id TEXT NOT NULL,
      last_name TEXT,
      first_name TEXT,
      grade TEXT,
      exam TEXT,
      day TEXT,
      exam_date DATE,
      session TEXT,
      room TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_test_assignments_student_id ON public.test_assignments(student_id);
  END IF;
END $$;

ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "anon_no_direct_access_test_assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "authenticated_staff_read_test_assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "service_role_full_access_test_assignments" ON public.test_assignments;

-- Anon users CANNOT directly SELECT (must use RPCs)
CREATE POLICY "anon_no_direct_access_test_assignments"
  ON public.test_assignments
  FOR SELECT
  TO anon
  USING (false);

-- Authenticated BCPS staff can read
CREATE POLICY "authenticated_staff_read_test_assignments"
  ON public.test_assignments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())
    ILIKE '%@browardschools.com'
  );

-- Service role (edge functions) bypass RLS automatically, but explicit policy for clarity
CREATE POLICY "service_role_full_access_test_assignments"
  ON public.test_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. Student roster table (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'student_roster'
  ) THEN
    ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "anon_no_direct_access_student_roster" ON public.student_roster;
    DROP POLICY IF EXISTS "authenticated_staff_read_student_roster" ON public.student_roster;
    DROP POLICY IF EXISTS "service_role_full_access_student_roster" ON public.student_roster;

    CREATE POLICY "anon_no_direct_access_student_roster"
      ON public.student_roster
      FOR SELECT
      TO anon
      USING (false);

    CREATE POLICY "authenticated_staff_read_student_roster"
      ON public.student_roster
      FOR SELECT
      TO authenticated
      USING (
        (SELECT email FROM auth.users WHERE id = auth.uid())
        ILIKE '%@browardschools.com'
      );

    CREATE POLICY "service_role_full_access_student_roster"
      ON public.student_roster
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 3. Staff upload allowlist
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_upload_allowlist (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT,
  notes TEXT
);

-- Insert initial staff
INSERT INTO public.staff_upload_allowlist (email, added_by, notes) VALUES
  ('rajesh.ramautar@browardschools.com', 'SYSTEM', 'IT Specialist - initial admin')
ON CONFLICT (email) DO NOTHING;

-- Grant access
GRANT SELECT ON public.staff_upload_allowlist TO service_role;
GRANT SELECT ON public.staff_upload_allowlist TO authenticated;

-- RLS: authenticated staff can view allowlist
ALTER TABLE public.staff_upload_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_view_allowlist" ON public.staff_upload_allowlist;
CREATE POLICY "authenticated_can_view_allowlist"
  ON public.staff_upload_allowlist
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 4. Upload audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.upload_audit_log (
  id BIGSERIAL PRIMARY KEY,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_upload_audit_log_uploaded_at ON public.upload_audit_log(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_audit_log_user_email ON public.upload_audit_log(user_email);

GRANT INSERT ON public.upload_audit_log TO service_role;
GRANT SELECT ON public.upload_audit_log TO service_role;
GRANT SELECT ON public.upload_audit_log TO authenticated;

ALTER TABLE public.upload_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_staff_view_audit_log" ON public.upload_audit_log;
CREATE POLICY "authenticated_staff_view_audit_log"
  ON public.upload_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())
    ILIKE '%@browardschools.com'
  );

-- ============================================================================
-- 5. Helper function: Check if user is authorized staff
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_authorized_staff(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email ends with @browardschools.com OR is in allowlist
  RETURN (
    user_email ILIKE '%@browardschools.com'
    OR EXISTS (
      SELECT 1 FROM public.staff_upload_allowlist
      WHERE email = user_email
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_authorized_staff(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_authorized_staff(TEXT) TO authenticated;

-- ============================================================================
-- 6. Update existing RPCs to be explicitly security-definer
-- ============================================================================

-- Lookup test assignments (anon-accessible, single student only)
CREATE OR REPLACE FUNCTION public.lookup_test_assignments(p_student_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  last_name TEXT,
  first_name TEXT,
  grade TEXT,
  exam TEXT,
  day TEXT,
  exam_date DATE,
  session TEXT,
  room TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple rate limit: trust Supabase's built-in rate limiting or add custom check
  -- For now, this RPC is safe because it returns at most 10-20 rows per student
  RETURN QUERY
  SELECT
    t.student_id,
    t.last_name,
    t.first_name,
    t.grade,
    t.exam,
    t.day,
    t.exam_date,
    t.session,
    t.room
  FROM public.test_assignments t
  WHERE t.student_id = p_student_id
  ORDER BY t.exam_date NULLS LAST, t.session, t.exam;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_test_assignments(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_test_assignments(TEXT) TO authenticated;

-- Lookup student from roster (fallback when no test assignments)
CREATE OR REPLACE FUNCTION public.lookup_student(p_student_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  name TEXT,
  grade TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This assumes a student_roster table exists; adjust if schema differs
  -- If table doesn't exist, this function will do nothing
  RETURN QUERY
  SELECT
    r.student_id::TEXT,
    COALESCE(r.last_name || ', ' || r.first_name, r.name)::TEXT AS name,
    r.grade::TEXT
  FROM (
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_roster')
        THEN (
          SELECT row_to_json(sub)::jsonb
          FROM (
            SELECT student_id, last_name, first_name, name, grade
            FROM public.student_roster
            WHERE student_id = p_student_id
            LIMIT 1
          ) sub
        )
        ELSE NULL
      END AS data
  ) AS query
  CROSS JOIN LATERAL jsonb_to_record(query.data) AS r(
    student_id TEXT,
    last_name TEXT,
    first_name TEXT,
    name TEXT,
    grade TEXT
  )
  WHERE query.data IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_student(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_student(TEXT) TO authenticated;

-- Admin function to replace all test assignments (service role only)
CREATE OR REPLACE FUNCTION public.admin_replace_test_assignments(p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Only service role should call this (edge function with service_role key)
  -- Additional check: if called by authenticated user, verify they're authorized staff
  IF auth.role() = 'authenticated' THEN
    IF NOT public.is_authorized_staff((SELECT email FROM auth.users WHERE id = auth.uid())) THEN
      RAISE EXCEPTION 'Unauthorized: not a BCPS staff member';
    END IF;
  END IF;

  -- Truncate existing assignments
  TRUNCATE public.test_assignments;

  -- Insert new assignments from JSON array
  INSERT INTO public.test_assignments (
    student_id, last_name, first_name, grade, exam, day, exam_date, session, room
  )
  SELECT
    (item->>'student_id')::TEXT,
    (item->>'last_name')::TEXT,
    (item->>'first_name')::TEXT,
    (item->>'grade')::TEXT,
    (item->>'exam')::TEXT,
    (item->>'day')::TEXT,
    CASE
      WHEN item->>'exam_date' IS NOT NULL AND item->>'exam_date' != ''
      THEN (item->>'exam_date')::DATE
      ELSE NULL
    END,
    (item->>'session')::TEXT,
    (item->>'room')::TEXT
  FROM jsonb_array_elements(p_rows) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_replace_test_assignments(JSONB) TO service_role;

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.test_assignments IS 'Student testing room assignments. RLS enforced: anon users must use lookup RPCs, authenticated BCPS staff can read directly.';
COMMENT ON TABLE public.staff_upload_allowlist IS 'Email addresses authorized to upload student rosters. Checked by edge function.';
COMMENT ON TABLE public.upload_audit_log IS 'Audit trail for roster uploads. Records user email, timestamp, and row count.';
COMMENT ON FUNCTION public.is_authorized_staff(TEXT) IS 'Returns true if email is @browardschools.com or in allowlist.';
COMMENT ON FUNCTION public.lookup_test_assignments(TEXT) IS 'Public RPC: returns test assignments for a single student ID. Anon-accessible.';
COMMENT ON FUNCTION public.lookup_student(TEXT) IS 'Public RPC: returns basic student info if no test assignments. Anon-accessible.';
COMMENT ON FUNCTION public.admin_replace_test_assignments(JSONB) IS 'Admin RPC: truncates and replaces all test assignments. Service role only.';
