/**
 * Service til at hente sundhedsdata fra Sundhed.dk via dhroxy FHIR proxy
 *
 * Mapper mellem Sundhed.dk API endpoints og FHIR ressourcer:
 * - Patient → /app/personvaelgerportal/api/v1/GetPersonSelection
 * - Observation (labs) → /api/labsvar/svaroversigt
 * - Condition → /app/ejournalportalborger/api/ejournal/forloebsoversigt
 * - Encounter → /app/ejournalportalborger/api/ejournal/kontaktperioder
 * - DocumentReference (epikriser) → /app/ejournalportalborger/api/ejournal/epikriser
 * - DocumentReference (notater) → /app/ejournalportalborger/api/ejournal/notater
 * - MedicationStatement → /app/medicinkort2borger/api/v1/ordinations/{id}/details
 * - MedicationRequest → /app/medicinkort2borger/api/v1/prescriptions/overview
 * - Immunization → /app/vaccination/api/v1/effectuatedvaccinations
 * - ImagingStudy → /app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisninger
 * - Appointment → /app/aftalerborger/api/v1/aftaler/cpr
 * - Organization → /api/minlaegeorganization
 */

const DHROXY_BASE_URL = '/fhir';

/**
 * Default custom headers der kan override dhroxy YAML konfiguration
 * Disse headers sendes med alle requests til dhroxy
 */
const DEFAULT_CUSTOM_HEADERS = {
  // Eksempler på headers der kan override YAML:
  // 'X-Dhroxy-Config-Override': 'true',
  // 'X-Custom-Base-Url': 'https://custom-endpoint.sundhed.dk',
  // 'X-Custom-Auth-Token': 'bearer-token-here',
};

/**
 * Mapper labsvar kategori til FHIR Observation category
 */
const mapLabCategory = (sundhedDkCategory) => {
  const categoryMap = {
    'KliniskBiokemi': 'laboratory',
    'Mikrobiologi': 'laboratory',
    'Patologi': 'laboratory',
    'Alle': 'laboratory'
  };
  return categoryMap[sundhedDkCategory] || 'laboratory';
};

/**
 * Mapper sundhed.dk område til labsvar kategori
 */
const mapOmraadeToCategory = (omraade) => {
  if (omraade === 'KliniskBiokemi') return 'laboratory|kliniskbiokemi';
  if (omraade === 'Mikrobiologi') return 'mikro*';
  if (omraade === 'Patologi') return 'patologi';
  return 'Alle'; // default
};

class SundhedDkService {
  constructor(baseUrl = DHROXY_BASE_URL, customHeaders = {}) {
    this.baseUrl = baseUrl;
    this.customHeaders = { ...DEFAULT_CUSTOM_HEADERS, ...customHeaders };
  }

  /**
   * Sæt custom headers der overrider YAML konfiguration
   * @param {Object} headers - Headers der skal tilføjes/overrides
   */
  setCustomHeaders(headers) {
    this.customHeaders = { ...this.customHeaders, ...headers };
  }

  /**
   * Hent nuværende custom headers
   */
  getCustomHeaders() {
    return { ...this.customHeaders };
  }

  /**
   * Fjern en specifik custom header
   * @param {string} headerName - Navnet på headeren der skal fjernes
   */
  removeCustomHeader(headerName) {
    delete this.customHeaders[headerName];
  }

  /**
   * Nulstil alle custom headers
   */
  clearCustomHeaders() {
    this.customHeaders = {};
  }

