/* Shared browser client for FLHS Help. Uses the public anon key only.
   Student roster tables are private; lookups go through RPCs. */
(() => {
  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  let client = null;

  window.flhsCreateDb = function flhsCreateDb() {
    if (client) return client;
    const cfg = window.FLHS_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey) {
      throw new Error("Missing Supabase config");
    }
    if (!window.supabase?.createClient) {
      throw new Error("Supabase library did not load");
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
  };
})();
