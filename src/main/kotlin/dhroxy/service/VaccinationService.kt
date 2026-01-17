package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.VaccinationMapper
import dhroxy.model.VaccinationRecord
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class VaccinationService(
    private val client: SundhedClient,
    private val mapper: VaccinationMapper
) {
    suspend fun search(
        headers: HttpHeaders,
        status: String?,
        includeHistory: Boolean,
        requestUrl: String
    ): Bundle {
        val records = client.fetchEffectuatedVaccinations(headers)
        val filtered = filterByStatus(records, status)
        val history = if (includeHistory) {
            filtered.mapNotNull { it.vaccinationIdentifier }
                .associateWith { id -> client.fetchVaccinationHistory(id, headers) }
        } else {
            emptyMap()
        }
        return mapper.toImmunizationBundle(filtered, requestUrl, history)
    }

    private fun filterByStatus(records: List<VaccinationRecord>, status: String?): List<VaccinationRecord> {
        val normalized = status?.lowercase()
        return when (normalized) {
            null -> records
            "completed" -> records.filter { it.activeStatus != false && it.negativeConsent != true }
            "not-done" -> records.filter { it.activeStatus == false || it.negativeConsent == true }
            "intended" -> emptyList() // planned vaccinations not yet mapped
            else -> records
        }
    }
}
