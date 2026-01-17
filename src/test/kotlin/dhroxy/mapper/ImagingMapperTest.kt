package dhroxy.mapper

import dhroxy.model.ImagingProducent
import dhroxy.model.ImagingReferralResponse
import dhroxy.model.ImagingRekvirent
import dhroxy.model.ImagingSvar
import dhroxy.model.ImagingUndersoegelse
import org.hl7.fhir.r4.model.DiagnosticReport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ImagingMapperTest {
    private val mapper = ImagingMapper()

    @Test
    fun `maps imaging referral to diagnostic report and imaging study`() {
        val undersoegelse = ImagingUndersoegelse(
            billedId = "1.2.840.113564.9.1.20080804154410.12310608110952.214528026",
            dato = "2021-06-08T11:25:00+02:00",
            id = "1.2.208.177.1.7^1.2.208.180.5.1.123751000016006.REP14528026-1.2",
            navn = "X-ray Knee"
        )
        val svar = ImagingSvar(
            beskrivelse = "Ingen tegn til aktuel eller tidligere skeletskade",
            dato = "2021-06-08T11:25:00+02:00",
            henvisningsId = "14527975^^^&1.2.208.181.8.100.1.4&ISO^1.2.208.177.1.0.1.14",
            id = "1.2.840.113564.9.1.20080804154410.12310608110952.2145282026^^^^1.2.208.177.1.0.1.133",
            producent = ImagingProducent(enhed = "Hospitalsenhed Øst", navn = "Hospitalsenhed Øst"),
            udgivelsesDato = "2021-06-09T07:31:03+02:00",
            undersoegelser = listOf(undersoegelse)
        )
        val response = ImagingReferralResponse(
            id = "14527975^^^&1.2.208.181.8.100.1.4&ISO^1.2.208.177.1.0.1.14",
            producent = ImagingProducent(enhed = "Hospitalsenhed Øst", navn = "Hospitalsenhed Øst"),
            rekvirent = ImagingRekvirent(enhed = "Skadestue Akutafdeling"),
            svar = listOf(svar),
            yderligereOplysninger = ""
        )

        val bundle = mapper.toDiagnosticReportBundle(response, "http://localhost/fhir/DiagnosticReport")

        assertEquals(2, bundle.entry.size) // diagnostic report + imaging study
        val report = bundle.entry.mapNotNull { it.resource as? DiagnosticReport }.first()
        assertEquals(DiagnosticReport.DiagnosticReportStatus.FINAL, report.status)
        assertTrue(report.conclusion?.contains("skeletskade") == true)
        assertTrue(report.imagingStudy.isNotEmpty())
    }
}
