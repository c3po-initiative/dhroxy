package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.MedicationRequestMapper
import dhroxy.model.MedicationCardEntry
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class MedicationRequestService(
    private val client: SundhedClient,
    private val mapper: MedicationRequestMapper,
    private val props: SundhedClientProperties
) {
    suspend fun search(headers: HttpHeaders, identifier: String?, requestUrl: String): Bundle {
        if (!identifier.isNullOrBlank()) {
            val detail = client.fetchOrdinationDetails(identifier, headers)
            val entries = client.fetchMedicationCard(props.medicationCardEservicesId.orEmpty(), headers)
            return mapper.toMedicationRequestBundle(listOfNotNull(detail), entries, requestUrl)
        }
        val eservicesId = props.medicationCardEservicesId ?: client.fetchMinLaegeOrganizationId(headers)?.toString()
        val entries: List<MedicationCardEntry> = if (!eservicesId.isNullOrBlank()) {
            client.fetchMedicationCard(eservicesId, headers)
        } else emptyList()
        val details = entries.mapNotNull { it.ordinationId?.let { id -> client.fetchOrdinationDetails(id, headers) } }
        return mapper.toMedicationRequestBundle(details, entries, requestUrl)
    }
}
