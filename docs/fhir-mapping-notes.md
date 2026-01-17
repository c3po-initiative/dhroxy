# FHIR Mapping Notes (sundhed.dk → FHIR R4)

Scope: Stateless, read-only proxy that forwards sundhed.dk APIs (see `openapi-spec-consolidated-trimmed.json`) to FHIR resources/bundles. Patient context is implied by downstream auth; no local persistence.

## Domain coverage (source endpoints)
- Laboratory: `/api/labsvar/svaroversigt` (+ filters/sorting metadata).
- Vaccinations: `/app/vaccination/api/v1/effectuatedvaccinations/`, `/app/vaccination/api/v1/plannedvaccinations/`, `/app/vaccination/api/v1/overview`, history.
- Medication card: `app/medicinkort2borger/api/v1/...` (ordinations, prescriptions, dispensings, effectuations, overviews), and nav shortcuts under `/api/navigationservice/.../medicinkortet`.
- Appointments: `/app/aftalerborger/api/v1/aftaler/cpr`, `.../print`, `.../tekster`.
- Diagnoses: `/app/diagnoserborger/api/v1/diagnoser`.
- Referrals & imaging: `/app/DenNationaleHenvisningsformidling/api/v1/henvisninger`, `/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/...`.
- Home measurements: `/app/hjemmemaalingerborger/api/v1/maalinger`.
- E-journal (notes/epikriser/forløb): `/app/ejournalportalborger/api/ejournal/...`.
- Vaccination/medication/imaging navigation endpoints under `/api/navigationservice/...` provide lite views; prefer the app-specific APIs above when available.

## Target FHIR resources (initial set)
- `Patient` (minimal placeholder derived from downstream demographic fields when present).
- `Observation` (labs and home measurements).
- `DiagnosticReport` + `Observation` (labs; imaging reports as needed).
- `Immunization` (effectuated vaccinations); planned vaccinations as `Immunization` with `status=intended` or `CarePlan`/`MedicationRequest` if vaccination order details exist.
- `MedicationRequest` (ordinations/orders) and `MedicationStatement` (current active medication card snapshot), `MedicationDispense` (dispensings/effectuations).
- Medication overview (counts) exposed as `Observation` (category `therapy`) using `/app/medicinkort2borger/api/v1/ordinations/overview/` and `/app/medicinkort2borger/api/v1/prescriptions/overview/`.
- `Appointment` (aftaler) and optionally `Schedule/Slot` for calendar views.
- `Condition` (diagnoses/problems).
- `ServiceRequest` (referrals/henvisninger).
- `ImagingStudy` + `DiagnosticReport` (billedbeskrivelser + henvisning).
- `ServiceRequest` for imaging referrals (henvisninger) using samme payload as billedbeskrivelser/henvisning.
- `DocumentReference` / `Composition` (ejournal notes, epikriser).
- `Bundle` (`searchset`) wrappers with paging and self/next/prev links.

## Search parameter mapping (examples)
- Labs `GET /fhir/Observation?category=laboratory&date=ge2022-01-01&date=le2025-12-07`: map to `/api/labsvar/svaroversigt?fra=...&til=...&omraade=...` (optionally `omraade`→`category`).
- Vaccinations `GET /fhir/Immunization?status=completed`: map to effectuated; `status=intended` → planned.
- Medication `GET /fhir/MedicationRequest?status=active`: map to ordinations active; `MedicationDispense` search may take `whenhandedover`/`whenprepared` date to filter dispensings.
- Appointments `GET /fhir/Appointment?date=...` → `aftaler` date window (FromDate/ToDate in POST body for `/app/aftalerborger/api/v1/aftaler/cpr`).
- Diagnoses `GET /fhir/Condition?category=encounter-diagnosis` → `/app/diagnoserborger/api/v1/diagnoser`.
- Home measurements `GET /fhir/Observation?category=survey|vital-signs` → `/app/hjemmemaalingerborger/api/v1/maalinger` with grouping filters from request body.

## Field mapping notes (high level)
- Identifiers: derive stable FHIR `id` from source identifiers (e.g., `LaboratorieProevenummer`, `VaccinationIdentifier`, ordination/prescription IDs). Preserve original IDs in `identifier` with `system` pointing to sundhed.dk namespace.
- Status enums: map source status strings to FHIR codesets (e.g., lab `ResultatStatus` → `Observation.status`; vaccination `ActiveStatus` → `Immunization.status`; medication ordination status → `MedicationRequest.status`/`intent`).
- Coding: use Danish/local code systems when provided (e.g., IUPAC lab codes, ATC for medications, SNOMED/ICD where present). Fallback to text-only `CodeableConcept` when code absent.
- Dates: normalize ISO offsets to FHIR `dateTime`; use `effectiveDateTime/Period` and `issued` appropriately; capture collection time vs. result time separately when available.
- Participants: map clinicians/organizations to `performer`/`requester`/`asserter` with `display` names; include `Organization` references if IDs/OIDs available.
- Narrative: preserve HTML fields (e.g., `_html` properties) into `text.div` (wrapped in `<div xmlns="http://www.w3.org/1999/xhtml">`).
- Pagination: if downstream supports paging, translate to FHIR bundle `link` entries; otherwise return single-page bundles with `total` estimated from payload counts.
- Errors: wrap downstream errors into `OperationOutcome` with `issue.diagnostics` carrying upstream message/HTTP status.

## Header/auth handling
- Required headers from OpenAPI examples (e.g., `conversation-uuid`, `cookie`, `x-xsrf-token`, `accept`, `referer`) must be forwarded; proxy should allow configurable header allowlist and blocklist.
- No secrets persisted; token/cookie extraction from inbound request (or gateway) and forwarded as-is to sundhed.dk.
- Timeouts and retry policy per service, with circuit breaker defaults; log redaction for PII.

## Open questions / TBD
- Exact code systems for labs/diagnoses (IUPAC vs. SNOMED vs. ICD10) — need confirmation per payload.
- Whether planned vaccinations should be exposed as `Immunization` with `status=intended` or via `MedicationRequest` (if dose/product data resembles a prescription).
- Pagination and filtering semantics for medication/appointment endpoints (few examples lack paging hints).
- Should nav endpoints be used as lightweight fallbacks or avoided in favor of app-specific APIs only?
- Consent/authorization flags (e.g., `HasConsentData`) — decide how to surface (extension vs. OperationOutcome).
