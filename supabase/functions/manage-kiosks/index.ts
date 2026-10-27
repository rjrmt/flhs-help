import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isUploadAuthorized } from "../_shared/upload-auth.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-flhs-upload-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server is missing database credentials");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function todayEastern() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const provided = req.headers.get("x-flhs-upload-key") || "";
  if (!isUploadAuthorized(provided)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const action = String(payload.action || "status").trim();
  const date = String(payload.date || todayEastern()).trim() || todayEastern();
  const status = String(payload.status || "all").trim() || "all";
  const query = String(payload.query || "").trim();

  let admin;
  try {
    admin = asClient();
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    if (action === "status") {
      const [statsRes, listRes, bathRes] = await Promise.all([
        admin.rpc("admin_kiosk_stats", { p_date: date }),
        admin.rpc("admin_kiosk_list", {
          p_program: "star",
          p_date: date,
          p_status: status,
          p_query: query,
        }),
        admin.rpc("admin_kiosk_bathroom_list", {
          p_date: date,
          p_status: status,
          p_query: query,
        }),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (listRes.error) throw listRes.error;
      if (bathRes.error) throw bathRes.error;
      return jsonResponse({
        ok: true,
        stats: statsRes.data && typeof statsRes.data === "object" ? statsRes.data : {},
        rows: Array.isArray(listRes.data) ? listRes.data : [],
        bathroom: Array.isArray(bathRes.data) ? bathRes.data : [],
      });
    }

    if (action === "checkout") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonResponse({ error: "id required" }, 400);
      const { data, error } = await admin.rpc("admin_kiosk_checkout_id", { p_id: id });
      if (error) throw error;
      return jsonResponse({ ok: true, result: data });
    }

    if (action === "bathroom_return") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonResponse({ error: "id required" }, 400);
      const { data, error } = await admin.rpc("admin_kiosk_bathroom_return", { p_id: id });
      if (error) throw error;
      return jsonResponse({ ok: true, result: data });
    }

    if (action === "set_permission") {
      const studentId = String(payload.student_id || "").trim();
      const perm = String(payload.status || "").trim();
      if (!studentId) return jsonResponse({ error: "student_id required" }, 400);
      const { data, error } = await admin.rpc("admin_kiosk_set_permission", {
        p_student_id: studentId,
        p_status: perm,
        p_by: "mission-control",
      });
      if (error) throw error;
      return jsonResponse({ ok: true, result: data });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || "Request failed" }, 500);
  }
});
