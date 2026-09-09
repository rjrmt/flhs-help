/* Shared Flying L coupon print engine.
   Port the tested 10-up / duplex slot math — do not re-derive it. */
(() => {
  const COLS = 2;
  const ROWS = 5;
  const PER_SHEET = COLS * ROWS;
  const PREFS_KEY = "flhs-coupons-print-prefs";

  const DEFAULT_SETTINGS = {
    school_name: "Fort Lauderdale High School",
    program_name: "Flying L Positive Behavior Coupon",
    tagline: "Congratulations! You earned this because of your…",
    categories: [
      "Appropriate Dress",
      "Participation",
      "Respect",
      "Patience",
      "Punctuality",
      "Resilience",
      "Integrity",
      "Kindness",
      "Attendance",
      "Self-Control",
      "Determination",
      "Maturity",
      "Leadership",
      "Honesty",
      "Excellence",
      "Cooperation",
    ],
    terms_text:
      "This coupon may not be duplicated or transferred. Present this coupon with your student ID at the Flying L Cart to redeem. Valid through the end of the quarter it was issued.",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayStaffName(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    let out = s;
    if (s.includes(",")) {
      const [last, ...rest] = s.split(",");
      const first = rest.join(",").trim();
      out = first ? `${first} ${last.trim()}` : s;
    }
    return out.replace(/[A-Za-z]+('[A-Za-z]+)?/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  function normalizeSettings(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const categories = Array.isArray(src.categories)
      ? src.categories.map((c) => String(c || "").trim()).filter(Boolean)
      : DEFAULT_SETTINGS.categories.slice();
    return {
      school_name: String(src.school_name || DEFAULT_SETTINGS.school_name).trim() || DEFAULT_SETTINGS.school_name,
      program_name: String(src.program_name || DEFAULT_SETTINGS.program_name).trim() || DEFAULT_SETTINGS.program_name,
      tagline: String(src.tagline || DEFAULT_SETTINGS.tagline).trim() || DEFAULT_SETTINGS.tagline,
      categories: categories.length ? categories : DEFAULT_SETTINGS.categories.slice(),
      terms_text: String(src.terms_text || DEFAULT_SETTINGS.terms_text).trim() || DEFAULT_SETTINGS.terms_text,
    };
  }

  function loadPrintPrefs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return {
        flipType: parsed.flipType === "short" ? "short" : "long",
        pageOrder: parsed.pageOrder === "grouped" ? "grouped" : "alternating",
      };
    } catch {
      return { flipType: "long", pageOrder: "alternating" };
    }
  }

  /** Room 2004 → Building 20, 518 → Building 5. Named rooms like "Bldg 20" also count. */
  function buildingFromRoom(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    const named = text.match(/\b(?:bldg\.?|building)\s*(\d+)\b/i);
    if (named) return Number(named[1]);
    const digits = (text.match(/\d+/) || [""])[0];
    if (!digits) return null;
    if (/^17\d{2}/.test(digits)) return 17;
    if (/^18\d{2}/.test(digits)) return 18;
    if (/^20\d{2}/.test(digits)) return 20;
    if (/^21\d{2}/.test(digits)) return 21;
    if (/^9\d{2}/.test(digits)) return 9;
    if (/^8\d{2}/.test(digits)) return 8;
    if (/^6\d{2}/.test(digits) || /^28\d/.test(digits)) return 6;
    if (/^5\d{2}/.test(digits)) return 5;
    if (/^2[5-6]\d/.test(digits)) return 4;
    if (digits.length >= 4) return Number(digits.slice(0, 2));
    if (digits.length === 3) return Number(digits.charAt(0));
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }

  function buildingKey(row) {
    const n = buildingFromRoom(row?.room);
    return n == null ? "none" : String(n);
  }

  function compareStaff(a, b) {
    const ba = buildingFromRoom(a?.room);
    const bb = buildingFromRoom(b?.room);
    const na = ba == null ? 9999 : ba;
    const nb = bb == null ? 9999 : bb;
    if (na !== nb) return na - nb;
    const ra = String(a?.room || "");
    const rb = String(b?.room || "");
    const rooms = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: "base" });
    if (rooms) return rooms;
    return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" });
  }

  function isTeacherRole(department) {
    return /^teacher\b/i.test(String(department || "").trim());
  }

  function savePrintPrefs(prefs) {
    const next = {
      flipType: prefs.flipType === "short" ? "short" : "long",
      pageOrder: prefs.pageOrder === "grouped" ? "grouped" : "alternating",
    };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  }

  /** i = reading-order slot (0..9) on the FRONT sheet. */
  function backSlotFor(i, flipType) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    if (flipType === "long") {
      return r * COLS + (COLS - 1 - c);
    }
    return (ROWS - 1 - r) * COLS + c;
  }

  function padChunk(chunk) {
    const padded = chunk.slice(0, PER_SHEET);
    while (padded.length < PER_SHEET) padded.push(null);
    return padded;
  }

  function buildBackGrid(chunk, flipType) {
    const grid = new Array(PER_SHEET).fill(null);
    padChunk(chunk).forEach((item, i) => {
      grid[backSlotFor(i, flipType)] = item;
    });
    return grid;
  }

  /** Quantity is pages. Each page is 10 identical coupons for one teacher. */
  function asPages(raw) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  }

  function buildQueue(teachers, { sheetPerBuilding = false } = {}) {
    /** @type {Array<{ name: string, room: string }|null>} */
    const queue = [];
    let lastKey;
    for (const teacher of teachers || []) {
      const name = String(teacher?.name || "").trim();
      if (!name) continue;
      const room = String(teacher?.room || "").trim();
      const pages = asPages(teacher.quantity ?? teacher.pages ?? teacher.default_quantity);
      if (sheetPerBuilding) {
        const key = buildingFromRoom(room);
        if (lastKey !== undefined && key !== lastKey && queue.length % PER_SHEET !== 0) {
          while (queue.length % PER_SHEET !== 0) queue.push(null);
        }
        lastKey = key;
      }
      const card = { name, room };
      for (let p = 0; p < pages; p += 1) {
        for (let n = 0; n < PER_SHEET; n += 1) queue.push(card);
      }
    }
    return queue;
  }

  function buildPages(queue, { flipType = "long", pageOrder = "alternating" } = {}) {
    const items = Array.isArray(queue) ? queue : [];
    const chunks = [];
    for (let i = 0; i < items.length; i += PER_SHEET) {
      chunks.push(padChunk(items.slice(i, i + PER_SHEET)));
    }
    const fronts = chunks.map((chunk) => chunk);
    const backs = chunks.map((chunk) => buildBackGrid(chunk, flipType));
    /** @type {{ side: "front"|"back", cards: Array<{name:string,room:string}|null> }[]} */
    const pages = [];
    if (pageOrder === "grouped") {
      fronts.forEach((cards) => pages.push({ side: "front", cards }));
      backs.forEach((cards) => pages.push({ side: "back", cards }));
    } else {
      fronts.forEach((cards, i) => {
        pages.push({ side: "front", cards });
        pages.push({ side: "back", cards: backs[i] });
      });
    }
    return pages;
  }

  const LOGO_SRC = "/assets/brand/logo.png";

  function frontCardHtml(settings) {
    const cats = settings.categories
      .map(
        (label) =>
          `<span class="cat"><span class="cat-box" aria-hidden="true"></span><span class="cat-label">${escapeHtml(label)}</span></span>`
      )
      .join("");
    return `<article class="card card-front">
      <header class="card-head">
        <img class="card-logo" src="${LOGO_SRC}" width="88" height="88" alt="" />
        <div class="card-head-copy">
          <p class="card-school">${escapeHtml(settings.school_name)}</p>
          <h2 class="card-program">${escapeHtml(settings.program_name)}</h2>
        </div>
      </header>
      <p class="card-banner">${escapeHtml(settings.tagline)}</p>
      <div class="cat-grid">${cats}</div>
    </article>`;
  }

  function backCardHtml(item, settings) {
    if (!item) {
      return `<article class="card card-back card-empty" aria-hidden="true"></article>`;
    }
    const room = item.room ? escapeHtml(item.room) : "—";
    return `<article class="card card-back">
      <header class="card-back-head">
        <img class="card-logo card-logo-sm" src="${LOGO_SRC}" width="88" height="88" alt="" />
        <div class="card-back-copy">
          <p class="card-back-kicker">Flying L Cart</p>
          <p class="card-back-title">Terms of Use</p>
        </div>
      </header>
      <p class="card-terms">${escapeHtml(settings.terms_text)}</p>
      <div class="card-issued">
        <div>
          <span>Issued by</span>
          <strong>${escapeHtml(displayStaffName(item.name))}</strong>
        </div>
        <div>
          <span>Room</span>
          <strong>${room}</strong>
        </div>
      </div>
      <div class="card-lines">
        <p class="card-line-full"><span>Student</span><i></i></p>
        <div class="card-line-split">
          <p><span>Date</span><i></i></p>
          <p><span>Signature</span><i></i></p>
        </div>
      </div>
      <p class="card-motto">Leading the Launch</p>
    </article>`;
  }

  function emptyFrontCard() {
    return `<article class="card card-front card-empty" aria-hidden="true"></article>`;
  }

  function cutGridSvg() {
    const left = 0.75;
    const top = 0.5;
    const cardW = 3.5;
    const cardH = 2;
    const right = left + cardW * COLS;
    const bottom = top + cardH * ROWS;
    const tick = 0.18;
    const xs = Array.from({ length: COLS + 1 }, (_, i) => left + i * cardW);
    const ys = Array.from({ length: ROWS + 1 }, (_, i) => top + i * cardH);
    const lines = [];
    xs.forEach((x) => {
      lines.push(`<line class="cut-line" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" />`);
      lines.push(`<line class="cut-tick" x1="${x}" y1="${top - tick}" x2="${x}" y2="${top}" />`);
      lines.push(`<line class="cut-tick" x1="${x}" y1="${bottom}" x2="${x}" y2="${bottom + tick}" />`);
    });
    ys.forEach((y) => {
      lines.push(`<line class="cut-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}" />`);
      lines.push(`<line class="cut-tick" x1="${left - tick}" y1="${y}" x2="${left}" y2="${y}" />`);
      lines.push(`<line class="cut-tick" x1="${right}" y1="${y}" x2="${right + tick}" y2="${y}" />`);
    });
    return `<svg class="cut-grid" viewBox="0 0 8.5 11" width="8.5in" height="11in" aria-hidden="true">${lines.join("")}</svg>`;
  }

  function sheetHtml(page, settings, isLast) {
    const cards =
      page.side === "front"
        ? page.cards.map((item) => (item ? frontCardHtml(settings) : emptyFrontCard())).join("")
        : page.cards.map((item) => backCardHtml(item, settings)).join("");
    const lastClass = isLast ? " is-last" : "";
    return `<section class="sheet sheet-${page.side}${lastClass}"><div class="sheet-cards">${cards}</div>${cutGridSvg()}</section>`;
  }

  function pagesHtml(pages, settings) {
    const normalized = normalizeSettings(settings);
    return pages.map((page, i) => sheetHtml(page, normalized, i === pages.length - 1)).join("");
  }

  function ensurePrintRoot() {
    let root = document.getElementById("coupon-print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "coupon-print-root";
      root.className = "print-root";
      root.setAttribute("aria-hidden", "true");
      (document.querySelector(".wrap") || document.body).appendChild(root);
    }
    return root;
  }

  function renderSheets(queue, settings, prefs) {
    const pages = buildPages(queue, prefs);
    const root = ensurePrintRoot();
    root.innerHTML = pagesHtml(pages, settings);
    const count = queue.filter(Boolean).length;
    return { root, pages, count, sheets: Math.ceil(queue.length / PER_SHEET) || 0 };
  }

  function printRendered() {
    document.body.classList.add("is-printing");
    const restore = () => document.body.classList.remove("is-printing");
    window.addEventListener("afterprint", restore, { once: true });
    window.setTimeout(() => window.print(), 50);
  }

  function sampleItem() {
    return { name: "Teacher Name", room: "101" };
  }

  function previewPairHtml(settings, teacher = sampleItem()) {
    const normalized = normalizeSettings(settings);
    return `<div class="preview-pair">
      ${frontCardHtml(normalized)}
      ${backCardHtml(teacher, normalized)}
    </div>`;
  }

  window.FLHSCouponsPrint = {
    COLS,
    ROWS,
    PER_SHEET,
    DEFAULT_SETTINGS,
    escapeHtml,
    displayStaffName,
    buildingFromRoom,
    buildingKey,
    compareStaff,
    isTeacherRole,
    asPages,
    normalizeSettings,
    loadPrintPrefs,
    savePrintPrefs,
    backSlotFor,
    buildBackGrid,
    buildQueue,
    buildPages,
    frontCardHtml,
    backCardHtml,
    pagesHtml,
    renderSheets,
    printRendered,
    previewPairHtml,
  };
})();
