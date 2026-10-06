// FHIR R4 mappers ported from dhroxy (https://github.com/c3po-initiative/dhroxy, Apache-2.0).
// Changes from the original: plain JavaScript; deterministic ids instead of random UUIDs so re-imports
// update rather than duplicate; every resource points to the citizen's Patient with a literal reference
// (instead of a logical CPR identifier); only the logged-in person's Patient is created, not delegated persons.
import {
  g, arr, str, nonBlank, joinNonBlank, safeId, prune, fhirDateTime, fhirInstant,
  htmlToText, base64Utf8, parseDecimal, contentKey
} from "./fhirutil.js";

const SDK = "https://www.sundhed.dk";
const ident = (system, value) => (value === undefined || value === null || value === "" ? undefined : { system, value: String(value) });
const cc = (text, ...codings) => ({ text, coding: codings.filter((c) => c && c.code) });

// ---------- Patient ----------
export function normalizeCpr(raw) {
  const value = str(raw)?.trim().replace(/-/g, "");
  return value && /^(((0[1-9]|[12][0-9]|3[01])(01|03|05|07|08|10|12))|((0[1-9]|[12][0-9]|30)(04|06|09|11))|((0[1-9]|[12][0-9])(02)))[0-9]{6}$/.test(value) ? value : undefined;
}

export function cprFrom({ forloeb, labs }) {
  const journal = normalizeCpr(g(forloeb, "personNummer"));
  const labCprs = new Set(arr(g(labs, "Svaroversigt", "Rekvisitioner"))
    .map((r) => normalizeCpr(g(r, "PatientCpr"))).filter(Boolean));
  // Conflicting clinical identities require a new collection, never a guess.
  if (labCprs.size > 1 || (journal && labCprs.size && !labCprs.has(journal)))
    throw new Error("Clinical sources identify different patients; reload and collect again.");
  return journal || [...labCprs][0];
}

export function mapPatient({ cpr, persons, forloeb }) {
  cpr = normalizeCpr(cpr);
  const list = arr(g(persons, "personDelegationData"));
  const me = cpr ? list.find((p) => normalizeCpr(g(p, "cpr")) === cpr) : undefined;
  const fullName = str(g(me, "name")) || str(g(forloeb, "navn"));
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const rel = str(g(me, "relationType"));
  return prune({
    resourceType: "Patient",
    id: `pat-${cpr || "unknown"}`,
    identifier: [ident("urn:oid:1.2.208.176.1.2", cpr)],
    name: [parts.length ? { text: fullName, family: parts.at(-1), given: parts.slice(0, -1) } : undefined],
    extension: rel ? [{ url: `${SDK}/fhir/StructureDefinition/relationType`, valueCode: rel }] : undefined
  });
}

// ---------- Observation (labsvar) ----------
function labStatus(code, text) {
  switch (code || text) {
    case "SvarEndeligt": case "KompletSvar": return "final";
    case "Foreloebigt": return "preliminary";
    case "Annulleret": return "cancelled";
    default: return "unknown";
  }
}

function labQuantity(qf) {
  const row = arr(g(qf, "Data"))[1];
  if (!Array.isArray(row) || row.length < 10) return undefined;
  const raw = str(row[9])?.trim();
  if (!raw || /^ikke påvist$/i.test(raw)) return undefined;
  const value = parseDecimal(raw);
  if (value === undefined) return undefined;
  const unit = str(row[10])?.trim();
  const known = new Set(["kg", "g", "mg", "mmol/L", "mol/L", "mg/L", "g/L", "mg/dL", "cm", "m", "%"]);
  const code = known.has(unit) ? unit : new Map([["mmHg", "mm[Hg]"], ["mm[Hg]", "mm[Hg]"], ["°C", "Cel"], ["Cel", "Cel"]]).get(unit);
  return { value, unit, ...(code ? { system: "http://unitsofmeasure.org", code } : {}) };
}

