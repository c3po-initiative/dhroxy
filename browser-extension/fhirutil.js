// Small helpers shared by the mappers. Pure functions, no chrome.* APIs, so they can be unit-tested in Node.

// Case-insensitive property access: sundhed.dk mixes PascalCase ("Svaroversigt") and camelCase ("forloeb").
export function g(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    if (k in cur) { cur = cur[k]; continue; }
    const lk = k.toLowerCase();
    const hit = Object.keys(cur).find((x) => x.toLowerCase() === lk);
    cur = hit === undefined ? undefined : cur[hit];
  }
  return cur;
}

export const arr = (v) => (Array.isArray(v) ? v : []);
export const str = (v) => (v === null || v === undefined || v === "" ? undefined : String(v));
export const nonBlank = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
export const joinNonBlank = (sep, ...vals) => vals.filter((v) => v !== undefined && v !== null && String(v).trim() !== "").join(sep);
export const safeId = (raw) => String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

// Removes undefined, null, empty strings, empty arrays and empty objects, recursively,
// so resources never carry empty elements (which FHIR forbids).
export function prune(v) {
  if (Array.isArray(v)) {
    const out = v.map(prune).filter((x) => x !== undefined);
    return out.length ? out : undefined;
  }
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const p = prune(val);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return undefined;
  return v;
}

// sundhed.dk timestamps are often local Danish time without a zone. FHIR requires a zone whenever
// a time is present, so we attach the Europe/Copenhagen offset that applied at that moment.
export function cphOffset(localIso) {
  const d = new Date(localIso + "Z");
  if (isNaN(d)) return "+00:00";
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Copenhagen", timeZoneName: "longOffset" })
    .formatToParts(d).find((p) => p.type === "timeZoneName")?.value || "GMT";
  const m = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] || "00"}` : "+00:00";
}

export function fhirDateTime(s) {
  if (typeof s !== "string") return undefined;
  s = s.trim();
  let m = s.match(/^(\d{4})(-\d{2}(-\d{2})?)?$/);
  if (m) return Number(m[1]) >= 1800 ? s : undefined;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m || Number(m[1]) < 1800) return undefined;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const time = `${m[4]}${m[5] || ":00"}${m[6] || ""}`;
  let zone = m[7];
  if (!zone) zone = cphOffset(`${date}T${m[4]}${m[5] || ":00"}`);
  else if (zone !== "Z" && !zone.includes(":")) zone = `${zone.slice(0, 3)}:${zone.slice(3)}`;
  return `${date}T${time}${zone}`;
}

export function fhirInstant(s) {
  const v = fhirDateTime(s);
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00${cphOffset(`${v}T00:00:00`)}`;
  return v.includes("T") ? v : undefined;
}

export function htmlToText(html) {
  if (typeof html !== "string" || !html.trim()) return undefined;
  const t = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .trim();
  return t || undefined;
}

export function base64Utf8(s) {
  const bytes = new TextEncoder().encode(s || "");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// "12,5" or "12.5" -> 12.5; anything else (e.g. "<0,5", "Ikke påvist") -> undefined
export function parseDecimal(v) {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : undefined;
}

// Stable key for records that have no id of their own, so re-imports produce the same resource id.
export const contentKey = (obj) => JSON.stringify(obj);
