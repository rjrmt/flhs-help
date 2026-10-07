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
  const rosterThead = document.getElementById("roster-thead");
  const inventoryThead = document.getElementById("inventory-thead");
  const buildingFilterEl = document.getElementById("building-filter");
  const extrasFilterEl = document.getElementById("extras-filter");
  const techPanel = document.getElementById("tech-panel");
  const techForm = document.getElementById("tech-form");
  const techPanelName = document.getElementById("tech-panel-name");
  const techPanelMeta = document.getElementById("tech-panel-meta");
  const techRoom = document.getElementById("tech-room");
  const techCartAssign = document.getElementById("tech-cart-assign");
  const techActual = document.getElementById("tech-actual");
  const techMax = document.getElementById("tech-max");
  const techExtras = document.getElementById("tech-extras");
  const techReportedCart = document.getElementById("tech-reported-cart");
  const techNotes = document.getElementById("tech-notes");
  const techExistingNotes = document.getElementById("tech-existing-notes");
  const inventorySummary = document.getElementById("inventory-summary");
  const inventoryPanel = document.getElementById("inventory-panel");

  /** @type {Array<Record<string, unknown>>} */
  let staff = [];
  /** @type {Array<Record<string, unknown>>} */
  let forms = [];
  /** @type {Array<Record<string, unknown>>} */
  let inventory = [];
  let view = "missing";
  let sortKey = "building";
  let sortDir = "asc";
  /** @type {string} */
  let buildingFilter = "all";
  /** @type {"all"|"needs"|"zero"} */
  let extrasFilter = "all";
  let invSortKey = "cart";
  let invSortDir = "asc";
  /** @type {null | { person: Record<string, unknown>, form: Record<string, unknown> | null, building: { label: string } }} */
  let selectedRow = null;
  /** @type {string} */
  let storedFormNotes = "";

  const ROSTER_COLUMNS = [
    { key: "status", label: "Status" },
    { key: "name", label: "Name" },
    { key: "building", label: "Building" },
    { key: "room", label: "Room" },
    { key: "cart", label: "Cart" },
    { key: "sheet", label: "Sheet", title: "Laptops on IT cart inventory sheet" },
    { key: "onHand", label: "On hand" },
    { key: "underSheet", label: "Under sheet", title: "Sheet minus on hand — asset audit only" },
    { key: "maxClass", label: "Max class" },
    { key: "extras", label: "Extras" },
    { key: "notes", label: "Notes" },
    { key: "edit", label: "Edit", sortable: false },
  ];

  const INVENTORY_COLUMNS = [
    { key: "cart", label: "Cart" },
    { key: "teacher", label: "Responsible" },
    { key: "matched", label: "Matched staff" },
    { key: "room", label: "Room" },
    { key: "building", label: "Building" },
    { key: "expected", label: "Expected" },
    { key: "kind", label: "Kind" },
  ];

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

  /** @param {Record<string, unknown> | null} form */
  function reportedCartOf(form) {
    if (!form) return "";
    const direct = String(form.reported_cart || "").trim();
    if (direct) return direct;
    const notes = String(form.notes || "");
    const match = notes.match(/Teacher reports:\s*([^.]+?)(?:\.|$)/i);
    return match ? match[1].trim() : "";
  }

  function teacherNoteSnippet(form) {
    if (!form) return "";
    const notes = String(form.notes || "").trim();
    if (!notes) return "";
    const boilerplate =
      /^(Cart on file:.*?\.|No cart on file\. Teacher reports:.*?\.|Teacher says.*?\.|Teacher reports having a cart, but did not enter a number\.)\s*/i;
    const rest = notes.replace(boilerplate, "").trim();
    return rest || notes;
  }

  /**
   * @param {Record<string, unknown>} person
   * @param {Record<string, unknown> | null} form
   */
  function cartCellHtml(person, form) {
    const onFile = String(person.cart_code || "").trim();
    const onFileLabel = onFile ? escapeHtml(onFile) : "—";
    if (!form) return onFileLabel;

    const reported = reportedCartOf(form);
    const reportedLabel = reported ? escapeHtml(reported) : "";

    if (form.cart_checked) {
      const badge = `<span class="badge badge-ok">Confirmed</span>`;
      if (onFile) return `${onFileLabel} ${badge}`;
      return `<span class="cart-muted">No cart on file</span> ${badge}`;
    }

    let badge;
    let lines = onFileLabel;
    if (!onFile && reported) {
      badge = `<span class="badge badge-info">Reported cart</span>`;
      lines = `${reportedLabel}`;
    } else if (!onFile && !reported) {
      badge = `<span class="badge badge-warn">Has cart, no #</span>`;
    } else if (onFile && reported) {
      badge = `<span class="badge badge-warn">Mismatch</span>`;
      lines = `${onFileLabel} <span class="cart-arrow">→</span> ${reportedLabel}`;
    } else {
      badge = `<span class="badge badge-warn">Disputed, no #</span>`;
    }
    return `${lines} ${badge}`;
  }

  /** @param {Record<string, unknown> | null} form */
  function cartStatusExport(form, person) {
    if (!form) return "";
    const onFile = String(person.cart_code || "").trim();
    if (form.cart_checked) return onFile ? "Confirmed" : "No cart (confirmed)";
    const reported = reportedCartOf(form);
    if (!onFile && reported) return "Reported cart (not on file)";
    if (!onFile && !reported) return "Has cart, no number entered";
    if (onFile && reported) return "Mismatch";
    return "Disputed, no number entered";
  }

  function buildingForRoom(raw) {
    const text = String(raw || "").trim();
    if (!text) return { id: "none", label: "No room", sort: "zzz" };
    const upper = text.toUpperCase();
    if (/MEDIA|922/i.test(upper)) return { id: "media", label: "Media / IT", sort: "Media" };
    if (/ESOL/i.test(upper)) return { id: "esol", label: "ESOL", sort: "ESOL" };

    const pair = upper.match(/^0?(\d+)\s*-\s*(\d+[A-Z]?)/);
    if (pair) {
      const b = Number(pair[1]);
      const labels = {
        4: "Gym (B4)",
        5: "Bldg 5",
        6: "Bldg 6",
        8: "Bldg 8",
        9: "Bldg 9",
        17: "Bldg 17",
        18: "Bldg 18",
        20: "Bldg 20",
        21: "Bldg 21",
      };
      const label = labels[b] || `Bldg ${b}`;
      return { id: `b${b}`, label, sort: label };
    }

    const digits = text.replace(/\D/g, "");
    if (!digits) return { id: "other", label: "Other", sort: "Other" };

    if (/^17\d{2}/.test(digits)) return { id: "b17", label: "Bldg 17", sort: "Bldg 17" };
    if (/^18\d{2}/.test(digits)) return { id: "b18", label: "Bldg 18", sort: "Bldg 18" };
    if (/^20\d{2}/.test(digits)) return { id: "b20", label: "Bldg 20", sort: "Bldg 20" };
    if (/^21\d{2}/.test(digits)) return { id: "b21", label: "Bldg 21", sort: "Bldg 21" };
    if (/^9\d{2}/.test(digits)) return { id: "b9", label: "Bldg 9", sort: "Bldg 9" };
    if (/^8\d{2}/.test(digits)) return { id: "b8", label: "Bldg 8", sort: "Bldg 8" };
    if (/^6\d{2}/.test(digits) || /^28\d/.test(digits)) {
      return { id: "b6", label: "Bldg 6", sort: "Bldg 6" };
    }
    if (/^5\d{2}/.test(digits)) return { id: "b5", label: "Bldg 5", sort: "Bldg 5" };
    if (/^2[5-6]\d/.test(digits)) return { id: "b4", label: "Gym (B4)", sort: "Gym" };
    return { id: "other", label: "Other", sort: "Other" };
  }

  function roomSortKey(raw) {
    const text = String(raw || "").trim();
    const digits = text.replace(/\D/g, "");
    if (!digits) return Number.MAX_SAFE_INTEGER;
    const n = Number(digits);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  }

  function joinedRows() {
    const byId = formByStaffId();
    return staff.map((person) => {
      const form = byId.get(Number(person.id)) || null;
      const expected = Number(person.expected_count) || 0;
      const actual = form && form.actual_count != null ? Number(form.actual_count) : null;
      const underSheet =
        actual == null || expected <= 0 ? null : Math.max(0, expected - actual);
      const building = buildingForRoom(person.room);
      return {
        person,
        form,
        teacher: isTeacher(person),
        expected,
        actual,
        underSheet,
        building,
      };
    });
  }

  function rowMatchesSearch(row) {
    const q = String(search?.value || "").trim().toLowerCase();
    if (!q) return true;
    const person = row.person;
    const hay = `${person.name || ""} ${displayName(person.name)} ${person.room || ""} ${row.building.label} ${person.role || ""} ${person.cart_code || ""} ${person.email || ""}`.toLowerCase();
    return hay.includes(q);
  }

  function rowSortValue(row, key) {
    const { person, form, expected, actual, underSheet, building } = row;
    switch (key) {
      case "status":
        return form ? 1 : 0;
      case "name":
        return displayName(person.name).toLowerCase();
      case "building":
        return building.sort;
      case "room":
        return roomSortKey(person.room);
      case "cart":
        return String(person.cart_code || reportedCartOf(form) || "").toLowerCase();
      case "sheet":
        return expected > 0 ? expected : -1;
      case "onHand":
        return actual == null ? -1 : actual;
      case "underSheet":
        return underSheet == null ? -1 : underSheet;
      case "maxClass":
        return form && form.max_students != null ? Number(form.max_students) : -1;
      case "extras":
        return form ? extrasOf(form) : -1;
      case "notes":
        return teacherNoteSnippet(form).toLowerCase();
      default:
        return "";
    }
  }

  function compareSortValues(a, b, key) {
    const va = rowSortValue(a, key);
    const vb = rowSortValue(b, key);
    if (typeof va === "number" && typeof vb === "number") {
      if (va !== vb) return va - vb;
    } else if (String(va) !== String(vb)) {
      return String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
    }
    const ra = roomSortKey(a.person.room);
    const rb = roomSortKey(b.person.room);
    if (ra !== rb) return ra - rb;
    return displayName(a.person.name).localeCompare(displayName(b.person.name), undefined, {
      sensitivity: "base",
    });
  }

  function sortRowList(rows) {
    const dir = sortDir === "desc" ? -1 : 1;
    return rows.slice().sort((a, b) => compareSortValues(a, b, sortKey) * dir);
  }

  function populateBuildingFilter() {
    if (!buildingFilterEl) return;
    const byBuilding = new Map();
    joinedRows().forEach((row) => {
      const id = row.building.id;
      if (!byBuilding.has(id)) {
        byBuilding.set(id, { id, label: row.building.label, sort: row.building.sort, count: 0 });
      }
      byBuilding.get(id).count += 1;
    });
    const options = [{ id: "all", label: "All buildings" }];
    [...byBuilding.values()]
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .forEach((entry) => {
        options.push({ id: entry.id, label: `${entry.label} (${entry.count})` });
      });
    const prev = buildingFilter;
    buildingFilterEl.innerHTML = options
      .map(
        (opt) =>
          `<option value="${escapeHtml(opt.id)}"${opt.id === prev ? " selected" : ""}>${escapeHtml(opt.label)}</option>`
      )
      .join("");
  }

  function visibleRows() {
    let rows = joinedRows().filter(({ person, form, teacher, building }) => {
      if (view === "missing" && (form || !teacher)) return false;
      if (view === "submitted" && !form) return false;
      if (view === "carts") return false;
      if (buildingFilter !== "all" && building.id !== buildingFilter) return false;
      if (extrasFilter === "needs" && (!form || extrasOf(form) <= 0)) return false;
      if (extrasFilter === "zero" && (!form || extrasOf(form) !== 0)) return false;
      return rowMatchesSearch({ person, form, teacher, building });
    });
    return sortRowList(rows);
  }

  function missingTeacherRows() {
    return joinedRows().filter(
      (row) => row.teacher && !row.form && rowMatchesSearch(row)
    );
  }

  function suggestBrowardEmail(rawName) {
    const s = String(rawName || "").trim();
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

  function exportRow({ person, form, expected, actual, underSheet, building }) {
    const emailOnFile = String(person.email || "").trim();
    const suggested = suggestBrowardEmail(person.name);
    const outreachEmail = emailOnFile || suggested;
    const bld = building || buildingForRoom(person.room);
    return {
      Status: form ? "Submitted" : "Missing",
      Name: displayName(person.name),
      "Roster name": String(person.name || ""),
      Role: String(person.role || ""),
      Building: bld.label,
      Room: String(person.room || ""),
      Cart: String(person.cart_code || ""),
      "Reported cart": form ? reportedCartOf(form) : "",
      "Cart status": cartStatusExport(form, person),
      Expected: expected > 0 ? expected : "",
      "On hand": actual == null ? "" : actual,
      "Under sheet (inv − on hand)": underSheet == null ? "" : underSheet,
      "Class gap (max − on hand)":
        form && form.max_students != null && actual != null
          ? Math.max(0, Number(form.max_students) - actual)
          : "",
      "Max class": form && form.max_students != null ? Number(form.max_students) : "",
      Extras: form ? extrasOf(form) : "",
      "Cart confirmed": !form ? "" : form.cart_checked ? "Yes" : "No",
      "Teacher notes": form ? teacherNoteSnippet(form) : "",
      Phone: String(person.main_phone || ""),
      Email: emailOnFile,
      "Email for outreach": outreachEmail,
      "Suggested email (verify)": emailOnFile ? "" : suggested,
      Notes: form ? String(form.notes || "") : "",
    };
  }

  function exportEmailRow({ person }) {
    const emailOnFile = String(person.email || "").trim();
    const suggested = suggestBrowardEmail(person.name);
    return {
      Name: displayName(person.name),
      "Roster name": String(person.name || ""),
      "Email for outreach": emailOnFile || suggested,
      Email: emailOnFile,
      "Suggested email (verify)": emailOnFile ? "" : suggested,
      Role: String(person.role || ""),
      Room: String(person.room || ""),
      Cart: String(person.cart_code || ""),
      Phone: String(person.main_phone || ""),
    };
  }

  function fileStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function downloadWorkbook(sheets, filename) {
    const XLSX = window.XLSX;
    if (!XLSX) {
      setStatus(statusEl, "Excel export did not load. Refresh and try again.", "err");
      return;
    }
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, rows }) => {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No rows" }]);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
    setStatus(statusEl, `Downloaded ${filename}`, "ok");
  }

  function exportCurrentView() {
    if (view === "carts") {
      const rows = visibleInventory().map((row) => ({
        Cart: row.cart_code,
        Responsible: displayName(row.teacher_name) || row.teacher_name,
        "Matched staff": displayName(row.assigned_name) || row.assigned_name,
        Room: row.room || "",
        Expected: row.expected_count ?? "",
        Kind: kindLabel(row.responsible_kind),
      }));
      downloadWorkbook([{ name: "Cart inventory", rows }], `flhs-laptop-carts-${fileStamp()}.xlsx`);
      return;
    }
    const rows = visibleRows().map(exportRow);
    const label = view === "missing" ? "missing" : view === "submitted" ? "submitted" : "roster";
    downloadWorkbook([{ name: "Roster", rows }], `flhs-laptop-${label}-${fileStamp()}.xlsx`);
  }

  function exportMissingBundle() {
    const missing = missingTeacherRows();
    downloadWorkbook(
      [
        { name: "Missing teachers", rows: missing.map(exportRow) },
        { name: "Email list", rows: missing.map(exportEmailRow) },
      ],
      `flhs-laptop-missing-${fileStamp()}.xlsx`
    );
  }

  function computedGap(form) {
    if (!form || form.actual_count == null || form.max_students == null) return null;
    return Math.max(0, Number(form.max_students) - Number(form.actual_count));
  }

  function orderTeacherRows() {
    return joinedRows()
      .filter(({ form, teacher }) => teacher && form)
      .map(({ person, form, actual }) => {
        const gap = computedGap(form);
        const extras = extrasOf(form);
        return {
          Building: buildingForRoom(person.room).label,
          Room: String(person.room || ""),
          Teacher: displayName(person.name),
          "Roster name": String(person.name || ""),
          Cart: String(person.cart_code || reportedCartOf(form) || ""),
          "On hand": actual == null ? "" : actual,
          "Max class": form.max_students ?? "",
          "Gap (max − on hand)": gap == null ? "" : gap,
          "Extras to order": extras,
          Notes: teacherNoteSnippet(form),
        };
      })
      .sort((a, b) => Number(b["Extras to order"]) - Number(a["Extras to order"]));
  }

  function bossBriefMetrics() {
    const teachers = joinedRows().filter((row) => row.teacher);
    const submitted = teachers.filter((row) => row.form);
    const missing = teachers.filter((row) => !row.form);
    const teacherExtras = submitted.reduce((sum, row) => sum + extrasOf(row.form), 0);
    const nSub = submitted.length;
    const nMiss = missing.length;
    const nTotal = teachers.length;
    const needers = submitted.filter((row) => extrasOf(row.form) > 0);
    const avgExtrasAll = nSub ? teacherExtras / nSub : 0;
    const avgExtrasNeed =
      needers.length > 0
        ? needers.reduce((sum, row) => sum + extrasOf(row.form), 0) / needers.length
        : 0;
    const needRate = nSub ? needers.length / nSub : 0;
    const projectedIfAvg = Math.round(teacherExtras + nMiss * avgExtrasAll);
    const projectedIfNeedRate = Math.round(
      teacherExtras + nMiss * needRate * avgExtrasNeed
    );
    const classGap = submitted.reduce((sum, { form }) => {
      if (!form || form.max_students == null || form.actual_count == null) return sum;
      return sum + Math.max(0, Number(form.max_students) - Number(form.actual_count));
    }, 0);
    const missingWithCart = missing.filter(
      (row) => Number(row.person.expected_count) > 0
    ).length;
    const stamp = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      teachers,
      submitted,
      missing,
      teacherExtras,
      nSub,
      nMiss,
      nTotal,
      needers,
      avgExtrasAll,
      avgExtrasNeed,
      needRate,
      projectedIfAvg,
      projectedIfNeedRate,
      classGap,
      missingWithCart,
      stamp,
      pctResponded: nTotal ? Math.round((100 * nSub) / nTotal) : 0,
    };
  }

  function buildBossEmail(metrics) {
    const m = metrics;
    const subject = `FLHS classroom laptop survey — ${m.nSub}/${m.nTotal} teachers in, ${m.teacherExtras} extras identified (${m.stamp})`;
    const body = `Good morning,

Summary of the Fort Lauderdale HS classroom laptop survey (teachers count laptops on hand, largest class size, and extras still needed — not a full class set).

RESPONSE STATUS
• ${m.nSub} of ${m.nTotal} teachers have submitted (${m.pctResponded}%).
• ${m.nMiss} teachers have not submitted yet (${m.missingWithCart} of those have a cart assigned on our inventory sheet and should be prioritized for follow-up).
• Spreadsheet attached: submitted results, non-responders with emails, and order totals.

WHAT WE KNOW SO FAR (SUBMITTED ONLY)
• Extras requested (classroom teachers): ${m.teacherExtras} laptops.
• ${m.needers.length} teachers reported they need extras; ${m.nSub - m.needers.length} reported 0 extras for now.
• Average among respondents: ${m.avgExtrasAll.toFixed(1)} extras per teacher (all who submitted).
• Average among those who asked for more: ${m.avgExtrasNeed.toFixed(1)} extras per teacher.
• Combined “max class minus on hand” gap (before manual adjustments): ${m.classGap} laptops across respondents.

ESTIMATE IF NON-RESPONDERS LOOK LIKE CURRENT RESPONDENTS (NOT A PURCHASE ORDER)
• Simple average extrapolation: ~${m.projectedIfAvg} extras schoolwide (${m.teacherExtras} confirmed + ~${Math.round(m.nMiss * m.avgExtrasAll)} if remaining ${m.nMiss} teachers match the ${m.avgExtrasAll.toFixed(1)} average).
• Adjusted for how often respondents asked for extras (~${Math.round(m.needRate * 100)}%): ~${m.projectedIfNeedRate} extras — still uncertain until we hear from the remaining ${m.nMiss} teachers.

RECOMMENDED NEXT STEPS
1. Use ${m.teacherExtras} as the firm floor for planning from completed surveys.
2. Send reminder to the ${m.nMiss} non-responders (email list in the Excel “Not submitted” tab).
3. Re-run totals after deadline; order number should be based on “Extras to order” column, not inventory sheet counts alone.

Survey link for staff: FLHS Help Hub → Teacher Resources → Classroom laptop report.

Please let me know if you want this broken out by building or department.

Thank you,
[Your name]
Fort Lauderdale HS · Media Center / IT`;
    return { subject, body };
  }

  function missingTeacherExportRows() {
    return missingTeacherRows().map(({ person, building }) => {
      const emailOnFile = String(person.email || "").trim();
      const suggested = suggestBrowardEmail(person.name);
      return {
        Name: displayName(person.name),
        "Roster name": String(person.name || ""),
        Building: building.label,
        Room: String(person.room || ""),
        Cart: String(person.cart_code || ""),
        "Sheet qty": Number(person.expected_count) > 0 ? Number(person.expected_count) : "",
        Role: String(person.role || ""),
        Email: emailOnFile,
        "Email for outreach": emailOnFile || suggested,
        "Suggested email (verify)": emailOnFile ? "" : suggested,
      };
    });
  }

  function exportBossBrief() {
    const metrics = bossBriefMetrics();
    const { subject, body } = buildBossEmail(metrics);
    const summaryRows = [
      { Metric: "Report date", Value: metrics.stamp },
      { Metric: "Teachers on roster", Value: metrics.nTotal },
      { Metric: "Submitted", Value: metrics.nSub },
      { Metric: "Not submitted", Value: metrics.nMiss },
      { Metric: "Response rate", Value: `${metrics.pctResponded}%` },
      { Metric: "Not submitted — have cart on sheet", Value: metrics.missingWithCart },
      { Metric: "Extras to order (submitted teachers only)", Value: metrics.teacherExtras },
      { Metric: "Avg extras — all submitted", Value: metrics.avgExtrasAll.toFixed(1) },
      { Metric: "Avg extras — only those who asked for >0", Value: metrics.avgExtrasNeed.toFixed(1) },
      { Metric: "Teachers asking for >0 extras", Value: metrics.needers.length },
      { Metric: "Class gap sum (max − on hand), submitted", Value: metrics.classGap },
      {
        Metric: "Projected total if non-responders match avg respondent",
        Value: metrics.projectedIfAvg,
      },
      {
        Metric: "Projected total (adjusted for % who asked for extras)",
        Value: metrics.projectedIfNeedRate,
      },
      { Metric: "Email subject line", Value: subject },
    ];
    const emailLines = body.split("\n").map((line, index) => ({
      Line: index + 1,
      Text: line,
    }));
    downloadWorkbook(
      [
        { name: "Executive summary", rows: summaryRows },
        { name: "Submitted orders", rows: orderTeacherRows() },
        { name: "Not submitted", rows: missingTeacherExportRows() },
        { name: "Email draft", rows: emailLines },
      ],
      `flhs-laptop-boss-brief-${fileStamp()}.xlsx`
    );
    return { subject, body };
  }

  async function copyBossEmail() {
    const { subject, body } = buildBossEmail(bossBriefMetrics());
    const full = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(full);
      setStatus(statusEl, "Boss email copied to clipboard. Excel downloaded.", "ok");
    } catch {
      setStatus(statusEl, "Downloaded Excel — copy email from the Email draft sheet.", "ok");
    }
  }

  function exportOrderSummary() {
    const teachers = orderTeacherRows();
    const teacherExtras = teachers.reduce((sum, row) => sum + Number(row["Extras to order"] || 0), 0);
    const allExtras = forms.reduce((sum, row) => sum + extrasOf(row), 0);
    const nonTeacherExtras = allExtras - teacherExtras;
    const withNeed = teachers.filter((row) => Number(row["Extras to order"]) > 0);
    const byRoom = new Map();
    teachers.forEach((row) => {
      const room = row.Room || "—";
      const prev = byRoom.get(room) || { Room: room, "Extras to order": 0, Teachers: "" };
      prev["Extras to order"] += Number(row["Extras to order"] || 0);
      const bit = `${row.Teacher} (${row["Extras to order"]})`;
      prev.Teachers = prev.Teachers ? `${prev.Teachers}; ${bit}` : bit;
      byRoom.set(room, prev);
    });
    const roomRows = [...byRoom.values()].sort(
      (a, b) => b["Extras to order"] - a["Extras to order"]
    );
    const summary = [
      {
        Metric: "Survey submissions (all roles)",
        Value: forms.length,
      },
      {
        Metric: "Teacher submissions",
        Value: teachers.length,
      },
      {
        Metric: "Teachers still missing survey",
        Value: joinedRows().filter(({ teacher, form }) => teacher && !form).length,
      },
      {
        Metric: "Extras to order — teachers (use for classroom buy)",
        Value: teacherExtras,
      },
      {
        Metric: "Extras — non-teacher submissions (e.g. IT)",
        Value: nonTeacherExtras,
      },
      {
        Metric: "Extras to order — all submissions",
        Value: allExtras,
      },
      {
        Metric: "Teachers reporting 0 extras",
        Value: teachers.length - withNeed.length,
      },
      {
        Metric: "Generated",
        Value: new Date().toISOString(),
      },
    ];
    downloadWorkbook(
      [
        { name: "Summary", rows: summary },
        { name: "By teacher", rows: teachers },
        { name: "By room", rows: roomRows },
        { name: "Need extras only", rows: withNeed },
      ],
      `flhs-laptop-order-${fileStamp()}.xlsx`
    );
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
    const teacherOrder = joinedRows()
      .filter(({ teacher, form }) => teacher && form)
      .reduce((sum, row) => sum + extrasOf(row.form), 0);
    const classGapTeachers = rows
      .filter(({ teacher, form }) => teacher && form)
      .reduce((sum, { form }) => {
        if (form.max_students == null || form.actual_count == null) return sum;
        return sum + Math.max(0, Number(form.max_students) - Number(form.actual_count));
      }, 0);
    const cartsChecked = forms.filter((row) => row.cart_checked).length;
    const cartFollowUps = forms.filter((row) => !row.cart_checked).length;
    const assignedCarts = inventory.filter((row) => row.staff_id).length;
    statsEl.innerHTML = `
      <p class="stats-legend" aria-hidden="true">
        <span class="stats-legend-item stats-legend-survey">Survey</span>
        <span class="stats-legend-item stats-legend-order">Order</span>
        <span class="stats-legend-item stats-legend-cart">Carts</span>
      </p>
      <div class="stat stat-survey-ok"><b>${teacherForms.length}/${teachers.length}</b><span>Teachers in</span></div>
      <div class="stat stat-survey-gap"><b>${missingTeachers}</b><span>Teachers missing</span></div>
      <div class="stat stat-order-primary"><b>${teacherOrder}</b><span>Order · teachers</span></div>
      <div class="stat stat-order-secondary"><b>${extras}</b><span>Extras · all forms</span></div>
      <div class="stat stat-order-gap" title="Largest class minus laptops counted — before teachers adjust extras.">
        <b>${classGapTeachers}</b><span>Class gap · teachers</span>
        <em class="stat-hint">max class − on hand</em>
      </div>
      <div class="stat stat-cart-ok"><b>${cartsChecked}</b><span>Carts confirmed</span></div>
      <div class="stat stat-cart-action"><b>${cartFollowUps}</b><span>Cart follow-ups</span></div>
      <div class="stat stat-cart-meta"><b>${assignedCarts}/${inventory.length}</b><span>Carts assigned</span></div>
    `;
  }

  function sortIndicator(key) {
    if (sortKey !== key) return `<span class="th-sort" aria-hidden="true">↕</span>`;
    return `<span class="th-sort is-active" aria-hidden="true">${sortDir === "asc" ? "↑" : "↓"}</span>`;
  }

  function renderRosterHead() {
    if (!rosterThead) return;
    rosterThead.innerHTML = `<tr>${ROSTER_COLUMNS.map((col) => {
      if (col.sortable === false) {
        return `<th scope="col">${escapeHtml(col.label)}</th>`;
      }
      return `<th scope="col" class="th-sortable" data-sort="${col.key}" title="${escapeHtml(col.title || "Click to sort")}">${escapeHtml(col.label)}${sortIndicator(col.key)}</th>`;
    }).join("")}</tr>`;
  }

  function ingestServerData(data) {
    const keepId = selectedRow ? Number(selectedRow.person.id) : null;
    staff = Array.isArray(data.staff) ? data.staff : [];
    forms = Array.isArray(data.forms) ? data.forms : [];
    inventory = Array.isArray(data.inventory) ? data.inventory : [];
    populateBuildingFilter();
    render();
    if (keepId) {
      const refreshed = joinedRows().find((row) => Number(row.person.id) === keepId);
      if (refreshed) openTechEditor(refreshed, { preserveDraft: true });
      else closeTechPanel();
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
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    ingestServerData(data);
    return data;
  }

  function populateTechCartSelect(person) {
    if (!techCartAssign) return;
    const assigned = String(person.cart_code || "")
      .split(/[,/]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    const opts = ['<option value="">— No change —</option>'];
    const codes = inventory
      .map((row) => String(row.cart_code || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    codes.forEach((code) => {
      const mine = assigned.includes(code) ? " (on file)" : "";
      opts.push(`<option value="${escapeHtml(code)}">${escapeHtml(code)}${mine}</option>`);
    });
    techCartAssign.innerHTML = opts.join("");
  }

  function closeTechPanel() {
    selectedRow = null;
    storedFormNotes = "";
    if (techPanel) techPanel.hidden = true;
    tbody?.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
  }

  function openTechEditor(row, opts = {}) {
    const { preserveDraft = false } = opts;
    selectedRow = row;
    const { person, form, building } = row;
    const id = Number(person.id);
    if (techPanel) techPanel.hidden = false;
    if (techPanelName) techPanelName.textContent = displayName(person.name);
    if (techPanelMeta) {
      techPanelMeta.textContent = [
        building.label,
        person.room ? `Room ${person.room}` : "No room",
        person.cart_code ? `Cart ${person.cart_code}` : "No cart on file",
        form ? "Survey on file" : "No survey yet",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    populateTechCartSelect(person);
    if (!preserveDraft) {
      if (techRoom) techRoom.value = String(person.room || "");
      if (techActual) techActual.value = form && form.actual_count != null ? String(form.actual_count) : "";
      if (techMax) techMax.value = form && form.max_students != null ? String(form.max_students) : "";
      if (techExtras) techExtras.value = form ? String(extrasOf(form)) : "";
      if (techReportedCart) techReportedCart.value = form ? reportedCartOf(form) : "";
      const cartOk = form ? (form.cart_checked ? "yes" : "no") : "yes";
      techForm?.querySelector(`input[name="tech-cart-ok"][value="${cartOk}"]`)?.click();
      storedFormNotes = form ? String(form.notes || "") : "";
      if (techNotes) techNotes.value = "";
      if (techExistingNotes) {
        techExistingNotes.textContent = storedFormNotes
          ? `On file: ${storedFormNotes}`
          : "No prior notes on this survey.";
      }
    }
    if (!preserveDraft) techPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function saveTechEdits(event) {
    event.preventDefault();
    if (!selectedRow) return;
    const person = selectedRow.person;
    const staffId = Number(person.id);
    const saveBtn = document.getElementById("tech-save");
    if (saveBtn) saveBtn.disabled = true;
    setStatus(statusEl, "Saving…");
    try {
      const roomVal = String(techRoom?.value || "").trim();
      if (roomVal !== String(person.room || "").trim()) {
        await apiAction({ action: "patch_staff", staff_id: staffId, room: roomVal });
      }
      const cartPick = String(techCartAssign?.value || "").trim();
      if (cartPick) {
        await apiAction({
          action: "assign_cart",
          cart_code: cartPick,
          staff_id: staffId,
        });
      }
      const actual = Number(techActual?.value);
      const max = Number(techMax?.value);
      const extras = Number(techExtras?.value);
      const cartRadio = techForm?.querySelector('input[name="tech-cart-ok"]:checked')?.value;
      if (!Number.isFinite(actual) || !Number.isFinite(max) || !Number.isFinite(extras)) {
        setStatus(statusEl, "Enter on hand, max class, and extras (use 0 if none).", "err");
        return;
      }
      const draft = String(techNotes?.value || "").trim();
      const stamp = new Date().toLocaleDateString();
      let notes = storedFormNotes;
      if (draft) {
        const tag = `[IT ${stamp}] ${draft}`;
        notes = notes ? `${notes} ${tag}` : tag;
      }
      await apiAction({
        action: "save_need",
        staff_id: staffId,
        cart_checked: cartRadio !== "no",
        max_students: max,
        actual_count: actual,
        extras_needed: extras,
        reported_cart: String(techReportedCart?.value || "").trim(),
        notes,
      });
      setStatus(statusEl, `Saved for ${displayName(person.name)}`, "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Save failed", "err");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function clearTechSurvey() {
    if (!selectedRow) return;
    const person = selectedRow.person;
    if (
      !window.confirm(
        `Clear the laptop survey for ${displayName(person.name)}? They will show as missing until someone submits again.`
      )
    ) {
      return;
    }
    setStatus(statusEl, "Clearing…");
    try {
      await apiAction({ action: "delete_need", staff_id: Number(person.id) });
      closeTechPanel();
      setStatus(statusEl, "Survey row cleared", "ok");
    } catch (err) {
      setStatus(statusEl, err.message || "Could not clear", "err");
    }
  }

  function renderTable() {
    renderRosterHead();
    if (view === "carts") {
      if (tableLabel) tableLabel.textContent = "Use the cart inventory table below";
      tbody.innerHTML = `<tr><td colspan="12">Switch stays on cart inventory — expand the section below.</td></tr>`;
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
      tbody.innerHTML = `<tr><td colspan="12">No rows for this view.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map(({ person, form, expected, actual, underSheet, building }) => {
        const status = form
          ? `<span class="badge badge-ok">Submitted</span>`
          : `<span class="badge badge-miss">Missing</span>`;
        const note = form ? teacherNoteSnippet(form) : "";
        const noteCell = note
          ? `<span class="note-snippet" title="${escapeHtml(note)}">${escapeHtml(note.length > 48 ? `${note.slice(0, 45)}…` : note)}</span>`
          : "—";
        const sid = Number(person.id);
        const selected = selectedRow && Number(selectedRow.person.id) === sid;
        return `<tr class="row-selectable${selected ? " is-selected" : ""}" data-staff-id="${sid}" tabindex="0">
          <td>${status}</td>
          <td>${escapeHtml(displayName(person.name))}</td>
          <td>${escapeHtml(building.label)}</td>
          <td>${escapeHtml(person.room || "—")}</td>
          <td class="cart-cell">${cartCellHtml(person, form)}</td>
          <td>${expected ? escapeHtml(expected) : "—"}</td>
          <td>${actual == null ? "—" : escapeHtml(actual)}</td>
          <td title="IT inventory expected minus counted (not extras to order)">${underSheet == null ? "—" : escapeHtml(underSheet)}</td>
          <td>${form ? escapeHtml(form.max_students) : "—"}</td>
          <td>${form ? escapeHtml(extrasOf(form)) : "—"}</td>
          <td>${noteCell}</td>
          <td><button type="button" class="btn btn-sm edit-row-btn">Edit</button></td>
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

  function invSortValue(row, key) {
    switch (key) {
      case "cart":
        return String(row.cart_code || "").toLowerCase();
      case "teacher":
        return String(displayName(row.teacher_name) || row.teacher_name || "").toLowerCase();
      case "matched":
        return String(displayName(row.assigned_name) || "").toLowerCase();
      case "room":
        return roomSortKey(row.room);
      case "building":
        return buildingForRoom(row.room).sort;
      case "expected":
        return row.expected_count == null ? -1 : Number(row.expected_count);
      case "kind":
        return kindLabel(row.responsible_kind).toLowerCase();
      default:
        return "";
    }
  }

  function sortInventoryRows(rows) {
    const dir = invSortDir === "desc" ? -1 : 1;
    return rows.slice().sort((a, b) => {
      const va = invSortValue(a, invSortKey);
      const vb = invSortValue(b, invSortKey);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
      return cmp * dir;
    });
  }

  function invSortIndicator(key) {
    if (invSortKey !== key) return `<span class="th-sort" aria-hidden="true">↕</span>`;
    return `<span class="th-sort is-active" aria-hidden="true">${invSortDir === "asc" ? "↑" : "↓"}</span>`;
  }

  function renderInventoryHead() {
    if (!inventoryThead) return;
    inventoryThead.innerHTML = `<tr>${INVENTORY_COLUMNS.map(
      (col) =>
        `<th scope="col" class="th-sortable" data-inv-sort="${col.key}">${escapeHtml(col.label)}${invSortIndicator(col.key)}</th>`
    ).join("")}</tr>`;
  }

  function renderInventory() {
    renderInventoryHead();
    const rows = sortInventoryRows(visibleInventory());
    if (inventorySummary) {
      inventorySummary.textContent = inventory.length
        ? `${inventory.length} carts · ${rows.length} shown`
        : "No data";
    }
    if (!inventory.length) {
      inventoryWrap.hidden = true;
      inventoryNote.hidden = false;
      inventoryNote.textContent = "No cart inventory loaded.";
      return;
    }
    inventoryNote.hidden = true;
    inventoryWrap.hidden = false;
    if (!rows.length) {
      inventoryBody.innerHTML = `<tr><td colspan="7">No carts match this search.</td></tr>`;
      return;
    }
    inventoryBody.innerHTML = rows
      .map((row) => {
        const matched = row.assigned_name || row.staff_id
          ? displayName(row.assigned_name || "")
          : "—";
        const bld = buildingForRoom(row.room);
        return `<tr>
          <td>${escapeHtml(row.cart_code)}</td>
          <td>${escapeHtml(displayName(row.teacher_name) || "—")}</td>
          <td>${escapeHtml(matched)}</td>
          <td>${escapeHtml(row.room || "—")}</td>
          <td>${escapeHtml(bld.label)}</td>
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
    saveKey(key);
    gate.hidden = true;
    app.hidden = false;
    setStatus(statusEl, "Loading…");
    try {
      await apiAction({ action: "status" });
      setStatus(
        statusEl,
        `${inventory.length} carts on file · ${forms.length} form${forms.length === 1 ? "" : "s"} submitted`,
        "ok"
      );
    } catch (err) {
      throw err;
    }
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

  buildingFilterEl?.addEventListener("change", () => {
    buildingFilter = buildingFilterEl.value || "all";
    renderTable();
  });

  extrasFilterEl?.addEventListener("change", () => {
    extrasFilter = extrasFilterEl.value || "all";
    renderTable();
  });

  document.getElementById("clear-table-filters")?.addEventListener("click", () => {
    buildingFilter = "all";
    extrasFilter = "all";
    if (buildingFilterEl) buildingFilterEl.value = "all";
    if (extrasFilterEl) extrasFilterEl.value = "all";
    if (search) search.value = "";
    sortKey = "building";
    sortDir = "asc";
    renderTable();
    renderInventory();
  });

  rosterThead?.addEventListener("click", (event) => {
    const th = event.target.closest("th[data-sort]");
    if (!th) return;
    const key = th.getAttribute("data-sort");
    if (!key) return;
    if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
    else {
      sortKey = key;
      sortDir = key === "name" || key === "building" || key === "room" ? "asc" : "desc";
    }
    renderTable();
  });

  inventoryThead?.addEventListener("click", (event) => {
    const th = event.target.closest("th[data-inv-sort]");
    if (!th) return;
    const key = th.getAttribute("data-inv-sort");
    if (!key) return;
    if (invSortKey === key) invSortDir = invSortDir === "asc" ? "desc" : "asc";
    else {
      invSortKey = key;
      invSortDir = "asc";
    }
    renderInventory();
  });

  document.getElementById("export-view")?.addEventListener("click", () => exportCurrentView());
  document.getElementById("export-missing")?.addEventListener("click", () => exportMissingBundle());
  document.getElementById("export-order")?.addEventListener("click", () => exportOrderSummary());
  document.getElementById("export-boss")?.addEventListener("click", () => {
    exportBossBrief();
    copyBossEmail();
  });

  document.getElementById("view-chips")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-view]");
    if (!btn) return;
    view = btn.getAttribute("data-view") || "missing";
    document.querySelectorAll("#view-chips .filter-chip").forEach((el) => {
      el.classList.toggle("is-on", el === btn);
    });
    if (view === "carts" && inventoryPanel) inventoryPanel.open = true;
    renderTable();
    renderInventory();
  });

  document.getElementById("tech-panel-close")?.addEventListener("click", closeTechPanel);
  techForm?.addEventListener("submit", saveTechEdits);
  document.getElementById("tech-clear-form")?.addEventListener("click", clearTechSurvey);

  tbody?.addEventListener("click", (event) => {
    const btn = event.target.closest(".edit-row-btn");
    const tr = event.target.closest("tr[data-staff-id]");
    if (!tr) return;
    const id = Number(tr.getAttribute("data-staff-id"));
    const row = joinedRows().find((item) => Number(item.person.id) === id);
    if (!row) return;
    if (btn || event.target.closest("tr.row-selectable")) {
      if (btn || !event.target.closest("button")) openTechEditor(row);
    }
  });

  tbody?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const tr = event.target.closest("tr[data-staff-id]");
    if (!tr) return;
    event.preventDefault();
    const id = Number(tr.getAttribute("data-staff-id"));
    const row = joinedRows().find((item) => Number(item.person.id) === id);
    if (row) openTechEditor(row);
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
