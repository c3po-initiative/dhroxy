package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.TokenOrListParam
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.OrganizationService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Organization
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class OrganizationProvider(
    private val organizationService: OrganizationService
) : IResourceProvider {

    override fun getResourceType(): Class<Organization> = Organization::class.java

    @Search
    fun search(
        @OptionalParam(name = Organization.SP_IDENTIFIER) identifier: TokenOrListParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val headers = toHttpHeaders(details)
        val (idParam, cvrParam) = extractIdentifier(identifier)
        val bundle = runBlocking {
            organizationService.search(
                headers,
                idParam,
                cvrParam,
                requestUrl(details)
            )
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Organization })
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

    private fun extractIdentifier(identifier: TokenOrListParam?): Pair<Int?, String?> {
        val tokens = collectTokens(identifier)
        var id: Int? = null
        var cvr: String? = null
        tokens.forEach { token ->
            val value = token.value
            val system = token.system?.lowercase()
            if (!value.isNullOrBlank()) {
                when {
                    system?.contains("cvr") == true || value.length == 8 -> if (cvr == null) cvr = value
                    else -> id = id ?: value.toIntOrNull()
                }
            }
        }
        return id to cvr
    }

    private fun collectTokens(param: TokenOrListParam?): List<TokenParam> {
        val result = mutableListOf<TokenParam>()
        val raw = param?.valuesAsQueryTokens
        if (raw is Iterable<*>) {
            raw.forEach { item ->
                when (item) {
                    is TokenParam -> result.add(item)
                    is Iterable<*> -> item.filterIsInstance<TokenParam>().forEach(result::add)
                    is TokenOrListParam -> {
                        val inner = item.valuesAsQueryTokens
                        if (inner is Iterable<*>) {
                            inner.forEach { nested ->
                                when (nested) {
                                    is TokenParam -> result.add(nested)
                                    is Iterable<*> -> nested.filterIsInstance<TokenParam>().forEach(result::add)
                                }
                            }
                        }
                    }
                }
            }
        }
        return result
    }
}
