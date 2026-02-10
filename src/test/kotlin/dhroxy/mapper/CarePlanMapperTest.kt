package dhroxy.mapper

import dhroxy.model.CarePlanEntry
import dhroxy.model.CarePlansResponse
import org.hl7.fhir.r4.model.CarePlan
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class CarePlanMapperTest {
    private val mapper = CarePlanMapper()

    @Test
    fun `maps care plan entry to FHIR CarePlan`() {
        val response = CarePlansResponse(
            plans = listOf(
                CarePlanEntry(
                    title = "Diabetes behandlingsplan",
                    status = "active",
                    startDate = "2025-01-15T00:00:00+01:00",
                    endDate = "2025-12-31T00:00:00+01:00",
                    organization = "Region Hovedstaden",
                    description = "Opfølgning på diabetes"
                )
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/CarePlan")

        assertEquals(1, bundle.total)
        val plan = bundle.entryFirstRep.resource as CarePlan
        assertEquals(CarePlan.CarePlanStatus.ACTIVE, plan.status)
        assertEquals(CarePlan.CarePlanIntent.PLAN, plan.intent)
        assertEquals("Diabetes behandlingsplan", plan.title)
        assertEquals("Opfølgning på diabetes", plan.description)
        assertEquals("Region Hovedstaden", plan.author.display)
        assertNotNull(plan.period.start)
        assertNotNull(plan.period.end)
    }

    @Test
    fun `maps Danish status strings`() {
        val response = CarePlansResponse(
            plans = listOf(
                CarePlanEntry(title = "Plan", status = "afsluttet")
            )
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/CarePlan")
        val plan = bundle.entryFirstRep.resource as CarePlan
        assertEquals(CarePlan.CarePlanStatus.COMPLETED, plan.status)
    }

    @Test
    fun `skips entries without title`() {
        val response = CarePlansResponse(
            plans = listOf(CarePlanEntry(status = "active"))
        )

        val bundle = mapper.toBundle(response, "http://localhost/fhir/CarePlan")
        assertEquals(0, bundle.total)
    }

    @Test
    fun `empty response returns empty bundle`() {
        val bundle = mapper.toBundle(null, "http://localhost/fhir/CarePlan")
        assertEquals(0, bundle.total)
    }
}
