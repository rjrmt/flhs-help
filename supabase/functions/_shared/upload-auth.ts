export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Short IT PIN always accepted; plus comma-separated env secrets. */
const STATIC_UPLOAD_KEYS = ["0951"];

/** Comma-separated FLHS_UPLOAD_SECRET plus optional FLHS_UPLOAD_SECRET_LEGACY. */
export function allowedUploadSecrets(): string[] {
  const chunks = [
    ...STATIC_UPLOAD_KEYS,
    Deno.env.get("FLHS_UPLOAD_SECRET") || "",
    Deno.env.get("FLHS_UPLOAD_SECRET_LEGACY") || "",
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of chunks) {
    for (const part of chunk.split(",")) {
      const s = part.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export function isUploadAuthorized(provided: string): boolean {
  const key = provided.trim();
  if (!key) return false;
  const allowed = allowedUploadSecrets();
  if (!allowed.length) return false;
  for (const expected of allowed) {
    if (timingSafeEqual(expected, key)) return true;
  }
  return false;
}
