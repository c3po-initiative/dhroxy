const KEYS = ["fhirUrl", "fhirToken", "labYears"];
const DEFAULTS = { fhirUrl: "http://localhost:8090/fhir", fhirToken: "", labYears: 2 };
const $ = (id) => document.getElementById(id);
const isLocal = (u) => ["localhost", "127.0.0.1"].includes(new URL(u).hostname);

chrome.storage.local.get(KEYS).then((s) => KEYS.forEach((k) => ($(k).value = s[k] ?? DEFAULTS[k])));

$("save").onclick = async () => {
  const v = {
    fhirUrl: $("fhirUrl").value.trim() || DEFAULTS.fhirUrl,
    fhirToken: $("fhirToken").value.trim(),
    labYears: Math.min(20, Math.max(1, parseInt($("labYears").value, 10) || DEFAULTS.labYears))
  };
  try { new URL(v.fhirUrl); } catch { $("msg").textContent = "Ugyldig URL"; return; }

  if (!isLocal(v.fhirUrl)) {
    const origins = [new URL(v.fhirUrl).origin + "/*"];
    if (!(await chrome.permissions.request({ origins }))) {
      $("msg").textContent = "Adgang til serveren blev ikke givet – ikke gemt.";
      return;
    }
  }
  await chrome.storage.local.set(v);
  $("msg").textContent = "Gemt ✓";
};
