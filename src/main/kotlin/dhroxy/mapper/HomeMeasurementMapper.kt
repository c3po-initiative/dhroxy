package dhroxy.mapper

import dhroxy.model.HomeMeasurementDocument
import dhroxy.model.HomeMeasurementsResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.DateTimeType
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Observation
import org.hl7.fhir.r4.model.Quantity
import org.hl7.fhir.r4.model.Reference
import org.hl7.fhir.r4.model.StringType
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class HomeMeasurementMapper {

    fun toBundle(response: HomeMeasurementsResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }

        response?.documents.orEmpty().forEach { doc ->
            mapObservation(doc)?.let {
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = it
                })
            }
        }

        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapObservation(doc: HomeMeasurementDocument): Observation? {
        val obs = Observation()
        val idSource = listOfNotNull(doc.date, doc.type ?: doc.name).joinToString("-")
            .ifBlank { UUID.randomUUID().toString() }
        obs.id = "hm-${safeId(idSource)}"

        obs.status = Observation.ObservationStatus.FINAL

        obs.addCategory(CodeableConcept().apply {
            addCoding(Coding()
                .setSystem("http://terminology.hl7.org/CodeSystem/observation-category")
                .setCode("vital-signs")
                .setDisplay("Vital Signs"))
        })

        val displayName = doc.type ?: doc.name
        displayName?.let {
            obs.code = CodeableConcept().apply { text = it }
        }

        doc.date?.let {
            try {
                obs.effective = DateTimeType(Date.from(OffsetDateTime.parse(it).toInstant()))
            } catch (_: Exception) {
                obs.effective = DateTimeType(it)
            }
        }

        if (doc.value != null) {
            val bigDecimalValue = doc.value.toBigDecimalOrNull()
            if (bigDecimalValue != null && doc.unit != null) {
                obs.value = Quantity().apply {
                    value = bigDecimalValue
                    unit = doc.unit
                }
            } else {
                obs.value = StringType(listOfNotNull(doc.value, doc.unit).joinToString(" "))
            }
        }

        doc.source?.let {
            obs.addNote(org.hl7.fhir.r4.model.Annotation().apply { text = "Source: $it" })
        }

        obs.subject = Reference().apply {
            setIdentifier(Identifier().setSystem("https://www.sundhed.dk/patient").setValue("current"))
        }

        return obs
    }

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)
}
