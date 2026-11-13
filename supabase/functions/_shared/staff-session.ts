import { createClient } from "jsr:@supabase/supabase-js@2";

export function isDistrictEmail(email: string) {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === "browardschools.com";
}

/** Accepts a signed-in @browardschools.com session. The anon key is not a user. */
export async function districtEmailFromRequest(req: Request): Promise<
  { email: string } | { status: number; error: string }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!supabaseUrl || !serviceKey || !token) {
    return { status: 401, error: "Sign in with your @browardschools.com email" };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  const email = data?.user?.email?.trim().toLowerCase() || "";
  if (error || !data?.user || !isDistrictEmail(email)) {
    return {
      status: error || !data?.user ? 401 : 403,
      error: "Sign-in is limited to a @browardschools.com account",
    };
  }
  return { email };
}