export function mapLabs(labs, patientRef) {
  const so = g(labs, "Svaroversigt");
  const rekById = new Map(arr(g(so, "Rekvisitioner")).map((r) => [str(g(r, "Id")), r]));
  return arr(g(so, "Laboratorieresultater")).map((res) => {
    const rekId = str(g(res, "RekvisitionsId"));
    const rek = rekById.get(rekId);
    const und = arr(g(res, "Undersoegelser"))[0];
    const key = joinNonBlank("-", rekId ?? g(res, "ProevenummerLaboratorie"), g(res, "AnalysetypeId")) || contentKey(res);
    const html = (k) => htmlToText(g(res, k));
    const qty = labQuantity(g(und, "QuantitativeFindings"));
    const narrative = nonBlank(html("Konklusion_html"), html("Diagnose_html"), html("Mikroskopi_html"), html("Makroskopi_html"), str(g(res, "Vaerdi")));
    const effective = fhirDateTime(g(res, "Resultatdato")) || fhirDateTime(g(rek, "Proevetagningstidspunkt"));
    const performer = nonBlank(str(g(rek, "RekvirentsOrganisation")), str(g(und, "Eksaminator")));
    const notes = [
      g(res, "AnalysevejledningLink") && `Analysevejledning: ${g(res, "AnalysevejledningLink")}`,
      html("Materiale_html") && `Materiale: ${html("Materiale_html")}`,
      html("Diagnose_html") && `Diagnose: ${html("Diagnose_html")}`,
      html("Konklusion_html") && `Konklusion: ${html("Konklusion_html")}`,
      html("Mikroskopi_html") && `Mikroskopi: ${html("Mikroskopi_html")}`,
      html("Makroskopi_html") && `Makroskopi: ${html("Makroskopi_html")}`,
      html("KliniskeInformationer_html") && `Kliniske oplysninger: ${html("KliniskeInformationer_html")}`
    ].filter(Boolean).map((text) => ({ text }));
    return prune({
      resourceType: "Observation",
      id: `lab-${safeId(key)}`,
      identifier: [ident(`${SDK}/labsvar/rekvisition`, rekId), ident(`${SDK}/labsvar/proevenummer`, g(res, "ProevenummerLaboratorie"))],
      status: labStatus(str(g(res, "ResultatStatuskode")), str(g(res, "ResultatStatus"))),
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory", display: "Laboratory" }] }],
      code: cc(
        nonBlank(str(g(und, "UndersoegelsesNavn")), str(g(res, "AnalysetypeId")), str(g(res, "Resultattype")), str(g(res, "Vaerditype"))) || "Laboratorieresultat",
        { system: `${SDK}/codes/labsvar`, code: str(g(und, "AnalyseKode")), display: str(g(und, "UndersoegelsesNavn")) }
      ),
      subject: { reference: patientRef },
      effectiveDateTime: effective,
      issued: fhirInstant(g(res, "Resultatdato")),
      performer: performer ? [{ display: performer }] : undefined,
      valueQuantity: qty?.unit ? qty : undefined,
      valueString: qty ? (qty.unit ? undefined : String(qty.value)) : narrative,
      referenceRange: g(res, "ReferenceIntervalTekst") ? [{ text: str(g(res, "ReferenceIntervalTekst")) }] : undefined,
      note: notes
    });
  });
}

// ---------- Condition (forløb + diagnoser) ----------
function conditionBase({ id, code, name, from, to, patientRef }) {
  return {
    resourceType: "Condition",
    id,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: to ? "resolved" : "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
    code: cc(name || code, { system: `${SDK}/diagnosekode`, code, display: name }),
    subject: { reference: patientRef },
    onsetDateTime: fhirDateTime(from),
    abatementDateTime: fhirDateTime(to)
  };
}

