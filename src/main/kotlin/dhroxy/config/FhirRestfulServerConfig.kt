package dhroxy.config

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.rest.api.EncodingEnum
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.RestfulServer
import ca.uhn.fhir.rest.server.interceptor.ResponseHighlighterInterceptor
import org.springframework.boot.web.servlet.ServletRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class FhirRestfulServerConfig(
    private val fhirContext: FhirContext,
    private val providers: List<IResourceProvider>,
    private val transactionProvider: dhroxy.controller.TransactionProvider
) {

    @Bean
    fun restfulServer(): RestfulServer =
        object : RestfulServer(fhirContext) {
            override fun initialize() {
                super.initialize()
                registerProviders(providers)
                registerProvider(transactionProvider)
                registerInterceptor(ResponseHighlighterInterceptor())
                setDefaultResponseEncoding(EncodingEnum.JSON)
                isDefaultPrettyPrint = true
            }
        }

    @Bean
    fun fhirServlet(restfulServer: RestfulServer): ServletRegistrationBean<RestfulServer> =
        ServletRegistrationBean(restfulServer, "/fhir/*").apply { setLoadOnStartup(1) }
}
