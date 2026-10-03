// sundhed.dk endpoints, ported from dhroxy's SundhedClient (Apache-2.0).
// Every function takes `call(path, {method, body})`, which performs the request from inside the user's own
// logged-in sundhed.dk tab and returns parsed JSON. Nothing here sees or handles cookies.
import { g, arr } from "./fhirutil.js";

const pad = (n) => String(n).padStart(2, "0");
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const noegleParam = (noegle) => encodeURIComponent(JSON.stringify({ Database: null, Noegle: noegle, VaerdispringNoegle: null }));

export const fetchPersonSelection = (call) => call("/app/personvaelgerportal/api/v1/GetPersonSelection");

export function fetchLabs(call, years) {
  const now = new Date();
  const from = new Date(now); from.setFullYear(now.getFullYear() - years);
  const qs = new URLSearchParams({
    fra: `${localDate(from)}T00:00:00`,
    til: `${localDate(now)}T23:59:59`,
    source: "RegionaleProevesvar"
  });
  return call(`/app/proevesvarportal/api/v1/svaroversigt?${qs}`);
}

// dhroxy reads only page 1 (10 forløb); we page until we have them all.
export async function fetchForloebAll(call) {
  const perPage = 10;
  let first = null;
  const all = [];
  for (let side = 1; side <= 30; side++) {
    const qs = new URLSearchParams({ Side: side, Sortering: "updated", SortDesc: true, ItemsPerPage: perPage });
    const page = await call(`/app/ejournalportalborger/api/ejournal/forloebsoversigt?${qs}`);
    first ??= page;
    const items = arr(g(page, "forloeb"));
    all.push(...items);
    const total = Number(g(page, "numberOfForloeb")) || 0;
    if (items.length < perPage || (total && all.length >= total)) break;
  }
  const seen = new Set();
  const forloeb = all.filter((e) => {
    const k = g(e, "idNoegle", "noegle") ?? JSON.stringify(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { ...(first || {}), forloeb };
}

export const fetchDiagnoser = (call) => call("/app/diagnoserborger/api/v1/diagnoser");
export const fetchKontaktperioder = (call, n) => call(`/app/ejournalportalborger/api/ejournal/kontaktperioder?noegle=${noegleParam(n)}`);
export const fetchEpikriser = (call, n) => call(`/app/ejournalportalborger/api/ejournal/epikriser?noegle=${noegleParam(n)}`);
export const fetchNotater = (call, n) => call(`/app/ejournalportalborger/api/ejournal/notater?noegle=${noegleParam(n)}`);

export const fetchMedicationCard = (call) =>
  call("/app/medicinkort2borger/api/v1/ordinations/?orderBy=StartDate&sortBy=desc&status=active");
export const fetchOrdinationDetails = (call, id) =>
  call(`/app/medicinkort2borger/api/v1/ordinations/${encodeURIComponent(id)}/details`);
export const fetchPrescriptions = (call) => call("/app/medicinkort2borger/api/v1/prescriptions/");

export const fetchVaccinations = (call) => call("/app/vaccination/api/v1/effectuatedvaccinations/");

export const fetchImagingReferrals = (call) => call("/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisninger/");
export function fetchImagingReferral(call, henvisningId, undersoegelsesId) {
  const qs = new URLSearchParams();
  if (henvisningId) qs.set("Id", henvisningId);
  if (undersoegelsesId) qs.set("undersoegelsesId", undersoegelsesId);
  return call(`/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisning/?${qs}`);
}

export function fetchAppointments(call) {
  const now = new Date();
  const from = new Date(now); from.setFullYear(now.getFullYear() - 1);
  const to = new Date(now); to.setFullYear(now.getFullYear() + 1);
  return call("/app/aftalerborger/api/v1/aftaler/cpr", {
    method: "POST",
    body: { FromDate: localDate(from), ToDate: localDate(to), Version: 2, WithPartials: true }
  });
}

export const fetchMinLaegeOrgId = (call) => call("/api/minlaegeorganization/").then((r) => g(r, "OrganizationId"));
export const fetchOrganization = (call, id) => call(`/api/core/organisation/${encodeURIComponent(id)}`);
