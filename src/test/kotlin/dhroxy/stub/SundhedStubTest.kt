package dhroxy.stub

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.config.WebClientConfig
import dhroxy.mapper.LabMapper
import dhroxy.mapper.MedicationCardMapper
import dhroxy.service.MedicationCardService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Observation
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.server.ResponseStatusException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

class SundhedStubTest {
    private val headers = HttpHeaders()

    private fun client(stub: SundhedStub, fallback: Map<String, String> = emptyMap()): SundhedClient {
        val props = SundhedClientProperties(baseUrl = stub.baseUrl, fallbackHeaders = fallback)
        return SundhedClient(WebClientConfig(props).sundhedWebClient(WebClient.builder()), props)
    }

    @Test
    fun `all upstream calls decode synthetic fixtures and linked details`() = runBlocking {
        SundhedStub().use { stub ->
            val c = client(stub)
            assertEquals("Testperson Eksempel", c.fetchPersonSelection(headers)!!.personDelegationData.single().name)
            val labs = c.fetchLabsvar("2026", "2026", "Alle", headers)!!
            assertEquals(2, labs.svaroversigt!!.laboratorieresultater.size)
            val observations = LabMapper().toObservationBundle(labs, "http://localhost/fhir/Observation")
            assertEquals(2, observations.total)
            assertEquals("5.2", (observations.entry[0].resource as Observation).valueQuantity.value.toPlainString())
            assertTrue((observations.entry[1].resource as Observation).valueStringType.value.contains("æ, ø og å"))
            val vaccination = c.fetchEffectuatedVaccinations(headers).single()
            assertEquals(vaccination.vaccinationIdentifier, c.fetchVaccinationHistory(vaccination.vaccinationIdentifier!!, headers).single().id)
            val ordination = c.fetchMedicationCard("", headers).single()
            assertEquals(ordination.ordinationId, c.fetchOrdinationDetails(ordination.ordinationId!!, headers)!!.drugMedication!!.ordinationIdentifier)
            assertEquals(1, c.fetchOrdinationOverview(headers)!!.numberOfActive)
            assertEquals(2, c.fetchPrescriptionOverview(headers)!!.numTotal)
            assertEquals(listOf("aktiv", "afsluttet"), c.fetchPrescriptions(headers).map { it.status })
            assertEquals("appt-1", c.fetchAppointments(headers, "2026", "2026")!!.appointments.single().documentId)
            val orgId = c.fetchMinLaegeOrganizationId(headers)!!
            assertEquals(orgId, c.fetchOrganization(orgId, headers)!!.organizations.single().organizationId)
            assertEquals("J45", c.fetchDiagnoser(headers)!!.diagnoser.single().diagnoseKode)
            val course = c.fetchForloebsoversigt(headers)!!.forloeb.single().idNoegle!!.noegle!!
            assertEquals(1, c.fetchKontaktperioder(course, headers)!!.kontaktperioder.size)
            assertEquals(1, c.fetchEpikriser(course, headers)!!.epikriser.size)
            assertEquals(1, c.fetchNotater(course, headers)!!.notater.size)
            val imaging = c.fetchImagingReferrals(headers)!!.svar.single()
            assertEquals(imaging.id, c.fetchImagingReferral(imaging.henvisningsId, imaging.undersoegelser.single().id, headers)!!.svar.single().id)
            assertEquals(1, c.fetchHenvisninger(headers)!!.aktiveHenvisninger.size)
            assertEquals("70", c.fetchHomeMeasurements(headers)!!.documents.single().value)
            assertEquals("Testplan", c.fetchCarePlans(headers)!!.plans.single().title)
            assertEquals(22, stub.requests.size)
        }
    }

    @Test
    fun `date ranges categories and appointment request casing are honored`() = runBlocking {
        SundhedStub().use { stub ->
            val c = client(stub)
            assertEquals(1, c.fetchLabsvar("2026-06", "2026-06", "Patologi", headers)!!.svaroversigt!!.laboratorieresultater.size)
            assertEquals("2026-06-01T00:00:00", stub.requests.last().query["fra"])
            assertEquals("2026-06-30T23:59:59", stub.requests.last().query["til"])
            assertTrue(c.fetchLabsvar("2025", "2025", null, headers)!!.svaroversigt!!.laboratorieresultater.isEmpty())
            assertTrue(c.fetchAppointments(headers, "2025", "2025")!!.appointments.isEmpty())
            assertEquals("POST", stub.requests.last().method)
            assertTrue(stub.requests.last().body.contains("\"FromDate\":\"2025-01-01\""))
            assertTrue(c.fetchForloebsoversigt(headers)!!.forloeb.isNotEmpty())
            val page = get(stub, "/app/ejournalportalborger/api/ejournal/forloebsoversigt?Side=2&ItemsPerPage=1")
            assertEquals(200, page.statusCode())
            assertTrue(page.body().contains("\"forloeb\":[]"))
        }
    }

    @Test
    fun `real HTTP forwards allowed headers with request precedence and fallback`() = runBlocking {
        SundhedStub().use { stub ->
            val c = client(stub, mapOf("cookie" to "fallback", "x-xsrf-token" to "synthetic-xsrf"))
            c.fetchPersonSelection(HttpHeaders().apply {
                set("Cookie", "synthetic-session=request")
                set("Conversation-UUID", "test-conversation")
                set("Authorization", "must-not-be-forwarded")
            })
            val sent = stub.requests.single().headers
            assertEquals(listOf("synthetic-session=request"), sent["cookie"])
            assertEquals(listOf("synthetic-xsrf"), sent["x-xsrf-token"])
            assertEquals(listOf("test-conversation"), sent["conversation-uuid"])
            assertEquals(listOf("application/json"), sent["accept"])
            assertNull(sent["authorization"])
        }
    }

