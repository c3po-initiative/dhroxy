package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class MedicationCardStatus(
    @JsonProperty("EnumStr")
    val enumStr: String? = null,
    @JsonProperty("From")
    val from: String? = null,
    @JsonProperty("To")
    val to: String? = null,
    @JsonProperty("ShowFromTime")
    val showFromTime: String? = null,
    @JsonProperty("ShowToTime")
    val showToTime: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class MedicationCardEntry(
    @JsonProperty("ActiveSubstance")
    val activeSubstance: String? = null,
    @JsonProperty("Cause")
    val cause: String? = null,
    @JsonProperty("Dosage")
    val dosage: String? = null,
    @JsonProperty("DosageEndDate")
    val dosageEndDate: String? = null,
    @JsonProperty("DrugMedication")
    val drugMedication: String? = null,
    @JsonProperty("EndDate")
    val endDate: String? = null,
    @JsonProperty("FollowUpDate")
    val followUpDate: String? = null,
    @JsonProperty("FollowUpDateIsExceeded")
    val followUpDateIsExceeded: Boolean? = null,
    @JsonProperty("FollowUpPerformedDate")
    val followUpPerformedDate: String? = null,
    @JsonProperty("Form")
    val form: String? = null,
    @JsonProperty("HasNegativeConsent")
    val hasNegativeConsent: Boolean? = null,
    @JsonProperty("IsDoseDispensing")
    val isDoseDispensing: Boolean? = null,
    @JsonProperty("IsVkaDrug")
    val isVkaDrug: Boolean? = null,
    @JsonProperty("LatestEffectuationDate")
    val latestEffectuationDate: String? = null,
    @JsonProperty("OrdinationId")
    val ordinationId: String? = null,
    @JsonProperty("StartDate")
    val startDate: String? = null,
    @JsonProperty("Status")
    val status: MedicationCardStatus? = null,
    @JsonProperty("Strength")
    val strength: String? = null,
    @JsonProperty("TreatmentStartedPreviously")
    val treatmentStartedPreviously: Boolean? = null,
    @JsonProperty("VkaDosagePeriodeEndsBeforeTreatmentEnds")
    val vkaDosagePeriodeEndsBeforeTreatmentEnds: Boolean? = null
)
