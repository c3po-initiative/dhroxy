package dhroxy.stub

import ca.uhn.fhir.context.FhirContext
import org.hl7.fhir.r4.model.Bundle
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/** Exercises the full HTTP -> provider -> service -> SundhedClient -> stub -> mapper path. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = ["spring.ai.mcp.server.enabled=false"])
class SundhedStubFhirTest {
    @LocalServerPort private var port = 0

    companion object {
        private val stub = SundhedStub()

        @JvmStatic @DynamicPropertySource
        fun upstream(registry: DynamicPropertyRegistry) {
            registry.add("sundhed.client.base-url") { stub.baseUrl }
        }

        @JvmStatic @AfterAll
        fun closeStub() = stub.close()
    }

    @Test
    fun `FHIR searches work against synthetic upstream without mocked services`() {
        val searches = mapOf(
            "Patient" to 1,
            "Observation?date=ge2026-01-01&date=le2026-12-31" to 2,
            "Observation?category=vital-signs" to 1,
            "Condition" to 2, // One from e-journal and one from the diagnoses endpoint.
            "Encounter" to 1,
            "DocumentReference" to 2,
            "MedicationStatement" to 1,
            "MedicationRequest" to 3,
            "Immunization" to 1,
            "ImagingStudy" to 1,
            "DiagnosticReport" to 1,
            "Appointment?date=ge2026-01-01&date=le2026-12-31" to 1,
            "Organization" to 1,
            "ServiceRequest" to 1,
            "CarePlan" to 1
        )
        val parser = FhirContext.forR4().newJsonParser()
        HttpClient.newHttpClient().use { http ->
            for ((search, count) in searches) {
                val request = HttpRequest.newBuilder(URI.create("http://localhost:$port/fhir/$search"))
                    .header("Accept", "application/fhir+json").GET().build()
                val response = http.send(request, HttpResponse.BodyHandlers.ofString())
                assertEquals(200, response.statusCode(), "$search: ${response.body()}")
                val bundle = parser.parseResource(Bundle::class.java, response.body())
                assertEquals(count, bundle.entry.size, search)
            }
        }
    }
}
