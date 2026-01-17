package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class ForloebsoversigtResponse(
    val numberOfForloeb: Int? = null,
    val harSpaerretForloeb: Boolean? = null,
    val ukendtExist: Boolean? = null,
    val personNummer: String? = null,
    val navn: String? = null,
    val antalCave: Int? = null,
    val forloeb: List<ForloebEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class ForloebEntry(
    val antalEpikriser: Int? = null,
    val antalNotater: Int? = null,
    val antalDiagnoser: Int? = null,
    val antalProcedurer: Int? = null,
    val antalKontaktperioder: Int? = null,
    val vaerdispring: Boolean? = null,
    val privatmarkering: String? = null,
    val skjult: Boolean? = null,
    val varsling: String? = null,
    val sektor: String? = null,
    val sektorKode: String? = null,
    val sygehusMapningKode: String? = null,
    val afdelingMapningKode: String? = null,
    val sygehusKode: String? = null,
    val sygehusNavn: String? = null,
    val afdelingKode: String? = null,
    val afdelingNavn: String? = null,
    val diagnoseNavn: String? = null,
    val diagnoseKode: String? = null,
    val identifikation: String? = null,
    val idNoegle: NoegleRef? = null,
    val datoFra: String? = null,
    val datoTil: String? = null,
    val datoOpdateret: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class NoegleRef(
    val database: String? = null,
    val noegle: String? = null,
    val vaerdispringNoegle: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class KontaktperioderResponse(
    val kontaktperioder: List<KontaktperiodeEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class KontaktperiodeEntry(
    val datoFra: String? = null,
    val datoTil: String? = null,
    val status: String? = null,
    val prioritet: String? = null,
    val afslutningsAarsag: String? = null,
    val enhedsInformation: EnhedsInformation? = null,
    val fritekst: String? = null,
    val laegeligAnsvarlig: String? = null,
    val laegeligAnsvarligTitel: String? = null,
    val registreretAf: String? = null,
    val noegle: String? = null,
    val valgt: Boolean? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class EnhedsInformation(
    val kode: String? = null,
    val afdelingsKode: String? = null,
    val sygehusKode: String? = null,
    val institution: String? = null,
    val afdeling: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class EpikriserResponse(
    val header: Header? = null,
    val epikriser: List<EpikriseEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class NotaterResponse(
    val header: Header? = null,
    val notater: List<NotatEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class Header(
    val datoFra: String? = null,
    val datoTil: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class EpikriseEntry(
    val notatType: String? = null,
    val datoFra: String? = null,
    val enhedsInformation: EnhedsInformation? = null,
    val overskrift: String? = null,
    val broedtekst: String? = null,
    val fritekst: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class NotatEntry(
    val notatType: String? = null,
    val datoFra: String? = null,
    val enhedsInformation: EnhedsInformation? = null,
    val overskrift: String? = null,
    val broedtekst: String? = null,
    val fritekst: String? = null,
    val behandlerNavn: String? = null
)
