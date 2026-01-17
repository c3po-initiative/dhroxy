package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.MedicationOverviewMapper
import dhroxy.model.MedicationCardEntry
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class MedicationOverviewService(
    private val client: SundhedClient,
    private val mapper: MedicationOverviewMapper,
    private val props: SundhedClientProperties
) {
    suspend fun overview(headers: HttpHeaders, requestUrl: String): Bundle {
        val eservicesId = props.medicationCardEservicesId ?: client.fetchMinLaegeOrganizationId(headers)?.toString()
        val entries: List<MedicationCardEntry> = if (!eservicesId.isNullOrBlank()) {
            client.fetchMedicationCard(eservicesId, headers)
        } else emptyList()

        val details = entries.mapNotNull { entry ->
            entry.ordinationId?.let { id -> client.fetchOrdinationDetails(id, headers) }
        }

        if (details.isNotEmpty()) {
            return mapper.toObservationBundle(details, entries, requestUrl)
        }

        val ordination = client.fetchOrdinationOverview(headers)
        val prescriptions = client.fetchPrescriptionOverview(headers)
        return mapper.toObservationBundle(ordination, prescriptions, requestUrl)
    }
}
