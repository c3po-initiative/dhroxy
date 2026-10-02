# Sundhed.dk → FHIR bridge (browser extension)

A Chrome extension that fetches **your own** data from sundhed.dk, maps it to FHIR R4 in the browser and uploads it to a FHIR server of your choice (e.g. HAPI or THP). There is no server in between: dhroxy's mapping is built into the extension.

## How it works

1. You log in to sundhed.dk with MitID as usual. The extension notes the two security headers your tab sends (`x-xsrf-token`, `conversation-uuid`). **Cookies are never read, stored or copied.**
2. You click **"Hent mine data"** (fetch my data). The sundhed.dk API calls run *inside your own sundhed.dk tab*, exactly as sundhed.dk itself makes them, so the browser handles the login session. The responses are mapped to FHIR locally, and you see a summary.
3. You click **"Send til FHIR-server"** (send to FHIR server) and confirm. The data is sent as one transaction with deterministic ids (`sdk-<hash>`), so repeated uploads update instead of creating duplicates.

## What is fetched

| sundhed.dk | FHIR |
|---|---|
| Person selection | Patient (only yourself, not people you hold a power of attorney for) |
| Own GP | Organization (+ `Patient.generalPractitioner`) |
| Lab results | Observation |
| E-journal courses + diagnoses | Condition |
| E-journal contact periods | Encounter |
| E-journal discharge summaries + notes | DocumentReference |
| Medicine card (active ordinations) | MedicationStatement + MedicationRequest |
| Prescriptions | MedicationRequest |
| Vaccinations | Immunization |
| Imaging reports | DiagnosticReport + ImagingStudy |
| Appointments (±1 year) | Appointment |

Every resource references your Patient and is tagged `urn:sundhed-fhir-bridge|sundhed.dk`.

## Getting started

```bash
docker compose up -d     # HAPI at http://localhost:8090/fhir (localhost only)
```

1. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder.
2. Log in at https://www.sundhed.dk and open e.g. your health record. **Keep the tab open.**
3. Click the extension icon → **Hent mine data fra sundhed.dk** → check the summary → **Send til FHIR-server**.
4. View the data: `http://localhost:8090/fhir/Patient?_tag=urn:sundhed-fhir-bridge|sundhed.dk` or `.../Patient/<id>/$everything`.

Other FHIR servers (e.g. THP) and how many years of lab results to fetch are set under **Indstillinger** (settings). The extension's UI is in Danish.

## Security

- No intermediate server. Your health data goes only from sundhed.dk to your browser and then to the FHIR server you chose.
- The extension never touches cookies. The login session stays in the sundhed.dk tab.
- The two headers and the fetched data are kept in memory only (`chrome.storage.session`). They are cleared when the browser closes, after 30 minutes, or when you press **"Glem session og data"** (forget session and data).
- Nothing happens automatically. Both fetching and sending require a click.
- The extension can only talk to sundhed.dk and localhost. Other FHIR servers require you to grant access to that specific address.
- The bearer token for the FHIR server is stored in plain text in `chrome.storage.local`. Use short-lived tokens.

## Limitations

- Relies on sundhed.dk's internal APIs, like dhroxy. They can change without notice, and this use is not officially supported. Check sundhed.dk's terms.
- Not yet tested against live sundhed.dk data, only against mock responses shaped like dhroxy's models.
- The medicine card is fetched with active ordinations only (as in dhroxy).
- `Encounter.class` and a few other fields that FHIR requires are missing because sundhed.dk doesn't provide them. HAPI accepts this by default; a server with strict validation will not.
- Home measurements, care plans and referrals from dhroxy are not included yet.

## License

Apache License 2.0, like the rest of dhroxy (see `../LICENSE`). The sundhed.dk calls (`sundhed.js`) and the mapping (`mappers.js`) are ported from dhroxy's Kotlin code. Changes from the server: JavaScript instead of Kotlin, deterministic ids instead of random ones, direct references to the Patient, only the logged-in person as Patient, and all courses fetched instead of only the first 10.