export function mapConditions(forloebList, diagnoser, patientRef) {
  const out = [];
  for (const e of forloebList) {
    const code = str(g(e, "diagnoseKode")), name = str(g(e, "diagnoseNavn"));
    if (!code && !name) continue;
    const key = str(g(e, "idNoegle", "noegle"));
    out.push(prune({
      ...conditionBase({ id: `cond-${safeId(key || contentKey(e))}`, code, name, from: g(e, "datoFra"), to: str(g(e, "datoTil")), patientRef }),
      identifier: [ident(`${SDK}/ejournal/forloeb`, key)],
      recordedDate: fhirDateTime(g(e, "datoOpdateret"))
    }));
  }
  for (const d of arr(g(diagnoser, "diagnoser"))) {
    const code = str(g(d, "diagnoseKode")), name = str(g(d, "diagnoseNavn"));
    if (!code && !name) continue;
    out.push(prune({
      ...conditionBase({ id: `cond-diag-${safeId(contentKey([code, name, g(d, "datoFra")]))}`, code, name, from: g(d, "datoFra"), to: str(g(d, "datoTil")), patientRef }),
      identifier: [ident(`${SDK}/diagnoser`, code)],
      category: g(d, "type") ? [{ coding: [{ system: `${SDK}/diagnosetype`, code: str(g(d, "type")) }] }] : undefined
    }));
  }
  return out;
}

// ---------- Encounter (kontaktperioder) ----------
function encounterStatus(status, end) {
  if (/finished/i.test(status || "") || end) return "finished";
  if (/planned/i.test(status || "")) return "planned";
  return "in-progress";
}

export function mapEncounters(forloebList, kontaktByKey, patientRef) {
  const out = [];
  for (const e of forloebList) {
    const key = str(g(e, "idNoegle", "noegle"));
    if (!key) continue;
    for (const kp of arr(g(kontaktByKey[key], "kontaktperioder"))) {
      const kpKey = str(g(kp, "noegle"));
      const info = g(kp, "enhedsInformation");
      out.push(prune({
        resourceType: "Encounter",
        id: `enc-${safeId(kpKey || contentKey([key, kp]))}`,
        identifier: [ident(`${SDK}/ejournal/kontaktperiode`, kpKey), ident(`${SDK}/ejournal/forloeb`, key)],
        status: encounterStatus(str(g(kp, "status")), str(g(kp, "datoTil"))),
        subject: { reference: patientRef },
        period: { start: fhirDateTime(g(kp, "datoFra")), end: fhirDateTime(g(kp, "datoTil")) },
        serviceProvider: info ? {
          display: joinNonBlank(" - ", g(info, "institution"), g(info, "afdeling")),
          identifier: ident(`${SDK}/ejournal/enhed`, joinNonBlank(":", g(info, "sygehusKode"), g(info, "afdelingsKode"), g(info, "kode")))
        } : undefined
      }));
    }
  }
  return out;
}

// ---------- DocumentReference (epikriser + notater) ----------
export function mapDocuments(forloebList, epikriserByKey, notaterByKey, patientRef) {
  const out = [];
  const one = (entry, key, category, idx) => {
    const title = nonBlank(str(g(entry, "overskrift")), str(g(entry, "notatType")), category);
    return prune({
      resourceType: "DocumentReference",
      id: `doc-${category}-${safeId(`${key}-${idx}`)}`,
      identifier: [ident(`${SDK}/ejournal/forloeb`, key)],
      status: "current",
      type: { text: nonBlank(str(g(entry, "notatType")), category) },
      subject: { reference: patientRef },
      date: fhirInstant(g(entry, "datoFra")),
      description: str(g(entry, "overskrift")),
      author: g(entry, "behandlerNavn") ? [{ display: str(g(entry, "behandlerNavn")) }] : undefined,
      content: [{ attachment: { contentType: "text/html", title, data: base64Utf8(nonBlank(g(entry, "broedtekst"), g(entry, "fritekst")) || "") } }]
    });
  };
  for (const e of forloebList) {
    const key = str(g(e, "idNoegle", "noegle"));
    if (!key) continue;
    arr(g(epikriserByKey[key], "epikriser")).forEach((x, i) => out.push(one(x, key, "epikrise", i)));
    arr(g(notaterByKey[key], "notater")).forEach((x, i) => out.push(one(x, key, "notat", i)));
  }
  return out;
}

