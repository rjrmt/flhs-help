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

  let admin;
  try {
    admin = asClient();
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    const { data, error } = await admin.rpc("admin_laptop_need_status");
    if (error) throw error;
    return jsonResponse({ ok: true, ...(data && typeof data === "object" ? data : {}) });
  } catch (err) {
    console.error(err);
    const message = (err as { message?: string })?.message || "Request failed";
    return jsonResponse({ error: message }, 500);
  }
});
