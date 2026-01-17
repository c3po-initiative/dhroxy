package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.api.server.RequestDetails
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.ImagingService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.DiagnosticReport
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class DiagnosticReportProvider(
    private val imagingService: ImagingService
) : IResourceProvider {
    override fun getResourceType(): Class<DiagnosticReport> = DiagnosticReport::class.java

    @Search
    fun search(
        @OptionalParam(name = DiagnosticReport.SP_IDENTIFIER) identifier: TokenParam?,
        @OptionalParam(name = "study") study: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val bundle = runBlocking {
            imagingService.search(
                toHttpHeaders(details),
                identifier?.value,
                study?.value,
                requestUrl(details)
            )
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? DiagnosticReport })
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply {
            details.headers?.forEach { (k, v) -> addAll(k, v) }
        }

    private fun requestUrl(details: RequestDetails): String =
        details.completeUrl ?: details.requestPath ?: ""
}
