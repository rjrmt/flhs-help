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

  let board = "floor";
  let viewStatus = "all";
  let rows = [];
  let bathroom = [];
  let stats = {};
  let pollTimer = 0;

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

  function paintStats() {
    const cards = [
      ["STAR in", stats.star_in],
      ["Here now", stats.star_open],
      ["Unique students", stats.star_unique],
      ["Need bus", stats.star_bus],
      ["Bathroom out", `${stats.bathroom_out ?? 0} / ${stats.bathroom_max ?? 5}`],
      ["Bathroom today", stats.bathroom_today],
    ];
    statsEl.innerHTML = cards
      .map(
        ([label, n]) =>
          `<div class="stat"><b>${escapeHtml(String(n ?? 0))}</b><span>${escapeHtml(label)}</span></div>`
      )
      .join("");
  }

  function paintFloor() {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No STAR check-ins for this filter.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((row) => {
        const open = !row.checked_out_at;
        const perm = String(row.permission_status || "missing");
        const who = [row.subject, row.teacher_name].filter(Boolean).join(" · ") || "—";
        const actions = [];
        if (open) {
          actions.push(
            `<button type="button" data-act="checkout" data-id="${escapeHtml(row.id)}">Check out</button>`
          );
        }
        actions.push(
          `<button type="button" data-act="perm" data-id="${escapeHtml(row.student_id)}" data-status="${
            perm === "received" ? "missing" : "received"
          }">${perm === "received" ? "Mark form missing" : "Mark form received"}</button>`
        );
        return `
          <tr>
            <td>${escapeHtml(row.student_name || "")}<br /><span style="color:var(--ink-400)">${escapeHtml(
              row.student_id || ""
            )}</span></td>
            <td>${escapeHtml(row.grade || "")}</td>
            <td>${escapeHtml(who)}</td>
            <td>${row.needs_bus ? "Yes" : "No"}</td>
            <td><span class="badge ${perm === "received" ? "ok" : "warn"}">${
              perm === "received" ? "On file" : "Missing"
            }</span></td>
            <td>${escapeHtml(formatWhen(row.checked_in_at))}${
              open ? ' <span class="badge ok">Here</span>' : `– ${escapeHtml(formatWhen(row.checked_out_at))}`
            }</td>
            <td class="row-actions">${actions.join("")}</td>
          </tr>
        `;
      })
      .join("");
  }

  function paintBathroom() {
    if (!bathroom.length) {
      bathBody.innerHTML = `<tr><td colspan="5">No bathroom passes for this filter.</td></tr>`;
      return;
    }
    bathBody.innerHTML = bathroom
      .map((row) => {
        const open = !row.returned_at;
        return `
          <tr>
            <td>${escapeHtml(row.student_name || "")}<br /><span style="color:var(--ink-400)">${escapeHtml(
              row.student_id || ""
            )}</span></td>
            <td>${escapeHtml(row.grade || "")}</td>
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
  }

  async function refresh() {
    setStatus("Loading…");
    try {
      const data = await request("status", {
        date: dateInput.value || todayEastern(),
        status: viewStatus,
        query: searchInput.value.trim(),
      });
      stats = data.stats || {};
      rows = Array.isArray(data.rows) ? data.rows : [];
      bathroom = Array.isArray(data.bathroom) ? data.bathroom : [];
      paintStats();
      paintFloor();
      paintBathroom();
      showBoard();
      const count = board === "bathroom" ? bathroom.length : rows.length;
      setStatus(`${count} record${count === 1 ? "" : "s"}`, "ok");
    } catch (err) {
      setStatus(err.message || "Could not load Mission Control.", "error");
    }
  }

  function exportCsv() {
    const source = board === "bathroom" ? bathroom : rows;
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
    document.querySelectorAll("#board-chips .filter-chip").forEach((el) => {
      el.classList.toggle("is-on", el === btn);
    });
    showBoard();
    refresh();
  });

  document.getElementById("status-chips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;
    viewStatus = btn.dataset.status;
    document.querySelectorAll("#status-chips .filter-chip").forEach((el) => {
      el.classList.toggle("is-on", el === btn);
    });
    refresh();
  });

  dateInput?.addEventListener("change", refresh);
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchInput._t);
    searchInput._t = window.setTimeout(refresh, 250);
  });
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
