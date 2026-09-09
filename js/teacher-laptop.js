(() => {
  const loadNote = document.getElementById("load-note");
  const search = document.getElementById("staff-search");
  const list = document.getElementById("staff-list");
  const pickPanel = document.getElementById("pick-panel");
  const formPanel = document.getElementById("form-panel");
  const pickedName = document.getElementById("picked-name");
  const pickedMeta = document.getElementById("picked-meta");
  const cartRecord = document.getElementById("cart-record");
  const actualCount = document.getElementById("actual-count");
  const maxStudents = document.getElementById("max-students");
  const extrasNeeded = document.getElementById("extras-needed");
  const extrasHint = document.getElementById("extras-hint");
  const notes = document.getElementById("notes");
  const form = document.getElementById("need-form");
  const submitBtn = document.getElementById("submit-btn");
  const statusEl = document.getElementById("status");

  /** @type {Array<Record<string, unknown>>} */
  let staff = [];
  /** @type {Record<string, unknown> | null} */
  let selected = null;
  let extrasTouched = false;

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

  function expectedCount(row) {
    return Number(row?.expected_count) || 0;
  }

  function suggestedExtras() {
    const actual = Number(actualCount.value);
    const max = Number(maxStudents.value);
    if (!Number.isFinite(actual) || !Number.isFinite(max) || max < 1) return null;
    return Math.max(0, max - actual);
  }

  function refreshExtrasHint() {
    const expected = selected ? expectedCount(selected) : 0;
    const suggest = suggestedExtras();
    if (suggest == null) {
      extrasHint.textContent = expected
        ? `Our records show ${expected} student laptop${expected === 1 ? "" : "s"} on your cart. Count what is actually there, then enter extras — not a full class set.`
        : "Extras means how many more you need beyond what you already have. Enter 0 if you have enough.";
      return;
    }
    extrasHint.textContent =
      suggest === 0
        ? "On these numbers you have enough for your largest class. Leave extras at 0 unless machines are broken."
        : `On these numbers extras = ${suggest}. Change it if some counted laptops cannot be used.`;
    if (!extrasTouched) extrasNeeded.value = String(suggest);
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
    return rows.filter((row) => {
      const hay = `${row.name || ""} ${displayName(row.name)} ${row.room || ""} ${row.role || ""} ${row.cart_code || ""}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 40);
  }

  function renderList() {
    const rows = filteredStaff();
    if (!rows.length) {
      list.innerHTML = `<p class="staff-row">No matching staff</p>`;
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const room = row.room ? `Room ${escapeHtml(row.room)}` : "No room";
        const cart = expectedCount(row)
          ? `${escapeHtml(row.cart_code)} · ${expectedCount(row)}`
          : escapeHtml(row.role || "Staff");
        return `<button type="button" class="staff-row" data-id="${escapeHtml(row.id)}">
          <span>${escapeHtml(displayName(row.name))}</span>
          <span class="meta">${room}<br />${cart}</span>
        </button>`;
      })
      .join("");
  }

  function showForm(row) {
    selected = row;
    extrasTouched = false;
    pickedName.textContent = displayName(row.name);
    pickedMeta.textContent = [row.role || "Staff", row.room ? `Room ${row.room}` : "No room"]
      .filter(Boolean)
      .join(" · ");
    const expected = expectedCount(row);
    if (cartRecord) {
      if (expected > 0) {
        cartRecord.hidden = false;
        cartRecord.textContent = `Our records: cart ${row.cart_code} · ${expected} student laptop${expected === 1 ? "" : "s"} assigned. Count what is in the cart today.`;
      } else {
        cartRecord.hidden = false;
        cartRecord.textContent =
          "No classroom cart is assigned to you in the inventory. Enter 0 if you do not have a class set, then extras = how many additional laptops you need.";
      }
    }
    pickPanel.hidden = true;
    formPanel.hidden = false;
    actualCount.focus();
    refreshExtrasHint();
  }

  function showPicker() {
    selected = null;
    extrasTouched = false;
    form.reset();
    if (cartRecord) cartRecord.hidden = true;
    pickPanel.hidden = false;
    formPanel.hidden = true;
    search?.focus();
  }

  async function loadStaff() {
    const db = window.flhsCreateDb();
    const { data, error } = await db.rpc("list_laptop_form_staff");
    if (error) throw error;
    staff = Array.isArray(data) ? data : [];
    if (loadNote) {
      loadNote.textContent = "Teachers are listed first. Type to find anyone on the staff roster.";
    }
    renderList();
  }

  search?.addEventListener("input", renderList);

  list?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-id]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const row = staff.find((item) => Number(item.id) === id);
    if (row) showForm(row);
  });

  document.getElementById("change-staff")?.addEventListener("click", showPicker);

  extrasNeeded?.addEventListener("input", () => {
    extrasTouched = true;
  });
  actualCount?.addEventListener("input", refreshExtrasHint);
  maxStudents?.addEventListener("input", refreshExtrasHint);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selected) {
      setStatus("Pick your name first", "err");
      return;
    }
    const cart = document.querySelector('input[name="cart"]:checked')?.value;
    const actual = Number(actualCount.value);
    const max = Number(maxStudents.value);
    const extras = Number(extrasNeeded.value);
    if (cart !== "yes" && cart !== "no") {
      setStatus("Say whether you checked your cart", "err");
      return;
    }
    submitBtn.disabled = true;
    setStatus("Saving…");
    try {
      const db = window.flhsCreateDb();
      const { data, error } = await db.rpc("submit_laptop_need", {
        p_staff_id: Number(selected.id),
        p_cart_checked: cart === "yes",
        p_max_students: max,
        p_actual_count: actual,
        p_extras_needed: extras,
        p_notes: String(notes.value || "").trim(),
      });
      if (error) throw error;
      const saved = data && typeof data === "object" ? data : {};
      const extraN = Number(saved.extras_needed);
      setStatus(
        extraN === 0
          ? `Saved for ${displayName(saved.staff_name || selected.name)} — no extra laptops requested.`
          : `Saved for ${displayName(saved.staff_name || selected.name)} — ${extraN} extra laptop${extraN === 1 ? "" : "s"} requested.`,
        "ok"
      );
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
