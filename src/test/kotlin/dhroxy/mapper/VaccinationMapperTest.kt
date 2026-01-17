package dhroxy.mapper

import dhroxy.model.VaccinationHistoryEntry
import dhroxy.model.VaccinationRecord
import org.hl7.fhir.r4.model.Immunization
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class VaccinationMapperTest {
    private val mapper = VaccinationMapper()

    @Test
    fun `maps vaccination record to immunization bundle`() {
        val record = VaccinationRecord(
            activeStatus = true,
            coverageDuration = "1 year",
            effectuatedBy = "Danske Lægers Vaccinations Service",
            effectuatedDateTime = "2025-09-30T09:11:14+02:00",
            isEditable = false,
            negativeConsent = false,
            selfCreated = false,
            vaccinationIdentifier = 32206056656,
            vaccine = "Influvac mod Influenza"
        )
        val history = listOf(VaccinationHistoryEntry(date = "2025-09-30T09:11:14+02:00", id = 1))

        val bundle = mapper.toImmunizationBundle(
            listOf(record),
            "http://localhost/fhir/Immunization",
            mapOf(32206056656L to history)
        )

        assertEquals(1, bundle.total)
        val imm = bundle.entryFirstRep.resource as Immunization
        assertEquals(Immunization.ImmunizationStatus.COMPLETED, imm.status)
        assertEquals("Influvac mod Influenza", imm.vaccineCode.text)
        assertEquals("32206056656", imm.identifierFirstRep.value)
        assertTrue(imm.note.any { it.text?.contains("History") == true })
    }

    @Test
    fun `marks negative consent as not-done`() {
        val record = VaccinationRecord(
            activeStatus = false,
            negativeConsent = true,
            vaccinationIdentifier = 1,
            vaccine = "Example Vaccine"
        )

        val bundle = mapper.toImmunizationBundle(
            listOf(record),
            "http://localhost/fhir/Immunization"
        )

        val imm = bundle.entryFirstRep.resource as Immunization
        assertEquals(Immunization.ImmunizationStatus.NOTDONE, imm.status)
    }
}
