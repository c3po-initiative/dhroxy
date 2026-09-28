package dhroxy.config

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.util.FhirTerser
import ca.uhn.fhir.rest.api.EncodingEnum
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.RestfulServer
import ca.uhn.fhir.rest.server.provider.ServerCapabilityStatementProvider
import ca.uhn.fhir.rest.server.interceptor.ResponseHighlighterInterceptor
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServlet
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.boot.web.servlet.ServletRegistrationBean
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.hl7.fhir.instance.model.api.IBaseConformance
import org.hl7.fhir.r4.model.CapabilityStatement
import org.hl7.fhir.r4.model.CanonicalType

@Configuration
class FhirRestfulServerConfig(
    private val fhirContext: FhirContext,
    private val providers: List<IResourceProvider>,
    private val transactionProvider: dhroxy.controller.TransactionProvider,
    private val euHealthDataApiProperties: EuHealthDataApiProperties
) {

    @Bean
    fun restfulServer(): RestfulServer =
        object : RestfulServer(fhirContext) {
            override fun initialize() {
                super.initialize()
                registerProviders(providers)
                registerProvider(transactionProvider)
                registerInterceptor(ResponseHighlighterInterceptor())
                setServerConformanceProvider(
                    EuHealthDataApiCapabilityStatementProvider(this, euHealthDataApiProperties)
                )
                setDefaultResponseEncoding(EncodingEnum.JSON)
                isDefaultPrettyPrint = true
            }
        }

    @Bean
    fun fhirServlet(restfulServer: RestfulServer): ServletRegistrationBean<RestfulServer> =
        ServletRegistrationBean(restfulServer, "/fhir/*").apply { setLoadOnStartup(1) }

    @Bean
    @ConditionalOnProperty(
        prefix = "eu-health-data-api.smart-configuration",
        name = ["enabled"],
        havingValue = "true"
    )
    fun smartConfigurationServlet(
        objectMapper: ObjectMapper
    ): ServletRegistrationBean<HttpServlet> {
        val servlet: HttpServlet = SmartConfigurationServlet(euHealthDataApiProperties, objectMapper)
        return ServletRegistrationBean(
            servlet,
            "/fhir/.well-known/smart-configuration"
        ).apply { setLoadOnStartup(1) }
    }
}

private class EuHealthDataApiCapabilityStatementProvider(
    restfulServer: RestfulServer,
    private val properties: EuHealthDataApiProperties
) : ServerCapabilityStatementProvider(restfulServer) {
    override fun postProcess(terser: FhirTerser, conformance: IBaseConformance) {
        super.postProcess(terser, conformance)
        val capabilityStatement = conformance as? CapabilityStatement ?: return

        mergeCanonicals(
            capabilityStatement.instantiates,
            properties.capabilityStatement.instantiates
        )
        mergeCanonicals(
            capabilityStatement.implementationGuide,
            properties.capabilityStatement.implementationGuides
        )
    }

    private fun mergeCanonicals(target: MutableList<CanonicalType>, values: List<String>) {
        val existing = target.mapNotNull { it.value }.toMutableSet()
        values.filter { it.isNotBlank() }
            .filter { existing.add(it) }
            .forEach { target.add(CanonicalType(it)) }
    }
}

private class SmartConfigurationServlet(
    private val properties: EuHealthDataApiProperties,
    private val objectMapper: ObjectMapper
) : HttpServlet() {
    override fun doGet(req: HttpServletRequest, resp: HttpServletResponse) {
        val smartConfiguration = properties.smartConfiguration
        val tokenEndpoint = smartConfiguration.tokenEndpoint
        if (tokenEndpoint.isNullOrBlank()) {
            resp.sendError(
                HttpServletResponse.SC_SERVICE_UNAVAILABLE,
                "eu-health-data-api.smart-configuration.token-endpoint must be configured"
            )
            return
        }

        resp.contentType = "application/json"
        resp.characterEncoding = Charsets.UTF_8.name()

        val body = linkedMapOf<String, Any>(
            "token_endpoint" to tokenEndpoint,
            "grant_types_supported" to smartConfiguration.grantTypesSupported,
            "capabilities" to smartConfiguration.capabilities
        )

        smartConfiguration.jwksUri
            ?.takeIf { it.isNotBlank() }
            ?.let { body["jwks_uri"] = it }

        if (smartConfiguration.scopesSupported.isNotEmpty()) {
            body["scopes_supported"] = smartConfiguration.scopesSupported
        }

        if (smartConfiguration.tokenEndpointAuthMethodsSupported.isNotEmpty()) {
            body["token_endpoint_auth_methods_supported"] =
                smartConfiguration.tokenEndpointAuthMethodsSupported
        }

        if (smartConfiguration.tokenEndpointAuthSigningAlgValuesSupported.isNotEmpty()) {
            body["token_endpoint_auth_signing_alg_values_supported"] =
                smartConfiguration.tokenEndpointAuthSigningAlgValuesSupported
        }

        objectMapper.writeValue(resp.outputStream, body)
    }
}
