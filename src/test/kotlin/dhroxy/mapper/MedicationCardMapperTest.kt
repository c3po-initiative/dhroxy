package dhroxy.mapper

import dhroxy.model.MedicationCardEntry
import dhroxy.model.MedicationCardStatus
import dhroxy.model.OrdinationDetails
import dhroxy.model.DrugMedication
import dhroxy.model.Treatment
import dhroxy.model.Dosage
import org.hl7.fhir.r4.model.MedicationStatement
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class MedicationCardMapperTest {
    private val mapper = MedicationCardMapper()

    @Test
    fun `maps medication card entries to medication statements`() {
        val entry = MedicationCardEntry(
            activeSubstance = "Ibuprofen",
            cause = "mod smerter",
            dosage = "2 tabletter 3 gange daglig",
            drugMedication = "Ipren (Ibuprofen)",
            ordinationId = "27974618",
            startDate = "2013-11-04T00:00:00",
            status = MedicationCardStatus(enumStr = "Active"),
            strength = "200 mg"
        )

        val bundle = mapper.toMedicationStatementBundle(listOf(entry), "http://localhost/fhir/MedicationStatement")

        assertEquals(1, bundle.entry.size)
        val med = bundle.entryFirstRep.resource as MedicationStatement
        assertEquals("Ipren (Ibuprofen)", med.medicationCodeableConcept.text)
        assertEquals(MedicationStatement.MedicationStatementStatus.ACTIVE, med.status)
        assertEquals("27974618", med.identifierFirstRep.value)
        assertEquals("2 tabletter 3 gange daglig", med.dosageFirstRep.text)
    }

    @Test
    fun `maps ordination details to medication statement`() {
        val details = OrdinationDetails(
            drugMedication = DrugMedication(
                name = "Ipren (Ibuprofen)",
                activeSubstance = "Ibuprofen",
                atcCode = "M01AE01",
                ordinationIdentifier = "27974618"
            ),
            treatment = Treatment(
                cause = "mod smerter",
                startDate = "2013-11-04T00:00:00"
            ),
            dosage = Dosage(text = "2 tabletter 3 gange daglig")
        )

        val bundle = mapper.fromDetails(details, "http://localhost/fhir/MedicationStatement")
        val med = bundle.entryFirstRep.resource as MedicationStatement
        assertEquals("Ipren (Ibuprofen)", med.medicationCodeableConcept.text)
        assertEquals("27974618", med.identifierFirstRep.value)
        assertEquals("M01AE01", med.medicationCodeableConcept.codingFirstRep.code)
    }
}
