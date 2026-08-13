(() => {
  const svg = document.getElementById("campus-svg");
  const detail = document.getElementById("map-detail");
  const search = document.getElementById("map-search");
  const list = document.getElementById("building-list");
  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));

  const BUILDINGS = {
    b20: {
      id: "b20",
      number: 20,
      title: "Building 20",
      blurb: "Connected near Building 21 · Lunch A.",
      tags: ["lunch-a"],
      focus: true,
      wings: [
        {
          title: "Classrooms · 2000s",
          note: "Classrooms",
          rooms: ["2079"],
          range: "2001–2080",
        },
      ],
    },
    b21: {
      id: "b21",
      number: 21,
      title: "Building 21",
      blurb: "Main classroom building · Lunch A with 20, 5, and 9.",
      tags: ["lunch-a"],
      focus: true,
      wings: [
        {
          title: "Lower · 2101–2119",
          note: "Classrooms",
          rooms: ["2101", "2103", "2107", "2109", "2111", "2115", "2119"],
          range: "2101–2119",
        },
        {
          title: "Middle · 2133–2146",
          note: "Classrooms",
          rooms: ["2133", "2134", "2138", "2139", "2141", "2142", "2144", "2145", "2146"],
          range: "2133–2146",
        },
        {
          title: "Upper · 2153–2163",
          note: "Classrooms",
          rooms: ["2153", "2156", "2158", "2159", "2160", "2163"],
          range: "2153–2163",
        },
      ],
    },
    b5: {
      id: "b5",
      number: 5,
      title: "Building 5",
      blurb: "Classroom wing · Lunch A.",
      tags: ["lunch-a"],
      focus: true,
      wings: [
        {
          title: "Classrooms · 504–523",
          note: "Classrooms",
          rooms: ["504", "506", "510", "518", "519", "520", "521", "522", "523"],
          range: "504–523",
        },
      ],
    },
    b9: {
      id: "b9",
      number: 9,
      title: "Building 9",
      blurb: "Long classroom wing · Lunch A.",
      tags: ["lunch-a"],
      focus: true,
      wings: [
        {
          title: "Classrooms · 908–926",
          note: "Classrooms",
          rooms: ["908", "909", "912", "913", "926"],
          range: "908–926",
        },
      ],
    },
    b17: {
      id: "b17",
      number: 17,
      title: "Building 17",
      blurb: "Tall 3-floor classroom tower · Lunch B with Building 8.",
      tags: ["lunch-b"],
      focus: true,
      wings: [
        {
          title: "Floor 1 · 1703–1716",
          note: "Classrooms",
          rooms: ["1703", "1704", "1705", "1706", "1711", "1712", "1714", "1715", "1716"],
          range: "1703–1716",
        },
        {
          title: "Floor 2 · 1720–1735",
          note: "Classrooms",
          rooms: ["1720", "1721", "1722", "1723", "1724", "1725", "1731", "1732", "1733", "1734", "1735"],
          range: "1720–1735",
        },
        {
          title: "Floor 3 · 1740–1755",
          note: "Classrooms",
          rooms: ["1740", "1741", "1742", "1744", "1745", "1751", "1752", "1753", "1754", "1755"],
          range: "1740–1755",
        },
      ],
    },
    b8: {
      id: "b8",
      number: 8,
      title: "Building 8",
      blurb: "South classroom building · Lunch B with Building 17.",
      tags: ["lunch-b"],
      focus: true,
      wings: [
        {
          title: "Classrooms · 801–812",
          note: "Classrooms",
          rooms: ["801", "802", "803", "805", "807", "808", "811", "812"],
          range: "801–812",
        },
      ],
    },
    b6: {
      id: "b6",
      number: 6,
      title: "Building 6 · Auditorium",
      blurb: "Auditorium / assembly hall.",
      tags: ["auditorium"],
      focus: true,
      wings: [
        {
          title: "Auditorium",
          note: "Main hall",
          rooms: ["280"],
          range: "Auditorium",
        },
        {
          title: "Support rooms",
          note: "Around the auditorium",
          rooms: ["600"],
          range: "600–609 · 283–284",
        },
      ],
    },
    b4: {
      id: "b4",
      number: 4,
      title: "Building 4 · Gym",
      blurb: "Gym building.",
      tags: ["gym"],
      focus: false,
      wings: [
        {
          title: "Gym / PE area",
          note: "Court + perimeter rooms",
          rooms: ["254"],
          range: "250–269",
        },
      ],
    },
    b18: {
      id: "b18",
      number: 18,
      title: "Building 18 · Cafeteria",
      blurb: "Cafeteria.",
      tags: ["food"],
      focus: false,
      wings: [
        {
          title: "Cafeteria",
          note: "Lunch serving & dining",
          rooms: [],
          range: "1800–1822",
        },
      ],
    },
  };

  /** Fallback hotspot % boxes if JSON fails to load */
  const DEFAULT_HOTSPOTS = [
    { id: "b20", number: 20, x: 12.6, y: 17.2, w: 15.8, h: 13.3 },
    { id: "b21", number: 21, x: 28.7, y: 12.9, w: 18.4, h: 18.0 },
    { id: "b4", number: 4, x: 13.7, y: 36.3, w: 25.5, h: 22.0 },
    { id: "b5", number: 5, x: 40.0, y: 33.2, w: 22.0, h: 18.0 },
    { id: "b9", number: 9, x: 64.0, y: 36.0, w: 8.5, h: 38.0 },
    { id: "b17", number: 17, x: 87.6, y: 41.6, w: 9.0, h: 28.9 },
    { id: "b6", number: 6, x: 39.5, y: 54.0, w: 22.0, h: 10.5 },
    { id: "b18", number: 18, x: 43.3, y: 67.6, w: 20.6, h: 14.0 },
    { id: "b8", number: 8, x: 47.1, y: 84.5, w: 21.4, h: 12.0 },
  ];

  let filter = "all";
  let highlightRoom = "";
  let hotspots = DEFAULT_HOTSPOTS;
  const filterBanner = document.getElementById("filter-banner");

  const LUNCH_GROUPS = {
    "lunch-a": {
      label: "Lunch A",
      buildings: "20, 21, 5, 9",
      hint: "Blue buildings eat Lunch A together.",
    },
    "lunch-b": {
      label: "Lunch B",
      buildings: "17, 8",
      hint: "Green buildings eat Lunch B together.",
    },
  };

  function tagLabel(t) {
    if (t === "lunch-a") return "Lunch A";
    if (t === "lunch-b") return "Lunch B";
    if (t === "food") return "Cafeteria";
    if (t === "gym") return "Gym";
    if (t === "auditorium") return "Auditorium";
    return t;
  }

  function padBuilding(n) {
    return String(n).padStart(2, "0");
  }

  function renderDetail(item) {
    if (!detail || !item) return;
    const tagHtml = (item.tags || [])
      .map((t) => `<span class="tag ${t}">${tagLabel(t)}</span>`)
      .join("");

    const wingsHtml = (item.wings || [])
      .map((wing) => {
        const chipsHtml = (wing.rooms || [])
          .map((room) => {
            const hit =
              highlightRoom &&
              String(room).replace(/\D/g, "") === String(highlightRoom).replace(/\D/g, "");
            const code = `${padBuilding(item.number)}-${room}`;
            return `<span class="room-chip${hit ? " is-hit" : ""}" title="${code}">${room}</span>`;
          })
          .join("");
        return `
          <div class="wing">
            <p class="wing-title">${wing.title}</p>
            ${wing.note ? `<p class="wing-note">${wing.note}${wing.range ? ` · ${wing.range}` : ""}</p>` : ""}
            ${chipsHtml ? `<div class="room-chips">${chipsHtml}</div>` : ""}
          </div>
        `;
      })
      .join("");

    detail.innerHTML = `
      <p class="detail-kicker">${item.focus ? "Focus building" : "Building"}</p>
      <h2>${item.title}</h2>
      <p>${item.blurb}</p>
      ${tagHtml ? `<div class="detail-tags">${tagHtml}</div>` : ""}
      ${wingsHtml}
      <div class="detail-actions">
        <a href="homeroom.html">Find my room</a>
        <a class="secondary" href="resources.html">Resources</a>
      </div>
    `;

    svg?.querySelectorAll(".hotspot").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.id === item.id);
    });
    list?.querySelectorAll("button").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.id === item.id);
    });
  }

  function applyFilter() {
    const lunchMode = filter === "lunch-a" || filter === "lunch-b";

    svg?.querySelectorAll(".hotspot").forEach((el) => {
      const meta = BUILDINGS[el.dataset.id];
      const tags = meta?.tags || [];
      const match =
        filter === "all"
          ? false
          : filter === "lunch-a"
            ? tags.includes("lunch-a")
            : filter === "lunch-b"
              ? tags.includes("lunch-b")
              : false;
      const dim = lunchMode && !match;

      el.classList.toggle("is-dim", dim);
      el.classList.toggle("is-lunch-a", filter === "lunch-a" && match);
      el.classList.toggle("is-lunch-b", filter === "lunch-b" && match);

      const pin = svg.querySelector(`.pin[data-id="${el.dataset.id}"]`);
      if (pin) {
        pin.classList.toggle("is-dim", dim);
        pin.classList.toggle("is-lunch-a", filter === "lunch-a" && match);
        pin.classList.toggle("is-lunch-b", filter === "lunch-b" && match);
      }
    });

    list?.querySelectorAll("button").forEach((btn) => {
      const meta = BUILDINGS[btn.dataset.id];
      const tags = meta?.tags || [];
      const match =
        filter === "lunch-a"
          ? tags.includes("lunch-a")
          : filter === "lunch-b"
            ? tags.includes("lunch-b")
            : true;
      btn.classList.toggle("is-dim", lunchMode && !match);
      btn.classList.toggle("lunch-a-on", filter === "lunch-a" && match);
      btn.classList.toggle("lunch-b-on", filter === "lunch-b" && match);
    });

    if (filterBanner) {
      const group = LUNCH_GROUPS[filter];
      if (group) {
        filterBanner.className = `filter-banner is-visible ${filter}`;
        filterBanner.innerHTML = `<strong>${group.label}:</strong> Buildings ${group.buildings}. ${group.hint}`;
      } else {
        filterBanner.className = "filter-banner";
        filterBanner.textContent = "";
      }
    }
  }

  function selectById(id, room) {
    const item = BUILDINGS[id];
    if (!item) return;
    highlightRoom = room || "";
    renderDetail(item);
  }

  function buildingFromRoomCode(raw) {
    const text = String(raw || "").trim().toUpperCase();
    if (!text) return null;

    const pair = text.match(/^0?(\d+)\s*-\s*(\d+[A-Z]?)/);
    if (pair) {
      const b = Number(pair[1]);
      const room = pair[2];
      const item = Object.values(BUILDINGS).find((x) => x.number === b) || null;
      return item ? { item, room } : null;
    }

    const digits = text.replace(/\D/g, "");
    if (!digits) return null;

    if (digits.length <= 2) {
      const n = Number(digits);
      const item = Object.values(BUILDINGS).find((x) => x.number === n) || null;
      return item ? { item, room: "" } : null;
    }

    let item = null;
    if (/^17\d{2}/.test(digits)) item = BUILDINGS.b17;
    else if (/^18\d{2}/.test(digits)) item = BUILDINGS.b18;
    else if (/^20\d{2}/.test(digits)) item = BUILDINGS.b20;
    else if (/^21\d{2}/.test(digits)) item = BUILDINGS.b21;
    else if (/^9\d{2}/.test(digits)) item = BUILDINGS.b9;
    else if (/^8\d{2}/.test(digits)) item = BUILDINGS.b8;
    else if (/^6\d{2}/.test(digits) || /^28\d/.test(digits)) item = BUILDINGS.b6;
    else if (/^5\d{2}/.test(digits)) item = BUILDINGS.b5;
    else if (/^2[5-6]\d/.test(digits)) item = BUILDINGS.b4;

    if (!item) {
      const asBuilding = Number(digits);
      item = Object.values(BUILDINGS).find((x) => x.number === asBuilding) || null;
    }
    return item ? { item, room: digits } : null;
  }

  function selectFromQuery(raw) {
    const found = buildingFromRoomCode(raw);
    if (!found) {
      if (detail) {
        detail.innerHTML = `
          <p class="detail-kicker">Not found</p>
          <h2>${String(raw || "").trim() || "Unknown"}</h2>
          <p>Try a focus building (21, 17, 8…) or a room like 1754 / 17-1754.</p>
          <div class="detail-actions">
            <a href="homeroom.html">Homeroom Locator</a>
          </div>
        `;
      }
      return;
    }
    highlightRoom = found.room;
    renderDetail(found.item);
  }

  function renderOverlay() {
    if (!svg) return;
    const parts = [];
    hotspots.forEach((h) => {
      const meta = BUILDINGS[h.id];
      if (!meta) return;
      const quiet = !meta.focus;
      parts.push(`
        <rect
          class="hotspot"
          data-id="${h.id}"
          data-tags="${(meta.tags || []).join(",")}"
          x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}"
          rx="0.6"
          tabindex="0"
          role="button"
          aria-label="${meta.title}"
        ></rect>
        <g class="pin" data-id="${h.id}">
          <rect class="pin-bubble" x="${h.x + h.w / 2 - 1.6}" y="${h.y + h.h / 2 - 1.05}" width="3.2" height="2.1" rx="0.55" />
          <text class="pin-text${quiet ? " sm" : ""}" x="${h.x + h.w / 2}" y="${h.y + h.h / 2}">${meta.number}</text>
        </g>
      `);
    });
    svg.innerHTML = parts.join("");

    svg.querySelectorAll(".hotspot").forEach((el) => {
      const go = () => selectById(el.dataset.id);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function wireList() {
    if (!list) return;
    const order = [20, 21, 5, 9, 17, 8, 6, 4, 18];
    const byNum = Object.fromEntries(Object.values(BUILDINGS).map((b) => [b.number, b]));
    list.innerHTML = order
      .map((n) => {
        const b = byNum[n];
        if (!b) return "";
        return `<button type="button" data-id="${b.id}" class="${b.focus ? "is-focus" : ""}">${b.number}${
          n === 6 ? " Aud" : n === 4 ? " Gym" : n === 18 ? " Cafe" : ""
        }</button>`;
      })
      .join("");
    list.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => selectById(btn.dataset.id));
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter || "all";
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      applyFilter();
    });
  });

  search?.addEventListener("input", () => {
    if (search.value.trim().length >= 1) selectFromQuery(search.value);
  });
  search?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      selectFromQuery(search.value);
    }
  });

  function applyQuery() {
    const params = new URLSearchParams(location.search);
    const b = params.get("b") || params.get("building") || params.get("room");
    if (b) selectFromQuery(b);
  }

  async function init() {
    try {
      const res = await fetch("assets/maps/hotspots.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.buildings) && data.buildings.length) {
          hotspots = data.buildings.map((b) => ({
            id: b.id,
            number: b.number,
            x: b.x,
            y: b.y,
            w: b.w,
            h: b.h,
          }));
        }
      }
    } catch (_) {
      /* use defaults */
    }
    renderOverlay();
    wireList();
    applyQuery();
  }

  init();
})();
