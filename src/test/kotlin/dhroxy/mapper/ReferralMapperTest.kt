package dhroxy.mapper

import dhroxy.model.*
import org.hl7.fhir.r4.model.ServiceRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ReferralMapperTest {
    private val mapper = ReferralMapper()

    @Test
    fun `maps active referral to service request`() {
        val response = HenvisningerResponse(
            aktiveHenvisninger = listOf(
                HenvisningEntry(
                    henvisningsDato = "2025-11-10T12:24:36.259Z",
                    udloebsDato = "2026-05-11T00:00:00Z",
                    henvisendeKlinik = "Lægehuset Amagerport",
                    specialeNavn = "Dermatologi-venerologi",
                    detaljer = HenvisningDetaljer(
                        henvisningsType = "Speciallægehenvisning",
                        henvisningsKode = "Ref06"
                    )
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/ServiceRequest")

        assertEquals(1, bundle.total)
        val sr = bundle.entryFirstRep.resource as ServiceRequest
        assertEquals(ServiceRequest.ServiceRequestStatus.ACTIVE, sr.status)
        assertEquals("Dermatologi-venerologi", sr.code.text)
        assertEquals("Lægehuset Amagerport", sr.requester.display)
        assertEquals("Speciallægehenvisning", sr.categoryFirstRep.text)
    }

    @Test
    fun `maps previous referral as completed`() {
        val response = HenvisningerResponse(
            tidligereHenvisninger = listOf(
                HenvisningEntry(
                    henvisningsDato = "2024-01-01T00:00:00Z",
                    specialeNavn = "Ortopædi"
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/ServiceRequest")

        assertEquals(1, bundle.total)
        val sr = bundle.entryFirstRep.resource as ServiceRequest
        assertEquals(ServiceRequest.ServiceRequestStatus.COMPLETED, sr.status)
    }

    @Test
    fun `includes diagnoses and clinical notes in annotations`() {
        val response = HenvisningerResponse(
            aktiveHenvisninger = listOf(
                HenvisningEntry(
                    henvisningsDato = "2025-11-10T12:24:36.259Z",
                    specialeNavn = "Dermatologi",
                    detaljer = HenvisningDetaljer(
                        diagnoser = listOf(
                            HenvisningDiagnose(diagnoseType = "Aktionsdiagnose", diagnoseText = "Dermatitis")
                        ),
                        kliniskeOplysninger = HenvisningKliniskeOplysninger(
                            tekster = listOf(
                                HenvisningTekst(overskrift = "Anamnese", tekst = "Patient has eczema")
                            )
                        )
                    )
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/ServiceRequest")
        val sr = bundle.entryFirstRep.resource as ServiceRequest
        assertTrue(sr.note.any { it.text?.contains("Dermatitis") == true })
        assertTrue(sr.note.any { it.text?.contains("Anamnese") == true })
    }

    @Test
    fun `empty response returns empty bundle`() {
        val bundle = mapper.toBundle(null, "http://localhost/fhir/ServiceRequest")
        assertEquals(0, bundle.total)
    }
}
