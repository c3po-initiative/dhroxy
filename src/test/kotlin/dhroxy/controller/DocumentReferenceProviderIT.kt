package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.DocumentReference
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class DocumentReferenceProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `documentreference search returns notes`() = runBlocking {
        val doc = DocumentReference().apply { id = "doc-1" }
        coEvery { documentReferenceService.search(any(), any()) } returns bundleOf(doc)

        val bundle = client.search<Bundle>()
            .forResource(DocumentReference::class.java)
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
        assertEquals(true, (bundle.entryFirstRep.resource as DocumentReference).id.contains("doc-1"))
    }
}
