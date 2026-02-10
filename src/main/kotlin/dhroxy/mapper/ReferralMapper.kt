package dhroxy.mapper

import dhroxy.model.HenvisningEntry
import dhroxy.model.HenvisningerResponse
import org.hl7.fhir.r4.model.Annotation
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.DateTimeType
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Period
import org.hl7.fhir.r4.model.Reference
import org.hl7.fhir.r4.model.ServiceRequest
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class ReferralMapper {

    fun toBundle(response: HenvisningerResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }

        response?.aktiveHenvisninger.orEmpty().forEach { entry ->
            mapServiceRequest(entry, active = true)?.let {
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = it
                })
            }
        }

        response?.tidligereHenvisninger.orEmpty().forEach { entry ->
            mapServiceRequest(entry, active = false)?.let {
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = it
                })
            }
        }

        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapServiceRequest(entry: HenvisningEntry, active: Boolean): ServiceRequest? {
        val sr = ServiceRequest()
        val idSource = listOfNotNull(
            entry.henvisningsDato,
            entry.specialeNavn,
            entry.henvisendeKlinik
        ).joinToString("-").ifBlank { UUID.randomUUID().toString() }
        sr.id = "ref-${safeId(idSource)}"

        sr.status = if (active) ServiceRequest.ServiceRequestStatus.ACTIVE
                    else ServiceRequest.ServiceRequestStatus.COMPLETED

        sr.intent = ServiceRequest.ServiceRequestIntent.ORDER

        entry.specialeNavn?.let {
            sr.code = CodeableConcept().apply {
                text = it
            }
        }

        entry.detaljer?.henvisningsType?.let { type ->
            sr.addCategory(CodeableConcept().apply {
                text = type
                entry.detaljer?.henvisningsKode?.let { code ->
                    addCoding(Coding()
                        .setSystem("https://www.sundhed.dk/henvisning/type")
                        .setCode(code)
                        .setDisplay(type))
                }
            })
        }

        entry.henvisendeKlinik?.let {
            sr.requester = Reference().apply { display = it }
        }

        entry.detaljer?.modtager?.name?.let {
            sr.addPerformer(Reference().apply { display = it })
        }

        val period = Period()
        entry.henvisningsDato?.let {
            period.start = Date.from(OffsetDateTime.parse(it).toInstant())
            sr.authoredOn = period.start
        }
        entry.udloebsDato?.let {
            period.end = Date.from(OffsetDateTime.parse(it).toInstant())
        }
        if (period.start != null || period.end != null) {
            sr.occurrence = period
        }

        val notes = mutableListOf<Annotation>()
        entry.detaljer?.diagnoser?.forEach { d ->
            val text = listOfNotNull(d.diagnoseType, d.diagnoseText).joinToString(": ")
            if (text.isNotBlank()) {
                notes.add(Annotation().apply { this.text = "Diagnose: $text" })
            }
        }
        entry.detaljer?.kliniskeOplysninger?.tekster?.forEach { t ->
            val heading = t.overskrift ?: ""
            val body = cleanHtml(t.tekst)
            val text = if (heading.isNotBlank()) "$heading: $body" else body
            if (text.isNotBlank()) {
                notes.add(Annotation().apply { this.text = text })
            }
        }
        if (notes.isNotEmpty()) {
            sr.note = notes
        }

        sr.subject = Reference().apply {
            setIdentifier(Identifier().setSystem("https://www.sundhed.dk/patient").setValue("current"))
        }

        return sr
    }

    private fun cleanHtml(html: String?): String {
        if (html.isNullOrBlank()) return ""
        return html
            .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<[^>]+>"), "")
            .replace("&#248;", "ø")
            .replace("&#230;", "æ")
            .replace("&#229;", "å")
            .replace("&#198;", "Æ")
            .replace("&#216;", "Ø")
            .replace("&#197;", "Å")
            .replace("&nbsp;", " ")
            .trim()
    }

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)
}
