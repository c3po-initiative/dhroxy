package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Immunization
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ImmunizationProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `immunization search returns result`() = runBlocking {
        coEvery { vaccinationService.search(any(), any(), any(), any()) } returns
            bundleOf(Immunization().apply { id = "imm-1"; vaccineCode.text = "flu" })

        // GET /fhir/Immunization
        val bundle = client.search<Bundle>()
            .forResource(Immunization::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
