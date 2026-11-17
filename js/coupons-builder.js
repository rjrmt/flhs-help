(() => {
  const api = window.FLHSCouponsApi;
  const print = window.FLHSCouponsPrint;

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const keyInput = document.getElementById("upload-key");
  const unlockForm = document.getElementById("unlock-form");
  const gateStatus = document.getElementById("gate-status");
  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("roster-body");
  const importText = document.getElementById("import-text");
  const importFile = document.getElementById("import-file");
  const addName = document.getElementById("add-name");
  const addRoom = document.getElementById("add-room");
  const addQty = document.getElementById("add-qty");
  const searchInput = document.getElementById("roster-search");
  const roleFilter = document.getElementById("role-filter");
  const statusFilter = document.getElementById("status-filter");
  const buildingChips = document.getElementById("building-chips");
  const selectAll = document.getElementById("select-all");
  const rosterCount = document.getElementById("roster-count");
  const qtyOverride = document.getElementById("qty-override");
  const sheetPerBuilding = document.getElementById("sheet-per-building");
  const printBtn = document.getElementById("print-btn");

  /** @type {Array<Record<string, unknown>>} */
  let roster = [];
  /** @type {Record<string, unknown>} */
  let settings = print.DEFAULT_SETTINGS;
  const saveTimers = new Map();
  const selected = new Set();
  let buildingFilter = "";

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

  function runQty(row) {
    const override = Number(qtyOverride?.value);
    if (Number.isFinite(override) && override > 0) return Math.floor(override);
    return print.asPages(row.default_quantity);
  }

  function matchesRole(row) {
    const value = String(roleFilter?.value || "");
    const dept = String(row.department || "").trim();
    if (!value) return true;
    if (value === "__teachers__") return print.isTeacherRole(dept);
    if (value === "__counselors__") return /counselor/i.test(dept);
    if (value === "__admin__") return /principal|office manager/i.test(dept);
    return dept === value;
  }

  function matchesStatus(row) {
    const value = String(statusFilter?.value || "active");
    const active = row.active !== false;
    if (value === "active") return active;
    if (value === "inactive") return !active;
    return true;
  }

  function filteredRoster() {
    const q = String(searchInput?.value || "").trim().toLowerCase();
    return roster
      .filter((row) => matchesStatus(row) && matchesRole(row))
      .filter((row) => !buildingFilter || print.buildingKey(row) === buildingFilter)
      .filter((row) => {
        if (!q) return true;
        const bldg = print.buildingFromRoom(row.room);
        const hay = `${row.name || ""} ${print.displayStaffName(row.name)} ${row.room || ""} ${row.department || ""} ${bldg ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort(print.compareStaff);
  }

  function printableRows(rows) {
    return rows.filter((row) => row.active !== false);
  }

  function uniqueRoles() {
    const set = new Set();
    roster.forEach((row) => {
      const dept = String(row.department || "").trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function buildingCounts(rows) {
    const counts = new Map();
    rows.forEach((row) => {
      const key = print.buildingKey(row);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function fillRoleFilter() {
    if (!roleFilter) return;
    const current = roleFilter.value;
    const roles = uniqueRoles();
    const teacherCount = roster.filter((row) => print.isTeacherRole(row.department)).length;
    const counselorCount = roster.filter((row) => /counselor/i.test(String(row.department || ""))).length;
    const adminCount = roster.filter((row) =>
      /principal|office manager/i.test(String(row.department || ""))
    ).length;
    roleFilter.innerHTML = [
      `<option value="">All roles</option>`,
      `<option value="__teachers__">Teachers (${teacherCount})</option>`,
      `<option value="__counselors__">Counselors (${counselorCount})</option>`,
      `<option value="__admin__">Admin (${adminCount})</option>`,
      `<option disabled>────────</option>`,
      ...roles.map((role) => `<option value="${print.escapeHtml(role)}">${print.escapeHtml(role)}</option>`),
    ].join("");
    if ([...roleFilter.options].some((opt) => opt.value === current)) roleFilter.value = current;
  }

  function renderBuildingChips() {
    if (!buildingChips) return;
    const counts = buildingCounts(roster.filter((row) => matchesStatus(row) && matchesRole(row)));
    if (buildingFilter && buildingFilter !== "" && !counts.has(buildingFilter)) buildingFilter = "";
    const keys = Array.from(counts.keys()).sort((a, b) => {
      if (a === "none") return 1;
      if (b === "none") return -1;
      return Number(a) - Number(b);
    });
    const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
    const chips = [
      { key: "", label: "All", count: total },
      ...keys.map((key) => ({
        key,
        label: key === "none" ? "No #" : key,
        count: counts.get(key) || 0,
      })),
    ];
    buildingChips.innerHTML = chips
      .map((chip) => {
        const on = buildingFilter === chip.key ? " is-on" : "";
        return `<button type="button" class="filter-chip${on}" data-building="${print.escapeHtml(chip.key)}" aria-pressed="${buildingFilter === chip.key}">
          ${print.escapeHtml(chip.label)} <em>${chip.count}</em>
        </button>`;
      })
      .join("");
  }

  function updateCounts() {
    const visible = filteredRoster();
    const visiblePrintable = printableRows(visible);
    const chosen = roster.filter((row) => selected.has(row.id) && row.active !== false);
    const printSource = chosen.length ? chosen : visiblePrintable;
    const pages = printSource.reduce((sum, row) => sum + runQty(row), 0);
    const coupons = pages * print.PER_SHEET;
    if (rosterCount) {
      rosterCount.textContent = chosen.length
        ? `${visible.length} shown · ${chosen.length} selected · ${pages} page${pages === 1 ? "" : "s"} · ${coupons} identical coupons`
        : `${visible.length} shown · ${pages} page${pages === 1 ? "" : "s"} · 10 identical per page`;
    }
    if (printBtn) {
      printBtn.textContent = chosen.length
        ? `Print ${chosen.length} selected`
        : `Print ${visiblePrintable.length} visible`;
    }
    if (selectAll) {
      const ids = visiblePrintable.map((row) => row.id);
      selectAll.checked = ids.length > 0 && ids.every((id) => selected.has(id));
      selectAll.indeterminate = ids.some((id) => selected.has(id)) && !selectAll.checked;
    }
  }

  function groupLabel(key, count) {
    if (key === "none") return `No building number · ${count}`;
    return `Building ${key} · ${count}`;
  }

  function renderTable() {
    if (!tbody) return;
    renderBuildingChips();
    const rows = filteredRoster();
    if (!roster.length) {
      tbody.innerHTML = `<tr><td colspan="7">Staff directory is empty.</td></tr>`;
      updateCounts();
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No staff match these filters.</td></tr>`;
      updateCounts();
      return;
    }

    const parts = [];
    let lastKey = null;
    rows.forEach((row) => {
      const key = print.buildingKey(row);
      if (key !== lastKey) {
        const count = rows.filter((item) => print.buildingKey(item) === key).length;
        const groupIds = rows
          .filter((item) => print.buildingKey(item) === key && item.active !== false)
          .map((item) => item.id);
        const allOn = groupIds.length > 0 && groupIds.every((id) => selected.has(id));
        parts.push(`<tr class="group-row" data-building="${print.escapeHtml(key)}">
          <td colspan="7">
            <div class="group-row-inner">
              <label class="toggle">
                <input type="checkbox" data-select-building="${print.escapeHtml(key)}" ${allOn ? "checked" : ""} />
                <strong>${print.escapeHtml(groupLabel(key, count))}</strong>
              </label>
              <button class="btn" type="button" data-print-building="${print.escapeHtml(key)}">Print this building</button>
            </div>
          </td>
        </tr>`);
        lastKey = key;
      }
      const inactive = row.active === false ? " is-inactive" : "";
      const bldg = print.buildingFromRoom(row.room);
      const checked = selected.has(row.id) ? "checked" : "";
      parts.push(`<tr data-id="${print.escapeHtml(row.id)}" class="${inactive.trim()}">
        <td class="col-check"><input type="checkbox" data-select-id="${print.escapeHtml(row.id)}" ${checked} ${row.active === false ? "disabled" : ""} /></td>
        <td><input type="text" data-field="name" value="${print.escapeHtml(row.name || "")}" /></td>
        <td><input class="room" type="text" data-field="room" value="${print.escapeHtml(row.room || "")}" /></td>
        <td class="col-bldg"><span class="bldg-num">${bldg == null ? "—" : print.escapeHtml(String(bldg))}</span></td>
        <td class="role-cell">${print.escapeHtml(row.department || "—")}</td>
        <td class="col-qty"><input class="qty" type="number" min="1" data-field="default_quantity" value="${print.escapeHtml(print.asPages(row.default_quantity))}" /></td>
        <td class="col-status">
          <label class="toggle">
            <input type="checkbox" data-field="active" ${row.active !== false ? "checked" : ""} />
            Active
          </label>
        </td>
      </tr>`);
    });
    tbody.innerHTML = parts.join("");
    applySelectionToTable();
  }

  function applySelectionToTable() {
    tbody?.querySelectorAll("input[data-select-id]").forEach((input) => {
      input.checked = selected.has(input.getAttribute("data-select-id"));
    });
    tbody?.querySelectorAll("input[data-select-building]").forEach((input) => {
      const key = input.getAttribute("data-select-building");
      const ids = printableRows(filteredRoster())
        .filter((row) => print.buildingKey(row) === key)
        .map((row) => row.id);
      input.checked = ids.length > 0 && ids.every((id) => selected.has(id));
      input.indeterminate = ids.some((id) => selected.has(id)) && !input.checked;
    });
    updateCounts();
  }

  function teachersFromRows(rows) {
    return printableRows(rows)
      .slice()
      .sort(print.compareStaff)
      .map((row) => ({
        name: row.name,
        room: row.room,
        quantity: runQty(row),
      }));
  }

  function printRows(rows, label) {
    const teachers = teachersFromRows(rows);
    const queue = print.buildQueue(teachers, { sheetPerBuilding: Boolean(sheetPerBuilding?.checked) });
    if (!queue.filter(Boolean).length) {
      setStatus(statusEl, "Nothing to print with this selection", "err");
      return;
    }
    const prefs = readPrefsFromForm();
    const rendered = print.renderSheets(queue, settings, prefs);
    rendered.root.classList.add("is-preview");
    const duplex =
      prefs.flipType === "long" ? "flip on the long edge" : "flip on the short edge";
    const order =
      prefs.pageOrder === "grouped" ? "all fronts, then all backs" : "front/back alternating";
    const extra = sheetPerBuilding?.checked ? " · new sheet per building" : "";
    setStatus(
      statusEl,
      `${label} · ${rendered.sheets} page${rendered.sheets === 1 ? "" : "s"} · 10 identical coupons each · ${order} · printer should ${duplex}${extra}`,
      "ok"
    );
    print.printRendered();
  }

  function rowsForPrint() {
    const chosen = roster.filter((row) => selected.has(row.id));
    if (chosen.length) return chosen;
    return filteredRoster();
  }

  async function bootstrap(key) {
    const data = await api.request("bootstrap", { uploadKey: key });
    roster = Array.isArray(data.roster) ? data.roster : [];
    settings = print.normalizeSettings(data.settings);
    fillRoleFilter();
    renderTable();
    gate.hidden = true;
    app.hidden = false;
    setStatus(
      statusEl,
      `${roster.length} staff in roster · ${activeRoster().length} active`,
      "ok"
    );
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

  searchInput?.addEventListener("input", renderTable);
  roleFilter?.addEventListener("change", renderTable);
  statusFilter?.addEventListener("change", renderTable);
  qtyOverride?.addEventListener("input", updateCounts);
  sheetPerBuilding?.addEventListener("change", updateCounts);

  buildingChips?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-building]");
    if (!btn) return;
    buildingFilter = btn.getAttribute("data-building") || "";
    renderTable();
  });

  document.getElementById("select-visible")?.addEventListener("click", () => {
    printableRows(filteredRoster()).forEach((row) => selected.add(row.id));
    applySelectionToTable();
  });

  document.getElementById("clear-selected")?.addEventListener("click", () => {
    selected.clear();
    applySelectionToTable();
  });

  selectAll?.addEventListener("change", () => {
    const rows = printableRows(filteredRoster());
    if (selectAll.checked) rows.forEach((row) => selected.add(row.id));
    else rows.forEach((row) => selected.delete(row.id));
    applySelectionToTable();
  });

  document.getElementById("import-btn")?.addEventListener("click", async () => {
    const rows = api.parseRosterText(importText.value);
    if (!rows.length) {
      setStatus(statusEl, "Paste Name, Room, Quantity (tab or comma) first", "err");
      return;
    }
    setStatus(statusEl, `Importing ${rows.length} teachers…`);
    try {
      const data = await api.request("upsert_roster", { rows });
      roster = Array.isArray(data.roster) ? data.roster : roster;
      fillRoleFilter();
      renderTable();
      importText.value = "";
      setStatus(
        statusEl,
        `Imported — ${data.inserted || 0} new, ${data.updated || 0} updated. No duplicates created.`,
        "ok"
      );
    } catch (err) {
      setStatus(statusEl, err.message || "Import failed", "err");
    }
  });

  importFile?.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      importText.value = await file.text();
      setStatus(statusEl, `Loaded ${file.name} — click Import to save`, "ok");
    } catch {
      setStatus(statusEl, "Could not read that file", "err");
    }
  });

  document.getElementById("add-btn")?.addEventListener("click", async () => {
    const name = addName.value.trim();
    if (!name) {
      setStatus(statusEl, "Enter a teacher name", "err");
      return;
    }
    const row = {
      name,
      room: addRoom.value.trim(),
      default_quantity: Number(addQty.value) || 1,
    };
    try {
      const data = await api.request("upsert_roster", { rows: [row] });
      roster = Array.isArray(data.roster) ? data.roster : roster;
      fillRoleFilter();
      renderTable();
      addName.value = "";
      addRoom.value = "";
      addQty.value = "1";
      setStatus(statusEl, `Saved ${name}`, "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Could not add teacher", "err");
    }
  });

  tbody?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.hasAttribute("data-select-id")) {
      const id = input.getAttribute("data-select-id");
      if (!id) return;
      if (input.checked) selected.add(id);
      else selected.delete(id);
      applySelectionToTable();
      return;
    }

    if (input.hasAttribute("data-select-building")) {
      const key = input.getAttribute("data-select-building");
      const rows = printableRows(filteredRoster()).filter((row) => print.buildingKey(row) === key);
      if (input.checked) rows.forEach((row) => selected.add(row.id));
      else rows.forEach((row) => selected.delete(row.id));
      applySelectionToTable();
      return;
    }

    const tr = input.closest("tr[data-id]");
    if (!tr) return;
    const id = tr.getAttribute("data-id");
    const field = input.getAttribute("data-field");
    if (!id || !field) return;
    const payload = { id };
    if (field === "active") payload.active = input.checked;
    else if (field === "default_quantity") payload.default_quantity = Number(input.value) || 1;
    else payload[field] = input.value;

    if (field === "active" && !input.checked) selected.delete(id);

    window.clearTimeout(saveTimers.get(id));
    saveTimers.set(
      id,
      window.setTimeout(async () => {
        try {
          const data = await api.request("update_staff", payload);
          const idx = roster.findIndex((row) => row.id === id);
          if (idx >= 0 && data.staff) roster[idx] = data.staff;
          if (field === "room" || field === "active") renderTable();
          else updateCounts();
          setStatus(statusEl, "Roster saved", "ok");
        } catch (err) {
          setStatus(statusEl, err.message || "Could not save row", "err");
        }
      }, 400)
    );
  });

  tbody?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-print-building]");
    if (!btn) return;
    const key = btn.getAttribute("data-print-building");
    const rows = filteredRoster().filter((row) => print.buildingKey(row) === key);
    const label = key === "none" ? "No building number" : `Building ${key}`;
    printRows(rows, label);
  });

  printBtn?.addEventListener("click", () => {
    const rows = rowsForPrint();
    const chosen = roster.filter((row) => selected.has(row.id));
    const label = chosen.length ? `${chosen.length} selected` : "Visible staff";
    printRows(rows, label);
  });

  document.querySelectorAll('input[name="flip"], input[name="order"]').forEach((el) => {
    el.addEventListener("change", () => readPrefsFromForm());
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
