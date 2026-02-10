package dhroxy.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningerResponse(
    val aktiveHenvisninger: List<HenvisningEntry> = emptyList(),
    val tidligereHenvisninger: List<HenvisningEntry> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningEntry(
    val henvisningsDato: String? = null,
    val udloebsDato: String? = null,
    val henvisendeKlinik: String? = null,
    val specialeNavn: String? = null,
    val detaljer: HenvisningDetaljer? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningDetaljer(
    val henvisningsType: String? = null,
    val henvisningsKode: String? = null,
    val modtager: HenvisningModtager? = null,
    val diagnoser: List<HenvisningDiagnose> = emptyList(),
    val kliniskeOplysninger: HenvisningKliniskeOplysninger? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningModtager(
    val name: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningDiagnose(
    val diagnoseType: String? = null,
    val diagnoseText: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningKliniskeOplysninger(
    val tekster: List<HenvisningTekst> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class HenvisningTekst(
    val overskrift: String? = null,
    val tekst: String? = null
)
