#!/usr/bin/env node
/**
 * Writes js/supabase-config.js from SUPABASE_URL and SUPABASE_ANON_KEY.
 * The generated file is gitignored. Never pass the service_role key.
 */
const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

if (!url || !anonKey) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY, then run this script.");
  process.exit(1);
}
if (anonKey.includes("service_role")) {
  console.error("Refusing to write a service_role key into the website.");
  process.exit(1);
}

const out = path.join(__dirname, "..", "js", "supabase-config.js");
const body = `window.FLHS_SUPABASE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;
fs.writeFileSync(out, body);
console.log("Wrote js/supabase-config.js");
