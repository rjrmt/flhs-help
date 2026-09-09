/* Admin client for Flying L coupon tools. Uses the same staff upload key
   as the testing-roster upload page (sessionStorage flhs-upload-key). */
(() => {
  const KEY_STORAGE = "flhs-upload-key";
  const FUNCTION_URL =
    "https://lharxnpvcprthgabklwo.supabase.co/functions/v1/manage-coupons";

  function getSavedKey() {
    try {
      return sessionStorage.getItem(KEY_STORAGE) || "";
    } catch {
      return "";
    }
  }

  function saveKey(key) {
    try {
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      /* ignore */
    }
  }

  async function request(action, body = {}) {
    const key = String(body.uploadKey || getSavedKey() || "").trim();
    if (!key) {
      const err = new Error("Enter the staff upload key");
      err.code = "NO_KEY";
      throw err;
    }
    const cfg = window.FLHS_SUPABASE || {};
    if (!cfg.anonKey) throw new Error("Missing public Supabase config");

    const payload = { ...body, action };
    delete payload.uploadKey;

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        "x-flhs-upload-key": key,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `Request failed (${response.status})`);
      err.status = response.status;
      throw err;
    }
    saveKey(key);
    return data;
  }

  function splitDelimited(line, delim) {
    const fields = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === delim) {
        fields.push(cur);
        cur = "";
      } else cur += c;
    }
    fields.push(cur);
    return fields.map((f) => f.replace(/^\uFEFF/, "").trim());
  }

  function headerIndex(headers) {
    const map = {};
    headers.forEach((h, i) => {
      map[h.toLowerCase().replace(/[_]+/g, " ").trim()] = i;
    });
    const pick = (...names) => {
      for (const name of names) {
        const idx = map[name];
        if (idx != null) return idx;
      }
      return -1;
    };
    return {
      name: pick("name", "teacher", "staff", "staff name", "teacher name", "full name"),
      room: pick("room", "rm", "location"),
      quantity: pick("quantity", "qty", "count", "pages", "page", "default quantity", "default_quantity"),
      department: pick("department", "dept"),
    };
  }

  function looksLikeHeader(cells) {
    const joined = cells.map((c) => c.toLowerCase()).join(" ");
    return /\b(name|teacher|staff|room|qty|quantity|pages|page|dept|department)\b/.test(joined);
  }

  function parseRosterText(text) {
    const clean = String(text || "").replace(/^\uFEFF/, "");
    const lines = clean.split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return [];

    const delim = lines[0].includes("\t") ? "\t" : ",";
    const table = lines.map((line) => splitDelimited(line, delim));
    let start = 0;
    let cols = { name: 0, room: 1, quantity: 2, department: 3 };

    if (looksLikeHeader(table[0])) {
      cols = headerIndex(table[0]);
      if (cols.name < 0) cols.name = 0;
      start = 1;
    }

    const rows = [];
    const seen = new Set();
    for (let i = start; i < table.length; i += 1) {
      const cells = table[i];
      if (!cells.length || cells.every((c) => !c)) continue;
      const name = (cells[cols.name] || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const row = { name };
      if (cols.room >= 0 && cells[cols.room] != null) row.room = cells[cols.room];
      if (cols.department >= 0 && cells[cols.department] != null) {
        row.department = cells[cols.department];
      }
      if (cols.quantity >= 0 && cells[cols.quantity] != null && String(cells[cols.quantity]).trim()) {
        const qty = Number(String(cells[cols.quantity]).replace(/[^\d]/g, ""));
        if (Number.isFinite(qty) && qty > 0) row.default_quantity = qty;
      } else if (start === 0 && cells.length >= 3 && /^\d+$/.test(String(cells[2] || "").trim())) {
        row.default_quantity = Number(cells[2]);
        if (cells[1] != null) row.room = cells[1];
      }
      if (seen.has(key)) {
        const prev = rows.find((r) => r.name.toLowerCase() === key);
        if (prev) {
          const { name: _ignored, ...rest } = row;
          Object.assign(prev, rest);
        }
        continue;
      }
      seen.add(key);
      rows.push(row);
    }
    return rows;
  }

  window.FLHSCouponsApi = {
    KEY_STORAGE,
    getSavedKey,
    saveKey,
    request,
    parseRosterText,
  };
})();
