package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Encounter
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class EncounterProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `encounter search returns contact periods`() = runBlocking {
        val encounter = Encounter().apply { id = "enc-1" }
        coEvery { encounterService.search(any(), any()) } returns bundleOf(encounter)

        val bundle = client.search<Bundle>()
            .forResource(Encounter::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
        assertEquals(true, (bundle.entryFirstRep.resource as Encounter).id.contains("enc-1"))
    }
}
