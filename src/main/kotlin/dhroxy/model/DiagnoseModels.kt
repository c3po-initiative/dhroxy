package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class DiagnoserResponse(
    val isLiveData: Boolean? = null,
    val hasConsentData: Boolean? = null,
    val canOverrideConsent: Boolean? = null,
    val containsDDSError: Boolean? = null,
    val lastUpdated: String? = null,
    val organization: String? = null,
    val diagnoser: List<DiagnoseEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class DiagnoseEntry(
    val diagnoseKode: String? = null,
    val diagnoseNavn: String? = null,
    val type: String? = null,
    val datoFra: String? = null,
    val datoTil: String? = null
)
