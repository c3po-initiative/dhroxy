/**
 * Eksempel fil der viser hvordan man bruger SundhedDkService
 */

import sundhedDkService from '../services/sundhedDkService';

/**
 * EKSEMPEL 1: Hent patient data
 */
export const getPatientExample = async () => {
  const result = await sundhedDkService.getPatient();

  if (result.success) {
    console.log('Patient data:', result.data);
    // result.data indeholder FHIR Patient resource
    // Eksempel struktur:
    // {
    //   resourceType: "Patient",
    //   id: "...",
    //   name: [{ family: "...", given: ["..."] }],
    //   birthDate: "...",
    //   address: [{ ... }]
    // }
  } else {
    console.error('Fejl:', result.error);
  }
};

/**
 * EKSEMPEL 2: Hent labsvar (alle kategorier)
 */
export const getLabResultsAllExample = async () => {
  const result = await sundhedDkService.getLabResults('Alle', 50);

  if (result.success) {
    console.log('Labsvar:', result.data);
    // result.data.entry indeholder array af Observation resources
    result.data.entry?.forEach((entry) => {
      const obs = entry.resource;
      console.log('Test:', obs.code?.coding?.[0]?.display);
      console.log('Værdi:', obs.valueQuantity?.value, obs.valueQuantity?.unit);
      console.log('Dato:', obs.effectiveDateTime);
    });
  }
};

/**
 * EKSEMPEL 3: Hent kun klinisk biokemi labsvar
 */
export const getLabResultsBiokemiExample = async () => {
  const result = await sundhedDkService.getLabResults('KliniskBiokemi', 20);

  if (result.success) {
    console.log('Klinisk biokemi svar:', result.data);
  }
};

/**
 * EKSEMPEL 4: Hent diagnoser (conditions)
 */
export const getConditionsExample = async () => {
  const result = await sundhedDkService.getConditions();

  if (result.success) {
    console.log('Diagnoser:', result.data);
    // result.data.entry indeholder array af Condition resources
    result.data.entry?.forEach((entry) => {
      const condition = entry.resource;
      console.log('Diagnose:', condition.code?.coding?.[0]?.display);
      console.log('Status:', condition.clinicalStatus?.coding?.[0]?.code);
      console.log('Dato:', condition.onsetDateTime);
    });
  }
};

/**
 * EKSEMPEL 5: Hent kontaktperioder (encounters)
 */
export const getEncountersExample = async () => {
  const result = await sundhedDkService.getEncounters();

  if (result.success) {
    console.log('Kontaktperioder:', result.data);
    result.data.entry?.forEach((entry) => {
      const encounter = entry.resource;
      console.log('Type:', encounter.type?.[0]?.coding?.[0]?.display);
      console.log('Status:', encounter.status);
      console.log('Period:', encounter.period);
    });
  }
};

/**
 * EKSEMPEL 6: Hent epikriser
 */
export const getEpikriserExample = async () => {
  const result = await sundhedDkService.getEpikriser();

  if (result.success) {
    console.log('Epikriser:', result.data);
    result.data.entry?.forEach((entry) => {
      const doc = entry.resource;
      console.log('Type:', doc.type?.coding?.[0]?.display);
      console.log('Beskrivelse:', doc.description);
      console.log('Dato:', doc.date);
      console.log('Forfatter:', doc.author?.[0]?.display);

      // Hvis dokumentet har base64 indhold:
      if (doc.content?.[0]?.attachment?.data) {
        const decoded = atob(doc.content[0].attachment.data);
        console.log('Indhold:', decoded);
      }
    });
  }
};

/**
 * EKSEMPEL 7: Hent notater
 */
export const getNotaterExample = async () => {
  const result = await sundhedDkService.getNotater();

  if (result.success) {
    console.log('Notater:', result.data);
  }
};

/**
 * EKSEMPEL 8: Hent alle dokumenter (epikriser + notater)
 */
export const getAllDocumentsExample = async () => {
  const result = await sundhedDkService.getAllDocuments();

  if (result.success) {
    console.log('Alle dokumenter:', result.data);
  }
};

/**
 * EKSEMPEL 9: Hent medicin ordinationer
 */
export const getMedicationStatementsExample = async () => {
  const result = await sundhedDkService.getAllMedicationStatements();

  if (result.success) {
    console.log('Medicin ordinationer:', result.data);
    result.data.entry?.forEach((entry) => {
      const med = entry.resource;
      console.log('Medicin:', med.medicationCodeableConcept?.coding?.[0]?.display);
      console.log('Dosering:', med.dosage?.[0]?.text);
      console.log('Status:', med.status);
    });
  }
};

/**
 * EKSEMPEL 10: Hent recepter
 */
export const getMedicationRequestsExample = async () => {
  const result = await sundhedDkService.getMedicationRequests();

  if (result.success) {
    console.log('Recepter:', result.data);
  }
};

/**
 * EKSEMPEL 11: Hent vaccinationer
 */
