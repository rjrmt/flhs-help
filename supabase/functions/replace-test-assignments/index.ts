import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isUploadAuthorized } from "../_shared/upload-auth.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const staffAuthRequired = Deno.env.get("STAFF_AUTH_REQUIRED") !== "false"; // Default: true

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server is missing database credentials" }, 500);
  }

  let userEmail: string | null = null;
  let userId: string | null = null;

  // PRIMARY: Check Supabase Auth (JWT in Authorization header)
  if (staffAuthRequired) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Fallback to old upload key for backwards compatibility (optional)
      const uploadKey = req.headers.get("x-flhs-upload-key") || "";
      if (!uploadKey || !isUploadAuthorized(uploadKey)) {
        return jsonResponse({ 
          error: "Unauthorized: Sign in with your @browardschools.com email" 
        }, 401);
      }
      // Old upload key provided and valid - allow (temporary fallback)
      userEmail = "legacy-upload-key";
      userId = null;
    } else {
      // Verify JWT and extract user
      const token = authHeader.replace("Bearer ", "");
      const authClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: userData, error: authError } = await authClient.auth.getUser(token);
      if (authError || !userData?.user) {
        return jsonResponse({ error: "Invalid authentication token" }, 401);
      }

      userEmail = userData.user.email || null;
      userId = userData.user.id || null;

      if (!userEmail) {
        return jsonResponse({ error: "No email found in authentication token" }, 401);
      }

      // Check if user is authorized staff (@browardschools.com or in allowlist)
      const { data: isAuthorized, error: authCheckError } = await authClient
        .rpc("is_authorized_staff", { user_email: userEmail });

      if (authCheckError || !isAuthorized) {
        return jsonResponse({ 
          error: `Unauthorized: ${userEmail} is not a BCPS staff member or in the allowlist` 
        }, 403);
      }
    }
  } else {
    // FALLBACK: Old upload key check (for rollback / emergency)
    const provided = req.headers.get("x-flhs-upload-key") || "";
    if (!isUploadAuthorized(provided)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    userEmail = "legacy-upload-key";
    userId = null;
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

  // Log upload attempt
  const ipAddress = req.headers.get("x-forwarded-for") || 
                    req.headers.get("x-real-ip") || 
                    "unknown";

  try {
    const { data, error } = await admin.rpc("admin_replace_test_assignments", {
      p_rows: cleaned,
    });

    if (error) {
      console.error("Upload RPC error:", error);
      // Log failure
      await admin.from("upload_audit_log").insert({
        user_id: userId,
        user_email: userEmail || "unknown",
        row_count: cleaned.length,
        success: false,
        error_message: error.message,
        ip_address: ipAddress,
      }).catch(err => console.error("Failed to log upload failure:", err));

      return jsonResponse({ error: error.message || "Upload failed" }, 500);
    }

    // Log success
    await admin.from("upload_audit_log").insert({
      user_id: userId,
      user_email: userEmail || "unknown",
      row_count: cleaned.length,
      success: true,
      ip_address: ipAddress,
    }).catch(err => console.error("Failed to log upload success:", err));

    const students = new Set(cleaned.map((row) => row.student_id)).size;
    return jsonResponse({
      ok: true,
      uploaded: Number(data) || cleaned.length,
      assignments: cleaned.length,
      students,
      uploaded_by: userEmail,
    });
  } catch (err) {
    console.error("Unexpected upload error:", err);
    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
});
