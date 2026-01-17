package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class CoreOrganizationResponse(
    @JsonProperty("Organizations")
    val organizations: List<CoreOrganization> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CoreOrganization(
    @JsonProperty("OrganizationId")
    val organizationId: Int? = null,
    @JsonProperty("Name")
    val name: String? = null,
    @JsonProperty("DisplayName")
    val displayName: String? = null,
    @JsonProperty("InformationsUnderkategori")
    val category: String? = null,
    @JsonProperty("Street")
    val street: String? = null,
    @JsonProperty("HouseNumberFrom")
    val houseNumberFrom: String? = null,
    @JsonProperty("Floor")
    val floor: String? = null,
    @JsonProperty("Door")
    val door: String? = null,
    @JsonProperty("ZipCode")
    val zipCode: Int? = null,
    @JsonProperty("City")
    val city: String? = null,
    @JsonProperty("Municipality")
    val municipality: String? = null,
    @JsonProperty("Homepage")
    val homepage: String? = null,
    @JsonProperty("CvrNumber")
    val cvrNumber: Long? = null,
    @JsonProperty("LastUpdated")
    val lastUpdated: String? = null
)
