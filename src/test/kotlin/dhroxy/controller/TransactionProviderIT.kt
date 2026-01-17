package dhroxy.controller

import ca.uhn.fhir.rest.server.exceptions.InvalidRequestException
import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.coEvery
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Patient
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class TransactionProviderIT : BaseProviderIntegrationTest() {

    @Test
    fun `transaction with GET entries succeeds`() = runBlocking {
        coEvery { patientService.search(any(), any(), any(), any()) } returns bundleOf(
            Patient().apply {
                id = "pat-1"
                addIdentifier().apply { system = "urn:dk:cpr"; value = "0906817173" }
                addName().setFamily("Tester").addGiven("Pat")
            }
        )

        val tx = Bundle().apply {
            type = Bundle.BundleType.TRANSACTION
            addEntry(
                Bundle.BundleEntryComponent().apply {
                    request = Bundle.BundleEntryRequestComponent().apply {
                        method = Bundle.HTTPVerb.GET
                        url = "Patient?identifier=urn:dk:cpr|0906817173"
                    }
                }
            )
        }

        val resp = client.transaction().withBundle(tx).execute()

        assertEquals(Bundle.BundleType.TRANSACTIONRESPONSE, resp.type)
        val returned = resp.entryFirstRep.resource as Bundle
        assertEquals(Bundle.BundleType.SEARCHSET, returned.type)
        assertEquals(1, returned.entry.size)
    }

    @Test
    fun `transaction with non-GET entry is rejected`() {
        val tx = Bundle().apply {
            type = Bundle.BundleType.TRANSACTION
            addEntry(
                Bundle.BundleEntryComponent().apply {
                    request = Bundle.BundleEntryRequestComponent().apply {
                        method = Bundle.HTTPVerb.POST
                        url = "Patient"
                    }
                }
            )
        }

        assertThrows(InvalidRequestException::class.java) {
            client.transaction().withBundle(tx).execute()
        }
    }
}
