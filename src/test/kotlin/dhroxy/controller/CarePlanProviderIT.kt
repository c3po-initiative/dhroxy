package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CarePlan
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CarePlanProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `care plan search returns plans`() = runBlocking {
        val cp = CarePlan().apply {
            id = "cp-1"
            status = CarePlan.CarePlanStatus.ACTIVE
            intent = CarePlan.CarePlanIntent.PLAN
            title = "Test Plan"
        }
        coEvery { carePlanService.search(any(), any()) } returns bundleOf(cp)

        val bundle = client.search<Bundle>()
            .forResource(CarePlan::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