// ---------- MedicationStatement (medicinkort) ----------
function medStatementStatus(raw) {
  switch ((raw || "").toLowerCase()) {
    case "": case "active": return "active";
    case "completed": return "completed";
    case "stopped": case "ended": return "stopped";
    case "entered-in-error": return "entered-in-error";
    default: return "unknown";
  }
}

export function mapMedicationStatements(cardEntries, detailsById, patientRef) {
  return cardEntries.map((e) => {
    const ordId = str(g(e, "OrdinationId"));
    const dm = g(detailsById[ordId], "DrugMedication");
    const substance = str(g(e, "ActiveSubstance")) || str(g(dm, "ActiveSubstance"));
    const cause = str(g(e, "Cause"));
    return prune({
      resourceType: "MedicationStatement",
      id: `medstmt-${safeId(ordId || contentKey(e))}`,
      identifier: [ident(`${SDK}/medication/ordination`, ordId)],
      status: medStatementStatus(str(g(e, "Status", "EnumStr"))),
      medicationCodeableConcept: cc(
        nonBlank(str(g(e, "DrugMedication")), substance) || "Medication",
        { system: "http://www.whocc.no/atc", code: str(g(dm, "AtcCode")), display: str(g(dm, "AtcText")) || str(g(dm, "AtcCode")) },
        { system: `${SDK}/medication/active-substance`, code: substance, display: substance }
      ),
      subject: { reference: patientRef },
      effectivePeriod: { start: fhirDateTime(g(e, "StartDate")), end: fhirDateTime(nonBlank(g(e, "EndDate"), g(e, "DosageEndDate"))) },
      dateAsserted: fhirDateTime(g(e, "StartDate")),
      reasonCode: cause ? [{ text: cause }] : undefined,
      dosage: [{ text: str(g(e, "Dosage")), patientInstruction: cause }]
    });
  });
}

// ---------- MedicationRequest (ordinationer + recepter) ----------
export function mapMedicationRequests(details, cardEntries, prescriptions, patientRef) {
  const entryById = new Map(cardEntries.map((e) => [str(g(e, "OrdinationId")), e]));
  const out = details.map((d) => {
    const dm = g(d, "DrugMedication"), tr = g(d, "Treatment"), dos = g(d, "Dosage"), by = g(d, "CreatedBy");
    const ordId = str(g(dm, "OrdinationIdentifier"));
    const entry = entryById.get(ordId);
    const requester = joinNonBlank(" - ", g(by, "Name"), g(by, "OrganisationName"));
    return prune({
      resourceType: "MedicationRequest",
      id: `medreq-${safeId(ordId || contentKey(d))}`,
      identifier: [ident(`${SDK}/medicinkort/ordination`, ordId), ident(`${SDK}/medicinkort/drug-medication`, g(dm, "DrugMedicationIdentifier"))],
      status: g(dm, "HasNegativeConsent") === true ? "stopped" : "active",
      intent: "order",
      medicationCodeableConcept: cc(
        nonBlank(str(g(dm, "DrugMedication")), str(g(entry, "DrugMedication")), str(g(entry, "ActiveSubstance"))) || "Medication",
        { system: "http://www.whocc.no/atc", code: str(g(dm, "AtcCode")), display: str(g(dm, "AtcText")) || str(g(dm, "AtcCode")) }
      ),
      subject: { reference: patientRef },
      authoredOn: fhirDateTime(nonBlank(g(entry, "StartDate"), g(tr, "StartDate"))),
      requester: requester ? { display: requester } : undefined,
      note: g(tr, "Cause") ? [{ text: str(g(tr, "Cause")) }] : undefined,
      dosageInstruction: [{
        text: nonBlank(str(g(dos, "Text")), str(g(entry, "Dosage"))),
        route: g(tr, "Administration") ? { text: str(g(tr, "Administration")) } : undefined
      }]
    });
  });
  for (const p of prescriptions) {
    const pid = str(g(p, "PrescriptionId"));
    const statusRaw = (str(g(p, "Status")) || "").toLowerCase();
    out.push(prune({
      resourceType: "MedicationRequest",
      id: `presc-${safeId(pid || contentKey(p))}`,
      identifier: [ident(`${SDK}/recept`, pid), ident(`${SDK}/medicinkort/ordination`, g(p, "OrdinationId"))],
      status: statusRaw === "afsluttet" ? "completed" : ["aktiv", "åben", "open"].includes(statusRaw) ? "active" : "unknown",
      intent: "order",
      medicationCodeableConcept: { text: joinNonBlank(", ", g(p, "Drug"), g(p, "Strength"), g(p, "Form")) || str(g(p, "ActiveSubstance")) || "Prescription" },
      subject: { reference: patientRef },
      authoredOn: fhirDateTime(nonBlank(g(p, "PrescriptionDate"), g(p, "CreatedDate"))),
      note: g(p, "Cause") ? [{ text: str(g(p, "Cause")) }] : undefined,
      dosageInstruction: g(p, "Dosage") ? [{ text: str(g(p, "Dosage")) }] : undefined,
      dispenseRequest: { validityPeriod: { start: fhirDateTime(g(p, "ValidFromDate")), end: fhirDateTime(g(p, "ValidToDate")) } }
    }));
  }
  return out;
}

