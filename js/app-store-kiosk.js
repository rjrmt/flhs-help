(() => {
  const STUDENT_ID_LEN = 10;
  const AUTO_SEARCH_MS = 120;
  const RESET_MS = 5200;
  const IDLE_MS = 40000;

  const program = document.body.dataset.kioskProgram || "star";
  const form = document.getElementById("kiosk-form");
  const input = document.getElementById("student-number");
  const searchBtn = document.getElementById("search-btn");
  const panel = document.getElementById("flow-panel");
  const toastEl = document.getElementById("toast");

  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */
  let db = null;
  let autoTimer = 0;
  let resetTimer = 0;
  let idleTimer = 0;
  let lastAuto = "";
  let inFlight = false;
  /** @type {Array<{code: string, label: string}>} */
  let subjects = [];

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

  function displayName(raw) {
    const value = String(raw || "").trim();
    if (!value) return "Student";
    return value.replace(/\s+/g, " ");
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

  function bumpIdle() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (document.activeElement === input && digitsOnly(input.value).length) return;
      resetToScan();
    }, IDLE_MS);
  }

  function hideDone() {
    const done = document.getElementById("kiosk-done");
    if (!done) return;
    done.hidden = true;
    done.className = "kiosk-done";
    done.innerHTML = "";
  }

  function resetToScan() {
    window.clearTimeout(resetTimer);
    hideDone();
    panel.hidden = true;
    panel.innerHTML = "";
    input.value = "";
    input.disabled = false;
    searchBtn.disabled = false;
    lastAuto = "";
    input.focus();
  }

  function scheduleHome() {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(resetToScan, RESET_MS);
  }

  function renderResult({ title, detail, kind }) {
    panel.hidden = true;
    panel.innerHTML = "";
    let done = document.getElementById("kiosk-done");
    if (!done) {
      done = document.createElement("div");
      done.id = "kiosk-done";
      done.setAttribute("role", "alertdialog");
      done.setAttribute("aria-live", "assertive");
      done.addEventListener("click", () => {
        if (!done.classList.contains("is-ready")) return;
        resetToScan();
      });
      document.body.appendChild(done);
    }
    const tone = kind === "out" ? "out" : "ok";
    done.className = `kiosk-done is-${tone}`;
    done.hidden = false;
    done.innerHTML = `
      <div class="kiosk-done-card">
        <div class="kiosk-done-mark" aria-hidden="true">✓</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(detail)}</p>
        <p class="kiosk-done-hint">You’re all set — please step aside for the next student.</p>
      </div>
    `;
    window.setTimeout(() => done.classList.add("is-ready"), 500);
    scheduleHome();
  }

  function studentCard(status) {
    const perm = status.permission_status === "received";
    const permHtml =
      program === "star"
        ? `<span class="badge ${perm ? "ok" : "warn"}">${
            perm ? "Bus form on file" : "Bus form missing"
          }</span>`
        : "";
    return `
      <div class="student-card">
        <div>
          <p class="student-name">${escapeHtml(displayName(status.name))}</p>
          <p class="student-meta">Grade ${escapeHtml(status.grade || "—")} · ID ${escapeHtml(
            status.student_id
          )}</p>
        </div>
        ${permHtml}
      </div>
    `;
  }

  function renderCheckout(status) {
    const open = status.open || {};
    panel.hidden = false;
    panel.innerHTML = `
      ${studentCard(status)}
      <p class="lead">Already checked in${open.subject ? ` for ${escapeHtml(open.subject)}` : ""}${
        open.teacher_name ? ` with ${escapeHtml(open.teacher_name)}` : ""
      }. Scan again to check out.</p>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap">
        <button type="button" class="btn btn-primary" id="do-checkout">Check out</button>
        <button type="button" class="btn btn-secondary" id="cancel-flow">Cancel</button>
      </div>
    `;
    document.getElementById("do-checkout")?.addEventListener("click", async () => {
      try {
        const result = await rpc("kiosk_checkout", {
          p_program: program,
          p_student_id: status.student_id,
        });
        renderResult({
          kind: "out",
          title: "You’re signed out",
          detail: "Thank you. You’re free to go — have a nice afternoon.",
        });
      } catch (err) {
        showToast(err.message || "Checkout failed", true);
      }
    });
    document.getElementById("cancel-flow")?.addEventListener("click", resetToScan);
  }

  function renderStarQuestions(status) {
    panel.hidden = false;
    panel.innerHTML = `
      ${studentCard(status)}
      <p class="section-label">What subject are you here for?</p>
      <div class="choice-grid" id="subject-grid"></div>
      <p class="section-label" style="margin-top:1rem">Need the activity bus?</p>
      <div class="choice-grid" id="bus-grid">
        <button type="button" class="choice" data-bus="yes">Yes</button>
        <button type="button" class="choice" data-bus="no">No</button>
      </div>
      <div id="pass-wrap" hidden>
        <p class="section-label" style="margin-top:1rem">Need a bus pass printed?</p>
        <div class="choice-grid" id="pass-grid">
          <button type="button" class="choice" data-pass="yes">Yes</button>
          <button type="button" class="choice" data-pass="no">No</button>
        </div>
      </div>
      <p class="status" id="flow-status"></p>
      <button type="button" class="btn btn-primary" id="do-checkin" disabled>Check in</button>
    `;

    const subjectGrid = document.getElementById("subject-grid");
    const busGrid = document.getElementById("bus-grid");
    const passWrap = document.getElementById("pass-wrap");
    const passGrid = document.getElementById("pass-grid");
    const submit = document.getElementById("do-checkin");
    const flowStatus = document.getElementById("flow-status");
    let subject = "";
    let bus = null;
    let pass = null;

    subjectGrid.innerHTML = subjects
      .map(
        (s) =>
          `<button type="button" class="choice" data-subject="${escapeHtml(s.label)}">${escapeHtml(
            s.label
          )}</button>`
      )
      .join("");

    const sync = () => {
      const busDone = bus === false || (bus === true && pass !== null);
      submit.disabled = !subject || !busDone;
    };

    subjectGrid.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        subject = btn.dataset.subject || "";
        subjectGrid.querySelectorAll(".choice").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        sync();
        bumpIdle();
      });
    });

    busGrid.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        bus = btn.dataset.bus === "yes";
        busGrid.querySelectorAll(".choice").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        pass = bus ? null : false;
        passWrap.hidden = !bus;
        passGrid.querySelectorAll(".choice").forEach((b) => b.classList.remove("selected"));
        if (bus && status.permission_status !== "received") {
          flowStatus.dataset.tone = "error";
          flowStatus.textContent = "Bus form is missing — check in, then see the coordinator.";
        } else {
          flowStatus.textContent = "";
        }
        sync();
        bumpIdle();
      });
    });

    passGrid.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        pass = btn.dataset.pass === "yes";
        passGrid.querySelectorAll(".choice").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        sync();
        bumpIdle();
      });
    });

    submit.addEventListener("click", async () => {
      submit.disabled = true;
      try {
        const result = await rpc("kiosk_checkin", {
          p_program: "star",
          p_student_id: status.student_id,
          p_subject: subject,
          p_teacher_id: null,
          p_needs_bus: Boolean(bus),
          p_needs_bus_pass: Boolean(bus && pass),
        });
        const extra =
          bus && status.permission_status !== "received"
            ? " If you need the activity bus, please see the coordinator about your form."
            : " A tutor will come by if you need help.";
        renderResult({
          kind: "ok",
          title: "You’re checked in",
          detail: `Please have a seat nearby.${extra}`,
        });
      } catch (err) {
        showToast(friendlyError(err), true);
        submit.disabled = false;
      }
    });
  }

  function friendlyError(err) {
    const msg = String(err?.message || err || "Something went wrong");
    if (msg.includes("STUDENT_NOT_FOUND")) return "ID not in the student roster.";
    if (msg.includes("ALREADY_CHECKED_IN")) return "Already checked in. Scan again to check out.";
    if (msg.includes("TEACHER_NOT_FOUND")) return "That teacher is not on the roster.";
    if (msg.includes("NO_OPEN_SESSION")) return "No open check-in for this ID.";
    return msg.length > 90 ? "Check-in failed. Try again." : msg;
  }

  async function lookup(raw) {
    const studentId = normalizeStudentId(raw);
    if (digitsOnly(raw).length < STUDENT_ID_LEN) {
      showToast("Enter the 10-digit student number.", true);
      return;
    }
    if (inFlight) return;
    inFlight = true;
    searchBtn.disabled = true;
    try {
      const status = await rpc("kiosk_student_status", {
        p_program: program,
        p_student_id: studentId,
      });
      const row = status && typeof status === "object" ? status : {};
      if (!row.found) {
        panel.hidden = false;
        panel.innerHTML = `
          <div class="result-screen">
            <h2>ID not found</h2>
            <p class="lead">See the coordinator. This kiosk uses the current FLHS Help student roster.</p>
            <button type="button" class="btn btn-secondary" id="cancel-flow">Try again</button>
          </div>
        `;
        document.getElementById("cancel-flow")?.addEventListener("click", resetToScan);
        scheduleHome();
        return;
      }
      if (row.open) {
        renderCheckout(row);
        return;
      }
      renderStarQuestions(row);
    } catch (err) {
      console.error(err);
      showToast("Could not look up that ID. Try again.", true);
    } finally {
      inFlight = false;
      searchBtn.disabled = false;
      bumpIdle();
    }
  }

  async function boot() {
    try {
      const subjectRows = await rpc("kiosk_list_subjects", { p_program: "star" });
      subjects = Array.isArray(subjectRows) ? subjectRows : [];
    } catch (err) {
      console.error(err);
      showToast("Could not load kiosk lists.", true);
    }
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    window.clearTimeout(autoTimer);
    lookup(input.value);
  });

  input?.addEventListener("input", () => {
    bumpIdle();
    const digits = digitsOnly(input.value);
    input.value = digits.slice(0, STUDENT_ID_LEN);
    window.clearTimeout(autoTimer);
    if (digits.length === STUDENT_ID_LEN && digits !== lastAuto) {
      autoTimer = window.setTimeout(() => {
        lastAuto = digits;
        lookup(digits);
      }, AUTO_SEARCH_MS);
    }
  });

  document.addEventListener("click", bumpIdle);
  document.addEventListener("keydown", bumpIdle);
  boot();
  bumpIdle();
  input?.focus();
})();
