package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.ImagingMapper
import dhroxy.model.*
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.DiagnosticReport
import org.hl7.fhir.r4.model.ImagingStudy
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders

class ImagingServiceTest {
    private val client = mockk<SundhedClient>()
    private val service = ImagingService(client, ImagingMapper())
    private val headers = HttpHeaders()

    init { coEvery { client.fetchForloebsoversigt(any()) } returns ForloebsoversigtResponse(personNummer = "010101-0000") }

    private fun response(key: String) = ImagingReferralResponse(
        id = "referral-$key",
        producent = ImagingProducent(navn = "Producer $key"),
        rekvirent = ImagingRekvirent(enhed = "Requester $key"),
        yderligereOplysninger = "Additional $key",
        svar = listOf(ImagingSvar(id = "report-$key", henvisningsId = "referral-$key",
            undersoegelser = listOf(ImagingUndersoegelse(id = "study-$key"))))
    )

    @Test
    fun `selected referral keeps its top-level metadata for reports and studies`() = runBlocking {
        coEvery { client.fetchImagingReferral("referral-a", null, headers) } returns response("a")
        val reports = service.search(headers, "referral-a", null, "http://localhost/fhir/DiagnosticReport")
        val report = reports.entry.mapNotNull { it.resource as? DiagnosticReport }.single()
        assertEquals("Producer a", report.performerFirstRep.display)
        assertEquals("Requester a", report.resultsInterpreterFirstRep.display)
        assertTrue(report.identifier.any { it.system.endsWith("/referral") && it.value == "referral-a" })
        assertStudy(service.imagingStudies(headers, "referral-a", null, "http://localhost/fhir/ImagingStudy")
            .entryFirstRep.resource as ImagingStudy, "a")
    }

    @Test
    fun `aggregated referrals keep their own metadata without mixing patients sources`() = runBlocking {
        val responses = listOf(response("a"), response("b"))
        coEvery { client.fetchImagingReferrals(headers) } returns ImagingReferralsResponse(svar = responses.flatMap { it.svar })
        responses.forEachIndexed { index, response ->
            val key = if (index == 0) "a" else "b"
            coEvery { client.fetchImagingReferral("referral-$key", "study-$key", headers) } returns response
        }
        val reports = service.search(headers, null, null, "http://localhost/fhir/DiagnosticReport")
        assertEquals(4, reports.total)
        val studies = service.imagingStudies(headers, null, null, "http://localhost/fhir/ImagingStudy")
        assertEquals(2, studies.total)
        listOf("a", "b").forEach { key ->
            val report = reports.entry.mapNotNull { it.resource as? DiagnosticReport }.single { it.id == "dr-report-$key" }
            assertEquals("Producer $key", report.performerFirstRep.display)
            assertEquals("Requester $key", report.resultsInterpreterFirstRep.display)
            assertTrue(report.identifier.any { it.system.endsWith("/referral") && it.value == "referral-$key" })
            assertStudy(studies.entry.mapNotNull { it.resource as? ImagingStudy }.single { it.id == "img-study-$key" }, key)
            assertStudy(reports.entry.mapNotNull { it.resource as? ImagingStudy }.single { it.id == "img-study-$key" }, key)
        }
    }

    @Test
    fun `empty detail lookup still produces an empty search bundle`() = runBlocking {
        coEvery { client.fetchImagingReferral("missing", null, headers) } returns null
        assertEquals(0, service.search(headers, "missing", null, "http://localhost/fhir/DiagnosticReport").total)
        assertEquals(0, service.imagingStudies(headers, "missing", null, "http://localhost/fhir/ImagingStudy").total)
    }

    private fun assertStudy(study: ImagingStudy, key: String) {
        assertEquals("Requester $key", study.referrer.display)
        assertEquals("Additional $key", study.note.single().text)
        assertTrue(study.identifier.any { it.system.endsWith("/referral") && it.value == "referral-$key" })
    }
}
