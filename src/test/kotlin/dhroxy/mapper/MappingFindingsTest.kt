package dhroxy.mapper

import ca.uhn.fhir.context.FhirContext
import dhroxy.model.*
import org.hl7.fhir.r4.model.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class MappingFindingsTest {
    private val parser = FhirContext.forR4Cached().newJsonParser()
    private val absentReason = "http://hl7.org/fhir/StructureDefinition/data-absent-reason"

    @Test
    fun `all standalone medication branches identify the session patient`() {
        val card = MedicationCardMapper()
        val statements = listOf(
            card.toMedicationStatementBundle(listOf(MedicationCardEntry(ordinationId = "ord-1")), "http://localhost/fhir/MedicationStatement"),
            card.fromDetails(OrdinationDetails(drugMedication = DrugMedication(ordinationIdentifier = "ord-1")), "http://localhost/fhir/MedicationStatement")
        )
        statements.forEach { bundle ->
            val result = parser.parseResource(parser.encodeResourceToString(bundle)) as Bundle
            assertSessionPatient((result.entryFirstRep.resource as MedicationStatement).subject)
        }
        val requests = MedicationRequestMapper().toMedicationRequestBundle(
            details = listOf(OrdinationDetails(drugMedication = DrugMedication(ordinationIdentifier = "ord-1"))),
            entries = emptyList(),
            requestUrl = "http://localhost/fhir/MedicationRequest",
            prescriptions = listOf(PrescriptionResponse(prescriptionId = "rx-1"))
        )
        val result = parser.parseResource(parser.encodeResourceToString(requests)) as Bundle
        assertEquals(2, result.total)
        result.entry.forEach { assertSessionPatient((it.resource as MedicationRequest).subject) }
    }

    @Test
    fun `missing lab CPR never becomes a fabricated identifier`() {
        listOf(null, "", "   ").forEach { cpr ->
            val observation = labObservation(cpr)
            assertFalse(observation.subject.hasIdentifier())
            assertEquals("Synthetic patient", observation.subject.display)
        }
        assertEquals("0101010000", labObservation("0101010000").subject.identifier.value)
        assertEquals("urn:dk:cpr", labObservation("0101010000").subject.identifier.system)
    }

    private fun labObservation(cpr: String?): Observation {
        val bundle = LabMapper().toObservationBundle(
            LabsvarResponse(svaroversigt = Svaroversigt(
                laboratorieresultater = listOf(Laboratorieresultat(rekvisitionsId = "req-1", analysetypeId = "test")),
                rekvisitioner = listOf(Rekvisition(id = "req-1", patientCpr = cpr, patientNavn = "Synthetic patient"))
            )), "http://localhost/fhir/Observation"
        )
        return (parser.parseResource(parser.encodeResourceToString(bundle)) as Bundle).entryFirstRep.resource as Observation
    }

    @Test
    fun `appointment identity survives repeated reads and mutable title changes`() {
        val source = AppointmentItem(documentId = "doc/" + "x".repeat(100), title = "Initial")
        val first = appointment(source)
        assertEquals(first.id, appointment(source).id)
        assertEquals(first.id, appointment(source.copy(title = "Updated")).id)
        assertNotEquals(first.id, appointment(source.copy(documentId = source.documentId + "2")).id)
        assertEquals(source.documentId, first.identifierFirstRep.value)
        assertTrue(first.id.matches(Regex("[A-Za-z0-9.-]{1,64}")))
    }

    @Test
    fun `appointments without a source key retain distinct fallback identities`() {
        val source = AppointmentItem()
        assertNotEquals(appointment(source).id, appointment(source).id)
    }

    private fun appointment(item: AppointmentItem): Appointment =
        AppointmentMapper().toAppointmentBundle(AppointmentsResponse(appointments = listOf(item)),
            "http://localhost/fhir/Appointment").entryFirstRep.resource as Appointment

    @Test
    fun `unnamed home measurement retains its value with an explicit unknown code`() {
        listOf(null, "", "   ").forEach { name ->
            val bundle = HomeMeasurementMapper().toBundle(
                HomeMeasurementsResponse(documents = listOf(HomeMeasurementDocument(type = name, name = name, value = "72", unit = "bpm"))),
                "http://localhost/fhir/Observation"
            )
            val obs = (parser.parseResource(parser.encodeResourceToString(bundle)) as Bundle).entryFirstRep.resource as Observation
            assertTrue(obs.hasCode())
            assertEquals("unknown", obs.code.getExtensionByUrl(absentReason).value.primitiveValue())
            assertFalse(obs.code.hasText())
            assertEquals("72", obs.valueQuantity.value.toPlainString())
        }
    }

    @Test
    fun `blank home measurement type falls back to an available name`() {
        val bundle = HomeMeasurementMapper().toBundle(
            HomeMeasurementsResponse(documents = listOf(HomeMeasurementDocument(type = " ", name = "Pulse"))),
            "http://localhost/fhir/Observation"
        )
        val obs = bundle.entryFirstRep.resource as Observation
        assertEquals("Pulse", obs.code.text)
        assertFalse(obs.code.hasExtension(absentReason))
    }

    @Test
    fun `encounter class is explicitly unknown rather than guessed`() {
        val bundle = EncounterMapper().toBundle(
            listOf(ForloebEntry(idNoegle = NoegleRef(noegle = "course-1"))),
            mapOf("course-1" to KontaktperioderResponse(kontaktperioder = listOf(KontaktperiodeEntry(noegle = "contact-1")))),
            "0101010000", "http://localhost/fhir/Encounter"
        )
        val encounter = (parser.parseResource(parser.encodeResourceToString(bundle)) as Bundle).entryFirstRep.resource as Encounter
        assertTrue(encounter.hasClass_())
        assertFalse(encounter.class_.hasCode())
        assertEquals("unknown", encounter.class_.getExtensionByUrl(absentReason).value.primitiveValue())
    }

    @Test
    fun `both imaging entry points supply the session patient`() {
        val source = ImagingReferralResponse(svar = listOf(ImagingSvar(id = "report-1",
            undersoegelser = listOf(ImagingUndersoegelse(id = "study-1")))))
        val mapper = ImagingMapper()
        listOf(mapper.toImagingStudyBundle(source, "http://localhost/fhir/ImagingStudy"),
            mapper.toDiagnosticReportBundle(source, "http://localhost/fhir/DiagnosticReport")).forEach { bundle ->
            val studies = bundle.entry.mapNotNull { it.resource as? ImagingStudy }
            assertEquals(1, studies.size)
            assertSessionPatient(studies.single().subject)
        }
    }

    private fun assertSessionPatient(subject: Reference) {
        assertEquals("https://www.sundhed.dk/patient", subject.identifier.system)
        assertEquals("current", subject.identifier.value)
    }
}
