package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.ServiceRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ServiceRequestProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `service request search returns referrals`() = runBlocking {
        val sr = ServiceRequest().apply {
            id = "ref-1"
            status = ServiceRequest.ServiceRequestStatus.ACTIVE
        }
        coEvery { referralService.search(any(), any()) } returns bundleOf(sr)

        val bundle = client.search<Bundle>()
            .forResource(ServiceRequest::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
