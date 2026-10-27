(() => {
  const STORAGE_KEY = "flhs-star-tutor";
  const POLL_MS = 4000;

  const loginBoard = document.getElementById("login-board");
  const stationBoard = document.getElementById("station-board");
  const searchInput = document.getElementById("tutor-search");
  const tutorList = document.getElementById("tutor-list");
  const loginStatus = document.getElementById("login-status");
  const stationStatus = document.getElementById("station-status");
  const stationKicker = document.getElementById("station-kicker");
  const waitingList = document.getElementById("waiting-list");
  const mineList = document.getElementById("mine-list");
  const switchBtn = document.getElementById("switch-tutor");
  const punchBtn = document.getElementById("punch-btn");
  const punchPill = document.getElementById("punch-pill");
  const statsEl = document.getElementById("tutor-stats");
  const shiftBody = document.getElementById("shift-body");
  const toastEl = document.getElementById("toast");

  let db = null;
  /** @type {Array<{id: number, name: string, role: string, room: string}>} */
  let teachers = [];
  /** @type {{id: number, name: string, role?: string, room?: string} | null} */
  let tutor = null;
  let pollTimer = 0;
  let inFlight = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message, err = false) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = `toast${err ? " err" : ""}`;
    toastEl.hidden = false;
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  function connect() {
    if (!db) db = window.flhsCreateDb();
    return db;
  }

  async function rpc(name, args = {}) {
    const { data, error } = await connect().rpc(name, args);
    if (error) throw error;
    return data;
  }

  function loadTutor() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.id && parsed.name) return parsed;
    } catch {
      /* ignore */
    }
    return null;
  }

  function saveTutor(row) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(row));
    } catch {
      /* ignore */
    }
  }

  function clearTutor() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function friendlyError(err) {
    const msg = String(err?.message || err || "Something went wrong");
    if (msg.includes("TEACHER_NOT_FOUND")) return "That name is not on the staff roster.";
    if (msg.includes("ALREADY_ASSIGNED")) return "Another tutor already claimed that student.";
    if (msg.includes("SESSION_NOT_OPEN")) return "That student is no longer waiting.";
    if (msg.includes("NOT_YOUR_STUDENT")) return "That student is not assigned to you.";
    if (msg.includes("NOT_CLOCKED_IN")) return "Clock in first.";
    return msg.length > 90 ? "Could not update. Try again." : msg;
  }

  function formatHours(seconds) {
    const n = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  function formatDay(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  }

  function formatWhen(iso) {
    if (!iso) return "";
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

  function paintLogin(q) {
    const needle = String(q || "").trim().toLowerCase();
    const rows = teachers
      .filter((t) => `${t.name} ${t.role} ${t.room}`.toLowerCase().includes(needle))
      .slice(0, needle ? 10 : 8);
    if (!needle) {
      tutorList.innerHTML = "";
      loginStatus.textContent = teachers.length
        ? "Type at least a few letters of your name."
        : "Could not load the staff roster.";
      return;
    }
    if (!rows.length) {
      tutorList.innerHTML = "";
      loginStatus.textContent = "No matching staff.";
      return;
    }
    loginStatus.textContent = `${rows.length} match${rows.length === 1 ? "" : "es"}`;
    tutorList.innerHTML = rows
      .map(
        (t) => `
        <button type="button" class="teacher-row" data-id="${t.id}">
          <span><b>${escapeHtml(t.name)}</b><br /><span>${escapeHtml(t.role || "Staff")}</span></span>
          <span>${escapeHtml(t.room || "")}</span>
        </button>`
      )
      .join("");
    tutorList.querySelectorAll(".teacher-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const row = teachers.find((t) => Number(t.id) === id);
        if (!row) return;
        enterStation(row);
      });
    });
  }

  function studentRowHtml(row, mode) {
    const action =
      mode === "waiting"
        ? `<button type="button" class="btn btn-primary" data-act="claim" data-id="${escapeHtml(
            row.id
          )}">Take student</button>`
        : `<button type="button" class="btn btn-secondary" data-act="release" data-id="${escapeHtml(
            row.id
          )}">Release</button>`;
    return `
      <div class="teacher-row" style="grid-template-columns:1fr auto;cursor:default">
        <span>
          <b>${escapeHtml(row.student_name || "Student")}</b><br />
          <span>Grade ${escapeHtml(row.grade || "—")} · ${escapeHtml(row.subject || "STAR")} · ${escapeHtml(
            formatWhen(row.checked_in_at)
          )}</span>
        </span>
        ${action}
      </div>`;
  }

  function paintFloor(data) {
    const waiting = Array.isArray(data.waiting) ? data.waiting : [];
    const mine = Array.isArray(data.mine) ? data.mine : [];
    waitingList.innerHTML = waiting.length
      ? waiting.map((row) => studentRowHtml(row, "waiting")).join("")
      : `<p class="note">No students waiting yet.</p>`;
    mineList.innerHTML = mine.length
      ? mine.map((row) => studentRowHtml(row, "mine")).join("")
      : `<p class="note">Take a student from Waiting to start helping.</p>`;
    stationStatus.textContent = `${waiting.length} waiting · ${mine.length} with you`;
    stationStatus.dataset.tone = "ok";
    paintPunch(data.punch && typeof data.punch === "object" ? data.punch : {});
  }

  function paintPunch(punch) {
    const open = Boolean(punch.open);
    if (punchPill) {
      punchPill.hidden = false;
      punchPill.classList.toggle("is-on", open);
      punchPill.textContent = open
        ? `On the clock · ${formatWhen(punch.clocked_in_at)}`
        : "Off the clock";
    }
    if (punchBtn) {
      punchBtn.textContent = open ? "Clock out" : "Clock in";
      punchBtn.classList.toggle("is-out", open);
      punchBtn.classList.toggle("btn-primary", !open);
      punchBtn.classList.toggle("btn-secondary", open);
    }
    if (statsEl) {
      const cards = [
        ["Hours today", formatHours(punch.hours_today)],
        ["Hours this week", formatHours(punch.hours_week)],
        ["Helped today", punch.students_today ?? 0],
        ["Helped all-time", punch.students_all ?? 0],
      ];
      statsEl.innerHTML = cards
        .map(
          ([label, value]) =>
            `<div class="stat"><b>${escapeHtml(String(value))}</b><span>${escapeHtml(label)}</span></div>`
        )
        .join("");
    }
    const shifts = Array.isArray(punch.shifts) ? punch.shifts : [];
    if (shiftBody) {
      if (!shifts.length) {
        shiftBody.innerHTML = `<tr><td colspan="4">Clock in to start today’s shift. Your days and hours will show here.</td></tr>`;
      } else {
        shiftBody.innerHTML = shifts
          .map((row) => {
            const seconds = row.clocked_out_at
              ? (new Date(row.clocked_out_at) - new Date(row.clocked_in_at)) / 1000
              : (Date.now() - new Date(row.clocked_in_at)) / 1000;
            return `<tr>
              <td>${escapeHtml(formatDay(row.clocked_in_at))}</td>
              <td>${escapeHtml(formatWhen(row.clocked_in_at))}</td>
              <td>${row.clocked_out_at ? escapeHtml(formatWhen(row.clocked_out_at)) : "Still on"}</td>
              <td>${escapeHtml(formatHours(seconds))}</td>
            </tr>`;
          })
          .join("");
      }
    }
  }

  async function refreshFloor() {
    if (!tutor) return;
    try {
      const data = await rpc("kiosk_tutor_floor", { p_teacher_id: tutor.id });
      paintFloor(data && typeof data === "object" ? data : {});
    } catch (err) {
      stationStatus.textContent = friendlyError(err);
      stationStatus.dataset.tone = "error";
    }
  }

  function startPoll() {
    window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refreshFloor, POLL_MS);
  }

  function showLogin() {
    window.clearInterval(pollTimer);
    tutor = null;
    clearTutor();
    loginBoard.hidden = false;
    stationBoard.hidden = true;
    searchInput.value = "";
    paintLogin("");
    searchInput.focus();
  }

  function enterStation(row) {
    tutor = { id: Number(row.id), name: row.name, role: row.role || "", room: row.room || "" };
    saveTutor(tutor);
    loginBoard.hidden = true;
    stationBoard.hidden = false;
    if (stationKicker) stationKicker.textContent = tutor.name;
    refreshFloor();
    startPoll();
  }

  async function act(action, sessionId) {
    if (!tutor || inFlight) return;
    inFlight = true;
    try {
      const rpcName = action === "release" ? "kiosk_tutor_release" : "kiosk_tutor_claim";
      const result = await rpc(rpcName, {
        p_session_id: sessionId,
        p_teacher_id: tutor.id,
      });
      const name = result?.student_name || "Student";
      showToast(action === "release" ? `${name} is waiting again.` : `${name} is with you.`);
      await refreshFloor();
    } catch (err) {
      showToast(friendlyError(err), true);
      await refreshFloor();
    } finally {
      inFlight = false;
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    act(btn.dataset.act, btn.dataset.id);
  });

  searchInput?.addEventListener("input", () => paintLogin(searchInput.value));
  switchBtn?.addEventListener("click", showLogin);
  punchBtn?.addEventListener("click", async () => {
    if (!tutor || inFlight) return;
    const clockingIn = punchBtn.textContent !== "Clock out";
    inFlight = true;
    punchBtn.disabled = true;
    try {
      const result = await rpc("kiosk_tutor_clock", {
        p_teacher_id: tutor.id,
        p_action: clockingIn ? "in" : "out",
      });
      paintPunch(result && typeof result === "object" ? result : {});
      showToast(clockingIn ? "You’re on the clock." : "You’re clocked out.");
    } catch (err) {
      showToast(friendlyError(err), true);
    } finally {
      inFlight = false;
      punchBtn.disabled = false;
    }
  });

  async function boot() {
    try {
      const rows = await rpc("kiosk_list_teachers");
      teachers = Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.error(err);
      loginStatus.textContent = "Could not load the staff roster.";
      loginStatus.dataset.tone = "error";
    }
    const saved = loadTutor();
    if (saved && teachers.some((t) => Number(t.id) === Number(saved.id))) {
      enterStation(saved);
      return;
    }
    paintLogin("");
  }

  boot();
})();
