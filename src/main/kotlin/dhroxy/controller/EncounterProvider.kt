package dhroxy.controller

import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.EncounterService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Encounter
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class EncounterProvider(
    private val encounterService: EncounterService
) : IResourceProvider {

    override fun getResourceType(): Class<Encounter> = Encounter::class.java

    @Search
    fun search(details: ServletRequestDetails): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking { encounterService.search(headers, requestUrl(details)) }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Encounter })
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
