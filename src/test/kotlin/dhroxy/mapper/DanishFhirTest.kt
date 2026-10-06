package dhroxy.mapper

import ca.uhn.fhir.context.FhirContext
import dhroxy.model.*
import org.hl7.fhir.r4.model.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class DanishFhirTest {
    @Test
    fun `CPR formatting is normalized without guessing identity or requiring modulus eleven`() {
        assertEquals("0101010000", DanishFhir.cprIdentifier(" 010101-0000 ")?.value)
        assertEquals(DanishFhir.CPR_SYSTEM, DanishFhir.cprIdentifier("0101010000")?.system)
        assertEquals(Identifier.IdentifierUse.OFFICIAL, DanishFhir.cprIdentifier("0101010000")?.use)
        for (raw in listOf(null, "", "0000000000", "3102000000", "0113000000", "person-123", "01010100000"))
            assertNull(DanishFhir.cprIdentifier(raw), raw)
    }

    @Test
    fun `UCUM preserves the numeric value and unfamiliar units remain source text`() {
        for ((source, code) in listOf("mmol/L" to "mmol/L", "kg" to "kg", "mmHg" to "mm[Hg]", "°C" to "Cel")) {
            val quantity = DanishFhir.quantity("5.20".toBigDecimal(), source)
            assertEquals("5.20", quantity.value.toPlainString())
            assertEquals(source, quantity.unit)
            assertEquals(code, quantity.code)
            assertEquals("http://unitsofmeasure.org", quantity.system)
        }
        val unknown = DanishFhir.quantity(5.toBigDecimal(), "arbitrary local units")
        assertEquals("arbitrary local units", unknown.unit)
        assertFalse(unknown.hasSystem())
        assertFalse(unknown.hasCode())
    }

    @Test
    fun `export actual mapper samples for external DK Core validation`() {
        val output = Path.of("build/dk-core-samples")
        Files.createDirectories(output)
        val parser = FhirContext.forR4Cached().newJsonParser().setPrettyPrint(true)
        fun export(bundle: Bundle, profile: String) {
            val resource = bundle.entryFirstRep.resource
            // Test-only validation target; production does not claim universal conformance.
            resource.meta.addProfile("http://hl7.dk/fhir/core/StructureDefinition/dk-core-$profile")
            Files.writeString(output.resolve("${resource.fhirType()}-${resource.idElement.idPart}.json"), parser.encodeResourceToString(resource))
        }
        export(PatientMapper().toPatientBundle(PersonSelectionResponse(personDelegationData =
            listOf(PersonDelegationData(cpr = "010101-0000", name = "Synthetic Patient"))), "http://localhost/fhir/Patient"), "patient")
        export(OrganizationMapper().toOrganizationBundle(CoreOrganizationResponse(organizations =
            listOf(CoreOrganization(organizationId = 1, cvrNumber = 34395675, name = "Synthetic organization"))), "http://localhost/fhir/Organization"), "organization")
        export(HomeMeasurementMapper().toBundle(HomeMeasurementsResponse(documents =
            listOf(HomeMeasurementDocument(name = "Weight", date = "2026-10-01T10:00:00Z", value = "70", unit = "kg"))), "http://localhost/fhir/Observation"), "observation")
        export(LabMapper().toObservationBundle(LabsvarResponse(svaroversigt = Svaroversigt(
            laboratorieresultater = listOf(Laboratorieresultat(rekvisitionsId = "req-1", analysetypeId = "synthetic", undersoegelser =
                listOf(Undersoegelse(undersoegelsesNavn = "Synthetic test", quantitativeFindings = QuantitativeFindings(data = listOf(
                    emptyList(), List<Any?>(9) { null } + listOf("5.2", "mmol/L"))))))),
            rekvisitioner = listOf(Rekvisition(id = "req-1", patientCpr = "010101-0000"))
        )), "http://localhost/fhir/Observation"), "observation")
        export(ConditionMapper().toBundle(ForloebsoversigtResponse(personNummer = "0101010000", forloeb =
            listOf(ForloebEntry(idNoegle = NoegleRef(noegle = "condition-1"), diagnoseNavn = "Synthetic condition"))), null,
            "http://localhost/fhir/Condition"), "condition")
        export(EncounterMapper().toBundle(listOf(ForloebEntry(idNoegle = NoegleRef(noegle = "course-1"))),
            mapOf("course-1" to KontaktperioderResponse(kontaktperioder = listOf(KontaktperiodeEntry(noegle = "contact-1")))),
            "0101010000", "http://localhost/fhir/Encounter"), "encounter")
        export(ImagingMapper().toDiagnosticReportBundle(ImagingReferralResponse(svar = listOf(ImagingSvar(id = "report-1"))),
            "http://localhost/fhir/DiagnosticReport"), "diagnostic-report")
        export(ReferralMapper().toBundle(HenvisningerResponse(aktiveHenvisninger = listOf(HenvisningEntry(
            henvisningsDato = "2026-10-01T10:00:00Z", specialeNavn = "Synthetic specialty"))),
            "http://localhost/fhir/ServiceRequest"), "person-servicerequest")
    }
}
