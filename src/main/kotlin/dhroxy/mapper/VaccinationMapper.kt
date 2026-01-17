package dhroxy.mapper

import dhroxy.model.VaccinationHistoryEntry
import dhroxy.model.VaccinationRecord
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.DateTimeType
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Immunization
import org.hl7.fhir.r4.model.Reference
import org.hl7.fhir.r4.model.Bundle
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class VaccinationMapper {
    fun toImmunizationBundle(
        records: List<VaccinationRecord>,
        requestUrl: String,
        historyById: Map<Long, List<VaccinationHistoryEntry>> = emptyMap()
    ): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
        records.forEach { record ->
            bundle.addEntry(
                Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = mapImmunization(record, historyById[record.vaccinationIdentifier])
                }
            )
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapImmunization(
        record: VaccinationRecord,
        history: List<VaccinationHistoryEntry>?
    ): Immunization {
        val immunization = Immunization()
        immunization.id = "imm-${safeId(record.vaccinationIdentifier?.toString() ?: UUID.randomUUID().toString())}"
        record.vaccinationIdentifier?.let {
            immunization.identifier = listOf(
                Identifier()
                    .setSystem("https://www.sundhed.dk/vaccination/id")
                    .setValue(it.toString())
            )
        }
        immunization.status = mapStatus(record)
        immunization.vaccineCode = CodeableConcept().apply {
            text = record.vaccine
        }
        record.effectuatedDateTime?.let {
            val occurrenceDate = Date.from(OffsetDateTime.parse(it).toInstant())
            immunization.setOccurrence(DateTimeType(occurrenceDate))
            immunization.recorded = occurrenceDate
        }
        immunization.setPatient(
            Reference().apply {
                setIdentifier(
                    Identifier()
                        .setSystem("https://www.sundhed.dk/patient")
                        .setValue("current")
                )
            }
        )
        record.effectuatedBy?.let {
            immunization.setPerformer(
                listOf(
                    Immunization.ImmunizationPerformerComponent().apply {
                        actor = Reference().apply { display = it }
                    }
                )
            )
        }
        val notes = mutableListOf<org.hl7.fhir.r4.model.Annotation>()
        record.coverageDuration?.takeIf { it.isNotBlank() }?.let {
            notes.add(org.hl7.fhir.r4.model.Annotation().apply { text = "Coverage duration: $it" })
        }
        if (record.selfCreated == true) {
            notes.add(org.hl7.fhir.r4.model.Annotation().apply { text = "Recorded as self-created" })
        }
        if (record.negativeConsent == true) {
            notes.add(org.hl7.fhir.r4.model.Annotation().apply { text = "Negative consent recorded" })
        }
        history?.takeIf { it.isNotEmpty() }?.let { entries ->
            notes.add(
                org.hl7.fhir.r4.model.Annotation().apply {
                    text = "History: " + entries.joinToString { entry ->
                        listOfNotNull(entry.date, entry.id?.toString()).joinToString(" ")
                    }
                }
            )
        }
        if (notes.isNotEmpty()) {
            immunization.note = notes
        }
        return immunization
    }

    private fun mapStatus(record: VaccinationRecord): Immunization.ImmunizationStatus {
        return when {
            record.negativeConsent == true -> Immunization.ImmunizationStatus.NOTDONE
            record.activeStatus == true -> Immunization.ImmunizationStatus.COMPLETED
            record.activeStatus == false -> Immunization.ImmunizationStatus.NOTDONE
            else -> Immunization.ImmunizationStatus.NULL
        }
    }

    private fun safeId(raw: String): String =
        raw.lowercase()
            .replace("[^a-z0-9]+".toRegex(), "-")
            .trim('-')
            .take(64)
}
