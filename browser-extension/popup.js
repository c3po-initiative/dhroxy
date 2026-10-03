const $ = (id) => document.getElementById(id);
const send = (type) => chrome.runtime.sendMessage({ type }).then((r) => { if (!r.ok) throw new Error(r.error); return r.data; });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderPreview(p) {
  const rows = Object.entries(p.counts).sort().map(([t, n]) => `<tr><td>${esc(t)}</td><td>${n}</td></tr>`).join("");
  $("preview").hidden = false;
  $("preview").innerHTML =
    `<b>${p.total} ressourcer klar</b> – tjek dem før du sender:<table>${rows}</table>` +
    (p.paged ? `<p class="bad">Nogle søgninger havde flere sider; kun første side er med.</p>` : "") +
    (p.errors.length ? `<p class="bad">Fejl:<br>${p.errors.map(esc).join("<br>")}</p>` : "");
  $("upload").disabled = p.total === 0;
}

async function refresh() {
  const s = await send("status");
  $("fhir").textContent = s.settings.fhirUrl;
  if (s.session) {
    const min = Math.round((Date.now() - s.session.capturedAt) / 60000);
    $("session").innerHTML = `<span class="ok">● sundhed.dk-session fanget</span> <span class="muted">(${min} min siden)</span>`;
    $("fetch").disabled = false;
  } else {
    $("session").innerHTML = `<span class="bad">● Ingen session</span><br><span class="muted">Log ind på sundhed.dk med MitID og åbn fx din sundhedsjournal. Åbn så denne menu igen.</span>`;
    $("fetch").disabled = true;
  }
  if (s.lastFetch) renderPreview(s.lastFetch);
}

$("fetch").onclick = async () => {
  $("fetch").disabled = true; $("fetch").textContent = "Henter…";
  const timer = setInterval(async () => { const s = await send("status").catch(() => null); if (s?.progress) $("fetch").textContent = s.progress; }, 700);
  try { renderPreview(await send("fetch")); }
  catch (e) { $("preview").hidden = false; $("preview").innerHTML = `<span class="bad">${esc(e.message)}</span>`; }
  finally { clearInterval(timer); $("fetch").textContent = "1. Hent mine data fra sundhed.dk"; refresh(); }
};

$("upload").onclick = async () => {
  const { settings } = await send("status");
  if (!confirm(`Send dine sundhedsdata til ${settings.fhirUrl}?`)) return;
  $("upload").disabled = true; $("upload").textContent = "Sender…";
  $("result").hidden = false;
  try {
    const r = await send("upload");
    const st = Object.entries(r.statuses).map(([k, v]) => `${esc(k)}: ${v}`).join(", ");
    $("result").innerHTML = `<span class="ok">Sendt ${r.sent} ressourcer.</span><br><span class="muted">Svar: ${st}</span>`;
  } catch (e) { $("result").innerHTML = `<span class="bad">${esc(e.message)}</span>`; }
  finally { $("upload").textContent = "2. Send til FHIR-server"; $("upload").disabled = false; }
};

$("forget").onclick = async () => { await send("forget"); $("preview").hidden = true; $("result").hidden = true; $("upload").disabled = true; refresh(); };
$("opts").onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

refresh();
