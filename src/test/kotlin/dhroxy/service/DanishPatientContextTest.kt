package dhroxy.service

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.rest.server.exceptions.InvalidRequestException
import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.*
import dhroxy.model.*
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.web.reactive.function.client.WebClientResponseException

class DanishPatientContextTest {
    private val headers = HttpHeaders().apply { set("X-Test-Session", "synthetic") }

    @Test
    fun `clinical CPR resolves all supported subject types and survives serialization`() = runBlocking {
        val client = mockk<SundhedClient>()
        coEvery { client.fetchForloebsoversigt(headers) } returns ForloebsoversigtResponse(personNummer = "010101-0000")
        val resources = listOf(Observation(), DiagnosticReport(), ImagingStudy(), MedicationStatement(),
            MedicationRequest(), Immunization(), CarePlan(), ServiceRequest())
        val bundle = Bundle().setType(Bundle.BundleType.COLLECTION)
        resources.forEach { bundle.addEntry().resource = it }
        client.withPatientContext(bundle, headers)
        val json = FhirContext.forR4Cached().newJsonParser().encodeResourceToString(bundle)
        assertEquals(8, Regex("urn:oid:1.2.208.176.1.2").findAll(json).count())
        assertEquals(8, Regex("0101010000").findAll(json).count())
        assertFalse(json.contains("current"))
        coVerify(exactly = 1) { client.fetchForloebsoversigt(headers) }
        coVerify(exactly = 0) { client.fetchPersonSelection(any()) }
    }

    @Test
    fun `missing malformed or unavailable clinical context stays explicitly unknown`() = runBlocking {
        for (cpr in listOf(null, "", "0000000000", "not-a-cpr")) {
            val client = mockk<SundhedClient>()
            coEvery { client.fetchForloebsoversigt(headers) } returns ForloebsoversigtResponse(personNummer = cpr)
            val observation = Observation()
            client.withPatientContext(Bundle().apply { addEntry().resource = observation }, headers)
            assertFalse(observation.subject.hasIdentifier())
            assertEquals("unknown", observation.subject.getExtensionByUrl(DanishFhir.DATA_ABSENT_REASON).value.primitiveValue())
        }
        val client = mockk<SundhedClient>()
        coEvery { client.fetchForloebsoversigt(headers) } throws WebClientResponseException(503, "Unavailable", null, null, null)
        val observation = Observation()
        client.withPatientContext(Bundle().apply { addEntry().resource = observation }, headers)
        assertFalse(observation.subject.hasIdentifier())
        assertTrue(observation.subject.hasExtension(DanishFhir.DATA_ABSENT_REASON))
    }

    @Test
    fun `known references and empty results do not trigger context requests`() = runBlocking {
        val client = mockk<SundhedClient>()
        val observation = Observation().setSubject(DanishFhir.patientReference("0202020000"))
        client.withPatientContext(Bundle().apply { addEntry().resource = observation }, headers)
        client.withPatientContext(Bundle(), headers)
        assertEquals("0202020000", observation.subject.identifier.value)
        coVerify(exactly = 0) { client.fetchForloebsoversigt(any()) }
    }

    @Test
    fun `patient search honors identifier namespace and normalized value`() = runBlocking {
        val client = mockk<SundhedClient>()
        coEvery { client.fetchPersonSelection(headers) } returns PersonSelectionResponse(personDelegationData =
            listOf(PersonDelegationData(cpr = "010101-0000", name = "Synthetic Patient")))
        val service = PatientService(client, PatientMapper())
        for (system in listOf(null, DanishFhir.CPR_SYSTEM, "urn:dk:cpr")) {
            assertEquals(1, service.search(headers, null, "0101010000", "http://localhost/fhir/Patient", system).total)
        }
        assertEquals(0, service.search(headers, null, "0101010000", "http://localhost/fhir/Patient", "http://other.example/id").total)
        assertEquals(0, service.search(headers, null, "bad", "http://localhost/fhir/Patient").total)
    }

    @Test
    fun `summary URL cannot relabel the clinical session as a delegated patient`() {
        val client = mockk<SundhedClient>()
        coEvery { client.fetchForloebsoversigt(headers) } returns ForloebsoversigtResponse(personNummer = "0101010000")
        val service = PatientSummaryService(client, SundhedClientProperties())
        assertThrows(InvalidRequestException::class.java) {
            runBlocking { service.fetchSummaryData(headers, "pat-0202020000") }
        }
        coVerify(exactly = 0) { client.fetchDiagnoser(any()) }
    }
}
