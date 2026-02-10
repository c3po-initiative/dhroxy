package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class CarePlansResponse(
    val plans: List<CarePlanEntry> = emptyList(),
    val isLiveData: Boolean? = null,
    val hasConsentData: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CarePlanEntry(
    val title: String? = null,
    val name: String? = null,
    val status: String? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val organization: String? = null,
    val description: String? = null
)
