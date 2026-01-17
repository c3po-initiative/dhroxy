package dhroxy.mapper

import dhroxy.model.CoreOrganization
import dhroxy.model.CoreOrganizationResponse
import org.hl7.fhir.r4.model.Organization
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class OrganizationMapperTest {
    private val mapper = OrganizationMapper()

    @Test
    fun `maps organization response to bundle`() {
        val org = CoreOrganization(
            organizationId = 60796,
            name = "Lægerne Sommervej",
            city = "Korsbæk",
            zipCode = 9940,
            cvrNumber = 34395675,
            homepage = "http://lægernesommervej.dk/"
        )
        val bundle = mapper.toOrganizationBundle(CoreOrganizationResponse(listOf(org)), "http://localhost/fhir/Organization")
        assertEquals(1, bundle.entry.size)
        val resource = bundle.entryFirstRep.resource as Organization
        assertEquals("Lægerne Sommervej", resource.name)
        assertEquals("34395675", resource.identifierFirstRep.value)
        assertEquals("9940", resource.addressFirstRep.postalCode)
    }
}
