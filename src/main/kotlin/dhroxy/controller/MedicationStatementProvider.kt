package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.StringParam
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.MedicationCardService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.MedicationStatement
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class MedicationStatementProvider(
    private val medicationCardService: MedicationCardService
) : IResourceProvider {

    override fun getResourceType(): Class<MedicationStatement> = MedicationStatement::class.java

    @Search
    fun search(
        @OptionalParam(name = MedicationStatement.SP_STATUS) status: TokenParam?,
        @OptionalParam(name = "_sourceId") sourceId: StringParam?,
        @OptionalParam(name = MedicationStatement.SP_IDENTIFIER) identifier: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking {
            medicationCardService.search(headers, sourceId?.value, status?.value, identifier?.value, requestUrl(details))
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? MedicationStatement })
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply {
            details.headers?.forEach { entry: Map.Entry<String, MutableList<String>> ->
                addAll(entry.key, entry.value)
            }
        }

    private fun requestUrl(details: ServletRequestDetails): String =
        details.servletRequest?.let { req ->
            buildString {
                append(req.requestURL.toString())
                req.queryString?.let { append("?").append(it) }
            }
        } ?: (details.requestPath ?: "")
}
