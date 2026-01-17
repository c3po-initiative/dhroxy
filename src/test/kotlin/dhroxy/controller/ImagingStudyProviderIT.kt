package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.ImagingStudy
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ImagingStudyProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `imaging study search returns result`() = runBlocking {
        coEvery { imagingService.imagingStudies(any(), any(), any(), any()) } returns
            bundleOf(ImagingStudy().apply { id = "img-1"; description = "XR" })

        // GET /fhir/ImagingStudy?identifier=foo
        val bundle = client.search<Bundle>()
            .forResource(ImagingStudy::class.java)
            .where(ImagingStudy.IDENTIFIER.exactly().identifier("foo"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