    @Test
    fun `journal keys are serialized and URI encoded once including reserved characters`() {
        SundhedStub().use { stub ->
            val key = "course+with/æ&\"quotes\"\\backslash"
            val error = assertThrows(ResponseStatusException::class.java) {
                runBlocking { client(stub).fetchNotater(key, headers) }
            }
            // It reached the server as a valid JSON key, but is not a fixture id.
            assertEquals(404, error.statusCode.value())
            val received = jacksonObjectMapper().readTree(stub.requests.single().query.getValue("noegle"))
            assertEquals(key, received["Noegle"].asText())
            assertTrue(received["Database"].isNull)
        }
    }

    @Test
    fun `plain text GP 404 does not suppress the session scoped medication card`() = runBlocking {
        SundhedStub(scenario = SundhedStub.Scenario.GP_UNAVAILABLE).use { stub ->
            val c = client(stub)
            assertNull(c.fetchMinLaegeOrganizationId(headers))
            val service = MedicationCardService(c, MedicationCardMapper(), SundhedClientProperties())
            assertEquals(1, service.search(headers, null, null, null, "http://localhost/fhir/MedicationStatement").total)
        }
    }

    @Test
    fun `large lab history exceeds default WebClient buffer and still decodes`() = runBlocking {
        SundhedStub(scenario = SundhedStub.Scenario.LARGE_LABS).use { stub ->
            val raw = get(stub, "/app/proevesvarportal/api/v1/svaroversigt?fra=2026-01-01T00:00:00&til=2026-12-31T23:59:59&source=RegionaleProevesvar")
            assertTrue(raw.body().toByteArray().size > 256 * 1024)
            assertEquals(3000, client(stub).fetchLabsvar("2026", "2026", null, headers)!!.svaroversigt!!.laboratorieresultater.size)
        }
    }

    @Test
    fun `empty responses retain envelopes and zero counts`() = runBlocking {
        SundhedStub(scenario = SundhedStub.Scenario.EMPTY).use { stub ->
            val c = client(stub)
            assertTrue(c.fetchPersonSelection(headers)!!.personDelegationData.isEmpty())
            assertTrue(c.fetchLabsvar("2026", "2026", null, headers)!!.svaroversigt!!.laboratorieresultater.isEmpty())
            assertTrue(c.fetchMedicationCard("", headers).isEmpty())
            assertTrue(c.fetchPrescriptions(headers).isEmpty())
            assertEquals(0, c.fetchOrdinationOverview(headers)!!.numberOfActive)
            assertEquals(0, c.fetchPrescriptionOverview(headers)!!.numTotal)
            assertEquals(0, c.fetchForloebsoversigt(headers)!!.numberOfForloeb)
            assertTrue(c.fetchAppointments(headers, "2026", "2026")!!.appointments.isEmpty())
            assertNull(c.fetchMinLaegeOrganizationId(headers))
        }
    }

    @Test
    fun `upstream errors reach the real client with the original status`() {
        for ((scenario, status) in listOf(SundhedStub.Scenario.UNAUTHORIZED to 401,
            SundhedStub.Scenario.FORBIDDEN to 403, SundhedStub.Scenario.UPSTREAM_ERROR to 500)) {
            SundhedStub(scenario = scenario).use { stub ->
                val error = assertThrows(ResponseStatusException::class.java) {
                    runBlocking { client(stub).fetchPersonSelection(headers) }
                }
                assertEquals(status, error.statusCode.value())
            }
        }
    }

    @Test
    fun `unsupported endpoints methods ids and malformed queries fail explicitly`() {
        SundhedStub().use { stub ->
            assertEquals(404, get(stub, "/api/labsvar/svaroversigt").statusCode())
            assertEquals(404, get(stub, "/app/medicinkort2borger/api/v1/ordinations/unknown/details").statusCode())
            val method = get(stub, "/app/aftalerborger/api/v1/aftaler/cpr")
            assertEquals(405, method.statusCode())
            assertEquals("POST", method.headers().firstValue("Allow").orElseThrow())
            assertEquals(400, get(stub, "/app/proevesvarportal/api/v1/svaroversigt").statusCode())
            assertEquals(400, get(stub, "/app/ejournalportalborger/api/ejournal/notater?noegle=invalid-json").statusCode())
            assertEquals(400, get(stub, "/app/ejournalportalborger/api/ejournal/forloebsoversigt?Side=0").statusCode())
            assertEquals(404, get(stub, "/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisning?Id=unknown").statusCode())
            HttpClient.newHttpClient().use { http ->
                val request = HttpRequest.newBuilder(URI.create(stub.baseUrl + "/app/aftalerborger/api/v1/aftaler/cpr"))
                    .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}" )).build()
                assertEquals(400, http.send(request, HttpResponse.BodyHandlers.ofString()).statusCode())
            }
        }
    }

    private fun get(stub: SundhedStub, path: String): HttpResponse<String> = HttpClient.newHttpClient().use {
        it.send(HttpRequest.newBuilder(URI.create(stub.baseUrl + path)).GET().build(), HttpResponse.BodyHandlers.ofString())
    }
}
