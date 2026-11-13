(() => {
  const api = window.FLHSCouponsApi;
  const statusEl = document.getElementById("gate-status");
  const form = document.getElementById("unlock-form");
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

  document.addEventListener("flhs-staff-unlocked", () => {
    api.request("bootstrap").then(() => {
      showApps();
      setStatus("");
    }).catch((err) => {
      setStatus(err.message || "Could not open coupon tools", "err");
    });
  });
})();