// ---------- Immunization ----------
export function mapImmunizations(records, patientRef) {
  return records.map((r) => {
    const vid = str(g(r, "VaccinationIdentifier"));
    const neg = g(r, "NegativeConsent") === true, active = g(r, "ActiveStatus");
    const when = fhirDateTime(g(r, "EffectuatedDateTime"));
    return prune({
      resourceType: "Immunization",
      id: `imm-${safeId(vid || contentKey(r))}`,
      identifier: [ident(`${SDK}/vaccination/id`, vid)],
      status: neg ? "not-done" : active === true ? "completed" : active === false ? "not-done" : undefined,
      vaccineCode: { text: str(g(r, "Vaccine")) },
      patient: { reference: patientRef },
      occurrenceDateTime: when,
      recorded: when,
      performer: g(r, "EffectuatedBy") ? [{ actor: { display: str(g(r, "EffectuatedBy")) } }] : undefined,
      note: [
        g(r, "CoverageDuration") && `Coverage duration: ${g(r, "CoverageDuration")}`,
        g(r, "SelfCreated") === true && "Recorded as self-created",
        neg && "Negative consent recorded"
      ].filter(Boolean).map((text) => ({ text }))
    });
  });
}

// ---------- ImagingStudy + DiagnosticReport (billedbeskrivelser) ----------
export function mapImaging(responses, patientRef) {
  const studies = new Map(), reports = new Map();
  for (const resp of responses) {
    const rek = g(resp, "Rekvirent");
    const requester = joinNonBlank(" ", g(rek, "Fornavn"), g(rek, "Efternavn"), g(rek, "Enhed"));
    for (const svar of arr(g(resp, "Svar"))) {
      const svarId = str(g(svar, "Id")), henvId = str(g(svar, "HenvisningsId"));
      const studyRefs = [];
      for (const u of arr(g(svar, "Undersoegelser"))) {
        const uKey = nonBlank(str(g(u, "Id")), str(g(u, "BilledId"))) || contentKey([henvId, u]);
        const id = `img-${safeId(uKey)}`;
        studyRefs.push({ reference: `ImagingStudy/${id}` });
        if (studies.has(id)) continue;
        studies.set(id, prune({
          resourceType: "ImagingStudy",
          id,
          identifier: [
            ident(`${SDK}/imaging/referral`, g(resp, "Id")), ident(`${SDK}/imaging/henvisning`, henvId),
            ident(`${SDK}/imaging/report`, svarId), ident(`${SDK}/imaging/undersoegelse`, g(u, "Id")),
            ident(`${SDK}/imaging/billed`, g(u, "BilledId"))
          ],
          status: "available",
          subject: { reference: patientRef },
          started: fhirDateTime(g(u, "Dato")),
          referrer: requester ? { display: requester } : undefined,
          description: nonBlank(str(g(u, "Navn")), str(g(svar, "Navn")), str(g(svar, "Type"))) || "Imaging study",
          note: g(resp, "YderligereOplysninger") ? [{ text: str(g(resp, "YderligereOplysninger")) }] : undefined
        }));
      }
      const rid = `dr-${safeId(nonBlank(svarId, henvId) || contentKey(svar))}`;
      const performer = nonBlank(str(g(svar, "Producent", "Navn")), str(g(svar, "Producent", "Enhed")), str(g(resp, "Producent", "Navn")), str(g(resp, "Producent", "Enhed")));
      const prev = reports.get(rid);
      reports.set(rid, prune({
        resourceType: "DiagnosticReport",
        id: rid,
        identifier: [ident(`${SDK}/imaging/report`, svarId), ident(`${SDK}/imaging/henvisning`, henvId), ident(`${SDK}/imaging/referral`, g(resp, "Id"))],
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "imaging", display: "Imaging" }] }],
        code: { text: nonBlank(str(g(svar, "Navn")), str(g(svar, "Type"))) || "Billedbeskrivelse" },
        subject: { reference: patientRef },
        effectiveDateTime: fhirDateTime(g(svar, "Dato")),
        issued: fhirInstant(nonBlank(g(svar, "UdgivelsesDato"), g(svar, "Dato"))),
        performer: performer ? [{ display: performer }] : undefined,
        resultsInterpreter: requester ? [{ display: requester }] : undefined,
        conclusion: str(g(svar, "Beskrivelse")),
        imagingStudy: [...(prev?.imagingStudy || []), ...studyRefs].filter((r, i, a) => a.findIndex((x) => x.reference === r.reference) === i)
      }));
    }
  }
  return [...reports.values(), ...studies.values()];
}

