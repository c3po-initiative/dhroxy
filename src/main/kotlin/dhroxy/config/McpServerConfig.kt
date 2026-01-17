package dhroxy.config

import ca.uhn.fhir.rest.server.McpFhirBridge
import com.fasterxml.jackson.databind.ObjectMapper
import dhroxy.mcp.McpBridge
import io.modelcontextprotocol.json.jackson.JacksonMcpJsonMapper
import io.modelcontextprotocol.server.McpServerFeatures
import io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider
import org.springframework.ai.mcp.server.common.autoconfigure.properties.McpServerStreamableHttpProperties
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.web.servlet.ServletRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import

@Configuration
@ConditionalOnProperty(prefix = "spring.ai.mcp.server", name = ["enabled"], havingValue = "true")
@Import(McpServerStreamableHttpProperties::class)
class McpServerConfig {

    private val sseEndpoint = "/sse"

    @Bean
    fun syncServer(mcpBridges: List<McpBridge>): List<McpServerFeatures.SyncToolSpecification> =
        mcpBridges.flatMap { it.generateTools() }

    @Bean
    fun mcpFhirBridge(restfulServer: ca.uhn.fhir.rest.server.RestfulServer): McpFhirBridge =
        McpFhirBridge(restfulServer)

    @Bean
    fun servletSseServerTransportProvider(
        properties: McpServerStreamableHttpProperties
    ): HttpServletStreamableServerTransportProvider =
        HttpServletStreamableServerTransportProvider.builder()
            .disallowDelete(false)
            .mcpEndpoint(properties.mcpEndpoint)
            .jsonMapper(JacksonMcpJsonMapper(ObjectMapper()))
            .build()

    @Bean
    fun mcpServlet(
        transportProvider: HttpServletStreamableServerTransportProvider,
        properties: McpServerStreamableHttpProperties
    ): ServletRegistrationBean<*> =
        ServletRegistrationBean(transportProvider, properties.mcpEndpoint, sseEndpoint).apply {
            setLoadOnStartup(1)
        }
}
