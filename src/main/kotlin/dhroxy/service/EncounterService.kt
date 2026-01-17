package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.EncounterMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class EncounterService(
    private val client: SundhedClient,
    private val mapper: EncounterMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val forloeb = client.fetchForloebsoversigt(headers)
        val cpr = forloeb?.personNummer?.replace("-", "")
        val kontaktperioder = forloeb?.forloeb.orEmpty().associate { entry ->
            val key = entry.idNoegle?.noegle
            val resp = key?.let { client.fetchKontaktperioder(it, headers) }
            (key ?: "") to (resp ?: dhroxy.model.KontaktperioderResponse())
        }
        return mapper.toBundle(forloeb?.forloeb.orEmpty(), kontaktperioder, cpr, requestUrl)
    }
}
