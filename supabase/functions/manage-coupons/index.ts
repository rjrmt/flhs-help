import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-flhs-upload-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StaffRow = {
  name?: string;
  room?: string;
  department?: string;
  default_quantity?: number | string;
};

type SettingsPayload = {
  school_name?: string;
  program_name?: string;
  tagline?: string;
  categories?: string[];
  terms_text?: string;
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

function cleanStaffRows(rows: StaffRow[]) {
  return rows
    .map((row) => {
      const name = String(row.name || "").trim();
      const out: Record<string, unknown> = { name };
      if ("room" in row) out.room = String(row.room || "").trim();
      if ("department" in row) out.department = String(row.department || "").trim();
      if (row.default_quantity != null && String(row.default_quantity).trim() !== "") {
        const qty = Number(row.default_quantity);
        if (Number.isFinite(qty) && qty > 0) out.default_quantity = Math.floor(qty);
      }
      return out;
    })
    .filter((row) => row.name);
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

  let payload: {
    action?: string;
    rows?: StaffRow[];
    id?: string;
    name?: string;
    room?: string;
    department?: string;
    active?: boolean;
    default_quantity?: number;
    settings?: SettingsPayload;
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = String(payload.action || "bootstrap").trim();
  let admin;
  try {
    admin = asClient();
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    if (action === "bootstrap") {
      const [staffRes, settingsRes] = await Promise.all([
        admin.rpc("admin_list_coupon_staff"),
        admin.rpc("admin_get_coupon_settings"),
      ]);
      if (staffRes.error) throw staffRes.error;
      if (settingsRes.error) throw settingsRes.error;
      return jsonResponse({
        ok: true,
        roster: staffRes.data || [],
        settings: settingsRes.data || null,
      });
    }

    if (action === "upsert_roster") {
      const rows = cleanStaffRows(Array.isArray(payload.rows) ? payload.rows : []);
      if (!rows.length) return jsonResponse({ error: "No staff rows to import" }, 400);
      if (rows.length > 2000) return jsonResponse({ error: "Too many rows (max 2,000)" }, 400);
      const { data, error } = await admin.rpc("admin_upsert_coupon_staff", { p_rows: rows });
      if (error) throw error;
      const list = await admin.rpc("admin_list_coupon_staff");
      if (list.error) throw list.error;
      return jsonResponse({
        ok: true,
        inserted: Number(data?.inserted) || 0,
        updated: Number(data?.updated) || 0,
        roster: list.data || [],
      });
    }

    if (action === "update_staff") {
      const id = String(payload.id || "").trim();
      if (!id) return jsonResponse({ error: "Missing staff id" }, 400);
      const args: Record<string, unknown> = { p_id: id };
      if (payload.name != null) args.p_name = String(payload.name);
      if (payload.room != null) args.p_room = String(payload.room);
      if (payload.department != null) args.p_department = String(payload.department);
      if (payload.active != null) args.p_active = Boolean(payload.active);
      if (payload.default_quantity != null) {
        args.p_default_quantity = Math.max(1, Math.floor(Number(payload.default_quantity) || 1));
      }
      const { data, error } = await admin.rpc("admin_update_coupon_staff", args);
      if (error) throw error;
      return jsonResponse({ ok: true, staff: data });
    }

    if (action === "save_settings") {
      const settings = payload.settings || {};
      const categories = Array.isArray(settings.categories)
        ? settings.categories.map((c) => String(c || "").trim()).filter(Boolean)
        : [];
      const { data, error } = await admin.rpc("admin_set_coupon_settings", {
        p_school_name: String(settings.school_name || ""),
        p_program_name: String(settings.program_name || ""),
        p_tagline: String(settings.tagline || ""),
        p_categories: categories,
        p_terms_text: String(settings.terms_text || ""),
      });
      if (error) throw error;
      return jsonResponse({ ok: true, settings: data });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error(err);
    const message = (err as { message?: string })?.message || "Request failed";
    return jsonResponse({ error: message }, 500);
  }
});
