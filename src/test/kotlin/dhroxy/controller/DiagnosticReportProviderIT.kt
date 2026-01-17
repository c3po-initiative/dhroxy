package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.DiagnosticReport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class DiagnosticReportProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `diagnostic report search returns result`() = runBlocking {
        coEvery { imagingService.search(any(), any(), any(), any()) } returns
            bundleOf(DiagnosticReport().apply { id = "dr-1"; code.text = "X-ray" })

        // GET /fhir/DiagnosticReport
        val bundle = client.search<Bundle>()
            .forResource(DiagnosticReport::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
