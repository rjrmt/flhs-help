import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { districtEmailFromRequest } from "../_shared/staff-session.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  const session = await districtEmailFromRequest(req);
  if ("error" in session) return jsonResponse({ error: session.error }, session.status);

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const action = String(payload.action || "status").trim();
  if (action === "unlock") {
    return jsonResponse({ ok: true });
  }

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
    if (action === "config") {
      const { data, error } = await admin.rpc("admin_kiosk_get_config");
      if (error) throw error;
      return jsonResponse({ ok: true, config: data });
    }

    if (action === "save_config") {
      const bathroomMax = Number(payload.bathroom_max_active);
      const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
      const { data, error } = await admin.rpc("admin_kiosk_save_config", {
        p_bathroom_max: bathroomMax,
        p_subjects: subjects,
      });
      if (error) throw error;
      return jsonResponse({ ok: true, config: data });
    }

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
