package dhroxy.model

import com.fasterxml.jackson.annotation.JsonProperty

data class OrdinationOverviewResponse(
    @JsonProperty("HasDrugMedicationWithNegativeConsent")
    val hasDrugMedicationWithNegativeConsent: Boolean? = null,
    @JsonProperty("HasEndedDrugMedicationWithNegativeConsent")
    val hasEndedDrugMedicationWithNegativeConsent: Boolean? = null,
    @JsonProperty("HasVkaDrugMedicationWhereDosagePeriodExceeded")
    val hasVkaDrugMedicationWhereDosagePeriodExceeded: Boolean? = null,
    @JsonProperty("NumberOfActive")
    val numberOfActive: Int? = null,
    @JsonProperty("NumberOfDosagePeriodExceeded")
    val numberOfDosagePeriodExceeded: Int? = null,
    @JsonProperty("NumberOfFutureDosageStart")
    val numberOfFutureDosageStart: Int? = null,
    @JsonProperty("NumberOfNonStopped")
    val numberOfNonStopped: Int? = null,
    @JsonProperty("NumberOfStopped")
    val numberOfStopped: Int? = null,
    @JsonProperty("NumberOfTemporarilyStopped")
    val numberOfTemporarilyStopped: Int? = null
)

data class PrescriptionOverviewResponse(
    @JsonProperty("NumClosed")
    val numClosed: Int? = null,
    @JsonProperty("NumDispensings")
    val numDispensings: Int? = null,
    @JsonProperty("NumFuture")
    val numFuture: Int? = null,
    @JsonProperty("NumOpen")
    val numOpen: Int? = null,
    @JsonProperty("NumTotal")
    val numTotal: Int? = null,
    @JsonProperty("NumUnconnected")
    val numUnconnected: Int? = null
)
