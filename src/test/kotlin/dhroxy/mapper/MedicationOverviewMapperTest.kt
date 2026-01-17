package dhroxy.mapper

import dhroxy.model.OrdinationOverviewResponse
import dhroxy.model.PrescriptionOverviewResponse
import org.hl7.fhir.r4.model.Observation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class MedicationOverviewMapperTest {
    private val mapper = MedicationOverviewMapper()

    @Test
    fun `maps ordination and prescription overviews to observation bundle`() {
        val ord = OrdinationOverviewResponse(
            hasDrugMedicationWithNegativeConsent = false,
            hasEndedDrugMedicationWithNegativeConsent = false,
            hasVkaDrugMedicationWhereDosagePeriodExceeded = false,
            numberOfActive = 2,
            numberOfDosagePeriodExceeded = 0,
            numberOfFutureDosageStart = 1,
            numberOfNonStopped = 2,
            numberOfStopped = 0,
            numberOfTemporarilyStopped = 0
        )
        val rx = PrescriptionOverviewResponse(
            numClosed = 1,
            numDispensings = 3,
            numFuture = 0,
            numOpen = 2,
            numTotal = 3,
            numUnconnected = 0
        )

        val bundle = mapper.toObservationBundle(ord, rx, "http://localhost/fhir/Observation?category=medication")
        assertEquals(1, bundle.entry.size)
        val obs = bundle.entryFirstRep.resource as Observation
        assertEquals(Observation.ObservationStatus.FINAL, obs.status)
        assertTrue(obs.component.any { it.code.codingFirstRep.code == "NumberOfActive" && it.valueQuantity.value?.toInt() == 2 })
        assertTrue(obs.component.any { it.code.codingFirstRep.code == "NumDispensings" && it.valueQuantity.value?.toInt() == 3 })
    }
}
