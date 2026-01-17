package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.api.server.RequestDetails
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.VaccinationService
import org.hl7.fhir.r4.model.Immunization
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import kotlinx.coroutines.runBlocking

@Component
class ImmunizationProvider(
    private val vaccinationService: VaccinationService
) : IResourceProvider {
    override fun getResourceType(): Class<Immunization> = Immunization::class.java

    @Search
    fun search(
        @OptionalParam(name = Immunization.SP_STATUS) status: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val history = details.parameters["history"]?.firstOrNull()?.toBoolean() ?: false
        val bundle = runBlocking {
            vaccinationService.search(
                toHttpHeaders(details),
                status?.value,
                history,
                requestUrl(details)
            )
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Immunization })
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply {
            details.headers?.forEach { (k, v) -> addAll(k, v) }
        }

    private fun requestUrl(details: RequestDetails): String =
        details.completeUrl ?: details.requestPath ?: ""
}
