package dhroxy.mapper

import dhroxy.model.LabsvarResponse
import dhroxy.model.Laboratorieresultat
import dhroxy.model.QuantitativeFindings
import dhroxy.model.Rekvisition
import org.hl7.fhir.r4.model.Annotation
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.DateTimeType
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Observation
import org.hl7.fhir.r4.model.Quantity
import org.hl7.fhir.r4.model.Reference
import org.hl7.fhir.r4.model.StringType
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class LabMapper {
    private val observationCategory =
        CodeableConcept().addCoding(
            Coding()
                .setSystem("http://terminology.hl7.org/CodeSystem/observation-category")
                .setCode("laboratory")
                .setDisplay("Laboratory")
        )

    private fun cleanText(html: String?): String? {
        if (html.isNullOrBlank()) return null
        return html
            .replace("<br/>", "\n", ignoreCase = true)
            .replace("<br />", "\n", ignoreCase = true)
            .replace(Regex("<[^>]+>"), " ")
            .replace("&nbsp;", " ")
            .replace("&#230;", "æ")
            .replace("&#248;", "ø")
            .replace("&#229;", "å")
            .replace("&#198;", "Æ")
            .replace("&#216;", "Ø")
            .replace("&#197;", "Å")
            .trim()
    }

    fun toObservationBundle(payload: LabsvarResponse?, requestUrl: String): Bundle {
        val svaroversigt = payload?.svaroversigt ?: return emptyBundle(requestUrl)
        val rekById = svaroversigt.rekvisitioner.associateBy { it.id }
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }

        svaroversigt.laboratorieresultater.forEach { result ->
            val rekvisition = rekById[result.rekvisitionsId]
            bundle.addEntry(
                Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = mapObservation(result, rekvisition)
                }
            )
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapObservation(result: Laboratorieresultat, rekvisition: Rekvisition?): Observation {
        val observation = Observation()
        observation.id = "lab-${safeId(result.rekvisitionsId ?: result.proevenummerLaboratorie ?: UUID.randomUUID().toString())}"
        observation.identifier = buildList {
            result.rekvisitionsId?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/labsvar/rekvisition").setValue(it))
            }
            result.proevenummerLaboratorie?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/labsvar/proevenummer").setValue(it))
            }
        }
        observation.category = listOf(observationCategory)
        observation.status = mapStatus(result.resultatStatuskode, result.resultatStatus)

        val undersoegelse = result.undersoegelser.firstOrNull()
        observation.code = CodeableConcept().apply {
            text = undersoegelse?.undersoegelsesNavn ?: result.analysetypeId ?: result.resultattype ?: result.vaerditype
            undersoegelse?.analyseKode?.let { code ->
                addCoding(
                    Coding()
                        .setSystem("https://www.sundhed.dk/codes/labsvar")
                        .setCode(code)
                        .setDisplay(undersoegelse.undersoegelsesNavn)
                )
            }
        }

        extractNumericValue(undersoegelse?.quantitativeFindings)?.let { value ->
            observation.setValue(value)
        } ?: run {
            val narrativeValue = cleanText(result.konklusionHtml)
                ?: cleanText(result.diagnoseHtml)
                ?: cleanText(result.mikroskopiHtml)
                ?: cleanText(result.makroskopiHtml)
                ?: result.vaerdi
            narrativeValue?.let { observation.setValue(StringType(it)) }
        }

        result.referenceIntervalTekst?.let {
            observation.referenceRange = listOf(
                Observation.ObservationReferenceRangeComponent().apply {
                    text = it
                }
            )
        }

        result.resultatdato?.let { observation.setEffective(parseDateType(it)) }
            ?: rekvisition?.proevetagningstidspunkt?.let { observation.setEffective(parseDateType(it)) }
        result.resultatdato?.let { observation.setIssued(parseDate(it)) }

        rekvisition?.rekvirentsOrganisation?.let {
            observation.setPerformer(
                listOf(
                    Reference().apply {
                        display = it
                    }
                )
            )
        } ?: undersoegelse?.eksaminator?.let {
            observation.setPerformer(listOf(Reference().apply { display = it }))
        }

        rekvisition?.let {
            val subjectRef = Reference()
            subjectRef.setIdentifier(
                Identifier()
                .setSystem("urn:dk:cpr")
                .setValue(it.patientCpr ?: hashId(observation.id))
            )
            subjectRef.display = it.patientNavn
            observation.setSubject(subjectRef)
        }

        result.analysevejledningLink?.let {
            observation.note = listOf(
                Annotation().apply {
                    text = "Analysevejledning: $it"
                }
            )
        }

        // Attach pathology-rich text as notes when present
        val extraNotes = listOfNotNull(
            cleanText(result.materialeHtml)?.let { "Materiale: $it" },
            cleanText(result.diagnoseHtml)?.let { "Diagnose: $it" },
            cleanText(result.konklusionHtml)?.let { "Konklusion: $it" },
            cleanText(result.mikroskopiHtml)?.let { "Mikroskopi: $it" },
            cleanText(result.makroskopiHtml)?.let { "Makroskopi: $it" },
            cleanText(result.kliniskeInformationerHtml)?.let { "Kliniske oplysninger: $it" }
        )
        if (extraNotes.isNotEmpty()) {
            observation.note = observation.note + extraNotes.map { txt ->
                Annotation().apply { text = txt }
            }
        }

        return observation
    }

    private fun extractNumericValue(qf: QuantitativeFindings?): Quantity? {
        val data = qf?.data ?: return null
        if (data.size < 2) return null
        val row = data[1]
        if (row.size < 10) return null
        val value = row[9]?.toString()?.trim().orEmpty()
        if (value.isBlank() || value.equals("Ikke påvist", ignoreCase = true)) return null
        val quantity = Quantity()
        quantity.value = value.toBigDecimalOrNull() ?: return null
        val unit = row.getOrNull(10)?.toString()?.trim().orEmpty()
        if (unit.isNotBlank()) {
            quantity.unit = unit
        }
        return quantity
    }

    private fun mapStatus(statusCode: String?, statusText: String?): Observation.ObservationStatus {
        return when (statusCode ?: statusText) {
            "SvarEndeligt", "KompletSvar" -> Observation.ObservationStatus.FINAL
            "Foreloebigt" -> Observation.ObservationStatus.PRELIMINARY
            "Annulleret" -> Observation.ObservationStatus.CANCELLED
            else -> Observation.ObservationStatus.UNKNOWN
        }
    }

    private fun parseDateType(dateTime: String): DateTimeType =
        DateTimeType(Date.from(OffsetDateTime.parse(dateTime).toInstant()))

    private fun parseDate(dateTime: String): Date =
        Date.from(OffsetDateTime.parse(dateTime).toInstant())

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)

    private fun hashId(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(value.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun emptyBundle(requestUrl: String): Bundle =
        Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            total = 0
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
}
