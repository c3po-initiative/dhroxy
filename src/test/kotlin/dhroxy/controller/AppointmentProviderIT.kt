package dhroxy.controller

import ca.uhn.fhir.rest.gclient.DateClientParam
import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Appointment
import org.hl7.fhir.r4.model.Bundle
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AppointmentProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `appointment search returns result`() = runBlocking {
        coEvery { appointmentService.search(any(), any(), any(), any()) } returns
            bundleOf(Appointment().apply { id = "apt-1"; description = "Consultation" })

        // GET /fhir/Appointment?date=ge2024-01-01
        val bundle = client.search<Bundle>()
            .forResource(Appointment::class.java)
            .where(DateClientParam("date").afterOrEquals().day("2024-01-01"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(1, bundle.entry.size)
    }
}
