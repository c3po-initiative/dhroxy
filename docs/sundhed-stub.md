# Local sundhed.dk test stub

Run a synthetic upstream without a sundhed.dk account, browser session or MitID:

```bash
./gradlew sundhedStub
```

In another terminal, point dhroxy at it:

```bash
SUNDHED_CLIENT_BASE_URL=http://127.0.0.1:9090 ./gradlew bootRun
```

Then make normal FHIR requests, without authentication headers:

```bash
curl http://localhost:8080/fhir/Patient
curl 'http://localhost:8080/fhir/Observation?date=ge2026-01-01&date=le2026-12-31'
curl http://localhost:8080/fhir/MedicationRequest
curl 'http://localhost:8080/fhir/Appointment?date=ge2026-01-01&date=le2026-12-31'
```

The stub binds to `127.0.0.1` only. Stop it with Ctrl-C. It lives in the test source set, uses the JDK HTTP server and existing Jackson dependencies, and is excluded from the production jar. Java 21 is required, as for dhroxy itself.

## Scenarios

```bash
./gradlew sundhedStub --args='--port=9091 --scenario=gp-unavailable'
```

| Scenario | Behavior |
| --- | --- |
| `happy` (default) | Linked synthetic records for all 22 client endpoints. |
| `empty` | Empty collections and zero overview counts; GP id absent. |
| `gp-unavailable` | GP lookup returns `404 text/plain`; medication endpoints still work. |
| `large-labs` | Repeats each matching lab result 1,500 times, exceeding the old 256 KB client buffer for the supplied fixtures. |
| `unauthorized` | Known endpoints return 401. |
| `forbidden` | Known endpoints return 403. |
| `upstream-error` | Known endpoints return 500. |

Fixtures use fixed dates around **15 June 2026**. Use explicit date ranges when testing: the client's default windows move with today's date. Data is invented, including the test CPR-shaped identifier `0101900000`; it is not a real patient record or a clinically meaningful example.

## Covered contracts

The implementation follows `SundhedClient.kt`, the mapper tests, `MedicationCardServiceTest`, `browser-extension/sundhed.js`, and `docs/fhir-mapping-notes.md`. Current executable code takes precedence where the older notes disagree. The OpenAPI file mentioned in the notes is absent from this repository.

- Labs: `/app/proevesvarportal/api/v1/svaroversigt`, with required `source=RegionaleProevesvar`, `fra`, `til`; filters dates and `omraade`. Includes quantitative CRP and pathology HTML, linked requisitions, and Danish characters. The obsolete `/api/labsvar/svaroversigt` returns 404.
- Appointments: **POST** `/app/aftalerborger/api/v1/aftaler/cpr`, requiring JSON `FromDate`, `ToDate`, `Version: 2`, `WithPartials: true`; filters dates inclusively.
- Person selection, GP id and organisation details.
- Medication: session-scoped active ordinations, ordination details, prescriptions with both `aktiv` and `afsluttet` status, and overview counts. Active-card requests require the client's sorting/status query.
- E-journal: course pagination (`Side`, `ItemsPerPage`), contacts, discharge summaries and notes. Detail requests require the JSON-encoded `noegle` object containing `Noegle`.
- Vaccinations and history; imaging list and details selected by `Id` and/or `undersoegelsesId`.
- Diagnoses, referrals, home measurements and care plans.

Trailing slashes are accepted. Unknown paths/ids return 404, unsupported methods return 405 with `Allow`, and malformed required parameters return 400. Error scenarios apply after route/method matching. The fixtures' linked ids are `ord-1`, `1001`, `course-1`, `ref-1`, `study-1`, and organisation `12345`.

This is a development contract stub, not an implementation of the entire portal. It does not emulate authentication, consent decisions, all sorting options, or undocumented APIs. Error scenarios simulate status responses rather than validating credentials. The browser extension's fetch functions can use the same HTTP endpoints via a test `call` adapter; the extension UI still requires a real sundhed.dk tab and is not redirected by this change.

## Automated use

```kotlin
SundhedStub().use { stub ->
    val props = SundhedClientProperties(baseUrl = stub.baseUrl)
    val client = SundhedClient(
        WebClientConfig(props).sundhedWebClient(WebClient.builder()), props
    )
    // Call client methods inside runBlocking, or use stub.baseUrl in a Spring test.
    // stub.requests contains the last 1,000 requests, including headers and bodies.
}
```

The default constructor allocates an ephemeral port, so tests can run independently. Request history stays in memory; use synthetic headers. Responses are copied per request so filters and scenarios cannot mutate subsequent responses. Edit `src/test/resources/sundhed-stub/fixtures.json` to extend the dataset.

```bash
./gradlew test --tests 'dhroxy.stub.*'
./gradlew test
```

`SundhedStubTest` exercises all client methods over HTTP, filters, header precedence, malformed requests, error statuses, empty results, large payloads and the optional GP-lookup regression. `SundhedStubFhirTest` runs the application with real services and mappers against the stub and checks every exposed resource search.
