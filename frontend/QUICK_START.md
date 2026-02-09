# Quick Start Guide - Sundhed.dk Integration

## 🚀 Kom i gang på 5 minutter

### Forudsætninger

1. ✅ dhroxy FHIR proxy kører på `localhost:8081`
2. ✅ Node.js installeret
3. ✅ npm/yarn installeret

### Trin 1: Start applikationen

```bash
cd min-sundhedsagent
npm install
npm start
```

Applikationen åbner automatisk på `http://localhost:3000`

### Trin 2: Test Data Viewer

1. Klik på **"Data Viewer"** i venstre menu
2. Klik på **"Hent alle data på én gang"** knappen
3. Se alle sundhedsdata hentet fra Sundhed.dk!

### Trin 3: Brug servicen i din egen kode

```javascript
import sundhedDkService from './services/sundhedDkService';

// Hent alt patient data
const result = await sundhedDkService.getAllPatientData();

if (result.success) {
  console.log('Patient data:', result.data);
} else {
  console.error('Fejl:', result.error);
}
```

## 📋 Tilgængelige endpoints

| Funktion | Hvad henter den? |
|----------|------------------|
| `getPatient()` | Personoplysninger |
| `getLabResults('Alle', 50)` | Laboratoriesvar |
| `getConditions()` | Diagnoser |
| `getEncounters()` | Hospitalsbesøg |
| `getEpikriser()` | Udskrivningsbreve |
| `getNotater()` | Kliniske notater |
| `getAllMedicationStatements()` | Aktuel medicin |
| `getMedicationRequests()` | Recepter |
| `getImmunizations()` | Vaccinationer |
| `getDiagnosticReports()` | Billedbeskrivelser |
| `getAppointments()` | Aftaler |
| `getMyDoctorOrganization()` | Min læge |
| `getAllPatientData(options)` | ⭐ **ALT ovenstående i én request** |

## 💡 Eksempler

### Eksempel 1: Hent seneste labsvar

```javascript
import sundhedDkService from './services/sundhedDkService';

const result = await sundhedDkService.getLabResults('Alle', 10);

if (result.success) {
  result.data.entry?.forEach(item => {
    const obs = item.resource;
    console.log(`${obs.code?.text}: ${obs.valueQuantity?.value} ${obs.valueQuantity?.unit}`);
  });
}
```

Output:
```
Hæmoglobin: 8.5 mmol/L
Leukocytter: 7.2 10^9/L
...
```

### Eksempel 2: Hent diagnoser

```javascript
const result = await sundhedDkService.getConditions();

if (result.success) {
  result.data.entry?.forEach(item => {
    const condition = item.resource;
    console.log(`Diagnose: ${condition.code?.text}`);
    console.log(`Status: ${condition.clinicalStatus?.coding?.[0]?.code}`);
  });
}
```

### Eksempel 3: Hent alt i React komponent

```javascript
import React, { useState, useEffect } from 'react';
import sundhedDkService from './services/sundhedDkService';

function PatientDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await sundhedDkService.getAllPatientData();
      if (result.success) {
        setData(result.data);
      }
    };
    fetchData();
  }, []);

  if (!data) return <div>Loading...</div>;

  const patient = data.entry[0]?.resource;
  const labs = data.entry[1]?.resource;

  return (
    <div>
      <h1>Patient: {patient.name?.[0]?.given?.[0]} {patient.name?.[0]?.family}</h1>
      <p>Fødselsdag: {patient.birthDate}</p>
      <p>Antal labsvar: {labs.total}</p>
    </div>
  );
}
```

## 🎯 Mest effektive metode

**Brug altid `getAllPatientData()` når du skal hente flere typer data!**

```javascript
// ❌ DÅRLIGT - 5 separate requests
const patient = await sundhedDkService.getPatient();
const labs = await sundhedDkService.getLabResults();
const conditions = await sundhedDkService.getConditions();
const medication = await sundhedDkService.getAllMedicationStatements();
const immunizations = await sundhedDkService.getImmunizations();

// ✅ GODT - 1 bundle request
const result = await sundhedDkService.getAllPatientData({
  includeLabResults: true,
  includeConditions: true,
  includeMedication: true,
  includeImmunizations: true
});

// Tilgå data via indices:
const patient = result.data.entry[0].resource;
const labs = result.data.entry[1].resource;
const conditions = result.data.entry[2].resource;
const medication = result.data.entry[3].resource;
const immunizations = result.data.entry[4].resource;
```

## 🔧 Konfiguration

### Ændre dhroxy URL

I `package.json`:
```json
{
  "proxy": "http://localhost:8081"
}
```

Eller opret custom service instance:
```javascript
import { SundhedDkService } from './services/sundhedDkService';

const service = new SundhedDkService('http://custom-server:9999/fhir');
```

## 🐛 Troubleshooting

### Problem: "Failed to fetch"

**Løsning:** Tjek at dhroxy kører:
```bash
# Tjek om port 8081 er åben
lsof -i :8081

# Eller test med curl
curl http://localhost:8081/fhir/metadata
```

### Problem: Tom data

**Løsning:**
1. Tjek at du er logget ind i dhroxy
2. Tjek at CPR er valgt i personvælger
3. Se dhroxy logs for fejl

### Problem: CORS fejl

**Løsning:** Sørg for proxy er konfigureret i `package.json` og genstart React app.

## 📚 Næste skridt

1. Læs fuld dokumentation: [SUNDHEDDK_INTEGRATION.md](./SUNDHEDDK_INTEGRATION.md)
2. Se kode eksempler: [src/examples/UsageExamples.js](./src/examples/UsageExamples.js)
3. Prøv Data Viewer komponenten i applikationen
4. Byg din egen feature med servicen!

## 📞 Support

- Se [SUNDHEDDK_INTEGRATION.md](./SUNDHEDDK_INTEGRATION.md) for detaljeret dokumentation
- Tjek browser console for fejlbeskeder
- Se dhroxy server logs for backend fejl

---

**Held og lykke! 🎉**
