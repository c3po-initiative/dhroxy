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

### Threat model: what this does and doesn't change

**It does not weaken sundhed.dk's security.**

- It gets no more access than you already have: only the data you can see yourself when logged in. It doesn't bypass MitID, can't read other people's data and can't change anything on sundhed.dk (all calls are reads; the one POST is the appointment search).
- It uses your session the way the browser already does, inside your own sundhed.dk tab. Nothing is copied out of it.
- CSRF protection guards against *other websites* making requests in your name. An extension you installed yourself, with explicit permission for sundhed.dk, is outside that threat model by design.
- Compared with running dhroxy as a server, where the session cookies are copied into another program, this is a smaller attack surface.

**It does move risk, and you take it on.**

1. **The extension is a high-value target.** It can read everything you can see on sundhed.dk. This copy only sends data where you tell it to, but a modified copy could quietly send it elsewhere. Install it only from source you have read, load it unpacked, and don't install builds or forks from others. This extension should not be published in the Chrome Web Store or distributed as a ready-made package.
2. **Your data leaves a governed system.** On sundhed.dk your data has access control, audit logging and an operator responsible for it. In your own FHIR server, that protection is yours to provide. The included HAPI has no login and is bound to `127.0.0.1` for that reason; never expose it to a network without authentication, and delete it after testing (`docker compose down`).
3. **It is not an official integration.** It automates sundhed.dk's internal APIs, as dhroxy does. That is a terms-of-use and stability question rather than a technical break-in, but it is the user's responsibility. Production use should go through official national integrations instead.

## Limitations

- Relies on sundhed.dk's internal APIs, like dhroxy. They can change without notice, and this use is not officially supported. Check sundhed.dk's terms.
- Not yet tested against live sundhed.dk data, only against mock responses shaped like dhroxy's models.
- The medicine card is fetched with active ordinations only (as in dhroxy).
- `Encounter.class` and a few other fields that FHIR requires are missing because sundhed.dk doesn't provide them. HAPI accepts this by default; a server with strict validation will not.
- Home measurements, care plans and referrals from dhroxy are not included yet.

## License

Apache License 2.0, like the rest of dhroxy (see `../LICENSE`). The sundhed.dk calls (`sundhed.js`) and the mapping (`mappers.js`) are ported from dhroxy's Kotlin code. Changes from the server: JavaScript instead of Kotlin, deterministic ids instead of random ones, direct references to the Patient, only the logged-in person as Patient, and all courses fetched instead of only the first 10.
