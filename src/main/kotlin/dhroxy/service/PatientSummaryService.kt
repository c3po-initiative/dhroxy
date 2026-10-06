package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.DanishFhir
import ca.uhn.fhir.rest.server.exceptions.InvalidRequestException
import dhroxy.config.SundhedClientProperties
import dhroxy.model.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

/**
 * Data class containing all clinical data needed for the International Patient Summary (IPS).
 */
data class PatientSummaryData(
    val patient: PersonDelegationData?,
    val conditions: DiagnoserResponse?,
    val forloeb: ForloebsoversigtResponse?,
    val medications: List<MedicationCardEntry>,
    val immunizations: List<VaccinationRecord>,
    val observations: LabsvarResponse?,
    val cpr: String?
)

@Service
class PatientSummaryService(
    private val client: SundhedClient,
    private val props: SundhedClientProperties
) {
    /**
     * Fetches all clinical data for a patient in parallel and returns it for IPS generation.
     */
    suspend fun fetchSummaryData(headers: HttpHeaders, patientId: String?): PatientSummaryData = coroutineScope {
        // Clinical endpoints are session-scoped: a URL must never relabel another patient's data.
        val forloeb = client.fetchForloebsoversigt(headers)
        val cpr = DanishFhir.normalizeCpr(forloeb?.personNummer)
        if (patientId != null && (cpr == null || patientId != "pat-$cpr")) {
            throw InvalidRequestException("Requested patient does not match the clinical session")
        }

        // Fetch all data sources in parallel
        val patientDeferred = async {
            val selection = client.fetchPersonSelection(headers)
            selection?.personDelegationData?.find { cpr != null && DanishFhir.normalizeCpr(it.cpr) == cpr }
        }
        val conditionsDeferred = async { client.fetchDiagnoser(headers) }
        val medicationsDeferred = async { fetchMedications(headers) }
        val immunizationsDeferred = async { client.fetchEffectuatedVaccinations(headers) }
        val observationsDeferred = async { fetchRecentObservations(headers) }

        PatientSummaryData(
            patient = patientDeferred.await(),
            conditions = conditionsDeferred.await(),
            forloeb = forloeb,
            medications = medicationsDeferred.await(),
            immunizations = immunizationsDeferred.await(),
            observations = observationsDeferred.await(),
            cpr = cpr
        )
    }

    private suspend fun fetchMedications(headers: HttpHeaders): List<MedicationCardEntry> {
        val eservicesId = props.medicationCardEservicesId
            ?: client.fetchMinLaegeOrganizationId(headers)?.toString()
        if (eservicesId.isNullOrBlank()) return emptyList()
        return client.fetchMedicationCard(eservicesId, headers)
    }

    private suspend fun fetchRecentObservations(headers: HttpHeaders): LabsvarResponse? {
        // Fetch observations from the last 12 months for the IPS
        val today = java.time.LocalDate.now()
        val fra = "${today.minusMonths(12)}T00:00:00"
        val til = "${today}T23:59:59"
        return client.fetchLabsvar(fra, til, null, headers)
    }
}
