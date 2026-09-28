package dhroxy.mapper

import dhroxy.model.PrescriptionResponse
import org.hl7.fhir.r4.model.MedicationRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class MedicationRequestMapperTest {
    private val mapper = MedicationRequestMapper()

    @Test
    fun `maps a closed prescription to a completed medication request`() {
        val bundle = mapper.toMedicationRequestBundle(
            details = emptyList(),
            entries = emptyList(),
            requestUrl = "http://localhost/fhir/MedicationRequest",
            prescriptions = listOf(
                PrescriptionResponse(
                    prescriptionId = "123456789012345",
                    ordinationId = "ord-1",
                    status = "afsluttet",
                    drug = "Paracetamol",
                    strength = "500 mg",
                    form = "tablet",
                    dosage = "1 tablet 3 gange dagligt",
                    prescriptionDate = "2025-02-19T09:47:54.991Z",
                    validFromDate = "2025-02-19T00:00:00Z",
                    validToDate = "2026-02-19T00:00:00Z"
                )
            )
        )

        assertEquals(1, bundle.total)
        val mr = bundle.entryFirstRep.resource as MedicationRequest
        assertEquals("presc-123456789012345", mr.id)
        assertEquals(MedicationRequest.MedicationRequestStatus.COMPLETED, mr.status)
        assertEquals(MedicationRequest.MedicationRequestIntent.ORDER, mr.intent)
        assertTrue(mr.medication.let { it as org.hl7.fhir.r4.model.CodeableConcept }.text.contains("Paracetamol"))
        assertEquals("1 tablet 3 gange dagligt", mr.dosageInstructionFirstRep.text)
        assertTrue(
            mr.identifier.any { it.system == "https://www.sundhed.dk/recept" && it.value == "123456789012345" },
            "prescription id must be preserved as a recept identifier"
        )
        assertTrue(mr.dispenseRequest.validityPeriod.hasStart() && mr.dispenseRequest.validityPeriod.hasEnd())
    }

    @Test
    fun `maps an open prescription to an active medication request`() {
        val bundle = mapper.toMedicationRequestBundle(
            details = emptyList(),
            entries = emptyList(),
            requestUrl = "http://localhost/fhir/MedicationRequest",
            prescriptions = listOf(PrescriptionResponse(prescriptionId = "p1", status = "aktiv", drug = "Ibuprofen"))
        )

        val mr = bundle.entryFirstRep.resource as MedicationRequest
        assertEquals(MedicationRequest.MedicationRequestStatus.ACTIVE, mr.status)
    }

    @Test
    fun `prescriptions and ordination details both appear in the bundle`() {
        val bundle = mapper.toMedicationRequestBundle(
            details = emptyList(),
            entries = emptyList(),
            requestUrl = "http://localhost/fhir/MedicationRequest",
            prescriptions = listOf(
                PrescriptionResponse(prescriptionId = "a", status = "afsluttet"),
                PrescriptionResponse(prescriptionId = "b", status = "afsluttet")
            )
        )

        assertEquals(2, bundle.total)
    }

    @Test
    fun `no prescriptions yields the medicine-card-only behaviour`() {
        val bundle = mapper.toMedicationRequestBundle(
            details = emptyList(),
            entries = emptyList(),
            requestUrl = "http://localhost/fhir/MedicationRequest"
        )
        assertEquals(0, bundle.total)
    }
}
