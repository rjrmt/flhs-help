(() => {
  const loadNote = document.getElementById("load-note");
  const search = document.getElementById("staff-search");
  const list = document.getElementById("staff-list");
  const pickPanel = document.getElementById("pick-panel");
  const formPanel = document.getElementById("form-panel");
  const pickedName = document.getElementById("picked-name");
  const pickedMeta = document.getElementById("picked-meta");
  const roomCodeEl = document.getElementById("room-code");
  const roomHint = document.getElementById("room-hint");
  const roomYesLabel = document.getElementById("room-yes-label");
  const roomNoLabel = document.getElementById("room-no-label");
  const roomMismatch = document.getElementById("room-mismatch");
  const roomCorrection = document.getElementById("room-correction");
  const phoneCodeEl = document.getElementById("phone-code");
  const phoneHint = document.getElementById("phone-hint");
  const phoneYesLabel = document.getElementById("phone-yes-label");
  const phoneNoLabel = document.getElementById("phone-no-label");
  const phoneMismatch = document.getElementById("phone-mismatch");
  const phoneCorrection = document.getElementById("phone-correction");
  const notes = document.getElementById("notes");
  const form = document.getElementById("need-form");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");
  const doneScreen = document.getElementById("done-screen");
  const doneName = document.getElementById("done-name");
  const doneDetail = document.getElementById("done-detail");

  /** @type {Array<Record<string, unknown>>} */
  let staff = [];
  /** @type {Record<string, unknown> | null} */
  let selected = null;
  let pickToken = 0;

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

  function setStatus(message, tone = "") {
    statusEl.textContent = message || "";
    statusEl.className = `status${tone ? ` ${tone}` : ""}`;
  }

  let homeTimer = 0;

  function showDone(name, changed) {
    if (doneName) doneName.textContent = displayName(name);
    if (doneDetail) {
      doneDetail.textContent = changed
        ? "IT will update the directory."
        : "It matches what we already have.";
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (doneScreen) doneScreen.hidden = false;
    setStatus("");
    window.clearTimeout(homeTimer);
    homeTimer = window.setTimeout(() => {
      window.location.href = "../index.html";
    }, 1500);
  }

  function displayPhone(phone) {
    const raw = String(phone || "").trim();
    if (!raw) return "";
    if (/^radio$/i.test(raw)) return "Radio";
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length === 10 && digits.startsWith("754")) {
      return `754-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 7) return `754-${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return raw;
  }

  function setBlockVisible(el, input, show) {
    if (!el) return;
    el.hidden = !show;
    if (!show && input) input.value = "";
  }

  function filteredStaff() {
    const q = String(search?.value || "").trim().toLowerCase();
    const rows = staff.slice().sort((a, b) => {
      const ta = isTeacher(a) ? 0 : 1;
      const tb = isTeacher(b) ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
    if (!q) return rows.slice(0, 40);
    return rows
      .filter((row) => {
        const hay = `${row.name || ""} ${displayName(row.name)} ${row.room || ""} ${row.role || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }

  function renderList() {
    const rows = filteredStaff();
    if (!rows.length) {
      list.innerHTML = `<p class="staff-row">No matching staff</p>`;
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const room = row.room ? `Room ${escapeHtml(row.room)}` : "No room on file";
        return `<button type="button" class="staff-row" data-id="${escapeHtml(row.id)}">
          <span>${escapeHtml(displayName(row.name))}</span>
          <span class="meta">${room}<br />${escapeHtml(row.role || "Staff")}</span>
        </button>`;
      })
      .join("");
  }

  function showRecord(row) {
    selected = row;
    form.reset();
    pickedName.textContent = displayName(row.name);
    pickedMeta.textContent = [row.role || "Staff", row.room ? `Room ${row.room}` : "No room on file"]
      .filter(Boolean)
      .join(" · ");

    const room = String(row.room || "").trim();
    const phone = displayPhone(row.main_phone);
    if (roomCodeEl) roomCodeEl.textContent = room || "None on file";
    if (phoneCodeEl) phoneCodeEl.textContent = phone || "None on file";

    if (room) {
      if (roomYesLabel) roomYesLabel.textContent = "Yes, this is my room";
      if (roomNoLabel) roomNoLabel.textContent = "No, different room";
      if (roomHint) roomHint.textContent = "Look at the number on your door.";
      if (roomCorrection) roomCorrection.placeholder = "Room number on your door";
    } else {
      if (roomYesLabel) roomYesLabel.textContent = "I don't have a room";
      if (roomNoLabel) roomNoLabel.textContent = "I do — I'll enter it";
      if (roomHint) roomHint.textContent = "No classroom is on file for you.";
      if (roomCorrection) roomCorrection.placeholder = "Room number on your door";
    }

    if (phone) {
      if (phoneYesLabel) phoneYesLabel.textContent = "Yes, this is my phone";
      if (phoneNoLabel) phoneNoLabel.textContent = "No, different number";
      if (phoneHint) phoneHint.textContent = "Check the handset in your room.";
    } else {
      if (phoneYesLabel) phoneYesLabel.textContent = "I don't have a room phone";
      if (phoneNoLabel) phoneNoLabel.textContent = "I do — I'll enter it";
      if (phoneHint) phoneHint.textContent = "No room phone is on file for you.";
    }
    if (phoneCorrection) phoneCorrection.placeholder = "754-322-1100, Radio, or None";

    setBlockVisible(roomMismatch, roomCorrection, false);
    setBlockVisible(phoneMismatch, phoneCorrection, false);
    pickPanel.hidden = true;
    formPanel.hidden = false;
    setStatus("");
    document.querySelector('input[name="room"][value="yes"]')?.focus();
  }

  function showPicker() {
    pickToken += 1;
    selected = null;
    form.reset();
    setBlockVisible(roomMismatch, roomCorrection, false);
    setBlockVisible(phoneMismatch, phoneCorrection, false);
    pickPanel.hidden = false;
    formPanel.hidden = true;
    search?.focus();
  }

  async function loadStaff() {
    const db = window.flhsCreateDb();
    const { data, error } = await db.rpc("list_room_phone_staff");
    if (error) throw error;
    staff = Array.isArray(data) ? data : [];
    if (loadNote) {
      loadNote.textContent = "Teachers are listed first. Type to find anyone on the staff roster.";
    }
    renderList();
  }

  search?.addEventListener("input", renderList);

  list?.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-id]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const row = staff.find((item) => Number(item.id) === id);
    if (!row) return;
    const token = ++pickToken;
    setStatus("Loading your record…");
    try {
      const db = window.flhsCreateDb();
      const { data, error } = await db.rpc("preview_room_phone", { p_staff_id: id });
      if (error) throw error;
      if (token !== pickToken) return;
      const record = data && typeof data === "object" ? data : null;
      if (!record?.id) throw new Error("That name is not in the directory");
      showRecord(record);
    } catch (err) {
      if (token !== pickToken) return;
      setStatus(err.message || "Could not open that record.", "err");
    }
  });

  document.getElementById("change-staff")?.addEventListener("click", showPicker);
  document.getElementById("done-another")?.addEventListener("click", () => {
    window.clearTimeout(homeTimer);
    if (doneScreen) doneScreen.hidden = true;
    showPicker();
  });

  form?.addEventListener("change", (event) => {
    const name = event.target?.name;
    if (name === "room") {
      const show = event.target.value === "no";
      setBlockVisible(roomMismatch, roomCorrection, show);
      if (show) roomCorrection?.focus();
    }
    if (name === "phone") {
      const show = event.target.value === "no";
      setBlockVisible(phoneMismatch, phoneCorrection, show);
      if (show) phoneCorrection?.focus();
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selected) {
      setStatus("Pick your name first", "err");
      return;
    }
    const roomChoice = document.querySelector('input[name="room"]:checked')?.value;
    const phoneChoice = document.querySelector('input[name="phone"]:checked')?.value;
    if (roomChoice !== "yes" && roomChoice !== "no") {
      setStatus("Confirm your room number", "err");
      return;
    }
    if (phoneChoice !== "yes" && phoneChoice !== "no") {
      setStatus("Confirm your room phone", "err");
      return;
    }
    const reportedRoom = String(roomCorrection?.value || "").trim();
    const reportedPhone = String(phoneCorrection?.value || "").trim();
    if (roomChoice === "no" && !reportedRoom) {
      setStatus("Enter the room number on your door, or None", "err");
      roomCorrection?.focus();
      return;
    }
    if (phoneChoice === "no" && !reportedPhone) {
      setStatus("Enter your room phone, Radio, or None", "err");
      phoneCorrection?.focus();
      return;
    }
    submitBtn.disabled = true;
    setStatus("Saving…");
    try {
      const db = window.flhsCreateDb();
      const { data, error } = await db.rpc("submit_room_phone", {
        p_staff_id: Number(selected.id),
        p_room_confirmed: roomChoice === "yes",
        p_phone_confirmed: phoneChoice === "yes",
        p_reported_room: roomChoice === "no" ? reportedRoom : "",
        p_reported_phone: phoneChoice === "no" ? reportedPhone : "",
        p_notes: String(notes?.value || "").trim(),
      });
      if (error) throw error;
      const saved = data && typeof data === "object" ? data : {};
      const changed = saved.room_confirmed === false || saved.phone_confirmed === false;
      showDone(saved.staff_name || selected.name, changed);
    } catch (err) {
      setStatus(err.message || "Could not save. Try again.", "err");
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadStaff().catch(() => {
    if (loadNote) loadNote.textContent = "Could not load the staff directory. Refresh and try again.";
    setStatus("Directory did not load", "err");
  });
})();