  /**
   * Generisk fetch funktion med error handling
   * Custom headers sendes automatisk og kan override YAML-konfiguration i dhroxy
   */
  async fetchFromDhroxy(url, options = {}) {
    try {
      // Merge headers: Content-Type < custom headers < request-specific headers
      const mergedHeaders = {
        'Content-Type': 'application/json',
        ...this.customHeaders,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hent patient data fra personvælger
   */
  async getPatient() {
    return this.fetchFromDhroxy(`${this.baseUrl}/Patient`);
  }

  /**
   * Hent labsvar (Observations)
   * @param {string} omraade - KliniskBiokemi, Mikrobiologi, Patologi, eller Alle
   * @param {number} count - Antal resultater (default 50)
   */
  async getLabResults(omraade = 'Alle', count = 50) {
    // Hent data fra 2010 og frem
    let url = `${this.baseUrl}/Observation?_count=${count}`;
    return this.fetchFromDhroxy(url);
  }

  /**
   * Hent diagnoser (Conditions) fra e-journal forløbsoversigt
   */
  async getConditions() {
    return this.fetchFromDhroxy(`${this.baseUrl}/Condition`);
  }

  /**
   * Hent kontaktperioder (Encounters)
   * @param {string} noegle - Nøgle til specifik forløb (optional)
   */
  async getEncounters(noegle = null) {
    let url = `${this.baseUrl}/Encounter`;
    if (noegle) {
      url += `?identifier=${noegle}`;
    }
    return this.fetchFromDhroxy(url);
  }

  /**
   * Hent epikriser (DocumentReference)
   */
  async getEpikriser() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/DocumentReference`
    );
  }

  /**
   * Hent notater (DocumentReference)
   */
  async getNotater() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/DocumentReference`
    );
  }

  /**
   * Hent alle dokumenter (epikriser + notater)
   */
  async getAllDocuments() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/DocumentReference`
    );
  }

  /**
   * Hent medicin ordination detaljer (MedicationStatement)
   * @param {string} id - Ordinations ID
   */
  async getMedicationStatement(id) {
    return this.fetchFromDhroxy(`${this.baseUrl}/MedicationStatement/${id}`);
  }

  /**
   * Hent alle medicin ordinationer
   */
  async getAllMedicationStatements() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/MedicationStatement`
    );
  }

  /**
   * Hent medicin recepter (MedicationRequest)
   */
  async getMedicationRequests() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/MedicationRequest`
    );
  }

  /**
   * Hent vaccinationer (Immunization)
   */
  async getImmunizations() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/Immunization`
    );
  }

  /**
   * Hent billedbeskrivelser (ImagingStudy/DiagnosticReport)
   */
  async getImagingStudies() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/ImagingStudy`
    );
  }

  /**
   * Hent billedbeskrivelse rapporter som DiagnosticReport
   */
  async getDiagnosticReports() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/DiagnosticReport`
    );
  }

  /**
   * Hent aftaler (Appointment)
   * Default range: 1 år tilbage til 1 år frem (håndteret af dhroxy)
   */
  async getAppointments() {
    // Dhroxy håndterer default dato range (1 år tilbage til 1 år frem)
    return this.fetchFromDhroxy(
      `${this.baseUrl}/Appointment`
    );
  }

  /**
   * Hent min læge organisation (Organization)
   */
  async getMyDoctorOrganization() {
    return this.fetchFromDhroxy(
      `${this.baseUrl}/Organization`
    );
  }

  /**
   * Hent organisation detaljer
   * @param {string} id - Organisation ID
   */
  async getOrganization(id) {
    return this.fetchFromDhroxy(`${this.baseUrl}/Organization/${id}`);
  }

  /**
   * Hent alt patient data på én gang (bundle request)
   * Dette er den mest effektive måde at hente data på
   */
  async getAllPatientData(options = {}) {
    const {
      includeLabResults = true,
      labOmraade = 'Alle',
      labCount = 50,
      includeConditions = true,
      includeEncounters = true,
      includeDocuments = true,
      includeMedication = true,
      includeImmunizations = true,
      includeImaging = true,
      includeAppointments = true,
      includeOrganizations = true
    } = options;

    const bundleEntries = [
      { request: { method: 'GET', url: 'Patient' } }
    ];

    if (includeLabResults) {
      const labUrl = `Observation?_count=${labCount}`;
      bundleEntries.push({ request: { method: 'GET', url: labUrl } });
    }

    if (includeConditions) {
      bundleEntries.push({
        request: { method: 'GET', url: 'Condition' }
      });
    }

    if (includeEncounters) {
      bundleEntries.push({
        request: { method: 'GET', url: 'Encounter' }
      });
    }

    if (includeDocuments) {
      bundleEntries.push({
        request: { method: 'GET', url: 'DocumentReference' }
      });
    }

    if (includeMedication) {
      bundleEntries.push({
        request: { method: 'GET', url: 'MedicationStatement' }
      });
      bundleEntries.push({
        request: { method: 'GET', url: 'MedicationRequest' }
      });
    }

    if (includeImmunizations) {
      bundleEntries.push({
        request: { method: 'GET', url: 'Immunization' }
      });
    }

    if (includeImaging) {
      bundleEntries.push({
        request: { method: 'GET', url: 'DiagnosticReport' }
      });
    }

    if (includeAppointments) {
      // Dhroxy håndterer default dato range (1 år tilbage til 1 år frem)
      bundleEntries.push({
        request: { method: 'GET', url: 'Appointment' }
      });
    }

    if (includeOrganizations) {
      bundleEntries.push({
        request: { method: 'GET', url: 'Organization' }
      });
    }

    return this.fetchFromDhroxy(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: bundleEntries
      })
    });
  }
}

// Eksporter singleton instance
const sundhedDkService = new SundhedDkService();
export default sundhedDkService;

// Eksporter også klassen for custom instances
export { SundhedDkService };
