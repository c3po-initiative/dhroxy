package dhroxy.conformance

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.rest.client.api.IGenericClient
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import dhroxy.controller.support.ProviderTestConfig
import org.hl7.fhir.r4.model.CapabilityStatement
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.http.HttpStatus
import org.springframework.test.context.TestPropertySource

@SpringBootTest(webEnvironment = RANDOM_PORT)
@Import(ProviderTestConfig::class)
@TestPropertySource(
    properties = [
        "eu-health-data-api.capability-statement.instantiates[0]=http://hl7.org/fhir/uv/ipa/CapabilityStatement/ipa-server",
        "eu-health-data-api.capability-statement.instantiates[1]=http://hl7.eu/fhir/health-data-api/CapabilityStatement/resource-access-provider-eu-api",
        "eu-health-data-api.capability-statement.implementation-guides[0]=http://hl7.eu/fhir/eps",
        "eu-health-data-api.smart-configuration.enabled=true",
        "eu-health-data-api.smart-configuration.token-endpoint=https://auth.example.test/token",
        "eu-health-data-api.smart-configuration.jwks-uri=https://auth.example.test/jwks.json",
        "eu-health-data-api.smart-configuration.scopes-supported[0]=system/Patient.rs",
        "eu-health-data-api.smart-configuration.scopes-supported[1]=system/Observation.rs"
    ]
)
class EuHealthDataApiSupportTest {

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var restTemplate: TestRestTemplate

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var client: IGenericClient

    @BeforeEach
    fun setup() {
        client = FhirContext.forR4().newRestfulGenericClient("http://localhost:$port/fhir")
    }

    @Test
    fun `metadata advertises configured EU health data capability links`() {
        val capabilityStatement = client.capabilities().ofType(CapabilityStatement::class.java).execute()

        val instantiates = capabilityStatement.instantiates.map { it.value }
        val implementationGuides = capabilityStatement.implementationGuide.map { it.value }

        assertTrue(instantiates.contains("http://hl7.org/fhir/uv/ipa/CapabilityStatement/ipa-server"))
        assertTrue(instantiates.contains("http://hl7.eu/fhir/health-data-api/CapabilityStatement/resource-access-provider-eu-api"))
        assertTrue(implementationGuides.contains("http://hl7.eu/fhir/eps"))
    }

    @Test
    fun `smart configuration endpoint exposes backend auth discovery metadata`() {
        val response = restTemplate.getForEntity(
            "http://localhost:$port/fhir/.well-known/smart-configuration",
            String::class.java
        )

        assertEquals(HttpStatus.OK, response.statusCode)

        val body = objectMapper.readTree(response.body) as JsonNode
        assertEquals("https://auth.example.test/token", body["token_endpoint"].asText())
        assertEquals("https://auth.example.test/jwks.json", body["jwks_uri"].asText())
        assertTrue(body["grant_types_supported"].any { it.asText() == "client_credentials" })
        assertTrue(body["capabilities"].any { it.asText() == "client-confidential-asymmetric" })
        assertTrue(body["scopes_supported"].any { it.asText() == "system/Patient.rs" })
    }
}
