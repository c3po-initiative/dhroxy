# dhroxy - Danish Healthcare Infrastructure Proxy

This service exposes a read-only FHIR API that maps sundhed.dk endpoints into FHIR resources. The server runs at `/fhir`.

## Supported resources and source endpoints
- Patient → personvælger (/app/personvaelgerportal/api/v1/GetPersonSelection)
- Observation (labs) → labsvar (/api/labsvar/svaroversigt)
  - `category` mapped to sundhed.dk `omraade` (default `Alle`): `laboratory|kliniskbiokemi`→KliniskBiokemi, `mikro*`→Mikrobiologi, `patologi`→Patologi, other/blank→Alle.
- Condition (diagnoser) → e-journal forløbsoversigt (/app/ejournalportalborger/api/ejournal/forloebsoversigt)
- Encounter (kontaktperioder) → e-journal kontaktperioder (/app/ejournalportalborger/api/ejournal/kontaktperioder?noegle=…)
- DocumentReference (epikriser/notater) → e-journal epikriser + notater (/app/ejournalportalborger/api/ejournal/epikriser, /notater)
- MedicationStatement → medicinkort ordination details (/app/medicinkort2borger/api/v1/ordinations/{id}/details)
- MedicationRequest → medicinkort prescriptions (/app/medicinkort2borger/api/v1/prescriptions/overview + details)
- Immunization → vaccination (/app/vaccination/api/v1/effectuatedvaccinations)
- ImagingStudy/DiagnosticReport → billedbeskrivelser (/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisning*/henvisninger)
- Appointment → aftalerborger (/app/aftalerborger/api/v1/aftaler/cpr)
- Organization → minlæge + core organisation (/api/minlaegeorganization + /api/core/organisation/{id})

## Security model

dhroxy has no built-in authentication. It is a stateless pass-through proxy — you must first obtain valid session headers from sundhed.dk and include them in every request.

```mermaid
flowchart TD
    subgraph precondition["Precondition: Obtain Session Headers"]
        direction TB
        U[User] -->|"1. Authenticate via browser"| SDK["sundhed.dk Login"]
        SDK -->|"2. Session established"| COOK["Obtain required headers:<br/><b>cookie</b><br/><b>x-xsrf-token</b><br/><b>conversation-uuid</b>"]
    end

    subgraph dhroxy["dhroxy Proxy (stateless)"]
        direction TB
        FHIR["FHIR Endpoint<br/>(e.g. /fhir/Patient)"]
        EXTRACT["Extract incoming HTTP headers"]
        FILTER["Filter to forwarded-header allowlist:<br/>accept, cookie, conversation-uuid,<br/>x-xsrf-token, x-queueit-ajaxpageurl,<br/>referer, user-agent, accept-language,<br/>page-app-id, dnt"]
        MERGE["Merge with fallback headers<br/>(incoming headers take priority)"]
        READONLY{"GET only?"}
        REJECT["Reject: only GET allowed"]
        CLIENT["SundhedClient<br/>(WebClient)"]
    end

    subgraph upstream["Upstream"]
        SUNDHED["sundhed.dk API"]
    end

    COOK -->|"3. Include headers<br/>in FHIR request"| FHIR
    FHIR --> EXTRACT
    EXTRACT --> FILTER
    FILTER --> MERGE
    MERGE --> READONLY
    READONLY -->|No| REJECT
    READONLY -->|Yes| CLIENT
    CLIENT -->|"Forwarded headers<br/>authenticate request"| SUNDHED
    SUNDHED -->|"Auth failure"| ERR["Error response"]
    SUNDHED -->|"Auth success"| RESP["JSON response"]
    RESP -->|"Map to FHIR"| FHIRR["FHIR Resource<br/>returned to client"]
```

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant sundhed.dk
    participant dhroxy
    participant SundhedClient

    rect rgb(255, 243, 205)
        Note over User,sundhed.dk: Precondition – obtain session
        User->>Browser: Log in to sundhed.dk
        Browser->>sundhed.dk: Authenticate (MitID / NemID)
        sundhed.dk-->>Browser: Set cookie, x-xsrf-token, conversation-uuid
        User->>Browser: Copy headers from DevTools
    end

    rect rgb(209, 236, 241)
        Note over User,SundhedClient: FHIR request through dhroxy
        User->>dhroxy: GET /fhir/Patient<br/>Headers: cookie, x-xsrf-token, conversation-uuid
        dhroxy->>dhroxy: Extract incoming headers
        dhroxy->>dhroxy: Filter to forwarded-header allowlist
        dhroxy->>dhroxy: Merge with fallback headers (incoming wins)
        dhroxy->>dhroxy: Verify GET-only
        dhroxy->>SundhedClient: Forward request with merged headers
        SundhedClient->>sundhed.dk: GET /app/.../api/...
        alt valid session
            sundhed.dk-->>SundhedClient: 200 JSON payload
            SundhedClient-->>dhroxy: Raw response
            dhroxy->>dhroxy: Map to FHIR resource
            dhroxy-->>User: 200 FHIR Bundle / Resource
        else expired / missing session
            sundhed.dk-->>SundhedClient: 401 / 403
            SundhedClient-->>dhroxy: Error status
            dhroxy-->>User: Error response
        end
    end
