(() => {
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
    const logBody = document.getElementById("log-body");
  const emptyLog = document.getElementById("empty-log");
  const statWaiting = document.getElementById("stat-waiting");
  const statDone = document.getElementById("stat-done");
  const statLeft = document.getElementById("stat-left");
  const liveIn = document.getElementById("live-in");
  const liveEligible = document.getElementById("live-eligible");
  const syncNote = document.getElementById("sync-note");

  /** @type {Map<string, {studentId: string, name: string, grade: string, at: string, lastAt: string, scans: number, givenAt: string | null}>} */
  const checkins = new Map();
  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  let db = null;
  let eligibleCount = 0;
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
      givenAt: row.laptop_given_at || null,
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
    db = window.flhsCreateDb();
    return db;
  }

  async function loadEligibleCount() {
    const { data, error } = await db.rpc("laptop_opt_in_count");
    if (error) throw error;
    eligibleCount = Number(data) || 0;
  }

  async function lookupLaptopStudent(studentId) {
    const { data, error } = await db.rpc("lookup_laptop_student", {
      p_student_id: studentId,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.student_id) return null;
    return {
      studentId: normalizeStudentId(row.student_id),
      name: row.name || "",
      grade: row.grade || "",
      whiteTeacher: row.white_teacher || "",
      whiteRoom: row.white_room || "",
      blueTeacher: row.blue_teacher || "",
      blueRoom: row.blue_room || "",
      optIn: Boolean(row.laptop_opt_in),
    };
  }

  async function loadCheckins() {
    const { data, error } = await db
      .from(TABLE)
      .select("student_id,name,grade,checked_in_at,last_scan_at,scan_count,laptop_given_at")
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
          setSync("Live desk · check-ins sync across Media Center stations");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSync("Live sync paused — refresh if another laptop looks ahead", false);
        }
      });
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
    const eligible = eligibleCount;
    const checked = checkins.size;
    const waiting = [...checkins.values()].filter((row) => !row.givenAt).length;
    const done = checked - waiting;
    const left = Math.max(0, eligible - checked);
    if (statWaiting) statWaiting.textContent = String(waiting);
    if (statDone) statDone.textContent = String(done);
    if (statLeft) statLeft.textContent = String(left);
    if (liveIn) liveIn.textContent = String(checked);
    if (liveEligible) liveEligible.textContent = String(eligible);
    renderLog();
  }

  function renderLog() {
    if (!logBody) return;
    const rows = [...checkins.values()].sort((a, b) => {
      const aDone = Boolean(a.givenAt);
      const bDone = Boolean(b.givenAt);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.at < b.at ? 1 : -1;
    });
    if (emptyLog) emptyLog.hidden = rows.length > 0;
    logBody.innerHTML = rows
      .map((row) => {
        const given = Boolean(row.givenAt);
        const laptopCell = given
          ? `<span class="given-label">Laptop given</span>
             <button class="undone-btn" type="button" data-undone="${escapeHtml(row.studentId)}">Undo done</button>`
          : `<button class="done-btn" type="button" data-done="${escapeHtml(row.studentId)}">Done</button>`;
        return `
        <tr class="${given ? "is-given" : "is-waiting"}">
          <td>${escapeHtml(formatWhen(row.at))}</td>
          <td>${escapeHtml(titleCaseName(row.name) || row.studentId)}</td>
          <td>${escapeHtml(String(row.grade || "").replace(/^0/, "") || "—")}</td>
          <td class="mono">${escapeHtml(row.studentId)}</td>
          <td>
            <div class="row-actions">
              ${laptopCell}
              <button class="undo-btn" type="button" data-undo="${escapeHtml(row.studentId)}">Undo</button>
            </div>
          </td>
        </tr>`;
      })
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
          .select("student_id,name,grade,checked_in_at,last_scan_at,scan_count,laptop_given_at")
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
      if (!db) throw new Error("Database is not connected");
      const studentId = normalizeStudentId(queryDigits);
      const student = await lookupLaptopStudent(studentId);
      const eligible = student?.optIn ? student : null;
      const name = titleCaseName(student?.name || "");
      const grade = gradeLabel(student?.grade || "");
      const room = homeroomLine(student);

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
            kicker: result.row.givenAt ? "Laptop already given" : "Already on the list",
            title: result.row.givenAt ? "Already done" : "Already checked in",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: result.row.givenAt
              ? `Laptop given ${formatWhen(result.row.givenAt)}`
              : `Waiting for laptop · first scan ${formatWhen(result.row.at)}`,
          });
        } else {
          showOverlay({
            tone: "ok",
            kicker: "Opt-In form on file",
            title: "Checked in",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: "Added to today's pickup list — press Done when handed over",
          });
        }
      } else {
        showOverlay({
          tone: "deny",
          kicker: "Stop",
          title: "FORM NOT COMPLETED PLEASE GO BACK TO CLASS",
          name: name || undefined,
          detail: [grade, room].filter(Boolean).join(" · "),
          meta: student
            ? "No Opt-In form on the checkout list"
            : "No Opt-In form · ID not on the homeroom roster either",
        });
      }
    } catch (err) {
      console.error(err);
      showOverlay({
        tone: "missing",
        kicker: "Desk error",
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
      ["student_id", "name", "grade", "checked_in_at", "scan_count", "laptop_given_at"].join(","),
      ...rows.map((row) =>
        [
          row.studentId,
          `"${String(row.name || "").replace(/"/g, '""')}"`,
          row.grade,
          row.at,
          row.scans || 1,
          row.givenAt || "",
        ].join(",")
      ),
    ];
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laptop-desk-checkins.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function markLaptopGiven(studentId, given) {
    const givenAt = given ? new Date().toISOString() : null;
    const { error } = await db
      .from(TABLE)
      .update({ laptop_given_at: givenAt })
      .eq("student_id", studentId);
    if (error) {
      window.alert("Could not update that student. Try again.");
      return;
    }
    const row = checkins.get(studentId);
    if (row) {
      row.givenAt = givenAt;
      checkins.set(studentId, row);
    }
    updateStats();
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

  document.getElementById("export-log")?.addEventListener("click", exportLog);
  logBody?.addEventListener("click", (event) => {
    const doneBtn = event.target.closest("[data-done]");
    if (doneBtn) {
      markLaptopGiven(doneBtn.getAttribute("data-done"), true);
      return;
    }
    const undoneBtn = event.target.closest("[data-undone]");
    if (undoneBtn) {
      markLaptopGiven(undoneBtn.getAttribute("data-undone"), false);
      return;
    }
    const undoBtn = event.target.closest("[data-undo]");
    if (undoBtn) undoCheckin(undoBtn.getAttribute("data-undo"));
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });

  (async () => {
    try {
      connectDb();
      await Promise.all([loadEligibleCount(), loadCheckins()]);
      subscribeCheckins();
      updateStats();
      document.body.classList.add("is-ready");
      setSync("Live desk · check-ins sync across Media Center stations");
    } catch (err) {
      console.error(err);
      document.body.classList.add("is-error");
      setSync("Database not connected — scans will not save until this is fixed", false);
    }
    keepAwake();
    input.focus();
  })();
})();
