package dhroxy.mapper

import dhroxy.model.CarePlanEntry
import dhroxy.model.CarePlansResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CarePlan
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Period
import org.hl7.fhir.r4.model.Reference
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class CarePlanMapper {

    fun toBundle(response: CarePlansResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }

        response?.plans.orEmpty().forEach { entry ->
            mapCarePlan(entry)?.let {
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = it
                })
            }
        }

        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapCarePlan(entry: CarePlanEntry): CarePlan? {
        val displayTitle = entry.title ?: entry.name ?: return null

        val plan = CarePlan()
        val idSource = listOfNotNull(displayTitle, entry.startDate).joinToString("-")
            .ifBlank { UUID.randomUUID().toString() }
        plan.id = "cp-${safeId(idSource)}"

        plan.status = mapStatus(entry.status)
        plan.intent = CarePlan.CarePlanIntent.PLAN
        plan.title = displayTitle

        entry.description?.let {
            plan.description = it
        }

        val period = Period()
        entry.startDate?.let {
            try {
                period.start = Date.from(OffsetDateTime.parse(it).toInstant())
            } catch (_: Exception) {
                // date may not be in OffsetDateTime format
            }
        }
        entry.endDate?.let {
            try {
                period.end = Date.from(OffsetDateTime.parse(it).toInstant())
            } catch (_: Exception) {
                // date may not be in OffsetDateTime format
            }
        }
        if (period.start != null || period.end != null) {
            plan.period = period
        }

        entry.organization?.let {
            plan.author = Reference().apply { display = it }
        }

        plan.subject = Reference().apply {
            setIdentifier(Identifier().setSystem("https://www.sundhed.dk/patient").setValue("current"))
        }

        return plan
    }

    private fun mapStatus(status: String?): CarePlan.CarePlanStatus {
        return when (status?.lowercase()) {
            "active", "aktiv" -> CarePlan.CarePlanStatus.ACTIVE
            "completed", "afsluttet" -> CarePlan.CarePlanStatus.COMPLETED
            "draft", "kladde" -> CarePlan.CarePlanStatus.DRAFT
            "revoked", "annulleret" -> CarePlan.CarePlanStatus.REVOKED
            else -> CarePlan.CarePlanStatus.UNKNOWN
        }
    }

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)
}
