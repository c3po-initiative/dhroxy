package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.MedicationStatement
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class MedicationStatementProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `medication statement search returns result`() = runBlocking {
        coEvery { medicationCardService.search(any(), any(), any(), any(), any()) } returns
            bundleOf(MedicationStatement().apply { id = "med-1"; status = MedicationStatement.MedicationStatementStatus.ACTIVE })

        // GET /fhir/MedicationStatement
        val bundle = client.search<Bundle>()
            .forResource(MedicationStatement::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
