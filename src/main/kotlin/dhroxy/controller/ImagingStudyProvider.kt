package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.ImagingService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.ImagingStudy
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class ImagingStudyProvider(
    private val imagingService: ImagingService
) : IResourceProvider {
    override fun getResourceType(): Class<ImagingStudy> = ImagingStudy::class.java

    @Search
    fun search(
        @OptionalParam(name = ImagingStudy.SP_IDENTIFIER) identifier: TokenParam?,
        @OptionalParam(name = "study") study: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking {
            imagingService.imagingStudies(headers, identifier?.value, study?.value, requestUrl(details))
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? ImagingStudy })
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
