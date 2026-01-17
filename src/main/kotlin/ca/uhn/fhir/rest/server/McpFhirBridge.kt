package ca.uhn.fhir.rest.server

import ca.uhn.fhir.context.FhirContext
import com.fasterxml.jackson.core.JsonProcessingException
import io.modelcontextprotocol.server.McpServerFeatures
import io.modelcontextprotocol.spec.McpSchema
import org.slf4j.LoggerFactory
import org.springframework.mock.web.MockHttpServletResponse

class McpFhirBridge(private val restfulServer: RestfulServer) : dhroxy.mcp.McpBridge {

    private val logger = LoggerFactory.getLogger(McpFhirBridge::class.java)
    private val fhirContext: FhirContext = restfulServer.fhirContext

    override fun generateTools(): List<McpServerFeatures.SyncToolSpecification> {
        return try {
            listOf(
                McpServerFeatures.SyncToolSpecification.Builder()
                    .tool(_root_ide_package_.dhroxy.mcp.ToolFactory.readFhirResource())
                    .callHandler { _, request -> getToolResult(request, _root_ide_package_.dhroxy.mcp.Interaction.READ) }
                    .build(),
                McpServerFeatures.SyncToolSpecification.Builder()
                    .tool(_root_ide_package_.dhroxy.mcp.ToolFactory.searchFhirResources())
                    .callHandler { _, request -> getToolResult(request, _root_ide_package_.dhroxy.mcp.Interaction.SEARCH) }
                    .build()
                ,
                McpServerFeatures.SyncToolSpecification.Builder()
                    .tool(_root_ide_package_.dhroxy.mcp.ToolFactory.createFhirTransaction())
                    .callHandler { _, request -> getToolResult(request, _root_ide_package_.dhroxy.mcp.Interaction.TRANSACTION) }
                    .build()
            )
        } catch (e: JsonProcessingException) {
            throw RuntimeException(e)
        }
    }

    private fun getToolResult(contextMap: McpSchema.CallToolRequest, interaction: dhroxy.mcp.Interaction): McpSchema.CallToolResult {
        val response = MockHttpServletResponse()
        val request = _root_ide_package_.dhroxy.mcp.RequestBuilder(fhirContext, contextMap.arguments(), interaction).buildRequest()

        return try {
            restfulServer.handleRequest(interaction.asRequestType(), request, response)
            val status = response.status
            val body = response.contentAsString
            if (status in 200..299) {
                if (body.isBlank()) {
                    _root_ide_package_.dhroxy.mcp.CallToolResultFactory.failure("Empty successful response for $interaction")
                } else {
                    _root_ide_package_.dhroxy.mcp.CallToolResultFactory.success(contextMap.arguments()["resourceType"]?.toString(), interaction, body, status)
                }
            } else {
                _root_ide_package_.dhroxy.mcp.CallToolResultFactory.failure("FHIR server error $status: $body")
            }
        } catch (e: Exception) {
            logger.error(e.message, e)
            _root_ide_package_.dhroxy.mcp.CallToolResultFactory.failure("Unexpected error: ${e.message}")
        }
    }
}
