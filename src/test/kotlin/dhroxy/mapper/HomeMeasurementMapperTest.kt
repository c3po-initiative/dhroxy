package dhroxy.mapper

import dhroxy.model.HomeMeasurementDocument
import dhroxy.model.HomeMeasurementsResponse
import org.hl7.fhir.r4.model.Observation
import org.hl7.fhir.r4.model.Quantity
import org.hl7.fhir.r4.model.StringType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class HomeMeasurementMapperTest {
    private val mapper = HomeMeasurementMapper()

    @Test
    fun `maps measurement with numeric value to observation`() {
        val response = HomeMeasurementsResponse(
            documents = listOf(
                HomeMeasurementDocument(
                    type = "Blodtryk",
                    date = "2025-12-01T10:30:00+01:00",
                    value = "120",
                    unit = "mmHg",
                    source = "Home device"
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/Observation")

        assertEquals(1, bundle.total)
        val obs = bundle.entryFirstRep.resource as Observation
        assertEquals(Observation.ObservationStatus.FINAL, obs.status)
        assertEquals("Blodtryk", obs.code.text)
        assertTrue(obs.value is Quantity)
        assertEquals("mmHg", (obs.value as Quantity).unit)
        assertTrue(obs.note.any { it.text?.contains("Home device") == true })
    }

    @Test
    fun `maps measurement with non-numeric value as string`() {
        val response = HomeMeasurementsResponse(
            documents = listOf(
                HomeMeasurementDocument(
                    type = "Kommentar",
                    value = "Normal"
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/Observation")

        val obs = bundle.entryFirstRep.resource as Observation
        assertTrue(obs.value is StringType)
    }

    @Test
    fun `sets vital-signs category`() {
        val response = HomeMeasurementsResponse(
            documents = listOf(
                HomeMeasurementDocument(type = "Puls", value = "72", unit = "bpm")
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/Observation")
        val obs = bundle.entryFirstRep.resource as Observation
        assertEquals("vital-signs", obs.categoryFirstRep.codingFirstRep.code)
    }

    @Test
    fun `empty response returns empty bundle`() {
        val bundle = mapper.toBundle(null, "http://localhost/fhir/Observation")
        assertEquals(0, bundle.total)
    }
}
