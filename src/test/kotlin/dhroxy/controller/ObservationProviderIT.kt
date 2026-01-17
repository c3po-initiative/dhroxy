package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Observation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ObservationProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `observation search returns result`() = runBlocking {
        coEvery { observationService.search(any(), any(), any(), any(), any()) } returns
            bundleOf(Observation().apply { id = "obs-1"; code.text = "lab" })

        // GET /fhir/Observation?category=lab
        val bundle = client.search<Bundle>()
            .forResource(Observation::class.java)
            .where(Observation.CATEGORY.exactly().code("lab"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }

    @Test
    fun `medication category still returns observations (labs only)`() = runBlocking {
        coEvery { observationService.search(any(), any(), any(), any(), any()) } returns
            bundleOf(Observation().apply { id = "obs-2"; code.text = "lab" })

        // GET /fhir/Observation?category=medication
        val bundle = client.search<Bundle>()
            .forResource(Observation::class.java)
            .where(Observation.CATEGORY.exactly().code("medication"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
