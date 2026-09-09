(() => {
  const api = window.FLHSCouponsApi;
  const print = window.FLHSCouponsPrint;

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const keyInput = document.getElementById("upload-key");
  const unlockForm = document.getElementById("unlock-form");
  const gateStatus = document.getElementById("gate-status");
  const statusEl = document.getElementById("status");
  const preview = document.getElementById("live-preview");
  const school = document.getElementById("school-name");
  const program = document.getElementById("program-name");
  const tagline = document.getElementById("tagline");
  const terms = document.getElementById("terms-text");
  const catInput = document.getElementById("category-input");
  const chips = document.getElementById("category-chips");

  /** @type {string[]} */
  let categories = [];

  function setStatus(el, message, tone = "") {
    if (!el) return;
    el.textContent = message || "";
    el.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function currentSettings() {
    return print.normalizeSettings({
      school_name: school.value,
      program_name: program.value,
      tagline: tagline.value,
      categories,
      terms_text: terms.value,
    });
  }

  function renderChips() {
    chips.innerHTML = categories
      .map(
        (label, i) =>
          `<span class="chip">${print.escapeHtml(label)} <button type="button" data-i="${i}" aria-label="Remove ${print.escapeHtml(label)}">×</button></span>`
      )
      .join("");
  }

  function renderPreview() {
    preview.innerHTML = print.previewPairHtml(currentSettings());
  }

  function fillForm(settings) {
    const next = print.normalizeSettings(settings);
    school.value = next.school_name;
    program.value = next.program_name;
    tagline.value = next.tagline;
    terms.value = next.terms_text;
    categories = next.categories.slice();
    renderChips();
    renderPreview();
  }

  async function bootstrap(key) {
    const data = await api.request("bootstrap", { uploadKey: key });
    fillForm(data.settings);
    gate.hidden = true;
    app.hidden = false;
  }

  unlockForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = keyInput.value.trim();
    if (!key) {
      setStatus(gateStatus, "Enter the staff upload key", "err");
      return;
    }
    setStatus(gateStatus, "Checking key…");
    try {
      await bootstrap(key);
    } catch (err) {
      setStatus(gateStatus, err.status === 401 ? "That key is not valid" : err.message, "err");
    }
  });

  [school, program, tagline, terms].forEach((el) => {
    el?.addEventListener("input", renderPreview);
  });

  chips?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-i]");
    if (!btn) return;
    categories.splice(Number(btn.getAttribute("data-i")), 1);
    renderChips();
    renderPreview();
  });

  document.getElementById("add-category")?.addEventListener("click", () => {
    const value = catInput.value.trim();
    if (!value) return;
    if (!categories.some((c) => c.toLowerCase() === value.toLowerCase())) categories.push(value);
    catInput.value = "";
    renderChips();
    renderPreview();
  });

  catInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("add-category")?.click();
    }
  });

  document.getElementById("save-btn")?.addEventListener("click", async () => {
    setStatus(statusEl, "Saving…");
    try {
      const data = await api.request("save_settings", { settings: currentSettings() });
      fillForm(data.settings);
      setStatus(statusEl, "Saved — the next print run will use this copy", "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Could not save settings", "err");
    }
  });

  const saved = api.getSavedKey();
  if (saved && keyInput) {
    keyInput.value = saved;
    bootstrap(saved).catch(() => {
      gate.hidden = false;
      app.hidden = true;
    });
  }
})();
