(() => {
  const KEY_STORAGE = "flhs-upload-key";
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-laptop-needs";

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const keyInput = document.getElementById("upload-key");
  const unlockForm = document.getElementById("unlock-form");
  const gateStatus = document.getElementById("gate-status");
  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("count-body");
  const statsEl = document.getElementById("stats");
  const search = document.getElementById("row-search");
  const tableLabel = document.getElementById("table-label");
  const inventoryNote = document.getElementById("inventory-note");
  const inventoryWrap = document.getElementById("inventory-wrap");
  const inventoryBody = document.getElementById("inventory-body");

  /** @type {Array<Record<string, unknown>>} */
  let staff = [];
  /** @type {Array<Record<string, unknown>>} */
  let forms = [];
  /** @type {Array<Record<string, unknown>>} */
  let inventory = [];
  let view = "missing";

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayName(raw) {
    const s = String(raw || "").trim();
    if (!s.includes(",")) return s;
    const [last, ...rest] = s.split(",");
    const first = rest.join(",").trim();
    return first ? `${first} ${last.trim()}` : s;
  }

  function isTeacher(row) {
    return /^teacher\b/i.test(String(row.role || "").trim());
  }

  function setStatus(el, message, tone = "") {
    if (!el) return;
    el.textContent = message || "";
    el.className = `status${tone ? ` ${tone}` : ""}`;
  }

  function formByStaffId() {
    const map = new Map();
    forms.forEach((row) => map.set(Number(row.staff_id), row));
    return map;
  }

  function extrasOf(form) {
    if (!form) return 0;
    const extras = form.extras_needed;
    if (extras != null && extras !== "") return Number(extras) || 0;
    return Number(form.laptops_needed) || 0;
  }

  function joinedRows() {
    const byId = formByStaffId();
    return staff
      .map((person) => {
        const form = byId.get(Number(person.id)) || null;
        const expected = Number(person.expected_count) || 0;
        const actual = form && form.actual_count != null ? Number(form.actual_count) : null;
        const missing =
          actual == null || expected <= 0 ? null : Math.max(0, expected - actual);
        return { person, form, teacher: isTeacher(person), expected, actual, missing };
      })
      .sort((a, b) =>
        String(a.person.name || "").localeCompare(String(b.person.name || ""), undefined, {
          sensitivity: "base",
        })
      );
  }

  function visibleRows() {
    const q = String(search?.value || "").trim().toLowerCase();
    return joinedRows().filter(({ person, form, teacher }) => {
      if (view === "missing" && (form || !teacher)) return false;
      if (view === "submitted" && !form) return false;
      if (view === "carts") return false;
      if (!q) return true;
      const hay = `${person.name || ""} ${displayName(person.name)} ${person.room || ""} ${person.role || ""} ${person.cart_code || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function visibleInventory() {
    const q = String(search?.value || "").trim().toLowerCase();
    return inventory.filter((row) => {
      if (!q) return true;
      const hay = `${row.cart_code || ""} ${row.teacher_name || ""} ${row.assigned_name || ""} ${row.room || ""} ${row.responsible_kind || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderStats() {
    const rows = joinedRows();
    const teachers = rows.filter((row) => row.teacher);
    const teacherForms = teachers.filter((row) => row.form);
    const missingTeachers = teachers.length - teacherForms.length;
    const extras = forms.reduce((sum, row) => sum + extrasOf(row), 0);
    const missingLaptops = rows.reduce((sum, row) => sum + (row.missing || 0), 0);
    const cartsChecked = forms.filter((row) => row.cart_checked).length;
    const assignedCarts = inventory.filter((row) => row.staff_id).length;
    statsEl.innerHTML = `
      <div class="stat"><b>${teacherForms.length}/${teachers.length}</b><span>Teachers in</span></div>
      <div class="stat"><b>${missingTeachers}</b><span>Teachers missing</span></div>
      <div class="stat"><b>${extras}</b><span>Extras requested</span></div>
      <div class="stat"><b>${missingLaptops}</b><span>Missing vs cart</span></div>
      <div class="stat"><b>${cartsChecked}</b><span>Carts confirmed</span></div>
      <div class="stat"><b>${assignedCarts}/${inventory.length}</b><span>Carts assigned</span></div>
    `;
  }

  function renderTable() {
    if (view === "carts") {
      if (tableLabel) tableLabel.textContent = "Use the cart inventory table below";
      tbody.innerHTML = `<tr><td colspan="9">Switch stays on cart inventory — scroll to the section below.</td></tr>`;
      return;
    }
    const rows = visibleRows();
    const labels = {
      missing: `Missing teachers · ${rows.length}`,
      submitted: `Submitted · ${rows.length}`,
      all: `All staff · ${rows.length}`,
    };
    if (tableLabel) tableLabel.textContent = labels[view] || "Roster";
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9">No rows for this view.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map(({ person, form, expected, actual, missing }) => {
        const status = form
          ? `<span class="badge badge-ok">Submitted</span>`
          : `<span class="badge badge-miss">Missing</span>`;
        const cartLabel = person.cart_code
          ? escapeHtml(person.cart_code)
          : "—";
        const checked = !form
          ? ""
          : form.cart_checked
            ? ` <span class="badge badge-ok">Confirmed</span>`
            : ` <span class="badge badge-warn">Not this cart</span>`;
        return `<tr>
          <td>${status}</td>
          <td>${escapeHtml(displayName(person.name))}</td>
          <td>${escapeHtml(person.room || "—")}</td>
          <td>${cartLabel}${checked}</td>
          <td>${expected ? escapeHtml(expected) : "—"}</td>
          <td>${actual == null ? "—" : escapeHtml(actual)}</td>
          <td>${missing == null ? "—" : escapeHtml(missing)}</td>
          <td>${form ? escapeHtml(form.max_students) : "—"}</td>
          <td>${form ? escapeHtml(extrasOf(form)) : "—"}</td>
        </tr>`;
      })
      .join("");
  }

  function kindLabel(kind) {
    const map = {
      teacher: "Teacher",
      testing: "Testing",
      location: "Location",
      unmatched: "Unmatched name",
      unassigned: "No teacher on sheet",
    };
    return map[kind] || kind || "—";
  }

  function renderInventory() {
    const rows = visibleInventory();
    if (!inventory.length) {
      inventoryWrap.hidden = true;
      inventoryNote.hidden = false;
      inventoryNote.textContent = "No cart inventory loaded.";
      return;
    }
    inventoryNote.hidden = true;
    inventoryWrap.hidden = false;
    if (!rows.length) {
      inventoryBody.innerHTML = `<tr><td colspan="6">No carts match this search.</td></tr>`;
      return;
    }
    inventoryBody.innerHTML = rows
      .map((row) => {
        const matched = row.assigned_name || row.staff_id
          ? displayName(row.assigned_name || "")
          : "—";
        return `<tr>
          <td>${escapeHtml(row.cart_code)}</td>
          <td>${escapeHtml(displayName(row.teacher_name) || "—")}</td>
          <td>${escapeHtml(matched)}</td>
          <td>${escapeHtml(row.room || "—")}</td>
          <td>${row.expected_count == null ? "—" : escapeHtml(row.expected_count)}</td>
          <td>${escapeHtml(kindLabel(row.responsible_kind))}</td>
        </tr>`;
      })
      .join("");
  }

  function render() {
    renderStats();
    renderTable();
    renderInventory();
  }

  async function load(key) {
    const cfg = window.FLHS_SUPABASE || {};
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "x-flhs-upload-key": key,
      },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `Request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }
    saveKey(key);
    staff = Array.isArray(data.staff) ? data.staff : [];
    forms = Array.isArray(data.forms) ? data.forms : [];
    inventory = Array.isArray(data.inventory) ? data.inventory : [];
    gate.hidden = true;
    app.hidden = false;
    render();
    setStatus(statusEl, `${inventory.length} carts on file · ${forms.length} form${forms.length === 1 ? "" : "s"} submitted`, "ok");
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
      await load(key);
    } catch (err) {
      setStatus(gateStatus, err.status === 401 ? "That key is not valid" : err.message, "err");
    }
  });

  search?.addEventListener("input", () => {
    renderTable();
    renderInventory();
  });

  document.getElementById("view-chips")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-view]");
    if (!btn) return;
    view = btn.getAttribute("data-view") || "missing";
    document.querySelectorAll("#view-chips .filter-chip").forEach((el) => {
      el.classList.toggle("is-on", el === btn);
    });
    renderTable();
    renderInventory();
  });

  const saved = getSavedKey();
  if (saved && keyInput) {
    keyInput.value = saved;
    load(saved).catch(() => {
      gate.hidden = false;
      app.hidden = true;
    });
  }
})();
