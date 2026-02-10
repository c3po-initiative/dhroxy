package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.ReferralMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class ReferralService(
    private val client: SundhedClient,
    private val mapper: ReferralMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val response = client.fetchHenvisninger(headers)
        return mapper.toBundle(response, requestUrl)
    }
}
