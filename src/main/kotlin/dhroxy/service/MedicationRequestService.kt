package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.MedicationRequestMapper
import dhroxy.model.MedicationCardEntry
import org.hl7.fhir.r4.model.Bundle
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class MedicationRequestService(
    private val client: SundhedClient,
    private val mapper: MedicationRequestMapper,
    private val props: SundhedClientProperties
) {
    private val log = LoggerFactory.getLogger(javaClass)

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
        // Prescriptions are best-effort: a failure here must not drop the medicine-card
        // ordinations that did resolve.
        val prescriptions = runCatching { client.fetchPrescriptions(headers) }
            .onFailure { log.warn("Failed to fetch prescriptions; returning medicine-card data only", it) }
            .getOrDefault(emptyList())
        return mapper.toMedicationRequestBundle(details, entries, requestUrl, prescriptions)
    }
}
