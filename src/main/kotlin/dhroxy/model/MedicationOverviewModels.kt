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

// One element of the `prescriptions/` list (the citizen "Recepter" tab). Distinct from
// the overview above, which is counts only. All fields are flat strings as returned by
// medicinkort2borger.
data class PrescriptionResponse(
    @JsonProperty("PrescriptionId")
    val prescriptionId: String? = null,
    @JsonProperty("OrdinationId")
    val ordinationId: String? = null,
    @JsonProperty("Status")
    val status: String? = null,
    @JsonProperty("Drug")
    val drug: String? = null,
    @JsonProperty("ActiveSubstance")
    val activeSubstance: String? = null,
    @JsonProperty("Strength")
    val strength: String? = null,
    @JsonProperty("Form")
    val form: String? = null,
    @JsonProperty("Dosage")
    val dosage: String? = null,
    @JsonProperty("Cause")
    val cause: String? = null,
    @JsonProperty("PrescriptionDate")
    val prescriptionDate: String? = null,
    @JsonProperty("ValidFromDate")
    val validFromDate: String? = null,
    @JsonProperty("ValidToDate")
    val validToDate: String? = null,
    @JsonProperty("CreatedDate")
    val createdDate: String? = null,
    @JsonProperty("EffectuatedDate")
    val effectuatedDate: String? = null,
    @JsonProperty("RemainingUnits")
    val remainingUnits: String? = null,
    @JsonProperty("IsOpenButDrugMedicationClosed")
    val isOpenButDrugMedicationClosed: Boolean? = null
)
