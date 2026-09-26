/** Shared Media Center walk-in status (home bubble + media page). */
(() => {
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

  /**
   * @param {any} mediaCfg
   * @param {Map<string, Array<{ period: string, label: string, startMin: number, endMin: number, lunchTrack: string }>>} bellByDayType
   */
  function createEngine(mediaCfg, bellByDayType) {
    function lunchWindows(dayType) {
      const rows = bellByDayType.get(dayType) || [];
      return rows
        .filter((r) => {
          const track = String(r.lunchTrack || "").toUpperCase();
          return String(r.period || "").toLowerCase() === "lunch" && (track === "A" || track === "B");
        })
        .map((r) => ({
          id: `lunch-${String(r.lunchTrack).toLowerCase()}`,
          label: `Lunch ${String(r.lunchTrack).toUpperCase()}`,
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
          return p === periodKey || lab.includes(`period ${periodKey}`) || p.includes(periodKey);
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
      return windows.filter((w) => w.kind !== "walkin" || (w.startMin != null && w.endMin != null));
    }

    function computeStatus(dayType, nowMin, isoDate) {
      if (dayType === "closed") {
        return {
          tone: "closed",
          answer: "No",
          kicker: "No school today",
          title: "Media Center is closed",
          detail: "Come back on the next school day.",
        };
      }
      if (dayType === "unknown") {
        return {
          tone: "check",
          answer: "Check",
          kicker: "Not a school day",
          title: "Walk-ins are for school days",
          detail: "Try again Monday–Friday when school is open.",
        };
      }

      const activeRes = reservationFor(isoDate, nowMin, dayType);
      if (activeRes) {
        const label = activeRes.label || "Class reserved";
        return {
          tone: "reserved",
          answer: "No",
          kicker: "Not for walk-ins",
          title: "A class is using it now",
          detail: `${label}. Study hall still needs a teacher pass.`,
        };
      }

      const windows = buildWindows(dayType).filter((w) => w.kind === "walkin");
      const openNow = windows.find((w) => nowMin >= w.startMin && nowMin < w.endMin);
      if (openNow) {
        return {
          tone: "open",
          answer: "Yes",
          kicker: "You can walk in",
          title: "Yes — go now!",
          detail: `${openNow.label} · ${formatRange(openNow.startMin, openNow.endMin)}`,
          activeId: openNow.id,
        };
      }

      const next = windows.filter((w) => w.startMin > nowMin).sort((a, b) => a.startMin - b.startMin)[0];
      if (next) {
        return {
          tone: "soon",
          answer: "Wait",
          kicker: "Not right now",
          title: "Come back later",
          detail: `Next open: ${next.label} · ${formatRange(next.startMin, next.endMin)}. Study hall needs a teacher pass.`,
          activeId: null,
        };
      }

      const firstBell = (bellByDayType.get(dayType) || []).find((r) => String(r.period || "").toLowerCase() !== "lunch");
      const lastBell = [...(bellByDayType.get(dayType) || [])].sort((a, b) => b.endMin - a.endMin)[0];
      if (firstBell && lastBell && nowMin >= firstBell.startMin && nowMin < lastBell.endMin) {
        return {
          tone: "closed",
          answer: "No",
          kicker: "Class time",
          title: "No walk-ins during class",
          detail: "Only study hall with a real teacher pass (academic work).",
          activeId: "class",
        };
      }

      return {
        tone: "closed",
        answer: "No",
        kicker: "Closed right now",
        title: "Not open for walk-ins",
        detail: "Come before school (7:00–7:40) or at lunch. After school is closed.",
      };
    }

    return { computeStatus, buildWindows, formatRange };
  }

  window.flhsMediaCenterStatus = {
    classifyDayType,
    createEngine,
    formatRange,
    toIsoDateKey,
  };
})();
