package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.PatientMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class PatientService(
    private val client: SundhedClient,
    private val mapper: PatientMapper
) {
    suspend fun search(headers: HttpHeaders, name: String?, identifier: String?, requestUrl: String): Bundle {
        val selection = client.fetchPersonSelection(headers)
        val filtered = selection?.copy(
            personDelegationData = selection.personDelegationData.filter { person ->
                val matchesId = identifier.isNullOrBlank() || person.cpr == identifier
                val matchesName = name.isNullOrBlank() || person.name?.contains(name, ignoreCase = true) == true
                matchesId && matchesName
            }
        )
        return mapper.toPatientBundle(filtered, requestUrl)
    }
}
