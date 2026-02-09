# Sundhed.dk Integration via dhroxy FHIR Proxy

Dette dokument beskriver hvordan applikationen integrerer med Sundhed.dk data via dhroxy FHIR proxy på port 8081.

## Oversigt

Applikationen bruger en custom service (`sundhedDkService.js`) til at hente sundhedsdata fra forskellige Sundhed.dk endpoints gennem dhroxy's FHIR API proxy.

## Arkitektur

```
React App (localhost:3000)
    ↓
proxy: localhost:8081
    ↓
dhroxy FHIR Server (localhost:8081)
    ↓
Sundhed.dk API endpoints
```

## Endpoints mapping

| FHIR Ressource | Sundhed.dk Endpoint | Beskrivelse |
|----------------|---------------------|-------------|
| `Patient` | `/app/personvaelgerportal/api/v1/GetPersonSelection` | Personoplysninger |
| `Observation` | `/api/labsvar/svaroversigt` | Laboratoriesvar (klinisk biokemi, mikrobiologi, patologi) |
| `Condition` | `/app/ejournalportalborger/api/ejournal/forloebsoversigt` | Diagnoser fra e-journal |
| `Encounter` | `/app/ejournalportalborger/api/ejournal/kontaktperioder` | Hospitalsbesøg og kontakter |
| `DocumentReference` (epikriser) | `/app/ejournalportalborger/api/ejournal/epikriser` | Udskrivningsbreve |
| `DocumentReference` (notater) | `/app/ejournalportalborger/api/ejournal/notater` | Kliniske notater |
| `MedicationStatement` | `/app/medicinkort2borger/api/v1/ordinations/{id}/details` | Aktuelle medicin ordinationer |
| `MedicationRequest` | `/app/medicinkort2borger/api/v1/prescriptions/overview` | Medicin recepter |
| `Immunization` | `/app/vaccination/api/v1/effectuatedvaccinations` | Vaccinationer |
| `ImagingStudy` | `/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisninger` | Billeddiagnostik henvisninger |
| `DiagnosticReport` | `/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisninger` | Billedbeskrivelser (røntgen, CT, MR) |
| `Appointment` | `/app/aftalerborger/api/v1/aftaler/cpr` | Kommende og tidligere aftaler |
| `Organization` | `/api/minlaegeorganization` | Min praktiserende læge |

## Labsvar kategorier

Labsvar kan filtreres efter område (sundhed.dk "område" parameter):

| Sundhed.dk område | FHIR category mapping | Beskrivelse |
|-------------------|----------------------|-------------|
| `KliniskBiokemi` | `laboratory\|kliniskbiokemi` | Klinisk biokemi tests |
| `Mikrobiologi` | `mikro*` | Mikrobiologiske tests |
| `Patologi` | `patologi` | Patologi prøver |
| `Alle` | `laboratory` | Alle laboratoriesvar (default) |

## Service API

### Import

```javascript
import sundhedDkService from './services/sundhedDkService';
```

### Metoder

#### `getPatient()`
Henter patient personoplysninger.

```javascript
const result = await sundhedDkService.getPatient();
if (result.success) {
  console.log(result.data); // FHIR Patient resource
}
```

#### `getLabResults(omraade, count)`
Henter laboratoriesvar.

**Parameters:**
- `omraade` (string): "Alle", "KliniskBiokemi", "Mikrobiologi", eller "Patologi" (default: "Alle")
- `count` (number): Antal resultater (default: 50)

```javascript
// Hent alle labsvar
const result = await sundhedDkService.getLabResults('Alle', 50);

// Hent kun klinisk biokemi
const result = await sundhedDkService.getLabResults('KliniskBiokemi', 20);
```

#### `getConditions()`
Henter diagnoser fra e-journal.

```javascript
const result = await sundhedDkService.getConditions();
```

#### `getEncounters(noegle)`
Henter kontaktperioder.

**Parameters:**
- `noegle` (string, optional): Nøgle til specifikt forløb

```javascript
const result = await sundhedDkService.getEncounters();
```

#### `getEpikriser()`
Henter epikriser (udskrivningsbreve).

```javascript
const result = await sundhedDkService.getEpikriser();
```

#### `getNotater()`
Henter kliniske notater.

```javascript
const result = await sundhedDkService.getNotater();
```

#### `getAllDocuments()`
Henter alle dokumenter (epikriser + notater).

```javascript
const result = await sundhedDkService.getAllDocuments();
```

#### `getMedicationStatement(id)`
Henter specifik medicin ordination.

**Parameters:**
- `id` (string): Ordinations ID

```javascript
const result = await sundhedDkService.getMedicationStatement('123');
```

