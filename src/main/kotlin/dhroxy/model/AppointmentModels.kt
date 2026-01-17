package dhroxy.model

import com.fasterxml.jackson.annotation.JsonProperty

data class AppointmentsResponse(
    @JsonProperty("appointments")
    val appointments: List<AppointmentItem> = emptyList(),
    @JsonProperty("canOverrideConsent")
    val canOverrideConsent: Boolean? = null,
    @JsonProperty("consentFilterApplied")
    val consentFilterApplied: Boolean? = null,
    @JsonProperty("errorText")
    val errorText: String? = null,
    @JsonProperty("reference")
    val reference: String? = null
)

data class AppointmentItem(
    @JsonProperty("appointmentColorClass")
    val appointmentColorClass: String? = null,
    @JsonProperty("appointmentType")
    val appointmentType: String? = null,
    @JsonProperty("documentId")
    val documentId: String? = null,
    @JsonProperty("endTime")
    val endTime: String? = null,
    @JsonProperty("endTimeDetailed")
    val endTimeDetailed: String? = null,
    @JsonProperty("endTimeNotDefined")
    val endTimeNotDefined: Boolean? = null,
    @JsonProperty("location")
    val location: AppointmentLocation? = null,
    @JsonProperty("patient")
    val patient: AppointmentPerson? = null,
    @JsonProperty("performer")
    val performer: AppointmentPerson? = null,
    @JsonProperty("startTime")
    val startTime: String? = null,
    @JsonProperty("startTimeDetailed")
    val startTimeDetailed: String? = null,
    @JsonProperty("title")
    val title: String? = null
)

data class AppointmentLocation(
    @JsonProperty("address")
    val address: String? = null,
    @JsonProperty("postalCode")
    val postalCode: String? = null,
    @JsonProperty("title")
    val title: String? = null
)

data class AppointmentPerson(
    @JsonProperty("address")
    val address: String? = null,
    @JsonProperty("familyName")
    val familyName: String? = null,
    @JsonProperty("givenName")
    val givenName: String? = null,
    @JsonProperty("personIdentifier")
    val personIdentifier: String? = null
)
