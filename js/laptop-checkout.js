(() => {
  const STUDENT_ID_LEN = 10;
  const AUTO_SEARCH_MS = 120;
  const RESET_MS = {
    ok: 7000,
    already: 7000,
    deny: 8000,
    missing: 5000,
  };

  const form = document.getElementById("checkout-form");
  const input = document.getElementById("student-number");
  const searchBtn = document.getElementById("search-btn");
  const overlay = document.getElementById("result-overlay");
  const syncNote = document.getElementById("sync-note");

  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  let db = null;
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

  function setSync(message, ok = true) {
    if (!syncNote) return;
    syncNote.textContent = message;
    syncNote.style.color = ok ? "" : "#be123c";
  }

  function connectDb() {
    db = window.flhsCreateDb();
    return db;
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

  async function lookupCheckinStatus(studentId) {
    const { data, error } = await db
      .from("laptop_checkins")
      .select("student_id,laptop_given_at,checked_in_at")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
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
        <p class="overlay-hint">Tap anywhere to check another student</p>
      </div>
    `;
    playTone(tone === "ok" ? "ok" : tone === "already" ? "already" : "deny");
    resetTimer = window.setTimeout(hideOverlay, RESET_MS[tone] || RESET_MS.missing);
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
      const name = titleCaseName(student?.name || "");
      const grade = gradeLabel(student?.grade || "");
      const room = homeroomLine(student);

      if (student?.optIn) {
        let checkin = null;
        try {
          checkin = await lookupCheckinStatus(studentId);
        } catch (err) {
          console.warn(err);
        }

        if (checkin?.laptop_given_at) {
          showOverlay({
            tone: "already",
            kicker: "Already completed",
            title: "Laptop already picked up",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: "If you still need help, see Media Center staff",
          });
        } else {
          showOverlay({
            tone: "ok",
            kicker: "Opt-In form on file",
            title: "You're eligible",
            name,
            detail: [grade, room].filter(Boolean).join(" · "),
            meta: "Pick up in the Media Center during laptop hours",
          });
        }
      } else {
        showOverlay({
          tone: "deny",
          kicker: "Not eligible yet",
          title: "FORM NOT COMPLETED — PLEASE GO BACK TO CLASS",
          name: name || undefined,
          detail: [grade, room].filter(Boolean).join(" · "),
          meta: student
            ? "Parent must complete the Opt-In form in Focus Parent Portal"
            : "ID not found · ask Media Center staff for help",
        });
      }
    } catch (err) {
      console.error(err);
      showOverlay({
        tone: "missing",
        kicker: "Connection issue",
        title: "Could not check eligibility",
        detail: "Check the internet connection and try again",
      });
    } finally {
      searchInFlight = false;
      searchBtn.disabled = false;
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });

  (async () => {
    try {
      connectDb();
      document.body.classList.add("is-ready");
      setSync("Student eligibility check · Media Center kiosk");
    } catch (err) {
      console.error(err);
      document.body.classList.add("is-error");
      setSync("Database not connected — eligibility checks will not work until this is fixed", false);
    }
    keepAwake();
    input.focus();
  })();
})();
