package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.ConditionMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class ConditionService(
    private val client: SundhedClient,
    private val mapper: ConditionMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val forloeb = client.fetchForloebsoversigt(headers)
        return mapper.toBundle(forloeb, requestUrl)
    }
}
