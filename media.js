(() => {
  const TZ = "America/New_York";
  const CAL_URL = "data/flhs_calendar_2026_2027.csv";
  const BELL_URL = "data/flhs_bell_schedule.csv";
  const MEDIA_URL = "data/media_center.json";

  const statusEl = document.getElementById("status-board");
  const statusKicker = document.getElementById("status-kicker");
  const statusTitle = document.getElementById("status-title");
  const statusDetail = document.getElementById("status-detail");
  const clockEl = document.getElementById("live-clock");
  const windowsEl = document.getElementById("windows");
  const doorBoardEl = document.getElementById("door-board");
  const doorListEl = document.getElementById("door-list");
  const locationHint = document.getElementById("location-hint");
  const teacherForm = document.getElementById("teacher-form");
  const teacherNote = document.getElementById("teacher-note");

  /** @type {any} */
  let mediaCfg = null;
  /** @type {Map<string, { date: string, dayType: string, notes: string }>} */
  let calendarByDate = new Map();
  /** @type {Map<string, Array<{ period: string, label: string, startMin: number, endMin: number, lunchTrack: string }>>} */
  let bellByDayType = new Map();

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
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value])
    );
    return {
      isoDate: toIsoDateKey(`${parts.year}-${parts.month}-${parts.day}`),
      weekday: parts.weekday,
      clock: `${parts.hour}:${parts.minute} ${parts.dayPeriod}`,
    };
  }

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
    return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  }

  function parseHHMM(s) {
    const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function formatRange(startMin, endMin) {
    const fmt = (min) => {
      let h = Math.floor(min / 60);
      const m = min % 60;
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, "0")} ${ap}`;
    };
    return `${fmt(startMin)} – ${fmt(endMin)}`;
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQ = !inQ;
          continue;
        }
        if (ch === "," && !inQ) {
          cols.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      cols.push(cur);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] || "").trim();
      });
      return row;
    });
  }

  function classifyDayType(row) {
    if (!row) return "unknown";
    const type = String(row.day_type || row.dayType || "").toLowerCase();
    const notes = String(row.notes || row.label || "").toLowerCase();
    if (type.includes("white")) return "white";
    if (type.includes("blue")) return "blue";
    if (type.includes("erd") || notes.includes("early release")) return "erd";
    if (type.includes("psd") || notes.includes("professional")) return "psd";
    if (
      type.includes("closed") ||
      type.includes("holiday") ||
      type.includes("planning") ||
      /no school|holiday|closed|planning/.test(notes)
    ) {
      return "closed";
    }
    return type || "unknown";
  }

  function loadBell(rows) {
    const map = new Map();
    rows.forEach((r) => {
      const dayType = String(r.day_type || "").toLowerCase();
      if (!dayType) return;
      const startMin = parseHHMM(r.start_time);
      const endMin = parseHHMM(r.end_time);
      if (startMin == null || endMin == null) return;
      const list = map.get(dayType) || [];
      list.push({
        period: r.period,
        label: r.label,
        startMin,
        endMin,
        lunchTrack: r.lunch_track || "",
      });
      map.set(dayType, list);
    });
    bellByDayType = map;
  }

  function lunchWindows(dayType) {
    const rows = bellByDayType.get(dayType) || [];
    return rows
      .filter((r) => r.period === "lunch" && (r.lunchTrack === "A" || r.lunchTrack === "B"))
      .map((r) => ({
        id: `lunch-${r.lunchTrack.toLowerCase()}`,
        label: `Lunch ${r.lunchTrack}`,
        startMin: r.startMin,
        endMin: r.endMin,
        blurb: mediaCfg?.walkIn?.lunchBlurb || "Walk in during your lunch",
        kind: "walkin",
      }));
  }

  function reservationFor(isoDate, nowMin, dayType) {
    const list = Array.isArray(mediaCfg?.reservations) ? mediaCfg.reservations : [];
    const today = list.filter((r) => toIsoDateKey(r.date) === isoDate);
    if (!today.length) return null;

    const bell = bellByDayType.get(dayType) || [];
    for (const res of today) {
      const periodKey = String(res.period || "").toLowerCase();
      const match = bell.find((b) => {
        const p = String(b.period || "").toLowerCase();
        const lab = String(b.label || "").toLowerCase();
        return (
          p === periodKey ||
          lab.includes(`period ${periodKey}`) ||
          p.includes(periodKey)
        );
      });
      if (match && nowMin >= match.startMin && nowMin < match.endMin) {
        return { ...res, window: match };
      }
    }
    return null;
  }

  function buildWindows(dayType) {
    const before = mediaCfg.walkIn.beforeSchool;
    const after = mediaCfg.walkIn.afterSchool;
    const study = mediaCfg.studyHall || {};
    const during = mediaCfg.duringClass || {};
    const windows = [
      {
        id: before.id,
        label: before.label,
        startMin: parseHHMM(before.start),
        endMin: parseHHMM(before.end),
        blurb: before.blurb,
        kind: "walkin",
        icon: "sun",
      },
      ...lunchWindows(dayType).map((w) => ({ ...w, icon: "lunch" })),
      {
        id: "study",
        label: study.label || "Study hall",
        startMin: null,
        endMin: null,
        blurb: study.blurb || "Academic purposes only · teacher pass required",
        kind: "pass",
        icon: "pass",
      },
      {
        id: "class",
        label: during.label || "During class periods",
        startMin: null,
        endMin: null,
        blurb: during.blurb || "Closed — no walk-ins during class",
        kind: "closed",
        icon: "door",
      },
      after?.closed
        ? {
            id: after.id,
            label: after.label,
            startMin: null,
            endMin: null,
            blurb: after.blurb || "Closed after school",
            kind: "closed",
            icon: "moon",
          }
        : {
            id: after.id,
            label: after.label,
            startMin: parseHHMM(after.start),
            endMin: parseHHMM(after.end),
            blurb: after.blurb,
            kind: "walkin",
            icon: "moon",
          },
    ];
    return windows.filter(
      (w) => w.kind !== "walkin" || (w.startMin != null && w.endMin != null)
    );
  }

  function computeStatus(dayType, nowMin, isoDate) {
    if (dayType === "closed") {
      return {
        tone: "closed",
        kicker: "No school today",
        title: "Media Center closed",
        detail: "Check back on the next school day.",
      };
    }
    if (dayType === "unknown") {
      return {
        tone: "check",
        kicker: "Weekend / calendar",
        title: "Not a school walk-in day",
        detail: "Walk-in hours are for school days.",
      };
    }

    const activeRes = reservationFor(isoDate, nowMin, dayType);
    if (activeRes) {
      const label = activeRes.label || "Class reserved";
      return {
        tone: "reserved",
        kicker: "Reserved right now",
        title: "Closed for walk-ins",
        detail: `${label}. Study hall still needs a teacher pass for academic work.`,
      };
    }

    const windows = buildWindows(dayType).filter((w) => w.kind === "walkin");
    const openNow = windows.find((w) => nowMin >= w.startMin && nowMin < w.endMin);
    if (openNow) {
      return {
        tone: "open",
        kicker: "Walk-in open",
        title: "Yes — you can go",
        detail: `${openNow.label} · ${formatRange(openNow.startMin, openNow.endMin)}`,
        activeId: openNow.id,
      };
    }

    const next = windows
      .filter((w) => w.startMin > nowMin)
      .sort((a, b) => a.startMin - b.startMin)[0];
    if (next) {
      return {
        tone: "soon",
        kicker: "Not walk-in right now",
        title: "Come back soon",
        detail: `Next open: ${next.label} · ${formatRange(next.startMin, next.endMin)}. Study hall needs a teacher pass.`,
        activeId: null,
      };
    }

    const firstBell = (bellByDayType.get(dayType) || []).find((r) => r.period !== "lunch");
    const lastBell = [...(bellByDayType.get(dayType) || [])].sort(
      (a, b) => b.endMin - a.endMin
    )[0];
    if (
      firstBell &&
      lastBell &&
      nowMin >= firstBell.startMin &&
      nowMin < lastBell.endMin
    ) {
      const studyBlurb =
        mediaCfg.studyHall?.blurb ||
        "Academic purposes only · bring a real pass from your teacher";
      return {
        tone: "closed",
        kicker: "During class",
        title: "Closed for walk-ins",
        detail: `Class periods are closed. Study hall only: ${studyBlurb}`,
        activeId: "class",
      };
    }

    return {
      tone: "closed",
      kicker: "Outside walk-in hours",
      title: "Closed for walk-ins",
      detail: "Come back before school or at lunch. After school is closed for now.",
    };
  }

  function iconSvg(kind) {
    if (kind === "sun") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
    }
    if (kind === "moon") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 16.5 3.5Z" fill="currentColor" opacity="0.9"/></svg>`;
    }
    if (kind === "lunch") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3v10M5 5v6M9 5v6M12 8c0-3 2-5 4.5-5S21 5 21 8v13h-4V8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 21h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
    }
    if (kind === "pass") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="16.5" cy="14" r="1.4" fill="currentColor"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.7"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/></svg>`;
  }

  function renderWindows(dayType, nowMin, activeId) {
    if (!windowsEl) return;
    const windows = buildWindows(dayType);
    windowsEl.innerHTML = windows
      .map((w) => {
        const isLive =
          w.id === activeId ||
          (w.kind === "walkin" &&
            w.startMin != null &&
            nowMin >= w.startMin &&
            nowMin < w.endMin);
        const time =
          w.kind === "walkin"
            ? formatRange(w.startMin, w.endMin)
            : w.kind === "pass"
              ? "Pass required"
              : w.kind === "closed"
                ? "Closed"
                : "Look at door";
        return `<article class="window-card ${w.kind}${isLive ? " is-live" : ""}" data-id="${w.id}">
          <div class="window-icon">${iconSvg(w.icon)}</div>
          <div class="window-copy">
            <strong>${escapeHtml(w.label)}</strong>
            <span class="window-time">${escapeHtml(time)}</span>
            <span class="window-blurb">${escapeHtml(w.blurb)}</span>
          </div>
          ${isLive ? '<span class="live-tag">Now</span>' : ""}
        </article>`;
      })
      .join("");
  }

  function renderDoorBoard(isoDate) {
    const list = Array.isArray(mediaCfg?.reservations) ? mediaCfg.reservations : [];
    const upcoming = list
      .filter((r) => toIsoDateKey(r.date) >= isoDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 8);

    if (!doorBoardEl || !doorListEl) return;
    if (!upcoming.length) {
      doorBoardEl.hidden = true;
      return;
    }
    doorBoardEl.hidden = false;
    doorListEl.innerHTML = upcoming
      .map((r) => {
        const status = String(r.status || "reserved");
        return `<li>
          <span class="door-chip ${status === "booked" ? "is-booked" : "is-reserved"}">${escapeHtml(status)}</span>
          <span><b>${escapeHtml(r.date)}</b> · Period ${escapeHtml(String(r.period || "?"))} — ${escapeHtml(r.label || "Class visit")}</span>
        </li>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function refresh() {
    if (!mediaCfg) return;
    const parts = easternParts();
    const nowMin = easternMinutesNow();
    const cal = calendarByDate.get(parts.isoDate);
    const dayType = classifyDayType(cal);

    if (clockEl) {
      clockEl.textContent = `${parts.weekday} · ${parts.clock}`;
    }

    const status = computeStatus(dayType, nowMin, parts.isoDate);
    if (statusEl) {
      statusEl.dataset.tone = status.tone;
    }
    if (statusKicker) statusKicker.textContent = status.kicker;
    if (statusTitle) statusTitle.textContent = status.title;
    if (statusDetail) statusDetail.textContent = status.detail;

    const windowsDay =
      dayType === "white" || dayType === "blue" || dayType === "erd" || dayType === "psd"
        ? dayType
        : "white";
    renderWindows(windowsDay, nowMin, status.activeId || null);
    renderDoorBoard(parts.isoDate);
  }

  function setupTeacherForm() {
    const wrap = document.querySelector(".teacher-wrap");
    if (wrap && mediaCfg.teacherRequest?.enabled !== true) {
      wrap.hidden = true;
      return;
    }
    if (wrap) wrap.hidden = false;
    if (!teacherForm) return;
    const email = (mediaCfg.contactEmail || "").trim();
    if (!email) {
      if (teacherNote) {
        teacherNote.textContent =
          "Ask Media Center staff to reserve a class (at least 2 school days ahead when you can). Add a contact email in data/media_center.json to enable one-tap email requests.";
      }
      teacherForm.querySelectorAll("input, select, textarea, button[type=submit]").forEach((el) => {
        if (el instanceof HTMLElement && el.id !== "teacher-toggle") {
          el.disabled = true;
        }
      });
      const submit = teacherForm.querySelector('button[type="submit"]');
      if (submit) submit.hidden = true;
      return;
    }

    teacherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = /** @type {HTMLInputElement} */ (document.getElementById("t-name")).value.trim();
      const subject = /** @type {HTMLInputElement} */ (document.getElementById("t-subject")).value.trim();
      const when = /** @type {HTMLInputElement} */ (document.getElementById("t-when")).value.trim();
      const purpose = /** @type {HTMLSelectElement} */ (document.getElementById("t-purpose")).value;
      const notes = /** @type {HTMLTextAreaElement} */ (document.getElementById("t-notes")).value.trim();
      if (!name || !subject || !when) {
        alert("Please add your name, class, and preferred day/period.");
        return;
      }
      const lines = [
        `Requested by: ${name}`,
        `Class/subject: ${subject}`,
        `Preferred day/period: ${when}`,
        `Purpose: ${purpose}`,
        notes ? `Notes: ${notes}` : "",
        "",
        "(Sent from FLHS Help · Media Center)",
      ].filter(Boolean);
      const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        `Media Center request — ${when}`
      )}&body=${encodeURIComponent(lines.join("\n"))}`;
      window.location.href = mailto;
    });
  }

  async function init() {
    try {
      const [mediaRes, calRes, bellRes] = await Promise.all([
        fetch(MEDIA_URL, { cache: "no-cache" }),
        fetch(CAL_URL, { cache: "no-cache" }),
        fetch(BELL_URL, { cache: "no-cache" }),
      ]);
      mediaCfg = await mediaRes.json();
      if (locationHint && mediaCfg.locationHint) {
        locationHint.textContent = mediaCfg.locationHint;
      }
      const purposeSelect = document.getElementById("t-purpose");
      if (purposeSelect && Array.isArray(mediaCfg.teacherRequest?.purposes)) {
        purposeSelect.innerHTML = mediaCfg.teacherRequest.purposes
          .map((p) => `<option>${escapeHtml(p)}</option>`)
          .join("");
      }

      const calRows = parseCsv(await calRes.text());
      calendarByDate = new Map(
        calRows.map((r) => {
          const key = toIsoDateKey(r.date || r.Date);
          return [
            key,
            {
              date: key,
              dayType: r.day_type || r.dayType || "",
              notes: r.notes || r.label || "",
            },
          ];
        })
      );
      loadBell(parseCsv(await bellRes.text()));
      setupTeacherForm();
      refresh();
      setInterval(refresh, 30000);
    } catch (err) {
      if (statusTitle) statusTitle.textContent = "Couldn’t load hours";
      if (statusDetail) {
        statusDetail.textContent = "Refresh the page, or check the door sign at the Media Center.";
      }
      console.error(err);
    }
  }

  const toggle = document.getElementById("teacher-toggle");
  const teacherPanel = document.getElementById("teacher-panel");
  toggle?.addEventListener("click", () => {
    const open = teacherPanel?.hidden === false;
    if (teacherPanel) teacherPanel.hidden = open;
    toggle.setAttribute("aria-expanded", open ? "false" : "true");
  });

  init();
})();
