package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.DocumentReferenceMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class DocumentReferenceService(
    private val client: SundhedClient,
    private val mapper: DocumentReferenceMapper
) {
    suspend fun search(headers: HttpHeaders, requestUrl: String): Bundle {
        val forloeb = client.fetchForloebsoversigt(headers)
        val cpr = forloeb?.personNummer?.replace("-", "")
        val forloebList = forloeb?.forloeb.orEmpty()
        val epikriser = mutableMapOf<String, dhroxy.model.EpikriserResponse>()
        val notater = mutableMapOf<String, dhroxy.model.NotaterResponse>()

        for (entry in forloebList) {
            val key = entry.idNoegle?.noegle ?: continue
            client.fetchEpikriser(key, headers)?.let { epikriser[key] = it }
            client.fetchNotater(key, headers)?.let { notater[key] = it }
        }

        return mapper.toBundle(forloebList, epikriser, notater, cpr, requestUrl)
    }
}
