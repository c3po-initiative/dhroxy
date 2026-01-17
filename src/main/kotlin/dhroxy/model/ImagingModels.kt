package dhroxy.model

import com.fasterxml.jackson.annotation.JsonProperty

data class ImagingReferralResponse(
    @JsonProperty("Id")
    val id: String? = null,
    @JsonProperty("Producent")
    val producent: ImagingProducent? = null,
    @JsonProperty("Rekvirent")
    val rekvirent: ImagingRekvirent? = null,
    @JsonProperty("Svar")
    val svar: List<ImagingSvar> = emptyList(),
    @JsonProperty("YderligereOplysninger")
    val yderligereOplysninger: String? = null
)

data class ImagingReferralsResponse(
    @JsonProperty("MinDate")
    val minDate: String? = null,
    @JsonProperty("Svar")
    val svar: List<ImagingSvar> = emptyList()
)

data class ImagingProducent(
    @JsonProperty("Enhed")
    val enhed: String? = null,
    @JsonProperty("Navn")
    val navn: String? = null
)

data class ImagingRekvirent(
    @JsonProperty("Efternavn")
    val efternavn: String? = null,
    @JsonProperty("Enhed")
    val enhed: String? = null,
    @JsonProperty("Fornavn")
    val fornavn: String? = null
)

data class ImagingSvar(
    @JsonProperty("Beskrivelse")
    val beskrivelse: String? = null,
    @JsonProperty("Dato")
    val dato: String? = null,
    @JsonProperty("HenvisningsId")
    val henvisningsId: String? = null,
    @JsonProperty("Id")
    val id: String? = null,
    @JsonProperty("Laege")
    val laege: String? = null,
    @JsonProperty("Navn")
    val navn: String? = null,
    @JsonProperty("Producent")
    val producent: ImagingProducent? = null,
    @JsonProperty("Type")
    val type: String? = null,
    @JsonProperty("UdgivelsesDato")
    val udgivelsesDato: String? = null,
    @JsonProperty("Undersoegelser")
    val undersoegelser: List<ImagingUndersoegelse> = emptyList()
)

data class ImagingUndersoegelse(
    @JsonProperty("BilledId")
    val billedId: String? = null,
    @JsonProperty("Dato")
    val dato: String? = null,
    @JsonProperty("Id")
    val id: String? = null,
    @JsonProperty("IdFormatted")
    val idFormatted: String? = null,
    @JsonProperty("Navn")
    val navn: String? = null,
    @JsonProperty("Type")
    val type: String? = null
)
