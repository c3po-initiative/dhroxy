package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class MinLaegeOrganizationResponse(
    @JsonProperty("OrganizationId")
    val organizationId: Int? = null
)
