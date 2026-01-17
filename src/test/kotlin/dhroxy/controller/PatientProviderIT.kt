package dhroxy.controller

import dhroxy.controller.support.BaseProviderIntegrationTest
import io.mockk.*
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Patient
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PatientProviderIT : BaseProviderIntegrationTest() {
    @Test
    fun `patient search returns result`() = runBlocking {
        coEvery { patientService.search(any(), any(), any(), any()) } returns
            Bundle().apply {
                type = Bundle.BundleType.SEARCHSET
                total = 3
                addLink(Bundle.BundleLinkComponent().apply {
                    relation = "self"
                    url = "http://localhost:8080/fhir/Patient"
                })
                addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "http://localhost:8080/fhir/Patient/pat-0906817173"
                    resource = Patient().apply {
                        id = "pat-0906817173"
                        addIdentifier().apply { system = "urn:dk:cpr"; value = "0906817173" }
                        addName().apply {
                            family = "Jørgensen"
                            given = listOf(org.hl7.fhir.r4.model.StringType("Jens"), org.hl7.fhir.r4.model.StringType("Kristian"))
                        }
                        addExtension("https://www.sundhed.dk/fhir/StructureDefinition/relationType", org.hl7.fhir.r4.model.CodeType("MigSelv"))
                    }
                })
                addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "http://localhost:8080/fhir/Patient/pat-0707173333"
                    resource = Patient().apply {
                        id = "pat-0707173333"
                        addIdentifier().apply { system = "urn:dk:cpr"; value = "0707173333" }
                        addName().apply {
                            family = "Jørgensen"
                            given = listOf(org.hl7.fhir.r4.model.StringType("Søren"), org.hl7.fhir.r4.model.StringType("Isaksen"))
                        }
                        addExtension("https://www.sundhed.dk/fhir/StructureDefinition/relationType", org.hl7.fhir.r4.model.CodeType("Foraelder"))
                    }
                })
                addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "http://localhost:8080/fhir/Patient/pat-1207131111"
                    resource = Patient().apply {
                        id = "pat-1207131111"
                        addIdentifier().apply { system = "urn:dk:cpr"; value = "1207131111" }
                        addName().apply {
                            family = "Jørgensen"
                            given = listOf(org.hl7.fhir.r4.model.StringType("Benny"), org.hl7.fhir.r4.model.StringType("Isaksen"))
                        }
                        addExtension("https://www.sundhed.dk/fhir/StructureDefinition/relationType", org.hl7.fhir.r4.model.CodeType("Foraelder"))
                    }
                })
            }

        // GET /fhir/Patient?identifier=urn:dk:cpr|0906817173
        val bundle = client.search<Bundle>()
            .forResource(Patient::class.java)
            .where(Patient.IDENTIFIER.exactly().systemAndIdentifier("urn:dk:cpr", "0906817173"))
            .returnBundle(Bundle::class.java)
            .execute()

        assertEquals(3, bundle.entry.size)
        assertEquals("0906817173", (bundle.entry[0].resource as Patient).identifierFirstRep.value)
        assertEquals("0707173333", (bundle.entry[1].resource as Patient).identifierFirstRep.value)
        assertEquals("1207131111", (bundle.entry[2].resource as Patient).identifierFirstRep.value)
    }
}
