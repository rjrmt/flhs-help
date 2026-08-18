(() => {
  const ELIGIBLE_URL = "../data/laptop-eligible.csv";
  const ROSTER_URL = "../data/homerooms.csv";
  const TABLE = "laptop_checkins";
  const STUDENT_ID_LEN = 10;
  const AUTO_SEARCH_MS = 120;
  const RESET_MS = {
    ok: 6000,
    already: 5500,
    deny: 8000,
    missing: 5000,
  };

  const form = document.getElementById("checkout-form");
  const input = document.getElementById("student-number");
  const searchBtn = document.getElementById("search-btn");
  const overlay = document.getElementById("result-overlay");
  const staffPanel = document.getElementById("staff-panel");
  const logBody = document.getElementById("log-body");
  const emptyLog = document.getElementById("empty-log");
  const statEligible = document.getElementById("stat-eligible");
  const statIn = document.getElementById("stat-in");
  const statLeft = document.getElementById("stat-left");
  const liveIn = document.getElementById("live-in");
  const liveEligible = document.getElementById("live-eligible");
  const syncNote = document.getElementById("sync-note");

  /** @type {Map<string, {studentId: string, name: string, grade: string, choice: string}> | null} */
  let eligibleById = null;
  /** @type {Map<string, {studentId: string, name: string, grade: string, whiteTeacher: string, whiteRoom: string, blueTeacher: string, blueRoom: string}> | null} */
  let rosterById = null;
  /** @type {Map<string, {studentId: string, name: string, grade: string, at: string, lastAt: string, scans: number}>} */
  const checkins = new Map();
  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  let db = null;
  /** @type {Promise<void> | null} */
  let loadPromise = null;
  let autoSearchTimer = 0;
  let resetTimer = 0;
  let lastAutoSearched = "";
  let searchInFlight = false;
  let wakeLock = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch === "\r") {
        // skip
      } else {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
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

  function titleCaseName(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    return value
      .toLowerCase()
      .replace(/(^|[\s,(\-/])([a-z])/g, (match) => match.toUpperCase());
  }

  function gradeLabel(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    const n = Number(digits);
    const suffix =
      n === 11 || n === 12 || n === 13
        ? "th"
        : n % 10 === 1
          ? "st"
          : n % 10 === 2
            ? "nd"
            : n % 10 === 3
              ? "rd"
              : "th";
    return `${n}${suffix} grade`;
  }

  function formatWhen(iso) {
    try {
      const date = new Date(iso);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function setSync(message, ok = true) {
    if (!syncNote) return;
    syncNote.textContent = message;
    syncNote.style.color = ok ? "" : "#be123c";
  }

  function rowFromDb(row) {
    if (!row?.student_id) return null;
    return {
      studentId: normalizeStudentId(row.student_id),
      name: row.name || "",
      grade: row.grade || "",
      at: row.checked_in_at || row.created_at || new Date().toISOString(),
      lastAt: row.last_scan_at || row.checked_in_at || new Date().toISOString(),
      scans: Number(row.scan_count) || 1,
    };
  }

  function applyRow(row) {
    const parsed = rowFromDb(row);
    if (!parsed) return;
    checkins.set(parsed.studentId, parsed);
  }

  function removeRow(studentId) {
    checkins.delete(normalizeStudentId(studentId));
  }

  function connectDb() {
    const cfg = window.FLHS_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey) {
      throw new Error("Missing Supabase config");
    }
    if (!window.supabase?.createClient) {
      throw new Error("Supabase library did not load");
    }
    db = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return db;
  }

  async function loadCheckins() {
    const { data, error } = await db
      .from(TABLE)
      .select("student_id,name,grade,checked_in_at,last_scan_at,scan_count")
      .order("checked_in_at", { ascending: false });
    if (error) throw error;
    checkins.clear();
    for (const row of data || []) applyRow(row);
  }

  function subscribeCheckins() {
    db.channel("laptop-checkins-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = payload.old?.student_id;
            if (id) removeRow(id);
          } else if (payload.new) {
            applyRow(payload.new);
          }
          updateStats();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSync("Live · all 5 kiosk laptops share this list");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSync("Live sync paused — refresh if another laptop looks ahead", false);
        }
      });
  }

  function rowsToMap(text, mapper) {
    const rows = parseCsv(text);
    if (rows.length < 2) return new Map();
    const header = rows[0].map((h) => h.trim());
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const map = new Map();
    for (let i = 1; i < rows.length; i += 1) {
      const record = mapper(rows[i], idx);
      if (record?.studentId && !map.has(record.studentId)) {
        map.set(record.studentId, record);
      }
    }
    return map;
  }

  async function loadLists() {
    if (eligibleById && rosterById) return;
    if (!loadPromise) {
      loadPromise = (async () => {
        const [eligibleRes, rosterRes] = await Promise.all([
          fetch(ELIGIBLE_URL, { cache: "no-cache" }),
          fetch(ROSTER_URL, { cache: "no-cache" }),
        ]);
        if (!eligibleRes.ok) {
          throw new Error(`Could not load checkout list (${eligibleRes.status})`);
        }
        if (!rosterRes.ok) {
          throw new Error(`Could not load homeroom roster (${rosterRes.status})`);
        }
        const [eligibleText, rosterText] = await Promise.all([
          eligibleRes.text(),
          rosterRes.text(),
        ]);
        eligibleById = rowsToMap(eligibleText, (r, idx) => {
          const studentId = normalizeStudentId(r[idx.student_id]);
          const choice = (r[idx.choice] || "").trim();
          if (!studentId) return null;
          if (!/opt-?\s*in/i.test(choice)) return null;
          return {
            studentId,
            name: (r[idx.name] || "").trim(),
            grade: (r[idx.grade] || "").trim(),
            choice,
          };
        });
        rosterById = rowsToMap(rosterText, (r, idx) => {
          const studentId = normalizeStudentId(r[idx.student_id]);
          if (!studentId) return null;
          return {
            studentId,
            name: (r[idx.name] || "").trim(),
            grade: (r[idx.grade] || "").trim(),
            whiteTeacher: (r[idx.white_teacher] || "").trim(),
            whiteRoom: (r[idx.white_room] || "").trim(),
            blueTeacher: (r[idx.blue_teacher] || "").trim(),
            blueRoom: (r[idx.blue_room] || "").trim(),
          };
        });
      })().catch((err) => {
        loadPromise = null;
        throw err;
      });
    }
    await loadPromise;
  }

  function playTone(kind) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const notes =
        kind === "ok"
          ? [
              [523, 0, 0.12],
              [784, 0.12, 0.18],
            ]
          : kind === "already"
            ? [[440, 0, 0.16]]
            : [
                [196, 0, 0.22],
                [147, 0.18, 0.28],
              ];
      for (const [freq, start, dur] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = kind === "ok" ? "sine" : "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.08, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      }
      window.setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch {
      /* kiosk still works without audio */
    }
  }

  function homeroomLine(roster) {
    if (!roster) return "";
    const teacher = roster.whiteTeacher || roster.blueTeacher;
    const room = roster.whiteRoom || roster.blueRoom;
    if (!teacher && !room) return "";
    const bits = [];
    if (teacher) bits.push(titleCaseName(teacher));
    if (room) bits.push(`Rm ${room}`);
    return bits.join(" · ");
  }

  function updateStats() {
    const eligible = eligibleById ? eligibleById.size : 0;
    const checked = checkins.size;
    const left = Math.max(0, eligible - checked);
    if (statEligible) statEligible.textContent = String(eligible);
    if (statIn) statIn.textContent = String(checked);
    if (statLeft) statLeft.textContent = String(left);
    if (liveIn) liveIn.textContent = String(checked);
    if (liveEligible) liveEligible.textContent = String(eligible);
    renderLog();
  }

  function renderLog() {
    if (!logBody) return;
    const rows = [...checkins.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
    if (emptyLog) emptyLog.hidden = rows.length > 0;
    logBody.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${escapeHtml(formatWhen(row.at))}</td>
          <td>${escapeHtml(titleCaseName(row.name) || row.studentId)}</td>
          <td>${escapeHtml(String(row.grade || "").replace(/^0/, "") || "—")}</td>
          <td class="mono">${escapeHtml(row.studentId)}</td>
          <td><button class="undo-btn" type="button" data-undo="${escapeHtml(row.studentId)}">Undo</button></td>
        </tr>`
      )
      .join("");
  }

  function hideOverlay() {
    window.clearTimeout(resetTimer);
    overlay.hidden = true;
    overlay.className = "overlay";
    overlay.innerHTML = "";
    input.value = "";
    lastAutoSearched = "";
    input.focus();
  }

  function showOverlay({ tone, kicker, title, name, detail, meta }) {
    window.clearTimeout(resetTimer);
    overlay.hidden = false;
    overlay.className = `overlay is-${tone}`;
    overlay.innerHTML = `
      <div class="overlay-card" role="alertdialog" aria-live="assertive" aria-modal="true">
        <p class="overlay-kicker">${escapeHtml(kicker)}</p>
        <h2>${escapeHtml(title)}</h2>
        ${name ? `<p class="overlay-name">${escapeHtml(name)}</p>` : ""}
        ${detail ? `<p class="overlay-detail">${escapeHtml(detail)}</p>` : ""}
        ${meta ? `<p class="overlay-meta">${escapeHtml(meta)}</p>` : ""}
        <p class="overlay-hint">Tap anywhere to continue</p>
      </div>
    `;
    playTone(tone === "ok" ? "ok" : tone === "already" ? "already" : "deny");
    resetTimer = window.setTimeout(hideOverlay, RESET_MS[tone] || RESET_MS.missing);
  }

  function isDuplicateError(error) {
    if (!error) return false;
    return error.code === "23505" || /duplicate|unique/i.test(error.message || "");
  }

  async function recordCheckin(record) {
    const existing = checkins.get(record.studentId) || null;
    if (existing) {
      const nextCount = (existing.scans || 1) + 1;
      const now = new Date().toISOString();
      const { error } = await db
        .from(TABLE)
        .update({ scan_count: nextCount, last_scan_at: now })
        .eq("student_id", record.studentId);
      if (error) console.error(error);
      existing.scans = nextCount;
      existing.lastAt = now;
      checkins.set(record.studentId, existing);
      return { already: true, row: existing };
    }

    const insert = {
      student_id: record.studentId,
      name: record.name,
      grade: record.grade,
    };
    const { data, error } = await db.from(TABLE).insert(insert).select().single();
    if (error) {
      if (isDuplicateError(error)) {
        const { data: again } = await db
          .from(TABLE)
          .select("student_id,name,grade,checked_in_at,last_scan_at,scan_count")
          .eq("student_id", record.studentId)
          .maybeSingle();
        if (again) {
          applyRow(again);
          return { already: true, row: checkins.get(record.studentId) };
        }
      }
      throw error;
    }
    applyRow(data);
    return { already: false, row: checkins.get(record.studentId) };
  }

  async function runLookup() {
    const queryDigits = digitsOnly(input.value);
    if (!queryDigits) {
      input.focus();
      return;
    }

    if (searchInFlight) return;
    searchInFlight = true;
    searchBtn.disabled = true;

    try {
      await loadLists();
      if (!db) throw new Error("Database is not connected");
      const studentId = normalizeStudentId(queryDigits);
      const eligible = eligibleById.get(studentId) || null;
      const roster = rosterById.get(studentId) || null;
      const name = titleCaseName(eligible?.name || roster?.name || "");
      const grade = gradeLabel(eligible?.grade || roster?.grade || "");
      const room = homeroomLine(roster);

      if (eligible) {
        const result = await recordCheckin({
          studentId,
          name: eligible.name,
          grade: eligible.grade,
        });
        updateStats();
        if (result.already) {
          showOverlay({
            tone: "already",
            kicker: "Already on the list",
            title: "Already checked in",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: `First scan ${formatWhen(result.row.at)}`,
          });
        } else {
          showOverlay({
            tone: "ok",
            kicker: "Opt-In form on file",
            title: "Checked in",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: "Hand them a laptop",
          });
        }
      } else {
        showOverlay({
          tone: "deny",
          kicker: "Stop",
          title: "FORM NOT COMPLETED PLEASE GO BACK TO CLASS",
          name: name || undefined,
          detail: [grade, room].filter(Boolean).join(" · "),
          meta: roster
            ? "No Opt-In form on the checkout list"
            : "No Opt-In form · ID not on the homeroom roster either",
        });
      }
    } catch (err) {
      console.error(err);
      showOverlay({
        tone: "missing",
        kicker: "Kiosk error",
        title: "Could not save this scan",
        detail: "Check the internet connection and try again",
      });
    } finally {
      searchInFlight = false;
      searchBtn.disabled = false;
    }
  }

  function exportLog() {
    const rows = [...checkins.values()].sort((a, b) => (a.at > b.at ? 1 : -1));
    const lines = [
      ["student_id", "name", "grade", "checked_in_at", "scan_count"].join(","),
      ...rows.map((row) =>
        [
          row.studentId,
          `"${String(row.name || "").replace(/"/g, '""')}"`,
          row.grade,
          row.at,
          row.scans || 1,
        ].join(",")
      ),
    ];
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laptop-checkout.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function undoCheckin(studentId) {
    const row = checkins.get(studentId);
    const label = row ? titleCaseName(row.name) : studentId;
    if (!window.confirm(`Remove ${label} from the shared check-in list?`)) return;
    const { error } = await db.from(TABLE).delete().eq("student_id", studentId);
    if (error) {
      window.alert("Could not undo that scan. Try again.");
      return;
    }
    removeRow(studentId);
    updateStats();
  }

  function toggleStaff(open) {
    const shouldOpen = open ?? staffPanel.hidden;
    staffPanel.hidden = !shouldOpen;
    staffPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    if (shouldOpen) {
      updateStats();
    } else {
      input.focus();
    }
  }

  async function keepAwake() {
    try {
      if (!("wakeLock" in navigator)) return;
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      /* battery saver / permission */
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(autoSearchTimer);
    runLookup();
  });

  input.addEventListener("input", () => {
    const digits = digitsOnly(input.value);
    if (input.value !== digits) input.value = digits;
    window.clearTimeout(autoSearchTimer);
    if (digits.length < STUDENT_ID_LEN) {
      lastAutoSearched = "";
      return;
    }
    if (digits.length === STUDENT_ID_LEN && digits !== lastAutoSearched) {
      autoSearchTimer = window.setTimeout(() => {
        lastAutoSearched = digits;
        runLookup();
      }, AUTO_SEARCH_MS);
    }
  });

  overlay.addEventListener("click", hideOverlay);
  document.addEventListener("keydown", (event) => {
    if (overlay.hidden) return;
    if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      hideOverlay();
      return;
    }
    if (/^\d$/.test(event.key)) {
      hideOverlay();
      input.value = event.key;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  document.getElementById("staff-open")?.addEventListener("click", () => toggleStaff(true));
  document.getElementById("staff-close")?.addEventListener("click", () => toggleStaff(false));
  document.getElementById("export-log")?.addEventListener("click", exportLog);
  document.getElementById("staff-backdrop")?.addEventListener("click", () => toggleStaff(false));
  logBody?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-undo]");
    if (!btn) return;
    undoCheckin(btn.getAttribute("data-undo"));
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });

  (async () => {
    try {
      connectDb();
      await Promise.all([loadLists(), loadCheckins()]);
      subscribeCheckins();
      updateStats();
      document.body.classList.add("is-ready");
      setSync("Live · all 5 kiosk laptops share this list");
    } catch (err) {
      console.error(err);
      document.body.classList.add("is-error");
      setSync("Database not connected — scans will not save until this is fixed", false);
    }
    keepAwake();
    input.focus();
  })();
})();
