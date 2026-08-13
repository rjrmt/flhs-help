(() => {
  const TZ = "America/New_York";
  const CALENDAR_CSV_URL = "../data/calendar-2026-2027.csv";
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthsEl = document.getElementById("cal-months");
  const todayBtnEl = document.getElementById("cal-today-btn");
  const detailEl = document.getElementById("cal-detail");
  const statusEl = document.getElementById("cal-status");

  /** @type {Map<string, { date: string, dayOfWeek: string, dayType: string, notes: string }>} */
  let byDate = new Map();
  /** @type {string | null} */
  let selectedDate = null;

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

  function isExamNotes(notes) {
    return /exam/i.test(notes || "");
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

  function monthKeysFromRows(rows) {
    const keys = new Set();
    for (const row of rows) {
      keys.add(row.date.slice(0, 7));
    }
    return [...keys].sort();
  }

  function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function firstWeekday(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  }

  function renderDetail(iso) {
    if (!detailEl) return;
    selectedDate = iso;
    const entry = byDate.get(iso) || null;
    const info = describeEntry(entry);
    const today = easternIsoToday();
    const isToday = iso === today;

    detailEl.hidden = false;
    detailEl.dataset.tone = info.tone;
    if (info.exam) detailEl.dataset.exam = "true";
    else delete detailEl.dataset.exam;

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
    `;

    monthsEl?.querySelectorAll(".cal-day.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
    monthsEl
      ?.querySelector(`.cal-day[data-date="${iso}"]`)
      ?.classList.add("is-selected");
  }

  function renderMonth(yearMonth, todayIso) {
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
      const tone = entry?.dayType || "empty";
      const isToday = iso === todayIso;
      const label = entry
        ? `${formatLongDate(iso)}: ${describeEntry(entry).title}`
        : `${formatLongDate(iso)}: not on calendar`;

      cells.push(`
        <button
          type="button"
          class="cal-day tone-${escapeHtml(tone)}${exam ? " is-exam" : ""}${isToday ? " is-today" : ""}"
          data-date="${iso}"
          aria-label="${escapeHtml(label)}"
        >
          <span class="cal-day-num">${day}</span>
        </button>
      `);
    }

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
      // Outside school-year range — still show the detail panel for today.
      detailEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function renderAll(rows) {
    if (!monthsEl) return;
    const todayIso = easternIsoToday();
    const months = monthKeysFromRows(rows);
    monthsEl.innerHTML = months.map((m) => renderMonth(m, todayIso)).join("");

    monthsEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".cal-day[data-date]");
      if (!btn || !(btn instanceof HTMLElement)) return;
      const iso = btn.dataset.date;
      if (iso) renderDetail(iso);
    });

    todayBtnEl?.addEventListener("click", goToToday);

    const initial =
      (byDate.has(todayIso) && todayIso) ||
      rows[0]?.date ||
      null;
    if (initial) renderDetail(initial);

    // Scroll today's month into view when present.
    const todayCell = monthsEl.querySelector(`.cal-day.is-today`);
    if (todayCell) {
      todayCell.closest(".month-card")?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }

  async function start() {
    try {
      if (statusEl) statusEl.textContent = "Loading calendar…";
      const res = await fetch(CALENDAR_CSV_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Calendar CSV ${res.status}`);
      const rows = loadRows(await res.text());
      byDate = new Map(rows.map((r) => [r.date, r]));
      if (statusEl) {
        statusEl.textContent = `${rows.length} school-year dates · 2026–2027`;
      }
      renderAll(rows);
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
