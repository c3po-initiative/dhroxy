package dhroxy.model

import com.fasterxml.jackson.annotation.JsonProperty

data class VaccinationRecord(
    @JsonProperty("ActiveStatus")
    val activeStatus: Boolean? = null,
    @JsonProperty("CoverageDuration")
    val coverageDuration: String? = null,
    @JsonProperty("EffectuatedBy")
    val effectuatedBy: String? = null,
    @JsonProperty("EffectuatedDateTime")
    val effectuatedDateTime: String? = null,
    @JsonProperty("IsEditable")
    val isEditable: Boolean? = null,
    @JsonProperty("NegativeConsent")
    val negativeConsent: Boolean? = null,
    @JsonProperty("SelfCreated")
    val selfCreated: Boolean? = null,
    @JsonProperty("VaccinationIdentifier")
    val vaccinationIdentifier: Long? = null,
    @JsonProperty("Vaccine")
    val vaccine: String? = null
)

data class VaccinationHistoryEntry(
    @JsonProperty("Date")
    val date: String? = null,
    @JsonProperty("Id")
    val id: Long? = null
)
