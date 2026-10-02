// Fetches every supported source from sundhed.dk and maps it to FHIR.
// Takes `call` (see sundhed.js) so it can be tested without a browser.
import * as S from "./sundhed.js";
import * as M from "./mappers.js";
import { g, arr, str } from "./fhirutil.js";

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n], n); }
  }));
  return out;
}

export async function collectAll(call, { labYears = 2, onProgress = () => {} } = {}) {
  const errors = [];
  const safe = async (label, fn, fallback) => {
    try { return await fn(); }
    catch (e) { errors.push(`${label}: ${e.message || e}`); return fallback; }
  };

  onProgress("Henter journal, labsvar og person…");
  const [persons, forloeb, labs] = await Promise.all([
    safe("Person", () => S.fetchPersonSelection(call), null),
    safe("Forløb", () => S.fetchForloebAll(call), { forloeb: [] }),
    safe("Labsvar", () => S.fetchLabs(call, labYears), null)
  ]);

  const cpr = M.cprFrom({ forloeb, labs, persons });
  const patient = M.mapPatient({ cpr, persons, forloeb });
  const patientRef = `Patient/${patient.id}`;
  const forloebList = arr(g(forloeb, "forloeb"));
  const keys = forloebList.map((e) => str(g(e, "idNoegle", "noegle"))).filter(Boolean);

  onProgress(`Henter ${keys.length} forløb, medicin og vaccinationer…`);
  const [diagnoser, perForloeb, card, prescriptions, vaccinations, imagingList, appointments, orgId] = await Promise.all([
    safe("Diagnoser", () => S.fetchDiagnoser(call), null),
    pool(keys, 4, async (k) => ({
      k,
      kontakt: await safe(`Kontaktperioder (${k})`, () => S.fetchKontaktperioder(call, k), null),
      epi: await safe(`Epikriser (${k})`, () => S.fetchEpikriser(call, k), null),
      not: await safe(`Notater (${k})`, () => S.fetchNotater(call, k), null)
    })),
    safe("Medicinkort", () => S.fetchMedicationCard(call), []),
    safe("Recepter", () => S.fetchPrescriptions(call), []),
    safe("Vaccinationer", () => S.fetchVaccinations(call), []),
    safe("Billedbeskrivelser", () => S.fetchImagingReferrals(call), null),
    safe("Aftaler", () => S.fetchAppointments(call), null),
    safe("Egen læge", () => S.fetchMinLaegeOrgId(call), undefined)
  ]);

  const kontaktBy = {}, epiBy = {}, notBy = {};
  for (const r of perForloeb) { kontaktBy[r.k] = r.kontakt; epiBy[r.k] = r.epi; notBy[r.k] = r.not; }

  onProgress("Henter medicindetaljer og billedbeskrivelser…");
  const cardEntries = arr(card);
  const ordIds = cardEntries.map((e) => str(g(e, "OrdinationId"))).filter(Boolean);
  const details = (await pool(ordIds, 4, (id) => safe(`Ordination ${id}`, () => S.fetchOrdinationDetails(call, id), null))).filter(Boolean);
  const detailsById = Object.fromEntries(details.map((d) => [str(g(d, "DrugMedication", "OrdinationIdentifier")), d]));

  const studyJobs = arr(g(imagingList, "Svar")).flatMap((s) =>
    arr(g(s, "Undersoegelser")).map((u) => [str(g(s, "HenvisningsId")), str(g(u, "Id"))]));
  let imaging = (await pool(studyJobs, 4, ([h, u]) =>
    safe(`Billedbeskrivelse ${h}`, () => S.fetchImagingReferral(call, h, u), null))).filter(Boolean);
  if (!imaging.length && imagingList) imaging = [imagingList];

  const org = orgId ? await safe("Organisation", () => S.fetchOrganization(call, orgId), null) : null;
  const orgs = M.mapOrganizations(org);
  if (orgs.length) patient.generalPractitioner = orgs.map((o) => ({ reference: `Organization/${o.id}` }));

  const resources = [
    patient,
    ...orgs,
    ...M.mapLabs(labs, patientRef),
    ...M.mapConditions(forloebList, diagnoser, patientRef),
    ...M.mapEncounters(forloebList, kontaktBy, patientRef),
    ...M.mapDocuments(forloebList, epiBy, notBy, patientRef),
    ...M.mapMedicationStatements(cardEntries, detailsById, patientRef),
    ...M.mapMedicationRequests(details, cardEntries, arr(prescriptions), patientRef),
    ...M.mapImmunizations(arr(vaccinations), patientRef),
    ...M.mapImaging(imaging, patientRef),
    ...M.mapAppointments(appointments, patientRef)
  ];

  // De-duplicate on resourceType/id (later entries win, matching an upsert).
  const byKey = new Map();
  for (const r of resources) byKey.set(`${r.resourceType}/${r.id}`, r);
  return { resources: [...byKey.values()], errors, hasCpr: !!cpr };
}
