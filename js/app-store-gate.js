/* STAR tools menu lock. Uses the same staff upload key as the other IT tools.
   The accepted keys live in supabase/functions/_shared/upload-auth.ts. */
(() => {
  const KEY_STORAGE = "flhs-upload-key";
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-kiosks";

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const form = document.getElementById("unlock-form");
  const keyInput = document.getElementById("upload-key");
  const gateStatus = document.getElementById("gate-status");

  function getSavedKey() {
    try {
      return sessionStorage.getItem(KEY_STORAGE) || "";
    } catch {
      return "";
    }
  }

  function saveKey(key) {
    try {
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      /* ignore */
    }
  }

  function showApps() {
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
  }

  async function verifyKey(key) {
    const trimmed = String(key || "").trim();
    if (!trimmed) return false;
    const cfg = window.FLHS_SUPABASE || {};
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey || "",
        Authorization: `Bearer ${cfg.anonKey || ""}`,
        "x-flhs-upload-key": trimmed,
      },
      body: JSON.stringify({ action: "unlock" }),
    });
    if (response.status === 401) return false;
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) return true;
    if (response.status === 400 && data.error === "Unknown action") return true;
    throw new Error(data.error || "Could not check the key.");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = keyInput?.value.trim() || "";
    if (gateStatus) gateStatus.textContent = "Checking…";
    try {
      const ok = await verifyKey(key);
      if (!ok) {
        if (gateStatus) gateStatus.textContent = "That key does not match.";
        return;
      }
      saveKey(key);
      if (gateStatus) gateStatus.textContent = "";
      showApps();
    } catch (err) {
      if (gateStatus) gateStatus.textContent = err.message || "Could not check the key.";
    }
  });

  const saved = getSavedKey();
  if (saved) {
    verifyKey(saved)
      .then((ok) => {
        if (ok) showApps();
      })
      .catch(() => {});
  }
})();
