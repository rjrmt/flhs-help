(() => {
  const TZ = "America/New_York";
  const CALENDAR_CSV_URL = "../data/calendar-2026-2027.csv";
  const TESTING_CSV_URL = "../data/academic-testing-2026-2027.csv";
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MODE_SCHOOL = "school";
  const MODE_ACADEMIC = "academic";

  const monthsEl = document.getElementById("cal-months");
  const todayBtnEl = document.getElementById("cal-today-btn");
  const detailEl = document.getElementById("cal-detail");
  const statusEl = document.getElementById("cal-status");
  const legendEl = document.getElementById("cal-legend");
  const leadEl = document.getElementById("cal-lead");
  const titleEl = document.getElementById("cal-title");
  const boardEl = document.querySelector(".board");
  const modeToggleEl = document.getElementById("cal-mode-toggle");

  const pdfBtnEl = document.getElementById("cal-pdf-btn");

  /** @type {Map<string, { date: string, dayOfWeek: string, dayType: string, notes: string }>} */
  let byDate = new Map();
  /** @type {Map<string, Array<{ date: string, category: string, title: string, details: string }>>} */
  let testingByDate = new Map();
  /** @type {string[]} */
  let schoolRows = [];
  /** @type {string | null} */
  let selectedDate = null;
  /** @type {string | null} */
  let activeFilter = null;
  /** @type {"school" | "academic"} */
  let calendarMode = MODE_SCHOOL;
  let interactionsBound = false;
  let testingEventCount = 0;

  const SCHOOL_FILTER_LABELS = {
    white: "White Days",
    blue: "Blue Days",
    closed: "Closed Days",
    planning: "Planning / PSD",
    erd: "Early Release",
    exam: "Exam Days",
  };

  const SCHOOL_FILTER_BLURBS = {
    white: "Upcoming White Days (Periods 1–4) from today onward.",
    blue: "Upcoming Blue Days (Periods 5–8) from today onward.",
    closed: "Upcoming closed days from today onward.",
    planning: "Upcoming teacher planning and Professional Study Days from today onward.",
    erd: "Upcoming Early Release Days from today onward.",
    exam: "Upcoming exam days from today onward.",
  };

  const CATEGORY_PRIORITY = [
    "SAT",
    "ACT",
    "AP",
    "PM/FAST",
    "PSAT",
    "WIDA",
    "CTACE",
    "Retakes",
    "MAP",
    "Government",
    "Infrastructure",
    "Training",
  ];

  const CATEGORY_META = {
    "PM/FAST": { label: "PM / FAST", blurb: "Upcoming PM and FAST testing from today onward." },
    CTACE: { label: "CTACE", blurb: "Upcoming CTACE testing in the Media Center from today onward." },
    AP: { label: "AP Exams", blurb: "Upcoming AP exam dates from today onward." },
    Retakes: { label: "Retakes", blurb: "Upcoming retake and make-up testing from today onward." },
    WIDA: { label: "WIDA", blurb: "Upcoming WIDA testing from today onward." },
    PSAT: { label: "PSAT", blurb: "Upcoming PSAT and related dates from today onward." },
    ACT: { label: "ACT", blurb: "Upcoming ACT testing from today onward." },
    SAT: { label: "SAT", blurb: "Upcoming SAT testing from today onward." },
    MAP: { label: "MAP", blurb: "Upcoming MAP testing from today onward." },
    Government: { label: "Government", blurb: "Upcoming government testing from today onward." },
    Training: { label: "Training", blurb: "Upcoming testing training from today onward." },
    Infrastructure: { label: "Infrastructure", blurb: "Upcoming infrastructure test dates from today onward." },
  };

  function categorySlug(category) {
    return String(category || "testing")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function toIsoDateKey(value) {
    const raw = String(value || "").trim();
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) {
      return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
    }
    return raw;
  }

  function easternIsoToday() {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
    );
    return toIsoDateKey(`${parts.year}-${parts.month}-${parts.day}`);
  }

  function splitCsvLine(line) {
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        if (inQuotes && line[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current);
    return cols;
  }

  function parseCsvTable(text) {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter((line) => {
        const t = line.trim();
        return t && !t.startsWith("#");
      });
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (!cols.length || cols.every((c) => !c.trim())) continue;
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (cols[idx] ?? "").trim();
      });
      rows.push(row);
    }
    return rows;
  }

  function loadRows(text) {
    return parseCsvTable(text)
      .map((r) => ({
        date: toIsoDateKey(r.date || ""),
        dayOfWeek: (r.day_of_week || "").trim(),
        dayType: (r.day_type || "").trim().toLowerCase(),
        notes: (r.notes || "").trim(),
      }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.dayType);
  }

  function loadTestingRows(text) {
    return parseCsvTable(text)
      .map((r) => ({
        date: toIsoDateKey(r.date || ""),
        category: (r.category || "Testing").trim(),
        title: (r.title || "").trim(),
        details: (r.details || "").trim(),
      }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.title);
  }

  function groupTestingByDate(rows) {
    /** @type {Map<string, Array<{ date: string, category: string, title: string, details: string }>>} */
    const map = new Map();
    for (const row of rows) {
      const list = map.get(row.date) || [];
      list.push(row);
      map.set(row.date, list);
    }
    return map;
  }

  function isExamNotes(notes) {
    return /exam/i.test(notes || "");
  }

  function testingEventsFor(iso) {
    return testingByDate.get(iso) || [];
  }

  function categoriesOnDate(iso) {
    const cats = [];
    for (const ev of testingEventsFor(iso)) {
      if (ev.category && !cats.includes(ev.category)) cats.push(ev.category);
    }
    return cats;
  }

  function primaryCategory(iso) {
    const cats = categoriesOnDate(iso);
    if (!cats.length) return null;
    if (cats.length === 1) return cats[0];
    for (const preferred of CATEGORY_PRIORITY) {
      if (cats.includes(preferred)) return preferred;
    }
    return cats[0];
  }

  function presentCategories() {
    const set = new Set();
    for (const events of testingByDate.values()) {
      for (const ev of events) {
        if (ev.category) set.add(ev.category);
      }
    }
    return CATEGORY_PRIORITY.filter((c) => set.has(c)).concat(
      [...set].filter((c) => !CATEGORY_PRIORITY.includes(c)).sort()
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function describeEntry(entry) {
    if (!entry) {
      return {
        title: "No school day on file",
        detail: "This date is not on the FLHS 2026–2027 calendar.",
        periods: "",
        tone: "empty",
        exam: false,
      };
    }

    const exam = isExamNotes(entry.notes);
    const notes = entry.notes;
    switch (entry.dayType) {
      case "white":
        return {
          title: exam ? "White Day · Exams" : "White Day",
          detail: exam ? "Exam day · Periods 1–4" : "Regular schedule · Periods 1–4",
          periods: "Periods 1–4",
          tone: "white",
          exam,
          notes,
        };
      case "blue":
        return {
          title: exam ? "Blue Day · Exams" : "Blue Day",
          detail: exam ? "Exam day · Periods 5–8" : "Regular schedule · Periods 5–8",
          periods: "Periods 5–8",
          tone: "blue",
          exam,
          notes,
        };
      case "erd":
        return {
          title: exam ? "Early Release · Exams" : "Early Release Day",
          detail: notes || "Early Release Day · 12:50 dismissal",
          periods: "Early release schedule",
          tone: "erd",
          exam,
          notes,
        };
      case "psd":
        return {
          title: "Professional Study Day",
          detail: notes || "Professional Study Day · 11:50 release",
          periods: "PSD schedule",
          tone: "psd",
          exam,
          notes,
        };
      case "planning":
        return {
          title: "Teacher Planning",
          detail: notes || "Teacher planning day · No student classes",
          periods: "No student bell schedule",
          tone: "planning",
          exam,
          notes,
        };
      case "closed":
        return {
          title: "School Closed",
          detail: notes || "No classes",
          periods: "No bell schedule",
          tone: "closed",
          exam,
          notes,
        };
      default: {
        const label = entry.dayType
          .split(/[\s_-]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return {
          title: label,
          detail: notes || label,
          periods: "",
          tone: entry.dayType,
          exam,
          notes,
        };
      }
    }
  }

  function formatLongDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(utc);
  }

  function formatShortDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(utc);
  }

  function clearDaySelection() {
    monthsEl?.querySelectorAll(".cal-day.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
  }

  function setLegendActive(filter) {
    legendEl?.querySelectorAll(".legend-item").forEach((btn) => {
      const on = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function filterLabels() {
    if (calendarMode === MODE_ACADEMIC) {
      const labels = {};
      for (const cat of presentCategories()) {
        labels[cat] = CATEGORY_META[cat]?.label || cat;
      }
      return labels;
    }
    return SCHOOL_FILTER_LABELS;
  }

  function filterBlurb(filter) {
    if (calendarMode === MODE_ACADEMIC) {
      return CATEGORY_META[filter]?.blurb || `Upcoming ${filter} dates from today onward.`;
    }
    return SCHOOL_FILTER_BLURBS[filter] || "Upcoming matching dates from today onward.";
  }

  function matchesFilter(iso, filter) {
    if (calendarMode === MODE_ACADEMIC) {
      return categoriesOnDate(iso).includes(filter);
    }
    const entry = byDate.get(iso) || null;
    if (!entry) return false;
    if (filter === "exam") return isExamNotes(entry.notes);
    if (filter === "planning") {
      return entry.dayType === "planning" || entry.dayType === "psd";
    }
    return entry.dayType === filter;
  }

  function upcomingDatesForFilter(filter) {
    const today = easternIsoToday();
    const dates = new Set();
    const source =
      calendarMode === MODE_ACADEMIC ? testingByDate.keys() : byDate.keys();
    for (const iso of source) {
      if (iso >= today && matchesFilter(iso, filter)) dates.add(iso);
    }
    return [...dates].sort();
  }

  function upcomingItemMeta(iso, filter) {
    const entry = byDate.get(iso) || null;
    const info = describeEntry(entry);
    const testing = testingEventsFor(iso);

    if (calendarMode === MODE_ACADEMIC) {
      const focused = testing.filter((t) => t.category === filter);
      const list = focused.length ? focused : testing;
      return {
        title: list.map((t) => t.title).join(" · ") || filter,
        meta: list
          .map((t) => (t.details ? t.details : t.category))
          .filter(Boolean)
          .join(" · "),
      };
    }

    return {
      title: info.title,
      meta: [info.periods, entry?.notes].filter(Boolean).join(" · "),
    };
  }

  function pulseDetailPanel() {
    if (!detailEl) return;
    detailEl.classList.remove("is-updating");
    // Restart the attention animation when the selected day changes.
    void detailEl.offsetWidth;
    detailEl.classList.add("is-updating");
  }

  function renderFilterList(filter) {
    if (!detailEl) return;
    const labels = filterLabels();
    if (!labels[filter]) return;

    activeFilter = filter;
    selectedDate = null;
    clearDaySelection();
    setLegendActive(filter);

    const dates = upcomingDatesForFilter(filter);
    const label = labels[filter];
    const blurb = filterBlurb(filter);

    detailEl.hidden = false;
    detailEl.dataset.tone = "filter";
    detailEl.dataset.mode = "filter";
    delete detailEl.dataset.exam;
    delete detailEl.dataset.testing;

    const items = dates.length
      ? `<ul class="upcoming-list">
          ${dates
            .map((iso) => {
              const { title, meta } = upcomingItemMeta(iso, filter);
              return `
                <li>
                  <button type="button" class="upcoming-item" data-jump-date="${iso}">
                    <span class="upcoming-date">${escapeHtml(formatShortDate(iso))}</span>
                    <span class="upcoming-title">${escapeHtml(title)}</span>
                    ${
                      meta
                        ? `<span class="upcoming-meta">${escapeHtml(meta)}</span>`
                        : ""
                    }
                  </button>
                </li>
              `;
            })
            .join("")}
        </ul>`
      : `<p class="upcoming-empty">No upcoming ${escapeHtml(
          label.toLowerCase()
        )} left on the 2026–2027 calendar from today forward.</p>`;

    detailEl.innerHTML = `
      <p class="detail-eyebrow">From today onward</p>
      <h2 class="detail-title">${escapeHtml(label)}</h2>
      <p class="detail-body">${escapeHtml(blurb)}</p>
      <p class="detail-meta"><span>Upcoming</span>${dates.length} date${
        dates.length === 1 ? "" : "s"
      }</p>
      ${items}
    `;

    pulseDetailPanel();
  }

  function renderTestingBlock(events, heading = "Academic testing") {
    if (!events.length) return "";
    const items = events
      .map((ev) => {
        const detail = ev.details
          ? `<span class="testing-item-detail">${escapeHtml(ev.details)}</span>`
          : "";
        return `
          <li class="testing-item">
            <span class="testing-cat">${escapeHtml(ev.category)}</span>
            <span class="testing-item-title">${escapeHtml(ev.title)}</span>
            ${detail}
          </li>
        `;
      })
      .join("");
    return `
      <div class="testing-block">
        <p class="testing-heading">${escapeHtml(heading)}</p>
        <ul class="testing-list">${items}</ul>
      </div>
    `;
  }

  function renderSchoolDetail(iso) {
    const entry = byDate.get(iso) || null;
    const info = describeEntry(entry);
    const testing = testingEventsFor(iso);
    const today = easternIsoToday();
    const isToday = iso === today;

    detailEl.dataset.tone = info.tone;
    delete detailEl.dataset.mode;
    if (info.exam) detailEl.dataset.exam = "true";
    else delete detailEl.dataset.exam;
    if (testing.length) detailEl.dataset.testing = "true";
    else delete detailEl.dataset.testing;

    detailEl.innerHTML = `
      <p class="detail-eyebrow">${isToday ? "Today · " : ""}${escapeHtml(formatLongDate(iso))}</p>
      <h2 class="detail-title">${escapeHtml(info.title)}</h2>
      <p class="detail-body">${escapeHtml(info.detail)}</p>
      ${
        info.periods
          ? `<p class="detail-meta"><span>Schedule</span>${escapeHtml(info.periods)}</p>`
          : ""
      }
      ${
        info.notes
          ? `<p class="detail-meta"><span>Notes</span>${escapeHtml(info.notes)}</p>`
          : ""
      }
      ${renderTestingBlock(testing)}
    `;
  }

  function renderAcademicDetail(iso) {
    const testing = testingEventsFor(iso);
    const entry = byDate.get(iso) || null;
    const info = describeEntry(entry);
    const today = easternIsoToday();
    const isToday = iso === today;
    const primary = primaryCategory(iso);
    const cats = categoriesOnDate(iso);

    detailEl.dataset.tone = primary ? `acat-${categorySlug(primary)}` : "empty";
    delete detailEl.dataset.mode;
    delete detailEl.dataset.exam;
    if (testing.length) detailEl.dataset.testing = "true";
    else delete detailEl.dataset.testing;

    if (!testing.length) {
      detailEl.innerHTML = `
        <p class="detail-eyebrow">${isToday ? "Today · " : ""}${escapeHtml(formatLongDate(iso))}</p>
        <h2 class="detail-title">No testing scheduled</h2>
        <p class="detail-body">There is no academic testing on this date in the 2026–2027 testing calendar.</p>
        ${
          entry
            ? `<p class="detail-meta"><span>School day</span>${escapeHtml(info.title)}${
                info.periods ? ` · ${escapeHtml(info.periods)}` : ""
              }</p>`
            : ""
        }
      `;
      return;
    }

    const headline =
      cats.length > 1
        ? `${cats.length} testing events`
        : CATEGORY_META[primary]?.label || primary || "Testing";

    detailEl.innerHTML = `
      <p class="detail-eyebrow">${isToday ? "Today · " : ""}${escapeHtml(formatLongDate(iso))}</p>
      <h2 class="detail-title">${escapeHtml(headline)}</h2>
      <p class="detail-body">${escapeHtml(
        cats.length > 1
          ? cats.join(" · ")
          : testing[0].details || "Academic testing day"
      )}</p>
      ${
        entry
          ? `<p class="detail-meta"><span>School day</span>${escapeHtml(info.title)}${
              info.periods ? ` · ${escapeHtml(info.periods)}` : ""
            }</p>`
          : ""
      }
      ${renderTestingBlock(testing, "Testing schedule")}
    `;
  }

  function renderDetail(iso) {
    if (!detailEl) return;
    selectedDate = iso;
    activeFilter = null;
    setLegendActive(null);
    detailEl.hidden = false;

    if (calendarMode === MODE_ACADEMIC) renderAcademicDetail(iso);
    else renderSchoolDetail(iso);

    clearDaySelection();
    monthsEl
      ?.querySelector(`.cal-day[data-date="${iso}"]`)
      ?.classList.add("is-selected");
    pulseDetailPanel();
  }

  function monthKeysFromDates(dates) {
    const keys = new Set();
    for (const date of dates) keys.add(date.slice(0, 7));
    return [...keys].sort();
  }

  function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function firstWeekday(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  }

  function renderMonthSchool(yearMonth, todayIso) {
    const [ys, ms] = yearMonth.split("-");
    const year = Number(ys);
    const monthIndex = Number(ms) - 1;
    const title = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(year, monthIndex, 1)));

    const startPad = firstWeekday(year, monthIndex);
    const totalDays = daysInMonth(year, monthIndex);
    const cells = [];

    for (let i = 0; i < startPad; i++) {
      cells.push(`<span class="cal-day is-pad" aria-hidden="true"></span>`);
    }

    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = byDate.get(iso) || null;
      const exam = entry ? isExamNotes(entry.notes) : false;
      const testing = testingEventsFor(iso);
      const hasTesting = testing.length > 0;
      const tone = entry?.dayType || "empty";
      const isToday = iso === todayIso;
      const testingHint = hasTesting
        ? ` · ${testing.map((t) => t.title).join("; ")}`
        : "";
      const label = entry
        ? `${formatLongDate(iso)}: ${describeEntry(entry).title}${testingHint}`
        : `${formatLongDate(iso)}: not on calendar${testingHint}`;

      cells.push(`
        <button
          type="button"
          class="cal-day tone-${escapeHtml(tone)}${exam ? " is-exam" : ""}${hasTesting ? " has-testing" : ""}${isToday ? " is-today" : ""}"
          data-date="${iso}"
          aria-label="${escapeHtml(label)}"
        >
          <span class="cal-day-num">${day}</span>
          ${hasTesting ? `<span class="testing-mark" aria-hidden="true"></span>` : ""}
        </button>
      `);
    }

    return monthCard(title, cells);
  }

  function renderMonthAcademic(yearMonth, todayIso) {
    const [ys, ms] = yearMonth.split("-");
    const year = Number(ys);
    const monthIndex = Number(ms) - 1;
    const title = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(year, monthIndex, 1)));

    const startPad = firstWeekday(year, monthIndex);
    const totalDays = daysInMonth(year, monthIndex);
    const cells = [];

    for (let i = 0; i < startPad; i++) {
      cells.push(`<span class="cal-day is-pad" aria-hidden="true"></span>`);
    }

    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const testing = testingEventsFor(iso);
      const cats = categoriesOnDate(iso);
      const primary = primaryCategory(iso);
      const isToday = iso === todayIso;
      const multi = cats.length > 1;
      const tone = primary
        ? multi
          ? "acat-multi"
          : `acat-${categorySlug(primary)}`
        : "empty";
      const label = testing.length
        ? `${formatLongDate(iso)}: ${testing.map((t) => t.title).join("; ")}`
        : `${formatLongDate(iso)}: no testing scheduled`;

      cells.push(`
        <button
          type="button"
          class="cal-day tone-${escapeHtml(tone)}${testing.length ? " has-academic" : ""}${isToday ? " is-today" : ""}"
          data-date="${iso}"
          aria-label="${escapeHtml(label)}"
        >
          <span class="cal-day-num">${day}</span>
        </button>
      `);
    }

    return monthCard(title, cells);
  }

  function monthCard(title, cells) {
    return `
      <section class="month-card" aria-label="${escapeHtml(title)}">
        <h2 class="month-title">${escapeHtml(title)}</h2>
        <div class="month-weekdays" aria-hidden="true">
          ${WEEKDAYS.map((d) => `<span>${d}</span>`).join("")}
        </div>
        <div class="month-grid">${cells.join("")}</div>
      </section>
    `;
  }

  function renderLegend() {
    if (!legendEl) return;

    if (calendarMode === MODE_ACADEMIC) {
      const cats = presentCategories();
      legendEl.setAttribute("aria-label", "Academic testing legend filters");
      legendEl.innerHTML = cats
        .map((cat) => {
          const slug = categorySlug(cat);
          const label = CATEGORY_META[cat]?.label || cat;
          return `
            <button type="button" class="legend-item" data-filter="${escapeHtml(cat)}" aria-pressed="false">
              <span class="swatch acat-${escapeHtml(slug)}" aria-hidden="true"></span>${escapeHtml(label)}
            </button>
          `;
        })
        .join("");
      return;
    }

    legendEl.setAttribute("aria-label", "School calendar legend filters");
    legendEl.innerHTML = `
      <button type="button" class="legend-item" data-filter="white" aria-pressed="false">
        <span class="swatch white" aria-hidden="true"></span>White
      </button>
      <button type="button" class="legend-item" data-filter="blue" aria-pressed="false">
        <span class="swatch blue" aria-hidden="true"></span>Blue
      </button>
      <button type="button" class="legend-item" data-filter="closed" aria-pressed="false">
        <span class="swatch closed" aria-hidden="true"></span>Closed
      </button>
      <button type="button" class="legend-item" data-filter="planning" aria-pressed="false">
        <span class="swatch planning" aria-hidden="true"></span>Planning / PSD
      </button>
      <button type="button" class="legend-item" data-filter="erd" aria-pressed="false">
        <span class="swatch erd" aria-hidden="true"></span>Early Release
      </button>
      <button type="button" class="legend-item" data-filter="exam" aria-pressed="false">
        <span class="swatch exam" aria-hidden="true"></span>Exam
      </button>
    `;
  }

  function updateChrome() {
    boardEl?.setAttribute("data-calendar-mode", calendarMode);
    document.body.dataset.calendarMode = calendarMode;

    modeToggleEl?.querySelectorAll("[data-mode]").forEach((btn) => {
      const on = btn.dataset.mode === calendarMode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    if (titleEl) {
      titleEl.textContent =
        calendarMode === MODE_ACADEMIC ? "Academic Testing Calendar" : "School Calendar";
    }

    if (leadEl) {
      leadEl.textContent =
        calendarMode === MODE_ACADEMIC
          ? "2026–2027 testing dates colored by type (PM/FAST, CTACE, ACT, SAT, AP, and more). Tap a legend chip for upcoming dates from today, or tap a day for details."
          : "2026–2027 FLHS days colored to match the official calendar legend. Tap a legend chip for upcoming dates from today, or tap a day for schedule details.";
    }

    if (statusEl) {
      statusEl.textContent =
        calendarMode === MODE_ACADEMIC
          ? `${testingEventCount} testing events · ${testingByDate.size} testing days · 2026–2027`
          : testingEventCount
            ? `${schoolRows.length} school-year dates · ${testingEventCount} testing events · 2026–2027`
            : `${schoolRows.length} school-year dates · 2026–2027`;
    }
  }

  function monthKeysForMode() {
    if (calendarMode === MODE_ACADEMIC) {
      const keys = monthKeysFromDates([...testingByDate.keys()]);
      return keys.length ? keys : monthKeysFromDates(schoolRows.map((r) => r.date));
    }
    return monthKeysFromDates(schoolRows.map((r) => r.date));
  }

  function renderCalendarGrid() {
    if (!monthsEl) return;
    const todayIso = easternIsoToday();
    const months = monthKeysForMode();
    monthsEl.innerHTML = months
      .map((m) =>
        calendarMode === MODE_ACADEMIC
          ? renderMonthAcademic(m, todayIso)
          : renderMonthSchool(m, todayIso)
      )
      .join("");
  }

  function refreshView(preferredDate) {
    updateChrome();
    renderLegend();
    renderCalendarGrid();

    const todayIso = easternIsoToday();
    let initial = preferredDate || selectedDate || todayIso;
    if (calendarMode === MODE_ACADEMIC) {
      if (!testingByDate.has(initial)) {
        const upcoming = [...testingByDate.keys()].filter((d) => d >= todayIso).sort();
        initial = upcoming[0] || [...testingByDate.keys()].sort()[0] || todayIso;
      }
    } else if (!byDate.has(initial)) {
      initial = (byDate.has(todayIso) && todayIso) || schoolRows[0]?.date || todayIso;
    }
    renderDetail(initial);

    const focusCell =
      monthsEl?.querySelector(`.cal-day[data-date="${initial}"]`) ||
      monthsEl?.querySelector(".cal-day.is-today");
    focusCell?.closest(".month-card")?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }

  function setCalendarMode(mode) {
    if (mode !== MODE_SCHOOL && mode !== MODE_ACADEMIC) return;
    if (mode === calendarMode) return;
    calendarMode = mode;
    activeFilter = null;
    refreshView(selectedDate);
  }

  function goToToday() {
    const todayIso = easternIsoToday();
    renderDetail(todayIso);

    const dayBtn = monthsEl?.querySelector(`.cal-day[data-date="${todayIso}"]`);
    if (dayBtn) {
      dayBtn.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      dayBtn.focus({ preventScroll: true });
    } else {
      detailEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function pdfToneClass(iso) {
    if (calendarMode === MODE_ACADEMIC) {
      const cats = categoriesOnDate(iso);
      const primary = primaryCategory(iso);
      if (!primary) return "empty";
      if (cats.length > 1) return "acat-multi";
      return `acat-${categorySlug(primary)}`;
    }
    const entry = byDate.get(iso);
    if (!entry) return "empty";
    const exam = isExamNotes(entry.notes);
    return exam ? `${entry.dayType} exam` : entry.dayType;
  }

  function buildPdfMonth(yearMonth) {
    const [ys, ms] = yearMonth.split("-");
    const year = Number(ys);
    const monthIndex = Number(ms) - 1;
    const title = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(year, monthIndex, 1)));
    const startPad = firstWeekday(year, monthIndex);
    const totalDays = daysInMonth(year, monthIndex);
    const cells = [];

    for (let i = 0; i < startPad; i++) {
      cells.push(`<span class="d pad"></span>`);
    }
    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const tone = pdfToneClass(iso);
      const testing = testingEventsFor(iso);
      const mark =
        calendarMode === MODE_SCHOOL && testing.length
          ? `<i class="dot"></i>`
          : "";
      cells.push(
        `<span class="d ${escapeHtml(tone)}"><b>${day}</b>${mark}</span>`
      );
    }

    return `
      <section class="month">
        <h2>${escapeHtml(title)}</h2>
        <div class="weekdays">${WEEKDAYS.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="grid">${cells.join("")}</div>
      </section>
    `;
  }

  function buildPdfLegend() {
    if (calendarMode === MODE_ACADEMIC) {
      return presentCategories()
        .map((cat) => {
          const slug = categorySlug(cat);
          const label = CATEGORY_META[cat]?.label || cat;
          return `<span class="chip"><i class="sw acat-${escapeHtml(slug)}"></i>${escapeHtml(label)}</span>`;
        })
        .join("");
    }
    return `
      <span class="chip"><i class="sw white"></i>White</span>
      <span class="chip"><i class="sw blue"></i>Blue</span>
      <span class="chip"><i class="sw closed"></i>Closed</span>
      <span class="chip"><i class="sw planning"></i>Planning / PSD</span>
      <span class="chip"><i class="sw erd"></i>Early Release</span>
      <span class="chip"><i class="sw exam"></i>Exam</span>
      <span class="chip"><i class="sw testing"></i>Testing marker</span>
    `;
  }

  function buildPdfSchedule() {
    if (calendarMode === MODE_ACADEMIC) {
      const dates = [...testingByDate.keys()].sort();
      if (!dates.length) {
        return `<p class="empty">No academic testing dates were found.</p>`;
      }
      return `
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Event</th><th>Details</th></tr>
          </thead>
          <tbody>
            ${dates
              .map((iso) => {
                const events = testingEventsFor(iso);
                return events
                  .map(
                    (ev, idx) => `
                  <tr>
                    <td>${idx === 0 ? escapeHtml(formatShortDate(iso)) : ""}</td>
                    <td>${escapeHtml(ev.category)}</td>
                    <td>${escapeHtml(ev.title)}</td>
                    <td>${escapeHtml(ev.details || "")}</td>
                  </tr>`
                  )
                  .join("");
              })
              .join("")}
          </tbody>
        </table>
      `;
    }

    const notable = schoolRows.filter((r) => {
      if (["closed", "erd", "psd", "planning"].includes(r.dayType)) return true;
      if (isExamNotes(r.notes)) return true;
      if (r.notes && !/^teacher planning/i.test(r.notes)) return true;
      return false;
    });

    if (!notable.length) {
      return `<p class="empty">No special school-day notes were found.</p>`;
    }

    return `
      <table>
        <thead>
          <tr><th>Date</th><th>Day type</th><th>Notes</th></tr>
        </thead>
        <tbody>
          ${notable
            .map((r) => {
              const info = describeEntry(r);
              return `
                <tr>
                  <td>${escapeHtml(formatShortDate(r.date))}</td>
                  <td>${escapeHtml(info.title)}</td>
                  <td>${escapeHtml(r.notes || info.detail || "")}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function buildPdfHtml() {
    const isAcademic = calendarMode === MODE_ACADEMIC;
    const title = isAcademic
      ? "FLHS Academic Testing Calendar 2026–2027"
      : "FLHS School Calendar 2026–2027";
    const subtitle = isAcademic
      ? `${testingEventCount} testing events · ${testingByDate.size} testing days`
      : `${schoolRows.length} school-year dates`;
    const months = monthKeysForMode()
      .map((m) => buildPdfMonth(m))
      .join("");
    const generated = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: letter; margin: 0.55in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #002366;
      font: 11px/1.35 "Helvetica Neue", Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .meta { color: #3d5680; margin: 0 0 14px; font-size: 11px; }
    .hint {
      margin: 0 0 12px;
      padding: 8px 10px;
      border: 1px solid #c5ccd8;
      background: #f4f7fb;
      border-radius: 8px;
      color: #1a3a6e;
      font-size: 11px;
    }
    .legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      border: 1px solid #c5ccd8; border-radius: 999px; padding: 3px 8px;
      background: #fff; font-size: 10px; font-weight: 700;
    }
    .sw, .d { display: inline-block; }
    .sw {
      width: 10px; height: 10px; border-radius: 2px; border: 1px solid rgba(0,0,0,.15);
    }
    .sw.white { background: #fff; }
    .sw.blue { background: #003399; }
    .sw.closed { background: #4f7a36; }
    .sw.planning { background: #c45a18; }
    .sw.erd { background: #fff7ed; border-color: #c2410c; }
    .sw.exam { background: linear-gradient(90deg, #e6b000 50%, #003399 50%); }
    .sw.testing { background: #0e7490; }
    .sw.acat-pm-fast { background: #0e7490; }
    .sw.acat-ctace { background: #155e75; }
    .sw.acat-ap { background: #002366; }
    .sw.acat-retakes { background: #b45309; }
    .sw.acat-wida { background: #3f6212; }
    .sw.acat-psat { background: #0056b3; }
    .sw.acat-act { background: #9f1239; }
    .sw.acat-sat { background: #1e3a8a; }
    .sw.acat-map { background: #4d7c0f; }
    .sw.acat-government { background: #92400e; }
    .sw.acat-training { background: #64748b; }
    .sw.acat-infrastructure { background: #475569; }
    .months {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .month {
      border: 1px solid #d5deea;
      border-radius: 10px;
      padding: 8px;
      background: #fff;
      break-inside: avoid;
    }
    .month h2 { font-size: 12px; margin: 0 0 6px; }
    .weekdays, .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .weekdays span {
      text-align: center; font-size: 8px; font-weight: 700;
      color: #5a7194; text-transform: uppercase;
    }
    .d {
      position: relative;
      min-height: 18px;
      border-radius: 4px;
      text-align: center;
      font-size: 9px;
      font-weight: 700;
      padding: 3px 0;
      background: #eef2f7;
      color: #5a7194;
    }
    .d.pad { visibility: hidden; }
    .d b { font-weight: 700; }
    .d.white { background: #fff; color: #0a0a0a; border: 1px solid #d0d0d0; }
    .d.blue { background: #003399; color: #fff; }
    .d.closed { background: #4f7a36; color: #fff; }
    .d.planning, .d.psd { background: #c45a18; color: #fff; }
    .d.erd { background: #fff7ed; color: #9a3412; border: 1px solid #c2410c; }
    .d.exam { box-shadow: inset 3px 0 0 #e6b000; }
    .d.acat-pm-fast { background: #0e7490; color: #fff; }
    .d.acat-ctace { background: #155e75; color: #fff; }
    .d.acat-ap { background: #002366; color: #fff; }
    .d.acat-retakes { background: #b45309; color: #fff; }
    .d.acat-wida { background: #3f6212; color: #fff; }
    .d.acat-psat { background: #0056b3; color: #fff; }
    .d.acat-act { background: #9f1239; color: #fff; }
    .d.acat-sat { background: #1e3a8a; color: #fff; }
    .d.acat-map { background: #4d7c0f; color: #fff; }
    .d.acat-government { background: #92400e; color: #fff; }
    .d.acat-training { background: #64748b; color: #fff; }
    .d.acat-infrastructure { background: #475569; color: #fff; }
    .d.acat-multi {
      background: linear-gradient(135deg, #0e7490 50%, #9f1239 50%);
      color: #fff;
    }
    .dot {
      position: absolute; top: 2px; right: 2px;
      width: 4px; height: 4px; border-radius: 50%; background: #0e7490;
    }
    .d.blue .dot, .d.closed .dot, .d.planning .dot, .d.psd .dot { background: #67e8f9; }
    h3 {
      margin: 0 0 8px;
      font-size: 13px;
      page-break-before: always;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #d5deea;
      padding: 5px 6px;
      vertical-align: top;
      text-align: left;
    }
    th { background: #eef3fa; }
    tr { break-inside: avoid; }
    .empty { color: #5a7194; }
    .footer {
      margin-top: 14px;
      color: #5a7194;
      font-size: 9px;
    }
    @media print {
      .hint { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(subtitle)} · Generated ${escapeHtml(generated)} · FLHSHelp.com</p>
  <p class="hint">In the print dialog, choose <strong>Save as PDF</strong> (or Microsoft Print to PDF), then save the file.</p>
  <div class="legend">${buildPdfLegend()}</div>
  <div class="months">${months}</div>
  <h3>${isAcademic ? "Testing schedule reference" : "School-year notes reference"}</h3>
  ${buildPdfSchedule()}
  <p class="footer">Fort Lauderdale High School · Source data matches the interactive calendar on FLHSHelp.com</p>
</body>
</html>`;
  }

  function restorePdfButton() {
    if (!pdfBtnEl) return;
    pdfBtnEl.disabled = false;
    pdfBtnEl.removeAttribute("aria-busy");
  }

  function downloadCalendarPdf() {
    if (!schoolRows.length && !testingByDate.size) return;

    const html = buildPdfHtml();
    if (pdfBtnEl) {
      pdfBtnEl.disabled = true;
      pdfBtnEl.setAttribute("aria-busy", "true");
    }

    // Prefer a same-page iframe so we avoid blank popup tabs from window.open + document.write.
    const existing = document.getElementById("cal-pdf-frame");
    if (existing) existing.remove();

    const frame = document.createElement("iframe");
    frame.id = "cal-pdf-frame";
    frame.title = "Calendar PDF export";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(frame);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      restorePdfButton();
      setTimeout(() => {
        frame.remove();
      }, 500);
    };

    const triggerPrint = () => {
      try {
        const win = frame.contentWindow;
        if (!win) throw new Error("Missing print frame window");
        win.focus();
        win.addEventListener("afterprint", finish, { once: true });
        win.print();
        // Safari / some mobile browsers may not fire afterprint reliably.
        setTimeout(finish, 5000);
      } catch (err) {
        console.error(err);
        finish();
        window.alert(
          "Could not open the print dialog. Please try again, or use your browser’s Print → Save as PDF."
        );
      }
    };

    frame.addEventListener(
      "load",
      () => {
        setTimeout(triggerPrint, 100);
      },
      { once: true }
    );

    // srcdoc is more reliable than document.write into a popup.
    frame.srcdoc = html;
  }

  function bindInteractions() {
    if (interactionsBound) return;
    interactionsBound = true;

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;

      const modeBtn = target.closest("#cal-mode-toggle [data-mode]");
      if (modeBtn) {
        event.preventDefault();
        setCalendarMode(modeBtn.dataset.mode);
        return;
      }

      const pdfBtn = target.closest("#cal-pdf-btn");
      if (pdfBtn) {
        event.preventDefault();
        downloadCalendarPdf();
        return;
      }

      const legendBtn = target.closest("#cal-legend .legend-item[data-filter]");
      if (legendBtn) {
        const filter = legendBtn.dataset.filter;
        const labels = filterLabels();
        if (!filter || !labels[filter]) return;
        event.preventDefault();
        if (activeFilter === filter) goToToday();
        else renderFilterList(filter);
        return;
      }

      const jumpBtn = target.closest("#cal-detail [data-jump-date]");
      if (jumpBtn) {
        const iso = jumpBtn.dataset.jumpDate;
        if (!iso) return;
        event.preventDefault();
        renderDetail(iso);
        const dayBtn = monthsEl?.querySelector(`.cal-day[data-date="${iso}"]`);
        if (dayBtn) {
          dayBtn.scrollIntoView({ block: "center", behavior: "smooth" });
          dayBtn.focus({ preventScroll: true });
        }
        return;
      }

      const dayBtn = target.closest("#cal-months .cal-day[data-date]");
      if (dayBtn) {
        const iso = dayBtn.dataset.date;
        if (iso) renderDetail(iso);
      }
    });

    todayBtnEl?.addEventListener("click", goToToday);
  }

  async function start() {
    try {
      if (statusEl) statusEl.textContent = "Loading calendar…";
      const [calRes, testRes] = await Promise.all([
        fetch(CALENDAR_CSV_URL, { cache: "no-cache" }),
        fetch(TESTING_CSV_URL, { cache: "no-cache" }),
      ]);
      if (!calRes.ok) throw new Error(`Calendar CSV ${calRes.status}`);
      schoolRows = loadRows(await calRes.text());
      byDate = new Map(schoolRows.map((r) => [r.date, r]));

      if (testRes.ok) {
        const testingRows = loadTestingRows(await testRes.text());
        testingByDate = groupTestingByDate(testingRows);
        testingEventCount = testingRows.length;
      } else {
        console.warn(`Academic testing CSV ${testRes.status}`);
        testingByDate = new Map();
        testingEventCount = 0;
      }

      bindInteractions();
      window.flhsCalendarFilter = (filter) => {
        const labels = filterLabels();
        if (!filter || !labels[filter]) return;
        if (activeFilter === filter) goToToday();
        else renderFilterList(filter);
      };
      window.flhsCalendarMode = setCalendarMode;
      window.flhsCalendarPdf = downloadCalendarPdf;

      refreshView();
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = "Could not load the school calendar.";
      if (monthsEl) {
        monthsEl.innerHTML =
          `<p class="cal-error">Calendar unavailable. Try refreshing, or return <a href="../index.html">home</a>.</p>`;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
