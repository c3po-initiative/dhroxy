// Sundhed.dk → FHIR bridge, v0.2 – dhroxy built into the extension.
//
// 1. Notes the x-xsrf-token / conversation-uuid that your own logged-in sundhed.dk tab sends.
//    Cookies are never read, stored or copied by this extension.
// 2. On your click, runs the sundhed.dk API calls *inside that tab*, exactly like the site itself does,
//    and maps the answers to FHIR locally (mappers ported from dhroxy).
// 3. On a second click, writes the resources to the FHIR server you chose, as one idempotent transaction.
import { collectAll } from "./collect.js";

const DEFAULTS = { fhirUrl: "http://localhost:8090/fhir", fhirToken: "", labYears: 2 };
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
const CAPTURE = ["x-xsrf-token", "conversation-uuid", "page-app-id"];
const SDK_ORIGIN = "https://www.sundhed.dk";
const TAG = { system: "urn:sundhed-fhir-bridge", code: "sundhed.dk", display: "Imported from sundhed.dk" };

// ---------- 1. Note the anti-CSRF headers from your own sundhed.dk tab ----------
chrome.webRequest.onSendHeaders.addListener(
  (d) => {
    if (d.tabId < 0) return;
    const h = {};
    for (const { name, value } of d.requestHeaders || []) {
      const n = name.toLowerCase();
      if (CAPTURE.includes(n) && value) h[n] = value;
    }
    if (!h["x-xsrf-token"]) return;
    chrome.storage.session.set({ sundhedSession: { headers: h, tabId: d.tabId, capturedAt: Date.now() } });
  },
  { urls: [`${SDK_ORIGIN}/app/*`, `${SDK_ORIGIN}/api/*`] },
  ["requestHeaders"]
);

async function getSession() {
  const { sundhedSession: s } = await chrome.storage.session.get("sundhedSession");
  if (!s) return null;
  if (Date.now() - s.capturedAt > SESSION_MAX_AGE_MS) {
    await chrome.storage.session.remove("sundhedSession");
    return null;
  }
  return s;
}

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

async function findSundhedTab(preferred) {
  try {
    const t = await chrome.tabs.get(preferred);
    if (t.url?.startsWith(SDK_ORIGIN)) return t.id;
  } catch { /* tab closed */ }
  const [t] = await chrome.tabs.query({ url: `${SDK_ORIGIN}/*` });
  if (!t) throw new Error("Ingen åben sundhed.dk-fane. Log ind på sundhed.dk og prøv igen.");
  return t.id;
}

// Runs in the sundhed.dk tab (isolated world): same origin, so the browser attaches the session itself.
async function inTabFetch(url, method, body, headers) {
  try {
    const r = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 0, text: String(e) };
  }
}

function makeCall(tabId, headers) {
  return async (path, { method = "GET", body } = {}) => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: inTabFetch,
      args: [SDK_ORIGIN + path, method, body ?? null, { ...headers, accept: "application/json" }]
    });
    const { status, text } = result || {};
    if (status === 401 || status === 403) throw new Error(`HTTP ${status} (sessionen er måske udløbet)`);
    if (!status || status >= 400) throw new Error(`HTTP ${status || "netværksfejl"}`);
    if (!text) return null;
    try { return JSON.parse(text); } catch { throw new Error("svaret var ikke JSON (er du logget ind?)"); }
  };
}

// ---------- 2. Fetch + map ----------
async function fetchFromSundhed(onProgress) {
  const session = await getSession();
  if (!session) throw new Error("Ingen aktiv sundhed.dk-session. Log ind på sundhed.dk og åbn fx din sundhedsjournal først.");
  const tabId = await findSundhedTab(session.tabId);
  const { labYears } = await getSettings();

  const { resources, errors, hasCpr } = await collectAll(makeCall(tabId, session.headers), { labYears: Number(labYears) || 2, onProgress });
  const authFailures = errors.filter((e) => /HTTP 40[13]/.test(e)).length;
  if (resources.length <= 1 && authFailures >= 3) throw new Error("sundhed.dk afviste kaldene. Log ind igen og prøv en gang til.");
  if (!hasCpr) errors.unshift("Kunne ikke finde dit CPR-nummer; Patient-ressourcen er uden identifikator.");

  await chrome.storage.session.set({ lastFetch: { resources, errors, fetchedAt: Date.now() } });
  return summarize(resources, errors);
}

