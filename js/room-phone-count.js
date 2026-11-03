(() => {
  const KEY_STORAGE = "flhs-upload-key";
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-room-phones";

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
  const teacherLinkNote = document.getElementById("teacher-link-note");
  const techPanel = document.getElementById("tech-panel");
  const techForm = document.getElementById("tech-form");
  const techPanelName = document.getElementById("tech-panel-name");
  const techPanelMeta = document.getElementById("tech-panel-meta");
  const techRoom = document.getElementById("tech-room");
  const techPhone = document.getElementById("tech-phone");
  const techResponse = document.getElementById("tech-response");

  /** @type {Array<Record<string, unknown>>} */
  let staff = [];
  /** @type {Array<Record<string, unknown>>} */
  let forms = [];
  let view = "missing";
  /** @type {null | { person: Record<string, unknown>, form: Record<string, unknown> | null }} */
  let selectedRow = null;

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

  function formUrl() {
    const path = "/pages/room-phone.html";
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return `https://www.flhshelp.com${path}`;
    return `${location.origin}${path}`;
  }

  function displayPhone(phone) {
    const raw = String(phone || "").trim();
    if (!raw) return "—";
    if (/^radio$/i.test(raw)) return "Radio";
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length === 10 && digits.startsWith("754")) {
      return `754-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 7) return `754-${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  }

  function normRoom(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function normPhone(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^radio$/i.test(raw)) return "RADIO";
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length === 10 && digits.startsWith("754")) digits = digits.slice(3);
    if (digits.length === 7 || digits.length === 10) return digits;
    return raw.toUpperCase();
  }

  function formByStaffId() {
    const map = new Map();
    forms.forEach((row) => map.set(Number(row.staff_id), row));
    return map;
  }

  function resolvedRoom(person, form) {
    if (!form) return String(person.room || "");
    return form.room_confirmed ? String(form.room_on_file || "") : String(form.reported_room || "");
  }

  function resolvedPhone(person, form) {
    if (!form) return String(person.main_phone || "");
    return form.phone_confirmed ? String(form.phone_on_file || "") : String(form.reported_phone || "");
  }

  function directoryMatches(person, form) {
    if (!form) return false;
    return (
      normRoom(person.room) === normRoom(resolvedRoom(person, form)) &&
      normPhone(person.main_phone) === normPhone(resolvedPhone(person, form))
    );
  }

  function joinedRows() {
    const formsById = formByStaffId();
    return staff.map((person) => ({
      person,
      form: formsById.get(Number(person.id)) || null,
    }));
  }

  function rowStatus(row) {
    if (!row.form) return "missing";
    return directoryMatches(row.person, row.form) ? "confirmed" : "review";
  }

  function visibleRows() {
    const q = String(search?.value || "").trim().toLowerCase();
    return joinedRows()
      .filter((row) => {
        const status = rowStatus(row);
        if (view === "missing" && !(isTeacher(row.person) && status === "missing")) return false;
        if (view === "review" && status !== "review") return false;
        if (view === "confirmed" && status !== "confirmed") return false;
        if (!q) return true;
        const hay = [
          displayName(row.person.name),
          row.person.name,
          row.person.role,
          row.person.room,
          row.person.main_phone,
          displayPhone(row.person.main_phone),
          row.form?.reported_room,
          row.form?.reported_phone,
          displayPhone(row.form?.reported_phone),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) =>
        displayName(a.person.name).localeCompare(displayName(b.person.name), undefined, { sensitivity: "base" })
      );
  }

  function suggestBrowardEmail(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    let first = "";
    let last = "";
    if (s.includes(",")) {
      const [lastPart, ...rest] = s.split(",");
      last = lastPart.trim();
      first = rest.join(",").trim();
    } else {
      const parts = s.split(/\s+/).filter(Boolean);
      first = parts[0] || "";
      last = parts.slice(1).join(" ") || parts[0] || "";
    }
    const clean = (value) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");
    first = clean(first);
    last = clean(last);
    if (!first || !last) return "";
    return `${first}.${last}@browardschools.com`;
  }

  function outreachEmail(person) {
    return String(person.email || "").trim() || suggestBrowardEmail(person.name);
  }

  function teacherAnswer(form, kind) {
    if (!form) return "—";
    if (kind === "room") {
      if (form.room_confirmed) return "Confirmed";
      return String(form.reported_room || "").trim() || "None";
    }
    if (form.phone_confirmed) return "Confirmed";
    const reported = String(form.reported_phone || "").trim();
    return reported ? displayPhone(reported) : "None";
  }

  function whenLabel(value) {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function statusBadge(status) {
    if (status === "confirmed") return `<span class="badge badge-ok">Matches</span>`;
    if (status === "review") return `<span class="badge badge-warn">Review</span>`;
    return `<span class="badge badge-miss">Missing</span>`;
  }

  function renderStats() {
    const teachers = staff.filter(isTeacher);
    const byId = formByStaffId();
    const teacherForms = teachers.filter((person) => byId.has(Number(person.id)));
    const missing = teachers.length - teacherForms.length;
    const review = joinedRows().filter((row) => rowStatus(row) === "review").length;
    const roomChanges = forms.filter((form) => !form.room_confirmed).length;
    const phoneChanges = forms.filter((form) => !form.phone_confirmed).length;
    statsEl.innerHTML = `
      <div class="stat stat-survey-ok"><b>${teacherForms.length}/${teachers.length}</b><span>Teachers in</span></div>
      <div class="stat stat-survey-gap"><b>${missing}</b><span>Teachers missing</span></div>
      <div class="stat stat-cart-action"><b>${review}</b><span>Need a directory update</span></div>
      <div class="stat stat-order-secondary"><b>${roomChanges} / ${phoneChanges}</b><span>Room / phone changes</span></div>
    `;
  }

  function renderTable() {
    const rows = visibleRows();
    const labels = {
      missing: `Missing teachers · ${rows.length}`,
      review: `Needs review · ${rows.length}`,
      confirmed: `Matches directory · ${rows.length}`,
      all: `All staff · ${rows.length}`,
    };
    if (tableLabel) tableLabel.textContent = labels[view] || "Roster";
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No one in this view.</td></tr>`;
      return;
    }
    const selectedId = selectedRow ? Number(selectedRow.person.id) : null;
    tbody.innerHTML = rows
      .map((row) => {
        const status = rowStatus(row);
        const id = Number(row.person.id);
        return `<tr class="row-selectable${id === selectedId ? " is-selected" : ""}" data-id="${id}">
          <td>${statusBadge(status)}</td>
          <td>${escapeHtml(displayName(row.person.name))}<br /><span class="note-snippet">${escapeHtml(row.person.role || "")}</span></td>
          <td>${escapeHtml(row.person.room || "—")}</td>
          <td>${escapeHtml(teacherAnswer(row.form, "room"))}</td>
          <td>${escapeHtml(displayPhone(row.person.main_phone))}</td>
          <td>${escapeHtml(teacherAnswer(row.form, "phone"))}</td>
          <td>${escapeHtml(whenLabel(row.form?.updated_at))}</td>
        </tr>`;
      })
      .join("");
  }

  function render() {
    if (teacherLinkNote) {
      const url = formUrl();
      teacherLinkNote.innerHTML = `Teacher form: <a href="room-phone.html">${escapeHtml(url)}</a>`;
    }
    renderStats();
    renderTable();
  }

  function ingestServerData(data) {
    const keepId = selectedRow ? Number(selectedRow.person.id) : null;
    staff = Array.isArray(data.staff) ? data.staff : [];
    forms = Array.isArray(data.forms) ? data.forms : [];
    render();
    if (keepId) {
      const refreshed = joinedRows().find((row) => Number(row.person.id) === keepId);
      if (refreshed) openEditor(refreshed);
      else closeEditor();
    }
  }

  async function apiAction(body) {
    const key = getSavedKey();
    if (!key) throw new Error("Unlock with the staff upload key first");
    const cfg = window.FLHS_SUPABASE || {};
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "x-flhs-upload-key": key,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    ingestServerData(data);
    return data;
  }

  function closeEditor() {
    selectedRow = null;
    if (techPanel) techPanel.hidden = true;
    tbody?.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
  }

  function openEditor(row) {
    selectedRow = row;
    const { person, form } = row;
    if (techPanel) techPanel.hidden = false;
    if (techPanelName) techPanelName.textContent = displayName(person.name);
    if (techPanelMeta) {
      techPanelMeta.textContent = [
        person.role || "Staff",
        person.email || "No email on file",
        form ? "Response on file" : "No response yet",
      ].join(" · ");
    }
    if (techRoom) techRoom.value = resolvedRoom(person, form);
    if (techPhone) techPhone.value = form ? resolvedPhone(person, form) : String(person.main_phone || "");
    if (techResponse) {
      const notes = String(form?.notes || "").trim();
      techResponse.textContent = notes
        ? `Teacher notes: ${notes}`
        : form
          ? "No notes on this response."
          : "No response yet. You can still correct the directory.";
    }
    tbody?.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
    tbody?.querySelector(`tr[data-id="${Number(person.id)}"]`)?.classList.add("is-selected");
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function downloadView() {
    const headers = ["Status", "Name", "Role", "Room on file", "Teacher room", "Phone on file", "Teacher phone", "Email", "Notes", "Updated"];
    const lines = [headers.join(",")];
    visibleRows().forEach((row) => {
      const status = rowStatus(row);
      lines.push(
        [
          status,
          displayName(row.person.name),
          row.person.role || "",
          row.person.room || "",
          teacherAnswer(row.form, "room"),
          displayPhone(row.person.main_phone),
          teacherAnswer(row.form, "phone"),
          outreachEmail(row.person),
          row.form?.notes || "",
          row.form?.updated_at || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `flhs-room-phone-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus(statusEl, `Downloaded ${link.download}`, "ok");
  }

  function emailDraft() {
    const missing = joinedRows().filter((row) => isTeacher(row.person) && !row.form);
    const url = formUrl();
    const addresses = missing.map((row) => outreachEmail(row.person)).filter(Boolean);
    return {
      count: missing.length,
      text: [
        `BCC (${addresses.length} addresses — verify suggested ones before sending):`,
        addresses.join("; "),
        "",
        "Subject: Confirm your classroom and room phone today",
        "",
        "Please confirm your room number and room phone by the end of the day. It takes about a minute:",
        "",
        url,
        "",
        "Find your name, check the room and phone we have on file, and correct anything that is wrong. Use this form instead of emailing IT.",
        "",
        "Thank you,",
        "RJ",
        "Media Center / IT",
        "Fort Lauderdale High School",
      ].join("\n"),
    };
  }

  async function copyEmail() {
    const draft = emailDraft();
    try {
      await navigator.clipboard.writeText(draft.text);
      setStatus(statusEl, `Copied an email for ${draft.count} teachers who have not submitted.`, "ok");
    } catch {
      setStatus(statusEl, "Could not copy. Select the teacher link and copy it manually.", "err");
    }
  }

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
  }

  unlockForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = String(keyInput?.value || "").trim();
    if (!key) return;
    saveKey(key);
    setStatus(gateStatus, "Checking…");
    try {
      await apiAction({ action: "status" });
      showApp();
      setStatus(gateStatus, "");
    } catch (err) {
      setStatus(gateStatus, err.message || "That key did not unlock the list.", "err");
    }
  });

  document.getElementById("view-chips")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    view = button.getAttribute("data-view") || "missing";
    document.querySelectorAll("#view-chips .filter-chip").forEach((chip) => {
      chip.classList.toggle("is-on", chip === button);
    });
    renderTable();
  });

  search?.addEventListener("input", renderTable);

  tbody?.addEventListener("click", (event) => {
    const tr = event.target.closest("tr[data-id]");
    if (!tr) return;
    const id = Number(tr.getAttribute("data-id"));
    const row = joinedRows().find((item) => Number(item.person.id) === id);
    if (row) openEditor(row);
  });

  document.getElementById("tech-panel-close")?.addEventListener("click", closeEditor);
  document.getElementById("copy-email")?.addEventListener("click", copyEmail);
  document.getElementById("export-view")?.addEventListener("click", downloadView);

  techForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedRow) return;
    const saveBtn = document.getElementById("tech-save");
    if (saveBtn) saveBtn.disabled = true;
    setStatus(statusEl, "Saving…");
    try {
      await apiAction({
        action: "apply",
        staff_id: Number(selectedRow.person.id),
        room: String(techRoom?.value || "").trim(),
        phone: String(techPhone?.value || "").trim(),
      });
      setStatus(statusEl, `Directory updated for ${displayName(selectedRow.person.name)}`, "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Save failed", "err");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  document.getElementById("tech-clear-form")?.addEventListener("click", async () => {
    if (!selectedRow?.form) {
      setStatus(statusEl, "There is no response to clear.", "err");
      return;
    }
    const person = selectedRow.person;
    if (!window.confirm(`Clear the room and phone response for ${displayName(person.name)}?`)) return;
    setStatus(statusEl, "Clearing…");
    try {
      await apiAction({ action: "delete", staff_id: Number(person.id) });
      closeEditor();
      setStatus(statusEl, "Response cleared", "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Could not clear", "err");
    }
  });

  const saved = getSavedKey();
  if (saved && keyInput) keyInput.value = saved;
  if (saved) {
    apiAction({ action: "status" })
      .then(showApp)
      .catch(() => setStatus(gateStatus, ""));
  }
})();
