(() => {
  const api = window.FLHSCouponsApi;
  const form = document.getElementById("unlock-form");
  const keyInput = document.getElementById("upload-key");
  const unlockBtn = document.getElementById("unlock-btn");
  const statusEl = document.getElementById("gate-status");
  const apps = document.getElementById("coupon-apps");

  function setStatus(message, tone = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function showApps() {
    if (form) form.hidden = true;
    if (apps) apps.hidden = false;
  }

  async function unlock(key) {
    await api.request("bootstrap", { uploadKey: key });
    showApps();
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = keyInput.value.trim();
    if (!key) {
      setStatus("Enter the staff upload key", "err");
      return;
    }
    if (unlockBtn) unlockBtn.disabled = true;
    setStatus("Checking key…");
    try {
      await unlock(key);
      setStatus("Unlocked", "ok");
    } catch (err) {
      setStatus(err.status === 401 ? "That key is not valid" : err.message, "err");
    } finally {
      if (unlockBtn) unlockBtn.disabled = false;
    }
  });

  const saved = api.getSavedKey();
  if (saved && keyInput) {
    keyInput.value = saved;
    unlock(saved).catch(() => {});
  }
})();
