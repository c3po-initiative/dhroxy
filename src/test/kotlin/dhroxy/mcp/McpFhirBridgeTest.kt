package dhroxy.mcp

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.rest.annotation.IdParam
import ca.uhn.fhir.rest.annotation.Read
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.server.RestfulServer
import jakarta.servlet.ServletException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockServletConfig
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.modelcontextprotocol.spec.McpSchema
import org.hl7.fhir.r4.model.IdType
import org.hl7.fhir.r4.model.Patient

class McpFhirBridgeTest {

    private lateinit var restfulServer: RestfulServer
    private lateinit var bridge: ca.uhn.fhir.rest.server.McpFhirBridge

    @BeforeEach
    fun setup() {
        restfulServer = RestfulServer(FhirContext.forR4()).apply {
            setResourceProviders(TestPatientProvider())
        }
        // Initialize the servlet to satisfy RestfulServer internals
        restfulServer.init(MockServletConfig())
        bridge = ca.uhn.fhir.rest.server.McpFhirBridge(restfulServer)
    }

    @Test
    fun `tools expose FHIR operations`() {
        val tools = bridge.generateTools()
        val names = tools.map { it.tool().name() }
        assertTrue(names.contains("read-fhir-resource"))
        assertTrue(names.contains("search-fhir-resources"))
        assertTrue(names.contains("create-fhir-transaction"))
    }

    @Test
    @Throws(ServletException::class)
    fun `read tool returns patient`() {
        val readTool = bridge.generateTools().first { it.tool().name() == "read-fhir-resource" }
        val request = McpSchema.CallToolRequest.Builder()
            .name("read-fhir-resource")
            .arguments(mapOf("resourceType" to "Patient", "id" to "123"))
            .build()

        val result = readTool.callHandler().apply(null, request)
        assertEquals(false, result.isError)

        val payload = (result.content().first() as McpSchema.TextContent).text()
        val map = jacksonObjectMapper().readValue(payload, object : TypeReference<Map<String, Any>>() {})
        assertEquals("Patient", map["resourceType"])
        val responseJson = map["response"].toString()
        assertTrue(responseJson.contains("\"resourceType\":\"Patient\""))
        assertTrue(responseJson.contains("\"id\":\"123\""))
    }

    @Test
    @Throws(ServletException::class)
    fun `search tool returns bundle`() {
        val searchTool = bridge.generateTools().first { it.tool().name() == "search-fhir-resources" }
        val request = McpSchema.CallToolRequest.Builder()
            .name("search-fhir-resources")
            .arguments(mapOf("resourceType" to "Patient"))
            .build()

        val result = searchTool.callHandler().apply(null, request)
        assertEquals(false, result.isError())

        val payload = (result.content().first() as McpSchema.TextContent).text()
        val map = jacksonObjectMapper().readValue(payload, object : TypeReference<Map<String, Any>>() {})
        assertEquals("Patient", map["resourceType"])
        val responseJson = map["response"].toString()
        assertTrue(responseJson.contains("\"resourceType\":\"Bundle\""))
        assertTrue(responseJson.contains("\"resourceType\":\"Patient\""))
    }

    private class TestPatientProvider : ca.uhn.fhir.rest.server.IResourceProvider {
        override fun getResourceType(): Class<Patient> = Patient::class.java

        @Read
        fun read(@IdParam id: IdType): Patient =
            Patient().apply {
                this.id = id.idPart
                addIdentifier().apply { value = "id-${id.idPart}" }
                addName().setFamily("Tester").addGiven("Pat")
            }

        @Search
        fun search(): List<Patient> = listOf(
            Patient().apply {
                id = "test"
                addIdentifier().apply { value = "id-test" }
                addName().setFamily("Tester").addGiven("Pat")
            }
        )
    }
}
