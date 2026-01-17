package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.ImagingMapper
import org.hl7.fhir.r4.model.Bundle
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Service

@Service
class ImagingService(
    private val client: SundhedClient,
    private val mapper: ImagingMapper
) {
    suspend fun search(
        headers: HttpHeaders,
        identifier: String?,
        study: String?,
        requestUrl: String
    ): Bundle {
        val responses = mutableListOf<dhroxy.model.ImagingReferralResponse>()
        if (!identifier.isNullOrBlank() || !study.isNullOrBlank()) {
            client.fetchImagingReferral(identifier, study, headers)?.let { responses.add(it) }
        } else {
            val list = client.fetchImagingReferrals(headers)
            list?.svar.orEmpty().forEach { svar ->
                val henvisningId = svar.henvisningsId
                svar.undersoegelser.forEach { undersoegelse ->
                    val detail = client.fetchImagingReferral(henvisningId, undersoegelse.id, headers)
                    if (detail != null) responses.add(detail)
                }
            }
            if (responses.isEmpty() && list != null) {
                responses.add(
                    dhroxy.model.ImagingReferralResponse(
                        svar = list.svar
                    )
                )
            }
        }
        val merged = if (responses.isEmpty()) null else {
            dhroxy.model.ImagingReferralResponse(
                svar = responses.flatMap { it.svar }
            )
        }
        return mapper.toDiagnosticReportBundle(merged, requestUrl)
    }

    suspend fun imagingStudies(
        headers: HttpHeaders,
        identifier: String?,
        study: String?,
        requestUrl: String
    ): Bundle {
        // When no ids are provided, first list referrals and then fetch details per study
        val responses = mutableListOf<dhroxy.model.ImagingReferralResponse>()
        if (!identifier.isNullOrBlank() || !study.isNullOrBlank()) {
            client.fetchImagingReferral(identifier, study, headers)?.let { responses.add(it) }
        } else {
            val list = client.fetchImagingReferrals(headers)
            list?.svar.orEmpty().forEach { svar ->
                val henvisningId = svar.henvisningsId
                svar.undersoegelser.forEach { undersoegelse ->
                    val detail = client.fetchImagingReferral(henvisningId, undersoegelse.id, headers)
                    if (detail != null) {
                        responses.add(detail)
                    }
                }
            }
            if (responses.isEmpty() && list != null) {
                responses.add(
                    dhroxy.model.ImagingReferralResponse(
                        svar = list.svar
                    )
                )
            }
        }
        val merged = if (responses.isEmpty()) null else {
            dhroxy.model.ImagingReferralResponse(
                svar = responses.flatMap { it.svar }
            )
        }
        return mapper.toImagingStudyBundle(merged, requestUrl)
    }
}