function summarize(resources, errors) {
  const counts = {};
  resources.forEach((r) => (counts[r.resourceType] = (counts[r.resourceType] || 0) + 1));
  return { counts, total: resources.length, errors, paged: false };
}

const diag = (oo) => oo?.issue?.map((i) => i.diagnostics || i.details?.text).filter(Boolean).join("; ") || "";

// ---------- 3. Upload ----------
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic ids ("sdk-" + 40 hex): re-uploads update instead of duplicating, no CPR in URLs,
// and HAPI's default client-id policy (not purely numeric) is satisfied.
export async function buildTransaction(resources, fhirUrl) {
  const newIds = new Map();
  for (const r of resources) newIds.set(r, "sdk-" + (await sha256Hex(`${r.resourceType}/${r.id}`)).slice(0, 40));
  const refMap = new Map(resources.map((r) => [`${r.resourceType}/${r.id}`, `${r.resourceType}/${newIds.get(r)}`]));

  const rewrite = (node) => {
    if (Array.isArray(node)) return node.map(rewrite);
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        out[k] = k === "reference" && typeof v === "string" && refMap.has(v) ? refMap.get(v) : rewrite(v);
      }
      return out;
    }
    return node;
  };

  const base = fhirUrl.replace(/\/$/, "");
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((r) => {
      const id = newIds.get(r);
      const res = rewrite(r);
      res.id = id;
      res.meta = { tag: [TAG] };
      return { fullUrl: `${base}/${r.resourceType}/${id}`, resource: res, request: { method: "PUT", url: `${r.resourceType}/${id}` } };
    })
  };
}

async function uploadToFhir() {
  const { lastFetch } = await chrome.storage.session.get("lastFetch");
  if (!lastFetch?.resources?.length) throw new Error("Intet at sende. Hent data fra sundhed.dk først.");
  const { fhirUrl, fhirToken } = await getSettings();
  const tx = await buildTransaction(lastFetch.resources, fhirUrl);

  const headers = { "Content-Type": "application/fhir+json", Accept: "application/fhir+json" };
  if (fhirToken) headers.Authorization = `Bearer ${fhirToken}`;
  const res = await fetch(fhirUrl.replace(/\/$/, ""), { method: "POST", credentials: "omit", headers, body: JSON.stringify(tx) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`FHIR-serveren svarede ${res.status}: ${diag(body)}`);

  const statuses = {};
  (body?.entry || []).forEach((e) => {
    const s = (e.response?.status || "?").split(" ")[0];
    statuses[s] = (statuses[s] || 0) + 1;
  });
  return { sent: tx.entry.length, statuses };
}

// ---------- Messaging with the popup ----------
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    switch (msg.type) {
      case "status": {
        const s = await getSession();
        const { lastFetch, progress } = await chrome.storage.session.get(["lastFetch", "progress"]);
        return {
          session: s ? { capturedAt: s.capturedAt } : null,
          lastFetch: lastFetch ? summarize(lastFetch.resources, lastFetch.errors) : null,
          progress,
          settings: await getSettings()
        };
      }
      case "fetch":
        try { return await fetchFromSundhed((p) => chrome.storage.session.set({ progress: p })); }
        finally { await chrome.storage.session.remove("progress"); }
      case "upload": return uploadToFhir();
      case "forget":
        await chrome.storage.session.clear();
        return { ok: true };
    }
  })().then((data) => reply({ ok: true, data }), (err) => reply({ ok: false, error: String(err.message || err) }));
  return true;
});