export const getImmunizationsExample = async () => {
  const result = await sundhedDkService.getImmunizations();

  if (result.success) {
    console.log('Vaccinationer:', result.data);
    result.data.entry?.forEach((entry) => {
      const imm = entry.resource;
      console.log('Vaccine:', imm.vaccineCode?.coding?.[0]?.display);
      console.log('Dato:', imm.occurrenceDateTime);
      console.log('Status:', imm.status);
    });
  }
};

/**
 * EKSEMPEL 12: Hent billedbeskrivelser
 */
export const getDiagnosticReportsExample = async () => {
  const result = await sundhedDkService.getDiagnosticReports();

  if (result.success) {
    console.log('Billedbeskrivelser:', result.data);
    result.data.entry?.forEach((entry) => {
      const report = entry.resource;
      console.log('Type:', report.code?.coding?.[0]?.display);
      console.log('Konklusion:', report.conclusion);
      console.log('Udstedt:', report.issued);
    });
  }
};

/**
 * EKSEMPEL 13: Hent aftaler
 */
export const getAppointmentsExample = async () => {
  const result = await sundhedDkService.getAppointments();

  if (result.success) {
    console.log('Aftaler:', result.data);
    result.data.entry?.forEach((entry) => {
      const apt = entry.resource;
      console.log('Type:', apt.appointmentType?.coding?.[0]?.display);
      console.log('Start:', apt.start);
      console.log('Status:', apt.status);
      console.log('Beskrivelse:', apt.description);
    });
  }
};

/**
 * EKSEMPEL 14: Hent min læge organisation
 */
export const getMyDoctorExample = async () => {
  const result = await sundhedDkService.getMyDoctorOrganization();

  if (result.success) {
    console.log('Min læge:', result.data);
    result.data.entry?.forEach((entry) => {
      const org = entry.resource;
      console.log('Navn:', org.name);
      console.log('Type:', org.type?.[0]?.coding?.[0]?.display);
      console.log('Adresse:', org.address?.[0]);
      console.log('Telefon:', org.telecom?.find(t => t.system === 'phone')?.value);
    });
  }
};

/**
 * EKSEMPEL 15: Hent ALT patient data på én gang (mest effektivt!)
 */
export const getAllPatientDataExample = async () => {
  const result = await sundhedDkService.getAllPatientData({
    includeLabResults: true,
    labCount: 50,
    includeConditions: true,
    includeEncounters: true,
    includeDocuments: true,
    includeMedication: true,
    includeImmunizations: true,
    includeImaging: true,
    includeAppointments: true,
    includeOrganizations: true
  });

  if (result.success) {
    console.log('Komplet patient data bundle:', result.data);

    // result.data.entry indeholder:
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

    const patient = result.data.entry?.[0]?.resource;
    const observations = result.data.entry?.[1]?.resource;
    const conditions = result.data.entry?.[2]?.resource;
    // ... osv

    console.log('Patient:', patient);
    console.log('Antal labsvar:', observations?.total);
    console.log('Antal diagnoser:', conditions?.total);
  }
};

/**
 * EKSEMPEL 16: Hent kun specifik data (optimeret bundle)
 */
export const getSpecificDataExample = async () => {
  // Kun hent labs og medicin
  const result = await sundhedDkService.getAllPatientData({
    includeLabResults: true,
    labCount: 20,
    includeConditions: false,
    includeEncounters: false,
    includeDocuments: false,
    includeMedication: true,
    includeImmunizations: false,
    includeImaging: false,
    includeAppointments: false,
    includeOrganizations: false
  });

  if (result.success) {
    console.log('Kun labs og medicin:', result.data);
  }
};

/**
 * EKSEMPEL 17: React komponent eksempel
 */
export const ExampleReactComponent = () => {
  const [patientData, setPatientData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Hent alle data
      const result = await sundhedDkService.getAllPatientData();

      if (result.success) {
        setPatientData(result.data);
      } else {
        console.error('Fejl:', result.error);
      }
    } catch (error) {
      console.error('Uventet fejl:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div>Henter data...</div>;
  }

  if (!patientData) {
    return <div>Ingen data tilgængelig</div>;
  }

  return (
    <div>
      <h1>Patient data hentet!</h1>
      <pre>{JSON.stringify(patientData, null, 2)}</pre>
    </div>
  );
};

/**
 * EKSEMPEL 18: Brug med async/await i React onClick handler
 */
export const handleButtonClick = async () => {
  // Hent kun labsvar når bruger klikker
  const result = await sundhedDkService.getLabResults('Alle', 20);

  if (result.success) {
    alert(`Hentet ${result.data.total || 0} labsvar!`);
  } else {
    alert(`Fejl: ${result.error}`);
  }
};

// Eksporter alt som default object
export default {
  getPatientExample,
  getLabResultsAllExample,
  getLabResultsBiokemiExample,
  getConditionsExample,
  getEncountersExample,
  getEpikriserExample,
  getNotaterExample,
  getAllDocumentsExample,
  getMedicationStatementsExample,
  getMedicationRequestsExample,
  getImmunizationsExample,
  getDiagnosticReportsExample,
  getAppointmentsExample,
  getMyDoctorExample,
  getAllPatientDataExample,
  getSpecificDataExample,
  ExampleReactComponent,
  handleButtonClick
};
