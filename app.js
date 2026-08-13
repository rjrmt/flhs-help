(() => {
  const TZ = "America/New_York";
  const CALENDAR_CSV_URL = "data/flhs_calendar_2026_2027.csv";
  const BELL_CSV_URL = "data/flhs_bell_schedule.csv";

  const dayBubble = document.getElementById("day-bubble");
  const clockBubble = document.getElementById("clock-bubble");
  const statusLine = document.getElementById("status-line");
  const bellModal = document.getElementById("bell-schedule-modal");
  const bellModalBody = document.getElementById("bell-modal-body");
  const bellModalPanel = bellModal?.querySelector(".modal-panel") || null;
  const bellModalClose = bellModal?.querySelector(".modal-close") || null;

  /** @type {Map<string, { date: string, dayOfWeek: string, dayType: string, notes: string }>} */
  let calendarByDate = new Map();
  /** False until the calendar CSV has been parsed into calendarByDate. */
  let calendarReady = false;

  /**
   * @typedef {{ dayType: string, block: string, period: string, label: string, startMin: number, endMin: number, lunchTrack: string, buildings: string, notes: string }} BellRow
   */
  /** @type {Map<string, BellRow[]>} */
  let bellByDayType = new Map();

  /** @type {{ tone: string, exam: boolean, status: string|null, dayType: string|null, notes: string } | null} */
  let currentDayInfo = null;

  let bellModalOpen = false;
  /** @type {Element | null} */
  let bellModalReturnFocus = null;
  let lastModalHighlightMin = -1;

  /** Normalize any Y-M-D / M/D/Y-ish value to zero-padded ISO `YYYY-MM-DD`. */
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

  function easternParts(date = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });

    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value])
    );

    return {
      // Always pad — some engines omit leading zeros even with month/day "2-digit".
      isoDate: toIsoDateKey(`${parts.year}-${parts.month}-${parts.day}`),
      weekday: parts.weekday,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
      dayPeriod: parts.dayPeriod,
      timeZoneName: parts.timeZoneName,
      monthLong: new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "long",
      }).format(date),
      dayNum: String(Number(parts.day)),
      year: parts.year,
    };
  }

  /** Minutes since midnight in America/New_York. */
  function easternMinutesNow(date = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value])
    );
    // Some engines emit "24" for midnight with hour12:false — normalize to 0.
    const hour = Number(parts.hour) % 24;
    return hour * 60 + Number(parts.minute);
  }

  /** After this Eastern minute-of-day, the day-type bubble shows tomorrow. */
  const DAY_BUBBLE_TOMORROW_AFTER_MIN = 16 * 60; // 4:00 PM

  function dayBubbleShowsTomorrow(date = new Date()) {
    return easternMinutesNow(date) >= DAY_BUBBLE_TOMORROW_AFTER_MIN;
  }

  /**
   * Eastern calendar parts for today + dayOffset (calendar days, not 24h wall time).
   * Uses UTC noon on the shifted Y-M-D so DST transitions don't skip/duplicate a date.
   */
  function easternPartsForOffset(dayOffset, date = new Date()) {
    if (dayOffset === 0) return easternParts(date);
    const today = easternParts(date);
    const [y, m, d] = today.isoDate.split("-").map(Number);
    const shifted = new Date(Date.UTC(y, m - 1, d + dayOffset, 12, 0, 0));
    return easternParts(shifted);
  }

  /** Parse "HH:MM" or "H:MM" (24h) to minutes since midnight. */
  function parseTimeToMinutes(value) {
    const m = String(value || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function formatMinutes(totalMin) {
    const h24 = Math.floor(totalMin / 60) % 24;
    const min = totalMin % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(min).padStart(2, "0")} ${period}`;
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

  function loadCalendarRows(text) {
    return parseCsvTable(text)
      .map((r) => ({
        date: toIsoDateKey(r.date || ""),
        dayOfWeek: (r.day_of_week || "").trim(),
        dayType: (r.day_type || "").trim().toLowerCase(),
        notes: (r.notes || "").trim(),
      }))
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.dayType);
  }

  function loadBellRows(text) {
    /** @type {BellRow[]} */
    const rows = [];
    for (const r of parseCsvTable(text)) {
      const dayType = (r.day_type || "").trim().toLowerCase();
      const startMin = parseTimeToMinutes(r.start_time);
      const endMin = parseTimeToMinutes(r.end_time);
      if (!dayType || startMin == null || endMin == null) continue;
      rows.push({
        dayType,
        block: (r.block || "").trim(),
        period: (r.period || "").trim(),
        label: (r.label || "").trim(),
        startMin,
        endMin,
        lunchTrack: (r.lunch_track || "").trim().toUpperCase(),
        buildings: (r.buildings || "").trim(),
        notes: (r.notes || "").trim(),
      });
    }
    return rows;
  }

  function groupBellByDayType(rows) {
    /** @type {Map<string, BellRow[]>} */
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.dayType)) map.set(row.dayType, []);
      map.get(row.dayType).push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    }
    return map;
  }

  function isExamNotes(notes) {
    return /exam/i.test(notes || "");
  }

  function describeDay(entry, weekday, whenLabel = "Today") {
    if (!entry) {
      const weekend = weekday === "Saturday" || weekday === "Sunday";
      return {
        whenLabel,
        letter: "—",
        title: "No School",
        detail: weekend ? "Enjoy your weekend" : "Not on the calendar",
        tone: "weekend",
        exam: false,
        dayType: null,
        notes: "",
        status: weekend
          ? "No bell schedule (Weekend)"
          : "No bell schedule today",
      };
    }

    const notes = entry.notes;
    const exam = isExamNotes(notes);

    const base = {
      whenLabel,
      tone: entry.dayType,
      exam,
      dayType: entry.dayType,
      notes,
      status: null,
    };

    switch (entry.dayType) {
      case "white":
        return {
          ...base,
          letter: "A",
          title: exam ? "White Day · Exams" : "White Day",
          detail: exam ? "Exams · Periods 1–4" : "Periods 1–4",
          status: exam
            ? "Exam day · Periods 1–4"
            : "Regular schedule · Periods 1–4",
        };
      case "blue":
        return {
          ...base,
          letter: "B",
          title: exam ? "Blue Day · Exams" : "Blue Day",
          detail: exam ? "Exams · Periods 5–8" : "Periods 5–8",
          status: exam
            ? "Exam day · Periods 5–8"
            : "Regular schedule · Periods 5–8",
        };
      case "erd":
        return {
          ...base,
          letter: "ER",
          title: exam ? "Early Release · Exams" : "Early Release",
          detail: notes || "Early Release Day · 12:50 dismissal",
          status: notes || "Early release schedule",
        };
      case "psd":
        return {
          ...base,
          letter: "PSD",
          title: "Professional Study Day",
          detail: notes || "Professional Study Day · 11:50 release",
          status: notes || "Professional study schedule",
        };
      case "planning":
        return {
          ...base,
          letter: "Plan",
          title: "Teacher Planning",
          detail: notes || "Teacher planning day · No student classes",
          status: "No bell schedule (Planning Day)",
        };
      case "closed":
        return {
          ...base,
          letter: "—",
          title: "School Closed",
          detail: notes || "No classes today",
          status: "No bell schedule (Closed)",
        };
      default: {
        const label = entry.dayType
          .split(/[\s_-]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return {
          ...base,
          letter: label.slice(0, 3).toUpperCase(),
          title: label,
          detail: notes || label,
          status: notes || label,
        };
      }
    }
  }

  /**
   * @typedef {{
   *   kind: "lunch" | "class",
   *   label: string,
   *   startMin: number,
   *   endMin: number,
   *   times: string,
   *   active: boolean
   * }} LunchPhaseRow
   *
   * @typedef {{
   *   track: string,
   *   buildings: string,
   *   order: "lunch-first" | "class-first",
   *   lunch: LunchPhaseRow | null,
   *   classPhase: LunchPhaseRow | null,
   *   activePhase: "lunch" | "class" | null
   * }} LunchGroupStatus
   */

  /**
   * One Lunch A / Lunch B group for Block 3 — full lunch + class windows.
   * A: lunch then class · B: class then lunch (matches official schedule).
   * @param {string} track
   * @param {BellRow[]} trackRows
   * @param {number} now
   * @param {string} midPeriod
   * @returns {LunchGroupStatus}
   */
  function lunchTrackGroup(track, trackRows, now, midPeriod) {
    const buildings =
      (trackRows[0]?.buildings || "").trim() || `Buildings · Lunch ${track}`;
    const lunchRow = trackRows.find((r) => r.period === "lunch");
    const classRow = trackRows.find((r) => r.period !== "lunch");
    const order = track === "B" ? "class-first" : "lunch-first";

    /** @param {"lunch"|"class"} kind @param {BellRow|undefined} row @param {string} label */
    function phaseFrom(kind, row, label) {
      if (!row) return null;
      return {
        kind,
        label,
        startMin: row.startMin,
        endMin: row.endMin,
        times: `${formatMinutes(row.startMin)} – ${formatMinutes(row.endMin)}`,
        active: now >= row.startMin && now < row.endMin,
      };
    }

    const lunch = phaseFrom("lunch", lunchRow, `Lunch ${track}`);
    const classPhase = phaseFrom("class", classRow, midPeriod);
    const activePhase = lunch?.active
      ? "lunch"
      : classPhase?.active
        ? "class"
        : null;

    return {
      track,
      buildings,
      order,
      lunch,
      classPhase,
      activePhase,
    };
  }

  /**
   * Live status for instructional days from bell CSV (white/blue/erd/psd).
   * White/blue Block 3 returns two building groups (Lunch A / Lunch B).
   * @returns {string | { kind: "lunch-groups", prefix: string, groups: LunchGroupStatus[] } | null}
   */
  function bellStatusForDay(dayType, exam) {
    const rows = bellByDayType.get(dayType);
    if (!rows || !rows.length) return null;

    const now = easternMinutesNow();
    const prefix = exam ? "Exam · " : "";

    // Instant markers (e.g. Buses Depart) use start === end; exclude from windows.
    const timedRows = rows.filter((r) => r.endMin > r.startMin);
    if (!timedRows.length) return null;

    const uniqueBlocks = [...new Set(timedRows.map((r) => r.block))];
    const firstStarts = Math.min(...timedRows.map((r) => r.startMin));
    const lastEnds = Math.max(...timedRows.map((r) => r.endMin));

    if (now < firstStarts) {
      const first = timedRows.find((r) => r.startMin === firstStarts);
      return `${prefix}Before school · ${first?.label || "First bell"} at ${formatMinutes(firstStarts)}`;
    }

    if (now >= lastEnds) {
      return `${prefix}School day ended · ${formatMinutes(lastEnds)}`;
    }

    // Prefer non-lunch-track single rows (blocks 1–4, grab & go, etc.).
    const activeSimple = timedRows.filter(
      (r) => !r.lunchTrack && now >= r.startMin && now < r.endMin
    );
    if (activeSimple.length === 1) {
      const r = activeSimple[0];
      if (r.endMin === r.startMin) {
        return `${prefix}${r.label} · ${formatMinutes(r.startMin)}`;
      }
      return `${prefix}${r.label} · ends ${formatMinutes(r.endMin)}`;
    }

    // Block 3 / lunch window: two clear building groups (A then B).
    const lunchRows = timedRows.filter((r) => r.lunchTrack);
    if (lunchRows.length) {
      const lunchWindowStart = Math.min(...lunchRows.map((r) => r.startMin));
      const lunchWindowEnd = Math.max(...lunchRows.map((r) => r.endMin));
      if (now >= lunchWindowStart && now < lunchWindowEnd) {
        const midPeriod = dayType === "blue" ? "Period 7" : "Period 3";
        const trackA = lunchRows.filter((r) => r.lunchTrack === "A");
        const trackB = lunchRows.filter((r) => r.lunchTrack === "B");
        return {
          kind: "lunch-groups",
          prefix: exam ? "Exam" : "",
          groups: [
            lunchTrackGroup("A", trackA, now, midPeriod),
            lunchTrackGroup("B", trackB, now, midPeriod),
          ],
        };
      }
    }

    // Passing periods between blocks.
    for (let i = 0; i < uniqueBlocks.length - 1; i++) {
      const blockA = uniqueBlocks[i];
      const blockB = uniqueBlocks[i + 1];
      const endA = Math.max(
        ...timedRows.filter((r) => r.block === blockA).map((r) => r.endMin)
      );
      const startB = Math.min(
        ...timedRows.filter((r) => r.block === blockB).map((r) => r.startMin)
      );
      if (now >= endA && now < startB) {
        const next =
          timedRows.find((r) => r.block === blockB && !r.lunchTrack) ||
          timedRows.find((r) => r.block === blockB);
        return `${prefix}Passing · ${next?.label || "Next"} at ${formatMinutes(startB)}`;
      }
    }

    // Fallback: first row that covers now (any track).
    const any = timedRows.find((r) => now >= r.startMin && now < r.endMin);
    if (any) {
      return `${prefix}${any.label} · ends ${formatMinutes(any.endMin)}`;
    }

    if (dayType === "erd") return `${prefix}Early release schedule`;
    if (dayType === "psd") return `${prefix}Professional study schedule`;
    return `${prefix}Regular schedule · ${dayType === "blue" ? "Periods 5–8" : "Periods 1–4"}`;
  }

  /** @returns {string | { kind: "lunch-groups", prefix: string, groups: LunchGroupStatus[] }} */
  function resolveStatusText(info) {
    if (!info) return "No bell schedule";

    if (
      info.dayType === "white" ||
      info.dayType === "blue" ||
      info.dayType === "erd" ||
      info.dayType === "psd"
    ) {
      const live = bellStatusForDay(info.dayType, info.exam);
      if (live) return live;
      if (info.dayType === "erd" || info.dayType === "psd") {
        if (info.notes) return info.notes;
        return info.status || "Special schedule";
      }
    }

    return info.status || "No bell schedule";
  }

  /**
   * @param {LunchPhaseRow} phase
   * @param {string} [buildings]
   */
  function lunchPhaseMarkup(phase, buildings) {
    const activeClass = phase.active ? "is-active" : "";
    const kindClass = phase.kind === "lunch" ? "is-lunch" : "is-class";
    const buildingsBit =
      phase.kind === "lunch" && buildings
        ? `<span class="lunch-phase-buildings">${escapeHtml(buildings)}</span>`
        : "";

    return `<div class="lunch-phase ${kindClass} ${activeClass}">
      <div class="lunch-phase-main">
        <span class="lunch-phase-label">${escapeHtml(phase.label)}</span>
        <span class="lunch-phase-times">${escapeHtml(phase.times)}</span>
      </div>
      ${buildingsBit}
    </div>`;
  }

  /** @param {LunchGroupStatus} group */
  function lunchGroupMarkup(group) {
    const hasActive = Boolean(group.activePhase);
    const activeClass = hasActive
      ? `is-live is-${group.activePhase}`
      : "is-idle";

    const lunchBit = group.lunch
      ? lunchPhaseMarkup(group.lunch, group.buildings)
      : "";
    const classBit = group.classPhase
      ? lunchPhaseMarkup(group.classPhase)
      : "";

    const body =
      group.order === "class-first"
        ? `${classBit}${lunchBit}`
        : `${lunchBit}${classBit}`;

    return `<div class="lunch-group ${activeClass}">
      <div class="lunch-group-body">${body}</div>
    </div>`;
  }

  function renderDayBubble(info) {
    if (!dayBubble) return;

    dayBubble.dataset.tone = info.tone;
    if (info.exam) dayBubble.dataset.exam = "true";
    else delete dayBubble.dataset.exam;

    dayBubble.innerHTML = `
      <p class="bubble-eyebrow">${escapeHtml(info.whenLabel)}</p>
      <p class="bubble-letter" aria-hidden="true">${escapeHtml(info.letter)}</p>
      <p class="bubble-title">${escapeHtml(info.title)}</p>
      <p class="bubble-detail">${escapeHtml(info.detail)}</p>
      <span class="bubble-open-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.7"/>
          <path d="M3.5 9.5h17" stroke="currentColor" stroke-width="1.7"/>
          <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M14.5 14.25 16.75 16.5 20 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;
    dayBubble.setAttribute(
      "aria-label",
      `${info.whenLabel}: ${info.title}. ${info.detail}. Open school calendar`
    );
  }

  function renderClockBubble(parts) {
    if (!clockBubble) return;

    const greeting = greetingForHour();

    clockBubble.innerHTML = `
      <p class="bubble-eyebrow">${escapeHtml(greeting)}</p>
      <p class="clock-time">
        <span class="clock-hm">${escapeHtml(parts.hour)}:${escapeHtml(parts.minute)}</span><span class="clock-sec">:${escapeHtml(parts.second)}</span>
        <span class="clock-ampm">${escapeHtml(parts.dayPeriod)}</span>
      </p>
      <p class="bubble-title clock-date">${escapeHtml(parts.weekday)}</p>
      <p class="bubble-detail">${escapeHtml(parts.monthLong)} ${escapeHtml(parts.dayNum)}, ${escapeHtml(parts.year)} · ${escapeHtml(parts.timeZoneName)}</p>
    `;
    clockBubble.setAttribute(
      "aria-label",
      `${greeting}. ${parts.hour}:${parts.minute} ${parts.dayPeriod}, ${parts.weekday}, ${parts.monthLong} ${parts.dayNum}, ${parts.year}, ${parts.timeZoneName}`
    );
  }

  function greetingForHour() {
    const hour24 = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );

    if (hour24 < 12) return "Good morning";
    if (hour24 < 17) return "Good afternoon";
    return "Good evening";
  }

  /**
   * @param {string | { kind: "lunch-groups", prefix: string, groups: LunchGroupStatus[] }} text
   */
  function renderStatus(text) {
    if (!statusLine) return;
    const label = statusLine.querySelector(".status-text");
    const isLunchGroups =
      text &&
      typeof text === "object" &&
      text.kind === "lunch-groups" &&
      Array.isArray(text.groups);

    let spoken = "";

    if (label) {
      if (isLunchGroups) {
        const prefixBit = text.prefix
          ? `<p class="lunch-groups-prefix">${escapeHtml(text.prefix)}</p>`
          : "";
        label.innerHTML = `<div class="lunch-groups">${prefixBit}${text.groups
          .map(lunchGroupMarkup)
          .join("")}</div>`;
        spoken = text.groups
          .map((g) => {
            const lunchPart = g.lunch
              ? `${g.lunch.label} ${g.lunch.times}`
              : "";
            const classPart = g.classPhase
              ? `${g.classPhase.label} ${g.classPhase.times}`
              : "";
            const ordered =
              g.order === "class-first"
                ? [classPart, lunchPart]
                : [lunchPart, classPart];
            return `Lunch ${g.track}: ${ordered.filter(Boolean).join(", ")}${
              g.buildings ? `; ${g.buildings}` : ""
            }`;
          })
          .join(". ");
      } else {
        const line = typeof text === "string" ? text : "No bell schedule";
        label.textContent = line || "No bell schedule";
        spoken = line || "No bell schedule";
      }
    }

    statusLine.setAttribute(
      "aria-label",
      `${spoken}. Open full bell schedule`
    );
    statusLine.classList.toggle("is-lunch-split", Boolean(isLunchGroups));
    statusLine.classList.remove("is-multiline");
  }

  function periodShort(label) {
    const m = String(label || "").match(/(\d+)/);
    return m ? `P${m[1]}` : label || "";
  }

  function timeRange(startMin, endMin) {
    if (endMin <= startMin) return formatMinutes(startMin);
    return `${formatMinutes(startMin)} – ${formatMinutes(endMin)}`;
  }

  function isRangeActive(startMin, endMin, now) {
    if (endMin <= startMin) return now === startMin;
    return now >= startMin && now < endMin;
  }

  /**
   * ERD / PSD single-column schedule section.
   * @param {string} dayType
   * @param {string} title
   * @param {string} blurb
   * @param {number} now
   * @param {boolean} highlightLive
   */
  function buildSpecialDaySection(dayType, title, blurb, now, highlightLive) {
    const rows = bellByDayType.get(dayType) || [];
    if (!rows.length) return "";

    const items = rows
      .map((r) => {
        const isBuses = r.period === "buses" || /buses/i.test(r.label);
        const isLunch =
          !isBuses &&
          (r.period === "lunch" || /lunch|grab/i.test(r.label));
        const active =
          highlightLive && isRangeActive(r.startMin, r.endMin, now);
        const kindClass = isBuses
          ? "is-buses"
          : isLunch
            ? "is-grab-lunch"
            : "";
        const currentClass = active ? "is-current" : "";
        const nowBadge = active
          ? `<span class="sched-now-badge">Now</span>`
          : "";

        return `<article class="sched-block ${kindClass} ${currentClass}" data-sched="${escapeHtml(
          `${dayType}-${r.block}`
        )}">
          <div class="sched-block-top">
            <span class="sched-block-label">${escapeHtml(r.label)}</span>
            ${nowBadge}
          </div>
          <p class="sched-time">${escapeHtml(
            timeRange(r.startMin, r.endMin)
          )}</p>
        </article>`;
      })
      .join("");

    return `<section class="sched-section sched-section-${escapeHtml(
      dayType
    )}" aria-label="${escapeHtml(title)}">
      <div class="sched-section-head">
        <h3 class="sched-section-title">${escapeHtml(title)}</h3>
        <p class="sched-section-blurb">${escapeHtml(blurb)}</p>
      </div>
      ${items}
    </section>`;
  }

  /**
   * Build overview: White/Blue paired blocks, then ERD and PSD sections.
   * @returns {{ html: string, highlightLive: boolean }}
   */
  function buildBellOverviewMarkup() {
    const white = bellByDayType.get("white") || [];
    const blue = bellByDayType.get("blue") || [];
    const erd = bellByDayType.get("erd") || [];
    const psd = bellByDayType.get("psd") || [];

    if (!white.length && !blue.length && !erd.length && !psd.length) {
      return {
        html: `<p class="sched-empty">Bell schedule unavailable</p>`,
        highlightLive: false,
      };
    }

    const now = easternMinutesNow();
    const liveDay = currentDayInfo?.dayType || null;
    const highlightWhiteBlue = liveDay === "white" || liveDay === "blue";
    const highlightErd = liveDay === "erd";
    const highlightPsd = liveDay === "psd";
    const highlightLive =
      highlightWhiteBlue || highlightErd || highlightPsd;

    /** @param {string} block */
    function simpleBlockRows(block) {
      const w = white.find((r) => r.block === block && !r.lunchTrack);
      const b = blue.find((r) => r.block === block && !r.lunchTrack);
      return { w, b };
    }

    /** @param {"A"|"B"} track */
    function lunchTrackRows(track) {
      const wRows = white.filter((r) => r.lunchTrack === track);
      const bRows = blue.filter((r) => r.lunchTrack === track);
      return {
        buildings: (wRows[0] || bRows[0])?.buildings || "",
        wLunch: wRows.find((r) => r.period === "lunch"),
        wClass: wRows.find((r) => r.period !== "lunch"),
        bLunch: bRows.find((r) => r.period === "lunch"),
        bClass: bRows.find((r) => r.period !== "lunch"),
      };
    }

    function periodPairMarkup(whiteLabel, blueLabel) {
      const wShort = periodShort(whiteLabel);
      const bShort = periodShort(blueLabel);
      return `<div class="sched-periods">
        <span class="sched-period">${escapeHtml(wShort)}</span>
        <span class="sched-period-tag is-white" title="White Day">W</span>
        <span class="sched-period-sep">/</span>
        <span class="sched-period">${escapeHtml(bShort)}</span>
        <span class="sched-period-tag is-blue" title="Blue Day">B</span>
      </div>`;
    }

    /**
     * @param {{
     *   key: string,
     *   label: string,
     *   whiteLabel: string,
     *   blueLabel: string,
     *   startMin: number,
     *   endMin: number,
     *   isLunch?: boolean,
     *   buildings?: string,
     *   phases?: { kind: "lunch"|"class", label: string, startMin: number, endMin: number }[]
     * }} section
     */
    function sectionMarkup(section) {
      const active = highlightWhiteBlue
        ? section.phases
          ? section.phases.some((p) =>
              isRangeActive(p.startMin, p.endMin, now)
            )
          : isRangeActive(section.startMin, section.endMin, now)
        : false;
      const lunchClass = section.isLunch ? "is-lunch" : "";
      const currentClass = active ? "is-current" : "";
      const nowBadge = active
        ? `<span class="sched-now-badge">Now</span>`
        : "";

      let body = "";
      if (section.phases && section.phases.length) {
        body = `<div class="sched-lunch-phases">${section.phases
          .map((p) => {
            const phaseActive =
              highlightWhiteBlue && isRangeActive(p.startMin, p.endMin, now);
            const kindClass = p.kind === "lunch" ? "is-lunch" : "is-class";
            const activeClass = phaseActive ? "is-active" : "";
            return `<div class="sched-phase ${kindClass} ${activeClass}">
              <span class="sched-phase-label">${escapeHtml(p.label)}</span>
              <span class="sched-phase-time">${escapeHtml(
                timeRange(p.startMin, p.endMin)
              )}</span>
            </div>`;
          })
          .join("")}</div>`;
      } else {
        body = `<p class="sched-time">${escapeHtml(
          timeRange(section.startMin, section.endMin)
        )}</p>`;
      }

      const buildingsBit = section.buildings
        ? `<p class="sched-buildings">${escapeHtml(section.buildings)}</p>`
        : "";

      return `<article class="sched-block ${lunchClass} ${currentClass}" data-sched="${escapeHtml(
        section.key
      )}">
        <div class="sched-block-top">
          <span class="sched-block-label">${escapeHtml(section.label)}</span>
          ${nowBadge}
        </div>
        ${periodPairMarkup(section.whiteLabel, section.blueLabel)}
        ${buildingsBit}
        ${body}
      </article>`;
    }

    const sections = [];

    if (white.length || blue.length) {
      const b1 = simpleBlockRows("1");
      const b2 = simpleBlockRows("2");
      const b4 = simpleBlockRows("4");
      const lunchA = lunchTrackRows("A");
      const lunchB = lunchTrackRows("B");

      if (b1.w || b1.b) {
        const row = b1.w || b1.b;
        sections.push(
          sectionMarkup({
            key: "block-1",
            label: "Block 1",
            whiteLabel: b1.w?.label || "Period 1",
            blueLabel: b1.b?.label || "Period 5",
            startMin: row.startMin,
            endMin: row.endMin,
          })
        );
      }

      if (b2.w || b2.b) {
        const row = b2.w || b2.b;
        sections.push(
          sectionMarkup({
            key: "block-2",
            label: "Block 2",
            whiteLabel: b2.w?.label || "Period 2",
            blueLabel: b2.b?.label || "Period 6",
            startMin: row.startMin,
            endMin: row.endMin,
          })
        );
      }

      if (lunchA.wLunch || lunchA.wClass || lunchA.bLunch || lunchA.bClass) {
        /** @type {{ kind: "lunch"|"class", label: string, startMin: number, endMin: number }[]} */
        const phases = [];
        const lunchRow = lunchA.wLunch || lunchA.bLunch;
        const classRow = lunchA.wClass || lunchA.bClass;
        if (lunchRow) {
          phases.push({
            kind: "lunch",
            label: "Lunch",
            startMin: lunchRow.startMin,
            endMin: lunchRow.endMin,
          });
        }
        if (classRow) {
          phases.push({
            kind: "class",
            label: `${periodShort(lunchA.wClass?.label || "Period 3")} / ${periodShort(
              lunchA.bClass?.label || "Period 7"
            )}`,
            startMin: classRow.startMin,
            endMin: classRow.endMin,
          });
        }
        const startMin = Math.min(...phases.map((p) => p.startMin));
        const endMin = Math.max(...phases.map((p) => p.endMin));
        sections.push(
          sectionMarkup({
            key: "lunch-a",
            label: "Lunch A group",
            whiteLabel: lunchA.wClass?.label || "Period 3",
            blueLabel: lunchA.bClass?.label || "Period 7",
            startMin,
            endMin,
            isLunch: true,
            buildings: lunchA.buildings,
            phases,
          })
        );
      }

      if (lunchB.wLunch || lunchB.wClass || lunchB.bLunch || lunchB.bClass) {
        /** @type {{ kind: "lunch"|"class", label: string, startMin: number, endMin: number }[]} */
        const phases = [];
        const lunchRow = lunchB.wLunch || lunchB.bLunch;
        const classRow = lunchB.wClass || lunchB.bClass;
        if (classRow) {
          phases.push({
            kind: "class",
            label: `${periodShort(lunchB.wClass?.label || "Period 3")} / ${periodShort(
              lunchB.bClass?.label || "Period 7"
            )}`,
            startMin: classRow.startMin,
            endMin: classRow.endMin,
          });
        }
        if (lunchRow) {
          phases.push({
            kind: "lunch",
            label: "Lunch",
            startMin: lunchRow.startMin,
            endMin: lunchRow.endMin,
          });
        }
        const startMin = Math.min(...phases.map((p) => p.startMin));
        const endMin = Math.max(...phases.map((p) => p.endMin));
        sections.push(
          sectionMarkup({
            key: "lunch-b",
            label: "Lunch B group",
            whiteLabel: lunchB.wClass?.label || "Period 3",
            blueLabel: lunchB.bClass?.label || "Period 7",
            startMin,
            endMin,
            isLunch: true,
            buildings: lunchB.buildings,
            phases,
          })
        );
      }

      if (b4.w || b4.b) {
        const row = b4.w || b4.b;
        sections.push(
          sectionMarkup({
            key: "block-4",
            label: "Block 4",
            whiteLabel: b4.w?.label || "Period 4",
            blueLabel: b4.b?.label || "Period 8",
            startMin: row.startMin,
            endMin: row.endMin,
          })
        );
      }
    }

    const legend =
      white.length || blue.length
        ? `<div class="sched-legend" aria-hidden="true">
      <span class="sched-legend-chip"><span class="sched-legend-swatch is-white"></span> White</span>
      <span class="sched-legend-chip"><span class="sched-legend-swatch is-blue"></span> Blue</span>
    </div>`
        : "";

    const regularBit =
      sections.length > 0
        ? `<section class="sched-section sched-section-regular" aria-label="Regular White and Blue schedule">
      <div class="sched-section-head">
        <h3 class="sched-section-title">Regular Day</h3>
        <p class="sched-section-blurb">White &amp; Blue · 92-minute blocks</p>
      </div>
      ${legend}${sections.join("")}
    </section>`
        : "";

    const erdBit = buildSpecialDaySection(
      "erd",
      "Early Release (ERD)",
      "Same times every ERD · see calendar for dates",
      now,
      highlightErd
    );
    const psdBit = buildSpecialDaySection(
      "psd",
      "Professional Study (PSD)",
      "Same times every PSD · see calendar for dates",
      now,
      highlightPsd
    );

    return {
      html: `${regularBit}${erdBit}${psdBit}`,
      highlightLive,
    };
  }

  function renderBellModalBody() {
    if (!bellModalBody) return;
    const { html } = buildBellOverviewMarkup();
    bellModalBody.innerHTML = html;
  }

  function getModalFocusable() {
    if (!bellModalPanel) return [];
    return [
      ...bellModalPanel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter(
      (el) =>
        el instanceof HTMLElement &&
        !el.hasAttribute("disabled") &&
        el.offsetParent !== null
    );
  }

  function openBellModal() {
    if (!bellModal || bellModalOpen) return;
    bellModalOpen = true;
    bellModalReturnFocus = document.activeElement;
    lastModalHighlightMin = easternMinutesNow();
    renderBellModalBody();
    bellModal.classList.add("is-open");
    bellModal.setAttribute("aria-hidden", "false");
    statusLine?.setAttribute("aria-expanded", "true");
    document.body.classList.add("modal-open");

    // Defer focus until after paint so the dialog is visible to AT.
    window.setTimeout(() => {
      if (!bellModalOpen) return;
      (bellModalClose || bellModalPanel)?.focus();
    }, 30);
  }

  function closeBellModal() {
    if (!bellModal || !bellModalOpen) return;
    bellModalOpen = false;
    bellModal.classList.remove("is-open");
    bellModal.setAttribute("aria-hidden", "true");
    statusLine?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("modal-open");

    const returnTo = bellModalReturnFocus;
    bellModalReturnFocus = null;
    if (returnTo instanceof HTMLElement) {
      returnTo.focus();
    } else {
      statusLine?.focus();
    }
  }

  function onBellModalKeydown(event) {
    if (!bellModalOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeBellModal();
      return;
    }

    if (event.key !== "Tab" || !bellModalPanel) return;

    const focusable = getModalFocusable();
    if (!focusable.length) {
      event.preventDefault();
      bellModalPanel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !bellModalPanel.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function wireBellModal() {
    if (!statusLine || !bellModal) return;

    statusLine.addEventListener("click", () => openBellModal());
    statusLine.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openBellModal();
      }
    });

    bellModal.querySelectorAll("[data-bell-close]").forEach((el) => {
      el.addEventListener("click", () => closeBellModal());
    });

    document.addEventListener("keydown", onBellModalKeydown);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function refreshDay() {
    // Avoid flashing "Not on the calendar" before the CSV map is ready.
    if (!calendarReady) return;

    const parts = easternParts();
    const todayEntry = calendarByDate.get(parts.isoDate) || null;
    // Bell / lunch / period status always tracks *today*.
    const todayInfo = describeDay(todayEntry, parts.weekday, "Today");
    currentDayInfo = todayInfo;

    // Day-type bubble flips to tomorrow at/after 4:00 PM Eastern.
    if (dayBubbleShowsTomorrow()) {
      const tomorrowParts = easternPartsForOffset(1);
      const tomorrowEntry = calendarByDate.get(tomorrowParts.isoDate) || null;
      renderDayBubble(
        describeDay(tomorrowEntry, tomorrowParts.weekday, "Tomorrow")
      );
    } else {
      renderDayBubble(todayInfo);
    }
    refreshBellStatus();
  }

  function refreshBellStatus() {
    if (!currentDayInfo) {
      renderStatus("Loading schedule…");
      return;
    }
    renderStatus(resolveStatusText(currentDayInfo));
    if (bellModalOpen) {
      const nowMin = easternMinutesNow();
      if (nowMin !== lastModalHighlightMin) {
        lastModalHighlightMin = nowMin;
        renderBellModalBody();
      }
    }
  }

  function tickClock() {
    const parts = easternParts();
    renderClockBubble(parts);
    // Keep bell status in sync at period boundaries without rebuilding the day bubble.
    refreshBellStatus();
  }

  async function loadData() {
    try {
      const [calRes, bellRes] = await Promise.all([
        fetch(CALENDAR_CSV_URL, { cache: "no-cache" }),
        fetch(BELL_CSV_URL, { cache: "no-cache" }),
      ]);

      if (!calRes.ok) throw new Error(`Calendar CSV ${calRes.status}`);

      const calText = await calRes.text();
      const calRows = loadCalendarRows(calText);
      calendarByDate = new Map(calRows.map((r) => [r.date, r]));
      calendarReady = true;

      if (bellRes.ok) {
        const bellText = await bellRes.text();
        bellByDayType = groupBellByDayType(loadBellRows(bellText));
      } else {
        console.warn("Bell schedule CSV unavailable:", bellRes.status);
      }

      refreshDay();
      if (bellModalOpen) renderBellModalBody();
    } catch (err) {
      console.error("Schedule load failed:", err);
      calendarReady = false;
      currentDayInfo = {
        tone: "error",
        exam: false,
        dayType: null,
        notes: "",
        status: "Calendar unavailable",
      };
      renderDayBubble({
        whenLabel: dayBubbleShowsTomorrow() ? "Tomorrow" : "Today",
        letter: "?",
        title: "Calendar unavailable",
        detail: "Check back shortly",
        tone: "error",
        exam: false,
      });
      renderStatus("Calendar unavailable");
    }
  }

  function start() {
    wireBellModal();
    tickClock();
    loadData();

    const clockTimer = setInterval(tickClock, 1000);
    const dayTimer = setInterval(refreshDay, 60_000);

    // Re-check day shortly after midnight Eastern
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        tickClock();
        refreshDay();
      }
    });

    window.addEventListener("beforeunload", () => {
      clearInterval(clockTimer);
      clearInterval(dayTimer);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
