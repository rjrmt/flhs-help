(() => {
  const STUDENT_ID_LEN = 10;
  const AUTO_SEARCH_MS = 120;
  const RESET_MS = 6500;

  const form = document.getElementById("kiosk-form");
  const input = document.getElementById("student-number");
  const searchBtn = document.getElementById("search-btn");
  const panel = document.getElementById("flow-panel");
  const capEl = document.getElementById("cap-pill");
  const capText = document.getElementById("cap-text");
  const toastEl = document.getElementById("toast");

  let db = null;
  let autoTimer = 0;
  let resetTimer = 0;
  let lastAuto = "";
  let inFlight = false;
  let stats = { active_count: 0, max_active: 5 };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeStudentId(raw) {
    const digits = digitsOnly(raw);
    if (!digits) return "";
    if (digits.length < STUDENT_ID_LEN) return digits.padStart(STUDENT_ID_LEN, "0");
    return digits;
  }

  function showToast(message, err = false) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = `toast${err ? " err" : ""}`;
    toastEl.hidden = false;
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  function connect() {
    if (!db) db = window.flhsCreateDb();
    return db;
  }

  async function rpc(name, args = {}) {
    const { data, error } = await connect().rpc(name, args);
    if (error) throw error;
    return data;
  }

  function paintCap() {
    const active = Number(stats.active_count) || 0;
    const max = Number(stats.max_active) || 5;
    if (capEl) {
      capEl.textContent = `${active} / ${max} out`;
      capEl.classList.toggle("full", active >= max);
    }
    if (capText) {
      capText.textContent = active >= max ? "All passes are out — please wait." : "Scan to check out or return.";
    }
  }

  async function loadStats() {
    try {
      const data = await rpc("kiosk_bathroom_status");
      if (data && typeof data === "object") stats = data;
      paintCap();
    } catch (err) {
      console.error(err);
    }
  }

  function resetToScan() {
    window.clearTimeout(resetTimer);
    panel.hidden = true;
    panel.innerHTML = "";
    input.value = "";
    lastAuto = "";
    input.focus();
  }

  function showResult(title, detail, kind) {
    panel.hidden = false;
    panel.innerHTML = `
      <div class="result-screen ${escapeHtml(kind)}">
        <div class="result-mark" aria-hidden="true">${kind === "out" ? "→" : "✓"}</div>
        <h2>${escapeHtml(title)}</h2>
        <p class="lead" style="margin-bottom:0">${escapeHtml(detail)}</p>
      </div>
    `;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(resetToScan, RESET_MS);
  }

  function friendlyError(err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("STUDENT_NOT_FOUND")) return "ID not in the student roster.";
    if (msg.includes("PASS_LIMIT_REACHED")) return "All passes are out. Please wait.";
    return "Could not process that ID. Try again.";
  }

  async function scan(raw) {
    const studentId = normalizeStudentId(raw);
    if (digitsOnly(raw).length < STUDENT_ID_LEN) {
      showToast("Enter the 10-digit student number.", true);
      return;
    }
    if (inFlight) return;
    inFlight = true;
    searchBtn.disabled = true;
    try {
      const result = await rpc("kiosk_bathroom_scan", { p_student_id: studentId });
      stats.active_count = result.active_count;
      stats.max_active = result.max_active;
      paintCap();
      if (result.action === "returned") {
        showResult("Welcome back", `${result.name} returned their pass.`, "ok");
      } else {
        showResult("Pass checked out", `${result.name} is out. Scan again when they return.`, "out");
      }
    } catch (err) {
      console.error(err);
      showToast(friendlyError(err), true);
    } finally {
      inFlight = false;
      searchBtn.disabled = false;
    }
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    window.clearTimeout(autoTimer);
    scan(input.value);
  });

  input?.addEventListener("input", () => {
    const digits = digitsOnly(input.value);
    input.value = digits.slice(0, STUDENT_ID_LEN);
    window.clearTimeout(autoTimer);
    if (digits.length === STUDENT_ID_LEN && digits !== lastAuto) {
      autoTimer = window.setTimeout(() => {
        lastAuto = digits;
        scan(digits);
      }, AUTO_SEARCH_MS);
    }
  });

  loadStats();
  window.setInterval(loadStats, 5000);
  input?.focus();
})();