#### `getAllMedicationStatements()`
Henter alle medicin ordinationer.

```javascript
const result = await sundhedDkService.getAllMedicationStatements();
```

#### `getMedicationRequests()`
Henter medicin recepter.

```javascript
const result = await sundhedDkService.getMedicationRequests();
```

#### `getImmunizations()`
Henter vaccinationer.

```javascript
const result = await sundhedDkService.getImmunizations();
```

#### `getImagingStudies()`
Henter billeddiagnostik henvisninger.

```javascript
const result = await sundhedDkService.getImagingStudies();
```

#### `getDiagnosticReports()`
Henter billedbeskrivelser.

```javascript
const result = await sundhedDkService.getDiagnosticReports();
```

#### `getAppointments()`
Henter aftaler fra de seneste 12 måneder og de næste 12 måneder (standard range).

```javascript
const result = await sundhedDkService.getAppointments();
```

**Note**: Dato-range (1 år tilbage til 1 år frem) håndteres automatisk af dhroxy backend.

#### `getMyDoctorOrganization()`
Henter min læge information.

```javascript
const result = await sundhedDkService.getMyDoctorOrganization();
```

#### `getOrganization(id)`
Henter specifik organisation.

**Parameters:**
- `id` (string): Organisation ID

```javascript
const result = await sundhedDkService.getOrganization('org-123');
```

#### `getAllPatientData(options)` ⭐ **Anbefalet**
Henter alle patient data i én bundle request (mest effektiv).

**Parameters (alle optional):**
```javascript
{
  includeLabResults: true,      // Hent labsvar
  labOmraade: 'Alle',           // Lab område filter
  labCount: 50,                 // Antal labsvar
  includeConditions: true,      // Hent diagnoser
  includeEncounters: true,      // Hent kontaktperioder
  includeDocuments: true,       // Hent epikriser + notater
  includeMedication: true,      // Hent medicin
  includeImmunizations: true,   // Hent vaccinationer
  includeImaging: true,         // Hent billedbeskrivelser
  includeAppointments: true,    // Hent aftaler
  includeOrganizations: true    // Hent læge info
}
```

**Eksempel:**
```javascript
// Hent alt data
const result = await sundhedDkService.getAllPatientData();

if (result.success) {
  const bundle = result.data;

  // bundle.entry indeholder:
  // [0] - Patient
  // [1] - Observation (labs)
  // [2] - Condition
  // [3] - Encounter
  // [4] - DocumentReference (epikriser)
  // [5] - DocumentReference (notater)
  // [6] - MedicationStatement
  // [7] - MedicationRequest
  // [8] - Immunization
  // [9] - DiagnosticReport
  // [10] - Appointment
  // [11] - Organization

  const patient = bundle.entry[0].resource;
  const labResults = bundle.entry[1].resource;
  // ...
}

// Eller kun specifik data
const result = await sundhedDkService.getAllPatientData({
  includeLabResults: true,
  includeMedication: true,
  includeConditions: false,
  includeEncounters: false,
  includeDocuments: false,
  includeImmunizations: false,
  includeImaging: false,
  includeAppointments: false,
  includeOrganizations: false
});
```

## Response format

Alle metoder returnerer et objekt med denne struktur:

```javascript
{
  success: boolean,    // true hvis succesfuld
  data: object,        // FHIR resource data (hvis success: true)
  error: string        // Fejlbesked (hvis success: false)
}
```

## FHIR Resource strukturer

### Patient
```javascript
{
  resourceType: "Patient",
  id: "...",
  name: [{
    family: "Efternavn",
    given: ["Fornavn"]
  }],
  birthDate: "1990-01-01",
  gender: "male",
  address: [{
    line: ["Vej 1"],
    city: "København",
    postalCode: "2100"
  }]
}
```

### Observation (labsvar)
```javascript
{
  resourceType: "Observation",
  id: "...",
  status: "final",
  category: [{
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/observation-category",
      code: "laboratory"
    }]
  }],
  code: {
    coding: [{
      display: "Hæmoglobin"
    }],
    text: "Hæmoglobin"
  },
  valueQuantity: {
    value: 8.5,
    unit: "mmol/L",
    code: "mmol/L"
  },
  effectiveDateTime: "2024-01-15T10:30:00Z",
  interpretation: [{
    coding: [{
      display: "Normal"
    }]
  }]
}
```

### Condition (diagnose)
```javascript
{
  resourceType: "Condition",
  id: "...",
  clinicalStatus: {
    coding: [{
      code: "active"
    }]
  },
  code: {
    coding: [{
      system: "http://hl7.org/fhir/sid/icd-10",
      code: "E11.9",
      display: "Type 2-diabetes uden komplikationer"
    }]
  },
  onsetDateTime: "2020-06-15"
}
```

