package dhroxy.model

import com.fasterxml.jackson.annotation.JsonProperty

data class LabsvarResponse(
    @JsonProperty("Svaroversigt")
    val svaroversigt: Svaroversigt? = null
)

data class Svaroversigt(
    @JsonProperty("Laboratorieresultater")
    val laboratorieresultater: List<Laboratorieresultat> = emptyList(),
    @JsonProperty("Rekvisitioner")
    val rekvisitioner: List<Rekvisition> = emptyList()
)

data class Laboratorieresultat(
    @JsonProperty("AnalysetypeId")
    val analysetypeId: String? = null,
    @JsonProperty("AnalysevejledningLink")
    val analysevejledningLink: String? = null,
    @JsonProperty("Producent")
    val producent: String? = null,
    @JsonProperty("ProduktionsnummerLaboratorie")
    val produktionsnummerLaboratorie: String? = null,
    @JsonProperty("ProevenummerLaboratorie")
    val proevenummerLaboratorie: String? = null,
    @JsonProperty("ProevenummerRekvirent")
    val proevenummerRekvirent: String? = null,
    @JsonProperty("ReferenceIntervalTekst")
    val referenceIntervalTekst: String? = null,
    @JsonProperty("RekvisitionsId")
    val rekvisitionsId: String? = null,
    @JsonProperty("ResultatStatus")
    val resultatStatus: String? = null,
    @JsonProperty("ResultatStatuskode")
    val resultatStatuskode: String? = null,
    @JsonProperty("Resultatdato")
    val resultatdato: String? = null,
    @JsonProperty("Resultattype")
    val resultattype: String? = null,
    @JsonProperty("Undersoegelser")
    val undersoegelser: List<Undersoegelse> = emptyList(),
    @JsonProperty("Vaerdi")
    val vaerdi: String? = null,
    @JsonProperty("Vaerditype")
    val vaerditype: String? = null,
    @JsonProperty("__type")
    val type: String? = null
)

data class Undersoegelse(
    @JsonProperty("AnalyseKode")
    val analyseKode: String? = null,
    @JsonProperty("Eksaminator")
    val eksaminator: String? = null,
    @JsonProperty("Materiale")
    val materiale: String? = null,
    @JsonProperty("OprindelsesSted")
    val oprindelsesSted: String? = null,
    @JsonProperty("Producent")
    val producent: String? = null,
    @JsonProperty("QuantitativeFindings")
    val quantitativeFindings: QuantitativeFindings? = null,
    @JsonProperty("UndersoegelsesNavn")
    val undersoegelsesNavn: String? = null
)

data class QuantitativeFindings(
    @JsonProperty("Data")
    val data: List<List<Any?>>? = null,
    @JsonProperty("NoColumns")
    val noColumns: Int? = null,
    @JsonProperty("NoRows")
    val noRows: Int? = null
)

data class Rekvisition(
    @JsonProperty("Afsender_html")
    val afsenderHtml: String? = null,
    @JsonProperty("Id")
    val id: String? = null,
    @JsonProperty("LaboratorieProductionsNummer")
    val laboratorieProductionsNummer: String? = null,
    @JsonProperty("LaboratorieProevenummer")
    val laboratorieProevenummer: String? = null,
    @JsonProperty("Laboratorieomraade")
    val laboratorieomraade: String? = null,
    @JsonProperty("PatientCpr")
    val patientCpr: String? = null,
    @JsonProperty("PatientNavn")
    val patientNavn: String? = null,
    @JsonProperty("Proevetagningstidspunkt")
    val proevetagningstidspunkt: String? = null,
    @JsonProperty("Rekvirent_html")
    val rekvirentHtml: String? = null,
    @JsonProperty("RekvirentsOrganisation")
    val rekvirentsOrganisation: String? = null,
    @JsonProperty("RekvirentsProevenummer")
    val rekvirentsProevenummer: String? = null,
    @JsonProperty("Svartidspunkt")
    val svartidspunkt: String? = null
)
