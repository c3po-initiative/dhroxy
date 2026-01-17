package dhroxy.mcp

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import io.modelcontextprotocol.spec.McpSchema

object CallToolResultFactory {

    fun success(resourceType: String?, interaction: Interaction, response: String, status: Int): McpSchema.CallToolResult {
        val payload: Map<String, Any?> = mapOf(
            "resourceType" to resourceType,
            "interaction" to interaction.name.lowercase(),
            "response" to response,
            "status" to status
        )
        val objectMapper = ObjectMapper()
        val jacksonData = try {
            objectMapper.writeValueAsString(payload)
        } catch (e: JsonProcessingException) {
            throw RuntimeException(e)
        }
        return McpSchema.CallToolResult.Builder()
            .addContent(McpSchema.TextContent(jacksonData))
            .build()
    }

    fun failure(message: String): McpSchema.CallToolResult =
        McpSchema.CallToolResult.Builder()
            .isError(true)
            .addTextContent(message)
            .build()
}
