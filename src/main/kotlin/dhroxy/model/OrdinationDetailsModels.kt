package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class OrdinationDetails(
    @JsonProperty("DrugMedication") val drugMedication: DrugMedication? = null,
    @JsonProperty("Treatment") val treatment: Treatment? = null,
    @JsonProperty("Dosage") val dosage: Dosage? = null,
    @JsonProperty("CreatedBy") val createdBy: CreatedBy? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class DrugMedication(
    @JsonProperty("DrugMedication") val name: String? = null,
    @JsonProperty("Form") val form: String? = null,
    @JsonProperty("Strength") val strength: String? = null,
    @JsonProperty("ActiveSubstance") val activeSubstance: String? = null,
    @JsonProperty("AtcCode") val atcCode: String? = null,
    @JsonProperty("AtcText") val atcText: String? = null,
    @JsonProperty("DrugMedicationIdentifier") val drugMedicationIdentifier: String? = null,
    @JsonProperty("OrdinationIdentifier") val ordinationIdentifier: String? = null,
    @JsonProperty("HasNegativeConsent") val hasNegativeConsent: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class Treatment(
    @JsonProperty("Cause") val cause: String? = null,
    @JsonProperty("StartDate") val startDate: String? = null,
    @JsonProperty("EndDate") val endDate: String? = null,
    @JsonProperty("Administration") val administration: String? = null,
    @JsonProperty("SubstitutionAllowed") val substitutionAllowed: Boolean? = null,
    @JsonProperty("TreatmentStartedPreviously") val treatmentStartedPreviously: Boolean? = null,
    @JsonProperty("FollowUpDate") val followUpDate: String? = null,
    @JsonProperty("FollowUpPerformedDate") val followUpPerformedDate: String? = null,
    @JsonProperty("FollowUpDateIsExceeded") val followUpDateIsExceeded: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class Dosage(
    @JsonProperty("Text") val text: String? = null,
    @JsonProperty("StartDate") val startDate: String? = null,
    @JsonProperty("EndDate") val endDate: String? = null,
    @JsonProperty("Type") val type: String? = null,
    @JsonProperty("IsDosageDispensed") val isDosageDispensed: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CreatedBy(
    @JsonProperty("Date") val date: String? = null,
    @JsonProperty("Name") val name: String? = null,
    @JsonProperty("OrganisationName") val organisationName: String? = null,
    @JsonProperty("AuthorisationId") val authorisationId: String? = null,
    @JsonProperty("IdentifierSource") val identifierSource: String? = null,
    @JsonProperty("IdentifierValue") val identifierValue: String? = null,
    @JsonProperty("Address") val address: String? = null,
    @JsonProperty("TelephoneNumber") val telephoneNumber: String? = null
)
