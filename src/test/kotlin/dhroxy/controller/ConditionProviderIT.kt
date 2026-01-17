package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Condition
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ConditionProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `condition search returns diagnoses`() = runBlocking {
        val condition = Condition().apply {
            id = "cond-1"
            code = org.hl7.fhir.r4.model.CodeableConcept().apply { text = "Kontakt mhp radiologisk undersøgelse" }
        }
        coEvery { conditionService.search(any(), any()) } returns bundleOf(condition)

        val bundle = client.search<Bundle>()
            .forResource(Condition::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
        assertEquals(true, (bundle.entryFirstRep.resource as Condition).id.contains("cond-1"))
    }
}