### DocumentReference (epikrise/notat)
```javascript
{
  resourceType: "DocumentReference",
  id: "...",
  status: "current",
  type: {
    coding: [{
      display: "Epikrise"
    }],
    text: "Epikrise"
  },
  description: "Udskrivningsbrev fra sygehus",
  date: "2024-01-20T14:30:00Z",
  author: [{
    display: "Dr. Hansen, Kardiologisk afdeling"
  }],
  content: [{
    attachment: {
      contentType: "text/plain",
      data: "base64EncodedContent..."  // Base64 encoded text
    }
  }]
}
```

### MedicationStatement
```javascript
{
  resourceType: "MedicationStatement",
  id: "...",
  status: "active",
  medicationCodeableConcept: {
    coding: [{
      display: "Metformin 500mg tablet"
    }]
  },
  dosage: [{
    text: "1 tablet 2 gange dagligt",
    timing: {
      repeat: {
        frequency: 2,
        period: 1,
        periodUnit: "d"
      }
    }
  }],
  effectiveDateTime: "2024-01-01"
}
```

### Immunization
```javascript
{
  resourceType: "Immunization",
  id: "...",
  status: "completed",
  vaccineCode: {
    coding: [{
      display: "COVID-19 vaccine"
    }]
  },
  occurrenceDateTime: "2024-01-10T10:00:00Z",
  lotNumber: "ABC123"
}
```

## React komponenter

### DataViewer komponent

En interaktiv UI til at teste alle endpoints:

```javascript
import DataViewer from './components/DataViewer';

function App() {
  return <DataViewer />;
}
```

Features:
- Test individuelle endpoints
- "Hent alle data" knap for komplet bundle
- Vis rå JSON data
- Ekspander/kollaps sektioner
- Loading states
- Error handling

## Eksempler

Se `src/examples/UsageExamples.js` for omfattende eksempler på hvordan man bruger servicen.

### Simpelt eksempel i React komponent

```javascript
import React, { useState, useEffect } from 'react';
import sundhedDkService from './services/sundhedDkService';

function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await sundhedDkService.getAllPatientData();

      if (result.success) {
        setData(result.data);
      } else {
        console.error('Fejl:', result.error);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Ingen data</div>;

  return (
    <div>
      <h1>Patient Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

## Fejlhåndtering

```javascript
const result = await sundhedDkService.getLabResults();

if (result.success) {
  // Success - brug result.data
  console.log('Data hentet:', result.data);
} else {
  // Error - vis result.error
  console.error('Fejl:', result.error);
  alert(`Kunne ikke hente data: ${result.error}`);
}
```

## Performance tips

1. **Brug `getAllPatientData()` for at hente flere ressourcer på én gang** - Dette er meget mere effektivt end individuelle requests.

2. **Begræns antal resultater** - Brug `count` parameteren for Observations:
   ```javascript
   sundhedDkService.getLabResults('Alle', 20); // Kun 20 resultater
   ```

3. **Filtrer data specifikt** - Kun inkluder hvad du har brug for:
   ```javascript
   sundhedDkService.getAllPatientData({
     includeLabResults: true,
     includeMedication: true,
     includeConditions: false,  // Skip unødvendige data
     // ...
   });
   ```

4. **Cache data lokalt** - Gem resultat i state/localStorage for at undgå gentagne requests.

## Konfiguration

### Ændre base URL

Default er `/fhir` (som proxyer til `http://localhost:8081` via package.json).

For at ændre:

```javascript
import { SundhedDkService } from './services/sundhedDkService';

const customService = new SundhedDkService('http://custom-url:8081/fhir');
const result = await customService.getPatient();
```

### package.json proxy

Sørg for at `package.json` har proxy konfigureret:

```json
{
  "proxy": "http://localhost:8081"
}
```

Dette redirecter alle requests til `/fhir/*` til dhroxy serveren.

## Troubleshooting

### "Failed to fetch" fejl

1. Tjek at dhroxy server kører på port 8081
2. Tjek at proxy er konfigureret i package.json
3. Tjek browser console for CORS fejl

### Tom data

1. Tjek at du er autentificeret i dhroxy
2. Tjek at patient CPR er valgt i personvælger
3. Se dhroxy server logs for fejl

### Slow performance

1. Reducer antal resultater med `count` parameter
2. Brug `getAllPatientData()` i stedet for individuelle requests
3. Filtrer unødvendige ressourcer fra

## Links

- FHIR Documentation: https://www.hl7.org/fhir/
- Sundhed.dk: https://www.sundhed.dk
- dhroxy: (link til dhroxy dokumentation)
