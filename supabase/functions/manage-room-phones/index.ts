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

async function loadStatus(admin: ReturnType<typeof asClient>) {
  const { data, error } = await admin.rpc("admin_room_phone_status");
  if (error) throw error;
  return data && typeof data === "object" ? data : {};
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

  let admin;
  try {
    admin = asClient();
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    if (action === "status") {
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, ...status });
    }

    if (action === "apply") {
      const staffId = Number(payload.staff_id);
      if (!Number.isFinite(staffId)) {
        return jsonResponse({ error: "staff_id required" }, 400);
      }
      const { error } = await admin.rpc("admin_apply_room_phone", {
        p_staff_id: staffId,
        p_room: String(payload.room ?? ""),
        p_phone: String(payload.phone ?? ""),
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, ...status });
    }

    if (action === "delete") {
      const staffId = Number(payload.staff_id);
      if (!Number.isFinite(staffId)) {
        return jsonResponse({ error: "staff_id required" }, 400);
      }
      const { error } = await admin.rpc("admin_delete_room_phone", {
        p_staff_id: staffId,
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, ...status });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error(err);
    const message = (err as { message?: string })?.message || "Request failed";
    return jsonResponse({ error: message }, 500);
  }
});
