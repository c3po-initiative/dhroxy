package dhroxy.mapper

import dhroxy.model.ImagingReferralResponse
import dhroxy.model.ImagingSvar
import dhroxy.model.ImagingUndersoegelse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.DiagnosticReport
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.ImagingStudy
import org.hl7.fhir.r4.model.Reference
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class ImagingMapper {
    private val imagingCategory =
        CodeableConcept().addCoding(
            Coding()
                .setSystem("http://terminology.hl7.org/CodeSystem/observation-category")
                .setCode("imaging")
                .setDisplay("Imaging")
        )

    fun toDiagnosticReportBundle(payload: ImagingReferralResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
        val response = payload ?: return bundle.apply { total = 0 }

        // Collect imaging studies to avoid duplicates
        val imagingEntries = mutableMapOf<String, Bundle.BundleEntryComponent>()

        response.svar.forEach { svar ->
            val studyRefs = svar.undersoegelser.mapNotNull { undersoegelse ->
                val studyEntry = imagingEntries.getOrPut(undersoegelse.id ?: undersoegelse.billedId ?: UUID.randomUUID().toString()) {
                    val imagingStudy = buildImagingStudy(response, svar, undersoegelse)
                    Bundle.BundleEntryComponent().apply {
                        fullUrl = "urn:uuid:${imagingStudy.idElement.idPart}"
                        resource = imagingStudy
                    }
                }
                Reference().apply { reference = studyEntry.fullUrl }
            }

            val diagnosticReport = buildDiagnosticReport(response, svar, studyRefs)
            bundle.addEntry(
                Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${diagnosticReport.idElement.idPart}"
                    resource = diagnosticReport
                }
            )
        }

        imagingEntries.values.forEach { bundle.addEntry(it) }
        bundle.total = bundle.entry.size
        return bundle
    }

    fun toImagingStudyBundle(payload: ImagingReferralResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
        val response = payload ?: return bundle.apply { total = 0 }
        response.svar.forEach { svar ->
            svar.undersoegelser.forEach { undersoegelse ->
                val imagingStudy = buildImagingStudy(response, svar, undersoegelse)
                bundle.addEntry(
                    Bundle.BundleEntryComponent().apply {
                        fullUrl = "urn:uuid:${imagingStudy.idElement.idPart}"
                        resource = imagingStudy
                    }
                )
            }
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun buildDiagnosticReport(
        response: ImagingReferralResponse,
        svar: ImagingSvar,
        imagingStudyRefs: List<Reference>
    ): DiagnosticReport {
        val report = DiagnosticReport()
        report.id = "dr-${safeId(svar.id ?: svar.henvisningsId ?: UUID.randomUUID().toString())}"
        report.identifier = listOfNotNull(
            svar.id?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/report").setValue(it) },
            svar.henvisningsId?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/henvisning").setValue(it) },
            response.id?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/referral").setValue(it) }
        )
        report.status = DiagnosticReport.DiagnosticReportStatus.FINAL
        report.category = listOf(imagingCategory)
        report.code = CodeableConcept().apply {
            text = svar.navn ?: svar.type ?: "Billedbeskrivelse"
        }
        svar.dato?.let { report.setEffective(parseDateType(it)) }
        svar.udgivelsesDato?.let { report.issued = parseDate(it) } ?: svar.dato?.let { report.issued = parseDate(it) }
        report.conclusion = svar.beskrivelse

        val performerName = svar.producent?.navn ?: svar.producent?.enhed ?: response.producent?.navn ?: response.producent?.enhed
        performerName?.let {
            report.performer = listOf(Reference().apply { display = it })
        }
        val requesterName = listOfNotNull(response.rekvirent?.fornavn, response.rekvirent?.efternavn, response.rekvirent?.enhed)
            .joinToString(" ").trim()
        if (requesterName.isNotBlank()) {
            report.resultsInterpreter = listOf(Reference().apply { display = requesterName })
        }
        if (imagingStudyRefs.isNotEmpty()) {
            report.imagingStudy = imagingStudyRefs
        }
        return report
    }

    private fun buildImagingStudy(
        response: ImagingReferralResponse,
        svar: ImagingSvar,
        undersoegelse: ImagingUndersoegelse
    ): ImagingStudy {
        val imagingStudy = ImagingStudy()
        imagingStudy.id = "img-${safeId(undersoegelse.id ?: undersoegelse.billedId ?: UUID.randomUUID().toString())}"
        imagingStudy.identifier = listOfNotNull(
            response.id?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/referral").setValue(it) },
            svar.henvisningsId?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/henvisning").setValue(it) },
            svar.id?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/report").setValue(it) },
            undersoegelse.id?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/undersoegelse").setValue(it) },
            undersoegelse.billedId?.let { Identifier().setSystem("https://www.sundhed.dk/imaging/billed").setValue(it) }
        )
        imagingStudy.status = ImagingStudy.ImagingStudyStatus.AVAILABLE
        undersoegelse.dato?.let { imagingStudy.started = parseDate(it) }
        imagingStudy.description = listOfNotNull(
            undersoegelse.navn,
            svar.navn,
            svar.type
        ).firstOrNull() ?: "Imaging study"
        val requesterName = listOfNotNull(response.rekvirent?.fornavn, response.rekvirent?.efternavn, response.rekvirent?.enhed)
            .joinToString(" ").trim()
        if (requesterName.isNotBlank()) {
            imagingStudy.referrer = Reference().apply { display = requesterName }
        }
        response.yderligereOplysninger?.takeIf { it.isNotBlank() }?.let {
            imagingStudy.note = listOf(org.hl7.fhir.r4.model.Annotation().apply { text = it })
        }

        // Minimal series/instance scaffolding
        val series = ImagingStudy.ImagingStudySeriesComponent().apply {
            uid = undersoegelse.id ?: undersoegelse.billedId ?: UUID.randomUUID().toString()
            description = undersoegelse.navn ?: svar.navn
            bodySite = Coding().apply { display = svar.type ?: "Imaging" }
            undersoegelse.type?.let { modality = Coding().setCode(it) }
            val instance = ImagingStudy.ImagingStudySeriesInstanceComponent().apply {
                uid = undersoegelse.billedId ?: undersoegelse.id ?: UUID.randomUUID().toString()
                title = undersoegelse.navn ?: svar.navn
            }
            addInstance(instance)
        }
        imagingStudy.series = listOf(series)
        return imagingStudy
    }

    private fun parseDateType(dateTime: String): org.hl7.fhir.r4.model.DateTimeType =
        org.hl7.fhir.r4.model.DateTimeType(Date.from(OffsetDateTime.parse(dateTime).toInstant()))

    private fun parseDate(dateTime: String): Date =
        Date.from(OffsetDateTime.parse(dateTime).toInstant())

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)
}
