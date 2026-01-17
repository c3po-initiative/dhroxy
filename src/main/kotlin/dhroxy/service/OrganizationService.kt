package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.OrganizationMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class OrganizationService(
    private val client: SundhedClient,
    private val mapper: OrganizationMapper
) {
    suspend fun search(headers: HttpHeaders, id: Int?, cvr: String?, requestUrl: String): Bundle {
        val resolvedId = id ?: client.fetchMinLaegeOrganizationId(headers)
        val payload = resolvedId?.let { client.fetchOrganization(it, headers) }
        val filtered = payload?.copy(
            organizations = payload.organizations.filter { org ->
                val matchesId = id == null || org.organizationId == id
                val matchesCvr = cvr.isNullOrBlank() || org.cvrNumber?.toString() == cvr
                matchesId && matchesCvr
            }
        )
        return mapper.toOrganizationBundle(filtered, requestUrl)
    }
}