```

### Headers and auth
- The proxy is stateless. It forwards incoming headers (case-insensitive) that are listed in `application.yml` under `sundhed.client.forwarded-headers` and supplements them with `sundhed.client.fallback-headers` when not provided.
- You can preconfigure fallback headers in `application.yml` (e.g., `cookie`, `x-xsrf-token`, `conversation-uuid`, `user-agent`). Fallback headers are only used when not provided by incoming forwarded headers.
- Typical required headers for sundhed.dk calls (examples in `application.yml`): `cookie`, `x-xsrf-token`, `conversation-uuid`, `user-agent`. These are forwarded to every upstream call.
- Headers sent in requests to dhroxy take precedence over the configured fallback headers.

## Example: Read/Search-Only FHIR Transaction

Only GET-based entries are allowed in a FHIR transaction. The example below fetches a small slice of each exposed resource type in a single request:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "request": {
        "method": "GET",
        "url": "Patient"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "Observation?date=ge2024-01-01"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "Condition"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "Encounter"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "DocumentReference"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "MedicationStatement"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "MedicationRequest"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "ImagingStudy"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "DiagnosticReport"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "Immunization"
      }
    },
    {
      "request": {
        "method": "GET",
        "url": "Organization"
      }
    }
  ]
}
```

POST this bundle to `/fhir` and the proxy will return a `transaction-response` bundle where each entry contains the matching response bundle or resource for that GET. Only GET operations (read/search) are accepted inside a transaction; any other HTTP verb will be rejected.
  
## Running with Docker (distroless runtime)

Build and run:
```bash
docker build -t dhroxy .
docker run -p 8080:8080 \
  -e SUNDHED_FALLBACK_COOKIE='sdk-user-accept-cookies=false; ...' \
  -e SUNDHED_FALLBACK_X_XSRF_TOKEN='your-xsrf' \
  -e SUNDHED_FALLBACK_CONVERSATION_UUID='f8da2975-6c6e-...' \
  -e SUNDHED_FALLBACK_USER_AGENT='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' \
  dhroxy
```

### Fallback headers via env vars
Fallback headers in `application.yml` under `sundhed.client.fallback-headers` can be set with env vars using upper-case keys prefixed with `SUNDHED_FALLBACK_`, dots/hyphens replaced by underscores. Examples:
- `sundhed.client.fallback-headers.cookie` → `SUNDHED_FALLBACK_COOKIE`
- `sundhed.client.fallback-headers.x-xsrf-token` → `SUNDHED_FALLBACK_X_XSRF_TOKEN`
- `sundhed.client.fallback-headers.conversation-uuid` → `SUNDHED_FALLBACK_CONVERSATION_UUID`
- `sundhed.client.fallback-headers.user-agent` → `SUNDHED_FALLBACK_USER_AGENT`

Fallback headers are only used when the corresponding header is not provided in the incoming request. Headers sent in requests take precedence.

### Where to copy headers from
In the sundhed.dk portal, open the browser dev tools → Network tab, pick any authenticated API call, and copy the cookies/XSRF/conversation UUID and user-agent from the request headers. The screenshot below highlights the relevant headers:

![Header locations](docs/pic.png)

## MCP (Model Context Protocol) tools

The service exposes a minimal MCP toolset (enabled when `spring.ai.mcp.server.enabled=true`):

- `read-fhir-resource`: GET any FHIR resource by `resourceType` and `id`.
- `search-fhir-resources`: GET search on a resource type, with `query` parameters.
- `create-fhir-transaction`: POST a Bundle of type `transaction` (read/search-only enforced).

Transport: HTTP Servlet endpoint from Spring AI MCP starter (`/mcp` by default). JSON mapper is Jackson (MCP SDK 0.13.1). The MCP bridge dispatches requests into the embedded HAPI server and returns the FHIR JSON payload and HTTP status inside MCP `CallToolResult`.
