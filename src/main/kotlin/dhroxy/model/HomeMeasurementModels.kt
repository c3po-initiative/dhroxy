package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class HomeMeasurementsResponse(
    val documents: List<HomeMeasurementDocument> = emptyList(),
    val groupings: List<HomeMeasurementGrouping> = emptyList(),
    val hasErrors: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HomeMeasurementDocument(
    val type: String? = null,
    val name: String? = null,
    val date: String? = null,
    val value: String? = null,
    val unit: String? = null,
    val source: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HomeMeasurementGrouping(
    val name: String? = null
)
