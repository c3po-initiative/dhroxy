package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.MedicationCardMapper
import dhroxy.model.MedicationCardEntry
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class MedicationCardService(
    private val client: SundhedClient,
    private val mapper: MedicationCardMapper,
    private val props: SundhedClientProperties
) {
    suspend fun search(headers: HttpHeaders, sourceId: String?, status: String?, identifier: String?, requestUrl: String): Bundle {
        if (!identifier.isNullOrBlank()) {
            val details = client.fetchOrdinationDetails(identifier, headers)
            return mapper.fromDetails(details, requestUrl)
        }
        val eservicesId = sourceId
            ?: props.medicationCardEservicesId
            ?: client.fetchMinLaegeOrganizationId(headers)?.toString()
        if (eservicesId.isNullOrBlank()) {
            return emptyBundle(requestUrl)
        }
        val entries = client.fetchMedicationCard(eservicesId, headers)
        val filtered = filterByStatus(entries, status)
        return mapper.toMedicationStatementBundle(filtered, requestUrl)
    }

    private fun filterByStatus(entries: List<MedicationCardEntry>, status: String?): List<MedicationCardEntry> {
        val normalized = status?.lowercase() ?: return entries
        return entries.filter { entry ->
            val current = entry.status?.enumStr?.lowercase()
            when (normalized) {
                "active" -> current == null || current == "active"
                "completed" -> current == "completed"
                "stopped" -> current == "stopped" || current == "ended"
                else -> true
            }
        }
    }

    private fun emptyBundle(requestUrl: String): Bundle = Bundle().apply {
        type = Bundle.BundleType.SEARCHSET
        link = listOf(Bundle.BundleLinkComponent().apply {
            relation = "self"
            url = requestUrl
        })
        total = 0
    }
}
