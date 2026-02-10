package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.CarePlanMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class CarePlanService(
    private val client: SundhedClient,
    private val mapper: CarePlanMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val response = client.fetchCarePlans(headers)
        return mapper.toBundle(response, requestUrl)
    }
}
