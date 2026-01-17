package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class PersonSelectionResponse(
    @JsonProperty("tabId")
    val tabId: String? = null,
    @JsonProperty("personDelegationData")
    val personDelegationData: List<PersonDelegationData> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class PersonDelegationData(
    @JsonProperty("id")
    val id: String? = null,
    @JsonProperty("cpr")
    val cpr: String? = null,
    @JsonProperty("name")
    val name: String? = null,
    @JsonProperty("relationType")
    val relationType: String? = null,
    @JsonProperty("validAppIDs")
    val validAppIDs: List<Int> = emptyList()
)
