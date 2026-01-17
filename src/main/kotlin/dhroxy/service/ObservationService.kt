package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.LabMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class ObservationService(
    private val client: SundhedClient,
    private val mapper: LabMapper
) {
    suspend fun search(
        headers: HttpHeaders,
        fra: String?,
        til: String?,
        omraade: String?,
        requestUrl: String
    ): Bundle {
        val response = client.fetchLabsvar(fra, til, omraade?.ifBlank { null }, headers)
        return mapper.toObservationBundle(response, requestUrl)
    }
}
