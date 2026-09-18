package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.config.SundhedClientProperties
import dhroxy.mapper.MedicationCardMapper
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.MedicationStatement
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders

class MedicationCardServiceTest {

    private val client = mockk<SundhedClient>()
    private val mapper = mockk<MedicationCardMapper>()
    private val service = MedicationCardService(client, mapper, SundhedClientProperties())

    /**
     * Regression: the medicine card is session-scoped and does not need a resolved
     * eservices/org id. Previously, when the optional min-læge-organisation lookup
     * was unavailable (now mapped to null instead of throwing), a null/blank id
     * short-circuited to an empty bundle without ever calling the medicine-card
     * endpoint. It must now still be fetched.
     */
    @Test
    fun `medicine card is fetched even when min-laege-organisation lookup is unavailable`() = runBlocking {
        coEvery { client.fetchMinLaegeOrganizationId(any()) } returns null
        coEvery { client.fetchMedicationCard(any(), any()) } returns emptyList()

        val expected = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            addEntry(
                Bundle.BundleEntryComponent().apply {
                    resource = MedicationStatement().apply { id = "med-1" }
                }
            )
        }
        every { mapper.toMedicationStatementBundle(any(), any()) } returns expected

        val result = service.search(
            headers = HttpHeaders(),
            sourceId = null,
            status = null,
            identifier = null,
            requestUrl = "http://localhost/fhir/MedicationStatement"
        )

        coVerify(exactly = 1) { client.fetchMedicationCard(any(), any()) }
        assertEquals(1, result.entry.size)
    }
}
