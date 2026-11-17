(() => {
  const KEY_STORAGE = "flhs-upload-key";
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-kiosks";

  const gate = document.getElementById("lock-gate");
  const app = document.getElementById("app");
  const keyInput = document.getElementById("upload-key");
  const unlockForm = document.getElementById("unlock-form");
  const gateStatus = document.getElementById("gate-status");
  const statusEl = document.getElementById("status");
  const statsEl = document.getElementById("stats");
  const tbody = document.getElementById("rows-body");
  const dateInput = document.getElementById("date-filter");
  const searchInput = document.getElementById("row-search");
  const exportBtn = document.getElementById("export-csv");
  const floorTable = document.getElementById("floor-table");
  const bathTable = document.getElementById("bath-table");
  const bathBody = document.getElementById("bath-body");
  const floorFilters = document.getElementById("floor-filters");
  const bathFilters = document.getElementById("bath-filters");
  const subjectSelect = document.getElementById("subject-filter");

  let board = "floor";
  let floorStatus = "all";
  let formFilter = "all";
  let busFilter = "all";
  let bathStatus = "all";
  let allRows = [];
  let allBath = [];
  let stats = {};
  let pollTimer = 0;
  let loadedOnce = false;

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

  function todayEastern() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function setStatus(message, tone = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    if (tone) statusEl.dataset.tone = tone;
    else delete statusEl.dataset.tone;
  }

  async function request(action, body = {}) {
    const key = String(body.uploadKey || getSavedKey() || "").trim();
    if (!key) {
      const err = new Error("Enter the staff upload key");
      err.code = "NO_KEY";
      throw err;
    }
    const cfg = window.FLHS_SUPABASE || {};
    const payload = { ...body, action };
    delete payload.uploadKey;
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "x-flhs-upload-key": key,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `Request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }
    saveKey(key);
    return data;
  }

  function formMissing(row) {
    return String(row.permission_status || "missing") !== "received";
  }

  function queryText() {
    return searchInput?.value.trim().toLowerCase() || "";
  }

  function matchesQuery(row, keys) {
    const q = queryText();
    if (!q) return true;
    return keys.some((key) => String(row[key] || "").toLowerCase().includes(q));
  }

  function visibleRows() {
    return allRows
      .filter((row) => {
        const here = !row.checked_out_at;
        if (floorStatus === "open" && !here) return false;
        if (floorStatus === "closed" && here) return false;
        if (formFilter === "missing" && !formMissing(row)) return false;
        if (formFilter === "received" && formMissing(row)) return false;
        if (busFilter === "yes" && !row.needs_bus) return false;
        if (busFilter === "no" && row.needs_bus) return false;
        if (subjectSelect?.value && row.subject !== subjectSelect.value) return false;
        return matchesQuery(row, ["student_name", "student_id", "subject", "teacher_name"]);
      })
      .sort((a, b) => {
        const aHere = a.checked_out_at ? 1 : 0;
        const bHere = b.checked_out_at ? 1 : 0;
        if (aHere !== bHere) return aHere - bHere;
        const aMiss = formMissing(a) ? 0 : 1;
        const bMiss = formMissing(b) ? 0 : 1;
        if (aMiss !== bMiss) return aMiss - bMiss;
        return new Date(b.checked_in_at) - new Date(a.checked_in_at);
      });
  }

  function visibleBath() {
    return allBath.filter((row) => {
      const open = !row.returned_at;
      if (bathStatus === "open" && !open) return false;
      if (bathStatus === "closed" && open) return false;
      return matchesQuery(row, ["student_name", "student_id"]);
    });
  }

  function paintSubjects() {
    if (!subjectSelect) return;
    const current = subjectSelect.value;
    const subjects = [...new Set(allRows.map((row) => String(row.subject || "").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
    subjectSelect.innerHTML =
      `<option value="">All subjects</option>` +
      subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("");
    if (subjects.includes(current)) subjectSelect.value = current;
  }

  function setChips(root, attr, value) {
    root?.querySelectorAll(".filter-chip").forEach((el) => {
      const on = el.dataset[attr] === value;
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function syncChips() {
    setChips(document.getElementById("board-chips"), "board", board);
    setChips(document.getElementById("here-chips"), "here", floorStatus);
    setChips(document.getElementById("form-chips"), "form", formFilter);
    setChips(document.getElementById("bus-chips"), "bus", busFilter);
    setChips(document.getElementById("bath-chips"), "bath", bathStatus);
  }

  function paintStats() {
    const missing = allRows.filter(formMissing).length;
    const cards = [
      ["STAR in", stats.star_in, ""],
      ["Here now", stats.star_open, "here"],
      ["Unique students", stats.star_unique, ""],
      ["Need bus", stats.star_bus, "bus"],
      ["Form missing", missing, "missing"],
      ["Bathroom out", `${stats.bathroom_out ?? 0} / ${stats.bathroom_max ?? 5}`, "bath"],
      ["Bathroom today", stats.bathroom_today, ""],
    ];
    statsEl.innerHTML = cards
      .map(([label, n, jump]) => {
        const on =
          (jump === "missing" && board === "floor" && formFilter === "missing") ||
          (jump === "here" && board === "floor" && floorStatus === "open") ||
          (jump === "bus" && board === "floor" && busFilter === "yes") ||
          (jump === "bath" && board === "bathroom" && bathStatus === "open");
        const tag = jump ? "button" : "div";
        const attrs = jump
          ? ` type="button" class="stat stat-btn${on ? " is-on" : ""}" data-jump="${jump}"`
          : ` class="stat"`;
        return `<${tag}${attrs}><b>${escapeHtml(String(n ?? 0))}</b><span>${escapeHtml(label)}</span></${tag}>`;
      })
      .join("");
  }

  function paintFloor() {
    const rows = visibleRows();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">No students match these filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((row) => {
        const open = !row.checked_out_at;
        const missing = formMissing(row);
        const actions = [];
        if (open) {
          actions.push(
            `<button type="button" data-act="checkout" data-id="${escapeHtml(row.id)}">Check out</button>`
          );
        }
        actions.push(
          `<button type="button" data-act="perm" data-id="${escapeHtml(row.student_id)}" data-status="${
            missing ? "received" : "missing"
          }">${missing ? "Mark on file" : "Mark missing"}</button>`
        );
        return `
          <tr class="${missing ? "mc-missing" : ""}">
            <td><span class="mc-name">${escapeHtml(row.student_name || "Student")}</span><span class="mc-id">${escapeHtml(
              row.student_id || ""
            )}</span></td>
            <td>${escapeHtml(row.grade || "—")}</td>
            <td><span class="mc-name">${escapeHtml(row.subject || "—")}</span>${
              row.teacher_name ? `<span class="mc-sub">${escapeHtml(row.teacher_name)}</span>` : ""
            }</td>
            <td>${row.needs_bus ? "Yes" : "No"}${row.needs_bus && row.needs_bus_pass ? " · pass" : ""}</td>
            <td><span class="badge ${missing ? "warn" : "ok"}">${missing ? "Missing" : "On file"}</span></td>
            <td>${escapeHtml(formatWhen(row.checked_in_at))}</td>
            <td>${open ? '<span class="badge ok">Here</span>' : escapeHtml(formatWhen(row.checked_out_at))}</td>
            <td class="row-actions">${actions.join("")}</td>
          </tr>
        `;
      })
      .join("");
  }

  function paintBathroom() {
    const bathroom = visibleBath();
    if (!bathroom.length) {
      bathBody.innerHTML = `<tr><td colspan="5">No bathroom passes match these filters.</td></tr>`;
      return;
    }
    bathBody.innerHTML = bathroom
      .map((row) => {
        const open = !row.returned_at;
        return `
          <tr>
            <td><span class="mc-name">${escapeHtml(row.student_name || "Student")}</span><span class="mc-id">${escapeHtml(
              row.student_id || ""
            )}</span></td>
            <td>${escapeHtml(row.grade || "—")}</td>
            <td>${escapeHtml(formatWhen(row.issued_at))}</td>
            <td>${
              open
                ? '<span class="badge warn">Out</span>'
                : escapeHtml(formatWhen(row.returned_at))
            }</td>
            <td class="row-actions">${
              open
                ? `<button type="button" data-act="bath-return" data-id="${escapeHtml(row.id)}">Mark returned</button>`
                : "—"
            }</td>
          </tr>
        `;
      })
      .join("");
  }

  function showBoard() {
    if (floorTable) floorTable.hidden = board !== "floor";
    if (bathTable) bathTable.hidden = board !== "bathroom";
    if (floorFilters) floorFilters.hidden = board !== "floor";
    if (bathFilters) bathFilters.hidden = board !== "bathroom";
    syncChips();
  }

  function paintCount() {
    if (board === "bathroom") {
      const count = visibleBath().length;
      setStatus(`${count} pass${count === 1 ? "" : "es"}`, "ok");
      return;
    }
    const rows = visibleRows();
    const missing = rows.filter(formMissing).length;
    if (!rows.length) {
      setStatus("No students match these filters.");
      return;
    }
    if (formFilter === "missing") {
      setStatus(`${rows.length} student${rows.length === 1 ? "" : "s"} missing a bus form`, "ok");
      return;
    }
    const extra = missing ? ` · ${missing} missing a bus form` : "";
    setStatus(`${rows.length} student${rows.length === 1 ? "" : "s"}${extra}`, "ok");
  }

  function paint() {
    paintSubjects();
    paintStats();
    paintFloor();
    paintBathroom();
    showBoard();
    paintCount();
  }

  async function refresh() {
    if (!loadedOnce) setStatus("Loading…");
    try {
      const data = await request("status", {
        date: dateInput.value || todayEastern(),
        status: "all",
        query: "",
      });
      stats = data.stats || {};
      allRows = Array.isArray(data.rows) ? data.rows : [];
      allBath = Array.isArray(data.bathroom) ? data.bathroom : [];
      loadedOnce = true;
      paint();
    } catch (err) {
      setStatus(err.message || "Could not load Mission Control.", "error");
    }
  }

  function exportCsv() {
    const source = board === "bathroom" ? visibleBath() : visibleRows();
    const header =
      board === "bathroom"
        ? ["student_id", "student_name", "grade", "issued_at", "returned_at"]
        : [
            "student_id",
            "student_name",
            "grade",
            "subject",
            "teacher_name",
            "needs_bus",
            "permission_status",
            "checked_in_at",
            "checked_out_at",
          ];
    const lines = [header.join(",")];
    for (const row of source) {
      lines.push(
        header
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `star-${board}-${dateInput.value || todayEastern()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    if (!dateInput.value) dateInput.value = todayEastern();
    refresh();
    window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refresh, 8000);
  }

  unlockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    gateStatus.textContent = "Unlocking…";
    try {
      saveKey(keyInput.value.trim());
      await request("status", { uploadKey: keyInput.value.trim(), date: todayEastern() });
      showApp();
    } catch (err) {
      gateStatus.textContent = err.status === 401 ? "Wrong key." : err.message || "Could not unlock.";
    }
  });

  document.getElementById("board-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-board]");
    if (!btn) return;
    board = btn.dataset.board;
    paint();
  });

  document.getElementById("here-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-here]");
    if (!btn) return;
    floorStatus = btn.dataset.here;
    paint();
  });

  document.getElementById("form-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-form]");
    if (!btn) return;
    formFilter = btn.dataset.form;
    paint();
  });

  document.getElementById("bus-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-bus]");
    if (!btn) return;
    busFilter = btn.dataset.bus;
    paint();
  });

  document.getElementById("bath-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-bath]");
    if (!btn) return;
    bathStatus = btn.dataset.bath;
    paint();
  });

  statsEl?.addEventListener("click", (e) => {
    const jump = e.target.closest("[data-jump]")?.dataset.jump;
    if (!jump) return;
    if (jump === "here") {
      board = "floor";
      floorStatus = floorStatus === "open" ? "all" : "open";
    } else if (jump === "bus") {
      board = "floor";
      busFilter = busFilter === "yes" ? "all" : "yes";
    } else if (jump === "missing") {
      board = "floor";
      formFilter = formFilter === "missing" ? "all" : "missing";
    } else if (jump === "bath") {
      board = "bathroom";
      bathStatus = bathStatus === "open" ? "all" : "open";
    }
    paint();
  });

  subjectSelect?.addEventListener("change", paint);
  dateInput?.addEventListener("change", refresh);
  searchInput?.addEventListener("input", paint);
  exportBtn?.addEventListener("click", exportCsv);

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    try {
      if (btn.dataset.act === "checkout") await request("checkout", { id: btn.dataset.id });
      if (btn.dataset.act === "bath-return") await request("bathroom_return", { id: btn.dataset.id });
      if (btn.dataset.act === "perm") {
        await request("set_permission", {
          student_id: btn.dataset.id,
          status: btn.dataset.status,
        });
      }
      await refresh();
    } catch (err) {
      setStatus(err.message || "Update failed.", "error");
    }
  });

  if (getSavedKey()) {
    request("status", { date: todayEastern() })
      .then(showApp)
      .catch(() => {});
  }
})();
