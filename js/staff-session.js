/* Signed-in @browardschools.com session for staff tools. */
(() => {
  function isDistrictEmail(email) {
    const parts = String(email || "").trim().toLowerCase().split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1] === "browardschools.com";
  }

  function client() {
    const cfg = window.FLHS_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase) return null;
    if (!window.__flhsStaffClient) {
      window.__flhsStaffClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return window.__flhsStaffClient;
  }

  async function user() {
    const db = client();
    if (!db) return null;
    const { data, error } = await db.auth.getUser();
    const email = data?.user?.email || "";
    if (error || !data?.user || !isDistrictEmail(email)) {
      if (data?.user) await db.auth.signOut();
      return null;
    }
    return data.user;
  }

  async function headers() {
    const db = client();
    const cfg = window.FLHS_SUPABASE || {};
    if (!db || !cfg.anonKey) throw new Error("Missing public Supabase config");
    const { data } = await db.auth.getSession();
    const token = data?.session?.access_token || "";
    const email = data?.session?.user?.email || "";
    if (!token || !isDistrictEmail(email)) {
      const err = new Error("Sign in with your @browardschools.com email");
      err.status = 401;
      throw err;
    }
    return {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token}`,
    };
  }

  async function sendCode(email) {
    const db = client();
    if (!db) throw new Error("Missing public Supabase config");
    if (!isDistrictEmail(email)) {
      const err = new Error("Only @browardschools.com emails can sign in");
      err.status = 403;
      throw err;
    }
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async function verifyCode(email, code) {
    const db = client();
    if (!db) throw new Error("Missing public Supabase config");
    const { data, error } = await db.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) throw error;
    const signedIn = data?.user?.email || "";
    if (!isDistrictEmail(signedIn)) {
      await db.auth.signOut();
      throw new Error("Only @browardschools.com emails can sign in");
    }
    return data.user;
  }

  window.flhsStaff = { isDistrictEmail, client, user, headers, sendCode, verifyCode };
})();
