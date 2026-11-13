import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AssignmentRow = {
  student_id: string;
  last_name?: string;
  first_name?: string;
  grade?: string;
  exam?: string;
  day?: string;
  exam_date?: string | null;
  session?: string;
  room?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isDistrictEmail(email: string) {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === "browardschools.com";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server is missing database credentials" }, 500);
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return jsonResponse({ error: "Sign in with your @browardschools.com email" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: authError } = await admin.auth.getUser(token);
  const email = userData?.user?.email?.trim().toLowerCase() || "";
  const userId = userData?.user?.id || null;
  if (authError || !userData?.user || !isDistrictEmail(email)) {
    return jsonResponse(
      { error: "Sign-in is limited to a @browardschools.com account" },
      authError || !userData?.user ? 401 : 403,
    );
  }

  let payload: { rows?: AssignmentRow[] };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) return jsonResponse({ error: "No assignment rows to upload" }, 400);
  if (rows.length > 20000) return jsonResponse({ error: "Too many rows (max 20,000)" }, 400);

  const cleaned = rows
    .map((row) => ({
      student_id: String(row.student_id || "").trim(),
      last_name: String(row.last_name || "").trim(),
      first_name: String(row.first_name || "").trim(),
      grade: String(row.grade || "").trim(),
      exam: String(row.exam || "").trim(),
      day: String(row.day || "").trim(),
      exam_date: row.exam_date ? String(row.exam_date).trim() : null,
      session: String(row.session || "").trim().toUpperCase(),
      room: String(row.room || "").trim(),
    }))
    .filter((row) => row.student_id);

  if (!cleaned.length) {
    return jsonResponse({ error: "No valid student IDs found in upload" }, 400);
  }

  async function record(success: boolean, rowCount: number, detail: string) {
    const { error } = await admin.rpc("admin_record_audit", {
      p_actor_id: userId,
      p_actor_email: email,
      p_action: "replace_test_assignments",
      p_target: "private.test_assignments",
      p_row_count: rowCount,
      p_success: success,
      p_detail: detail,
    });
    if (error) console.error("Audit log failed:", error.message);
  }

  try {
    const { data, error } = await admin.rpc("admin_replace_test_assignments", {
      p_rows: cleaned,
    });
    if (error) {
      await record(false, cleaned.length, error.message);
      return jsonResponse({ error: error.message || "Upload failed" }, 500);
    }

    await record(true, cleaned.length, "");
    const students = new Set(cleaned.map((row) => row.student_id)).size;
    return jsonResponse({
      ok: true,
      uploaded: Number(data) || cleaned.length,
      assignments: cleaned.length,
      students,
      uploaded_by: email,
    });
  } catch (err) {
    console.error("Unexpected upload error:", err);
    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
});
