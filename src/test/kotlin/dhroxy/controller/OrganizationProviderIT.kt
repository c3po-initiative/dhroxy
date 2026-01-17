package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Organization
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class OrganizationProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `organization search by cvr returns result`() = runBlocking {
        coEvery { organizationService.search(any(), any(), any(), any()) } returns
            bundleOf(Organization().apply { id = "org-1"; addIdentifier().apply { system = "urn:dk:cvr"; value = "34395675" } })

        // GET /fhir/Organization?identifier=urn:dk:cvr|34395675
        val bundle = client.search<Bundle>()
            .forResource(Organization::class.java)
            .where(Organization.IDENTIFIER.exactly().systemAndIdentifier("urn:dk:cvr", "34395675"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
