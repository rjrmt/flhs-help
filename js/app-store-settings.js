/* STAR kiosk settings. Saves subjects and the bathroom limit through manage-kiosks. */
(() => {
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-kiosks";

  const list = document.getElementById("subject-list");
  const form = document.getElementById("settings-form");
  const maxInput = document.getElementById("bathroom-max");
  const statusEl = document.getElementById("settings-status");
  const addBtn = document.getElementById("add-subject");
  const nav = document.querySelector(".settings-nav");
  const subjectsSummary = document.getElementById("subjects-summary");
  const bathroomSummary = document.getElementById("bathroom-summary");

  /** @type {Array<{id: string, label: string, active: boolean}>} */
  let subjects = [];
  let loaded = false;

  function setStatus(message, tone = "") {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    if (tone) statusEl.dataset.tone = tone;
    else delete statusEl.dataset.tone;
  }

  async function request(action, body = {}) {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: await window.flhsStaff.headers(),
      body: JSON.stringify({ action, ...body }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save settings.");
    return data;
  }

  function readRows() {
    if (!list) return;
    subjects = [...list.querySelectorAll(".subject-row")].map((row) => ({
      id: row.dataset.id || "",
      label: row.querySelector("input[type='text']")?.value.trim() || "",
      active: Boolean(row.querySelector("input[type='checkbox']")?.checked),
    }));
  }

  function paintSummaries() {
    const on = subjects.filter((subject) => subject.active && subject.label).length;
    if (subjectsSummary) {
      subjectsSummary.textContent = subjects.length ? `${on} on the kiosk` : "Kiosk choices";
    }
    if (bathroomSummary && maxInput) {
      const max = Number(maxInput.value);
      bathroomSummary.textContent = max ? `${max} out at once` : "Pass limit";
    }
  }

  function showSection(name) {
    if (!nav) return;
    nav.querySelectorAll("[data-section]").forEach((button) => {
      const on = button.dataset.section === name;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== name;
    });
  }

  function render() {
    if (!list) return;
    list.innerHTML = subjects
      .map(
        (subject, index) => `
        <li class="subject-row${subject.active ? "" : " is-off"}" data-id="${subject.id}">
          <span class="subject-move">
            <button type="button" data-move="up" aria-label="Move up" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-move="down" aria-label="Move down" ${
              index === subjects.length - 1 ? "disabled" : ""
            }>↓</button>
          </span>
          <input type="text" maxlength="80" value="${escapeAttr(subject.label)}" aria-label="Subject name" />
          <label class="subject-on"><input type="checkbox" ${subject.active ? "checked" : ""} /> On kiosk</label>
        </li>`
      )
      .join("");
    paintSummaries();
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  async function load() {
    if (loaded || document.getElementById("app")?.hidden) return;
    loaded = true;
    setStatus("Loading…");
    try {
      const data = await request("config");
      const config = data.config || {};
      if (maxInput) maxInput.value = String(config.bathroom_max_active ?? 5);
      paintSummaries();
      subjects = Array.isArray(config.subjects)
        ? config.subjects.map((row) => ({
            id: String(row.id || ""),
            label: String(row.label || ""),
            active: row.active !== false,
          }))
        : [];
      render();
      setStatus("");
    } catch (err) {
      loaded = false;
      setStatus(err.message || "Could not load settings.", "error");
    }
  }

  nav?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    showSection(button.dataset.section);
  });

  nav?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = [...nav.querySelectorAll("[data-section]")];
    const index = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    if (index < 0) return;
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? index + 1 : index - 1;
    const tab = tabs[(next + tabs.length) % tabs.length];
    event.preventDefault();
    showSection(tab.dataset.section);
    tab.focus();
  });

  list?.addEventListener("change", (event) => {
    const box = event.target.closest("input[type='checkbox']");
    if (!box) return;
    box.closest(".subject-row")?.classList.toggle("is-off", !box.checked);
    readRows();
    paintSummaries();
  });

  maxInput?.addEventListener("input", paintSummaries);

  list?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move]");
    if (!button) return;
    readRows();
    const row = button.closest(".subject-row");
    const index = [...list.children].indexOf(row);
    const next = button.dataset.move === "up" ? index - 1 : index + 1;
    if (index < 0 || next < 0 || next >= subjects.length) return;
    const [item] = subjects.splice(index, 1);
    subjects.splice(next, 0, item);
    render();
  });

  addBtn?.addEventListener("click", () => {
    readRows();
    subjects.push({ id: "", label: "", active: true });
    render();
    const inputs = list?.querySelectorAll("input[type='text']");
    inputs?.[inputs.length - 1]?.focus();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    readRows();
    const bathroomMax = Number(maxInput?.value);
    setStatus("Saving…");
    try {
      const data = await request("save_config", {
        bathroom_max_active: bathroomMax,
        subjects: subjects.filter((subject) => subject.label),
      });
      const config = data.config || {};
      if (maxInput) maxInput.value = String(config.bathroom_max_active ?? bathroomMax);
      subjects = Array.isArray(config.subjects)
        ? config.subjects.map((row) => ({
            id: String(row.id || ""),
            label: String(row.label || ""),
            active: row.active !== false,
          }))
        : subjects;
      render();
      setStatus("Saved. The kiosk uses this on the next scan.", "ok");
    } catch (err) {
      setStatus(err.message || "Could not save settings.", "error");
    }
  });

  document.addEventListener("flhs-staff-unlocked", load);
  if (!document.getElementById("app")?.hidden) load();
})();
