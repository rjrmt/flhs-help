import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
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
  const { data, error } = await admin.rpc("admin_laptop_need_status");
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

  const expected = Deno.env.get("FLHS_UPLOAD_SECRET") || "";
  const provided = req.headers.get("x-flhs-upload-key") || "";
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

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

    if (action === "save_need") {
      const staffId = Number(payload.staff_id);
      if (!Number.isFinite(staffId)) {
        return jsonResponse({ error: "staff_id required" }, 400);
      }
      const { data, error } = await admin.rpc("submit_laptop_need", {
        p_staff_id: staffId,
        p_cart_checked: Boolean(payload.cart_checked),
        p_max_students: Number(payload.max_students),
        p_actual_count: Number(payload.actual_count),
        p_extras_needed: Number(payload.extras_needed),
        p_notes: String(payload.notes || ""),
        p_reported_cart: String(payload.reported_cart || ""),
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, saved: data, ...status });
    }

    if (action === "patch_staff") {
      const staffId = Number(payload.staff_id);
      if (!Number.isFinite(staffId)) {
        return jsonResponse({ error: "staff_id required" }, 400);
      }
      const { data, error } = await admin.rpc("admin_patch_staff_room", {
        p_staff_id: staffId,
        p_room: String(payload.room ?? ""),
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, staff: data, ...status });
    }

    if (action === "assign_cart") {
      const cartCode = String(payload.cart_code || "").trim();
      const staffId =
        payload.staff_id == null || payload.staff_id === ""
          ? null
          : Number(payload.staff_id);
      if (!cartCode) return jsonResponse({ error: "cart_code required" }, 400);
      if (staffId != null && !Number.isFinite(staffId)) {
        return jsonResponse({ error: "Invalid staff_id" }, 400);
      }
      const { data, error } = await admin.rpc("admin_assign_laptop_cart", {
        p_cart_code: cartCode,
        p_staff_id: staffId,
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, assignment: data, ...status });
    }

    if (action === "delete_need") {
      const staffId = Number(payload.staff_id);
      if (!Number.isFinite(staffId)) {
        return jsonResponse({ error: "staff_id required" }, 400);
      }
      const { data, error } = await admin.rpc("admin_delete_laptop_need", {
        p_staff_id: staffId,
      });
      if (error) throw error;
      const status = await loadStatus(admin);
      return jsonResponse({ ok: true, deleted: data, ...status });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error(err);
    const message = (err as { message?: string })?.message || "Request failed";
    return jsonResponse({ error: message }, 500);
  }
});
