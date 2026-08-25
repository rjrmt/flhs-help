import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-flhs-upload-key",
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

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("FLHS_UPLOAD_SECRET") || "";
  const provided = req.headers.get("x-flhs-upload-key") || "";
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server is missing database credentials" }, 500);
  }

  let payload: { rows?: AssignmentRow[] };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    return jsonResponse({ error: "No assignment rows to upload" }, 400);
  }
  if (rows.length > 20000) {
    return jsonResponse({ error: "Too many rows (max 20,000)" }, 400);
  }

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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("admin_replace_test_assignments", {
    p_rows: cleaned,
  });

  if (error) {
    console.error(error);
    return jsonResponse({ error: error.message || "Upload failed" }, 500);
  }

  const students = new Set(cleaned.map((row) => row.student_id)).size;
  return jsonResponse({
    ok: true,
    uploaded: Number(data) || cleaned.length,
    assignments: cleaned.length,
    students,
  });
});
