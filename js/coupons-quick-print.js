(() => {
  const api = window.FLHSCouponsApi;
  const print = window.FLHSCouponsPrint;

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const keyInput = document.getElementById("upload-key");
  const unlockForm = document.getElementById("unlock-form");
  const gateStatus = document.getElementById("gate-status");
  const statusEl = document.getElementById("status");
  const list = document.getElementById("teacher-list");
  const search = document.getElementById("teacher-search");
  const selectAll = document.getElementById("select-all");
  const qtyOverride = document.getElementById("qty-override");
  const countLine = document.getElementById("count-line");

  /** @type {Array<Record<string, unknown>>} */
  let roster = [];
  let settings = print.DEFAULT_SETTINGS;
  const selected = new Set();

  function setStatus(el, message, tone = "") {
    if (!el) return;
    el.textContent = message || "";
    el.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function activeRoster() {
    return roster.filter((row) => row.active !== false);
  }

  function readPrefsFromForm() {
    const flipType = document.querySelector('input[name="flip"]:checked')?.value || "long";
    const pageOrder = document.querySelector('input[name="order"]:checked')?.value || "alternating";
    return print.savePrintPrefs({ flipType, pageOrder });
  }

  function applyPrefs() {
    const prefs = print.loadPrintPrefs();
    const flip = document.querySelector(`input[name="flip"][value="${prefs.flipType}"]`);
    const order = document.querySelector(`input[name="order"][value="${prefs.pageOrder}"]`);
    if (flip) flip.checked = true;
    if (order) order.checked = true;
  }

  function filteredRoster() {
    const q = String(search?.value || "").trim().toLowerCase();
    const rows = activeRoster();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = `${row.name || ""} ${print.displayStaffName(row.name)} ${row.room || ""} ${row.department || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function runQty(row) {
    const override = Number(qtyOverride?.value);
    if (Number.isFinite(override) && override > 0) return Math.floor(override);
    return print.asPages(row.default_quantity);
  }

  function updateCount() {
    const chosen = activeRoster().filter((row) => selected.has(row.id));
    const pages = chosen.reduce((sum, row) => sum + runQty(row), 0);
    if (countLine) {
      countLine.textContent = chosen.length
        ? `${chosen.length} teacher${chosen.length === 1 ? "" : "s"} · ${pages} page${pages === 1 ? "" : "s"} · 10 identical each`
        : "Select a teacher or Select All";
    }
    if (selectAll) {
      const visible = filteredRoster();
      selectAll.checked = visible.length > 0 && visible.every((row) => selected.has(row.id));
      selectAll.indeterminate = visible.some((row) => selected.has(row.id)) && !selectAll.checked;
    }
  }

  function renderList() {
    const rows = filteredRoster();
    if (!rows.length) {
      list.innerHTML = `<p class="teacher-row">No matching staff</p>`;
      updateCount();
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const checked = selected.has(row.id) ? "checked" : "";
        const room = row.room ? `Room ${print.escapeHtml(row.room)}` : "No room";
        const pages = runQty(row);
        return `<label class="teacher-row">
          <input type="checkbox" data-id="${print.escapeHtml(row.id)}" ${checked} />
          <span>${print.escapeHtml(print.displayStaffName(row.name))}</span>
          <span class="meta">${room} · ${pages} page${pages === 1 ? "" : "s"}</span>
        </label>`;
      })
      .join("");
    updateCount();
  }

  async function bootstrap(key) {
    const data = await api.request("bootstrap", { uploadKey: key });
    roster = Array.isArray(data.roster) ? data.roster : [];
    settings = print.normalizeSettings(data.settings);
    gate.hidden = true;
    app.hidden = false;
    renderList();
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

  search?.addEventListener("input", renderList);
  qtyOverride?.addEventListener("input", renderList);

  selectAll?.addEventListener("change", () => {
    const rows = filteredRoster();
    if (selectAll.checked) rows.forEach((row) => selected.add(row.id));
    else rows.forEach((row) => selected.delete(row.id));
    renderList();
  });

  list?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const id = input.getAttribute("data-id");
    if (!id) return;
    if (input.checked) selected.add(id);
    else selected.delete(id);
    updateCount();
  });

  document.querySelectorAll('input[name="flip"], input[name="order"]').forEach((el) => {
    el.addEventListener("change", () => readPrefsFromForm());
  });

  document.getElementById("print-btn")?.addEventListener("click", () => {
    const teachers = activeRoster()
      .filter((row) => selected.has(row.id))
      .map((row) => ({
        name: row.name,
        room: row.room,
        quantity: runQty(row),
      }));
    const queue = print.buildQueue(teachers);
    const sheets = Math.ceil(queue.filter(Boolean).length / print.PER_SHEET) || 0;
    if (!sheets) {
      setStatus(statusEl, "Pick one teacher or Select All first", "err");
      return;
    }
    const prefs = readPrefsFromForm();
    print.renderSheets(queue, settings, prefs);
    document.getElementById("coupon-print-root")?.classList.remove("is-preview");
    setStatus(statusEl, `Printing ${sheets} page${sheets === 1 ? "" : "s"} · 10 identical per teacher…`, "ok");
    print.printRendered();
  });

  applyPrefs();
  const saved = api.getSavedKey();
  if (saved && keyInput) {
    keyInput.value = saved;
    bootstrap(saved).catch(() => {
      gate.hidden = false;
      app.hidden = true;
    });
  }
})();