// ---------- Appointment ----------
export function mapAppointments(resp, patientRef) {
  return arr(g(resp, "appointments")).map((a) => {
    const docId = str(g(a, "documentId"));
    const place = (x) => x && joinNonBlank(" - ", g(x, "organisation"), g(x, "address", "formatted"));
    const performer = place(g(a, "performer")), location = place(g(a, "location"));
    return prune({
      resourceType: "Appointment",
      id: `apt-${safeId(docId || contentKey([g(a, "startTime"), g(a, "title")]))}`,
      identifier: [ident(`${SDK}/appointments/documentId`, docId)],
      status: "booked",
      serviceType: [cc(str(g(a, "title")), { system: `${SDK}/appointments/type`, code: str(g(a, "appointmentType")) })],
      description: str(g(a, "title")),
      start: fhirInstant(g(a, "startTime")),
      end: fhirInstant(g(a, "endTime")),
      participant: [
        { actor: { reference: patientRef }, status: "accepted" },
        performer && { actor: { display: performer }, status: "accepted" },
        location && location !== performer && { actor: { display: location }, status: "accepted" }
      ].filter(Boolean)
    });
  });
}

// ---------- Organization (egen læge) ----------
export function mapOrganizations(resp) {
  return arr(g(resp, "Organizations")).map((o) => {
    const id = str(g(o, "OrganizationId")) || contentKey(o);
    const line = joinNonBlank(" ", g(o, "Street"), g(o, "HouseNumberFrom"), g(o, "Floor"), g(o, "Door"));
    const cat = str(g(o, "InformationsUnderkategori"));
    return prune({
      resourceType: "Organization",
      id: `org-${safeId(id)}`,
      identifier: [ident("http://cvr.dk", g(o, "CvrNumber"))],
      name: nonBlank(str(g(o, "DisplayName")), str(g(o, "Name"))) || `Organization ${id}`,
      type: cat ? [cc(cat, { system: `${SDK}/organization/category`, code: cat.toLowerCase().replace(/ /g, "-"), display: cat })] : undefined,
      address: [{ line: line ? [line] : undefined, city: str(g(o, "City")), postalCode: str(g(o, "ZipCode")), district: str(g(o, "Municipality")), country: "DK" }],
      telecom: g(o, "Homepage") ? [{ system: "url", value: str(g(o, "Homepage")) }] : undefined
    });
  });
}
