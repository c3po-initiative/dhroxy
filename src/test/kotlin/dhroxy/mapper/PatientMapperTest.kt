package dhroxy.mapper

import dhroxy.model.PersonDelegationData
import dhroxy.model.PersonSelectionResponse
import org.hl7.fhir.r4.model.Patient
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PatientMapperTest {
    private val mapper = PatientMapper()

    @Test
    fun `maps person selection to patient bundle`() {
        val payload = PersonSelectionResponse(
            personDelegationData = listOf(
                PersonDelegationData(
                    id = "a",
                    cpr = "0101837173",
                    name = "Jens Kristian Jørgensen",
                    relationType = "MigSelv"
                )
            )
        )
        val bundle = mapper.toPatientBundle(payload, "http://localhost/fhir/Patient")
        assertEquals(1, bundle.entry.size)
        val patient = bundle.entryFirstRep.resource as Patient
        assertEquals("0101837173", patient.identifierFirstRep.value)
        assertEquals("Jørgensen", patient.nameFirstRep.family)
    }
}
