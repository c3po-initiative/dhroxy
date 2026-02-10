package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.HomeMeasurementMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class HomeMeasurementService(
    private val client: SundhedClient,
    private val mapper: HomeMeasurementMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val response = client.fetchHomeMeasurements(headers)
        return mapper.toBundle(response, requestUrl)
    }
}
