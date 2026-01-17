package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.MedicationRequestService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.MedicationRequest
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class MedicationRequestProvider(
    private val service: MedicationRequestService
) : IResourceProvider {
    override fun getResourceType(): Class<MedicationRequest> = MedicationRequest::class.java

    @Search
    fun search(
        @OptionalParam(name = MedicationRequest.SP_IDENTIFIER) identifier: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking {
            service.search(headers, identifier?.value, requestUrl(details))
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? MedicationRequest })
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply { details.headers?.forEach { (k, v) -> addAll(k, v) } }

    private fun requestUrl(details: ServletRequestDetails): String =
        details.servletRequest?.let { req ->
            buildString {
                append(req.requestURL.toString())
                req.queryString?.let { append("?").append(it) }
            }
        } ?: (details.requestPath ?: "")
}
