package dhroxy.controller

import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.ConditionService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Condition
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class ConditionProvider(
    private val conditionService: ConditionService
) : IResourceProvider {

    override fun getResourceType(): Class<Condition> = Condition::class.java

    @Search
    fun search(details: ServletRequestDetails): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking { conditionService.search(headers, requestUrl(details)) }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Condition })
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
