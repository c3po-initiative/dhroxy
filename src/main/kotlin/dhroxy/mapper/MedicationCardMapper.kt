package dhroxy.mapper

import dhroxy.model.MedicationCardEntry
import dhroxy.model.OrdinationDetails
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.Dosage
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.MedicationStatement
import org.hl7.fhir.r4.model.Period
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.UUID

@Component
class MedicationCardMapper {

    fun fromDetails(details: OrdinationDetails?, requestUrl: String): Bundle {
        val stmt = mapDetails(details)
        return Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
            addEntry(Bundle.BundleEntryComponent().apply { resource = stmt })
            total = entry.size
        }
    }

    private fun mapDetails(details: OrdinationDetails?): MedicationStatement {
        val stmt = MedicationStatement()
        val dm = details?.drugMedication
        val treatment = details?.treatment
        val dosage = details?.dosage
        stmt.id = "medstmt-${dm?.ordinationIdentifier ?: UUID.randomUUID()}"
        dm?.ordinationIdentifier?.let {
            stmt.identifier = listOf(
                Identifier().setSystem("https://www.sundhed.dk/medication/ordination").setValue(it)
            )
        }
        stmt.status = if (dm?.hasNegativeConsent == true) {
            MedicationStatement.MedicationStatementStatus.NOTTAKEN
        } else {
            MedicationStatement.MedicationStatementStatus.ACTIVE
        }
        stmt.medication = CodeableConcept().apply {
            text = dm?.name ?: dm?.activeSubstance ?: "Medication"
            dm?.atcCode?.let { code ->
                addCoding(
                    Coding()
                        .setSystem("http://www.whocc.no/atc")
                        .setCode(code)
                        .setDisplay(dm.atcText ?: code)
                )
            }
            dm?.activeSubstance?.let { substance ->
                addCoding(
                    Coding()
                        .setSystem("https://www.sundhed.dk/medication/active-substance")
                        .setCode(substance)
                        .setDisplay(substance)
                )
            }
        }
        stmt.dosage = listOf(
            Dosage().apply {
                text = dosage?.text ?: treatment?.administration
                treatment?.cause?.let { patientInstruction = it }
            }
        )
        stmt.reasonCode = treatment?.cause?.let { listOf(CodeableConcept().apply { text = it }) } ?: emptyList()
        stmt.effective = Period().apply {
            periodDate(treatment?.startDate)?.let { start = it }
            periodDate(treatment?.endDate ?: dosage?.endDate)?.let { end = it }
        }
        stmt.dateAsserted = periodDate(treatment?.startDate)
        return stmt
    }

    fun toMedicationStatementBundle(entries: List<MedicationCardEntry>, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(
                Bundle.BundleLinkComponent().apply {
                    relation = "self"
                    url = requestUrl
                }
            )
        }

        entries.forEach { entry ->
            val statement = mapEntry(entry)
            bundle.addEntry(
                Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${statement.idElement.idPart}"
                    resource = statement
                }
            )
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapEntry(entry: MedicationCardEntry): MedicationStatement {
        val stmt = MedicationStatement()
        stmt.id = "medstmt-${entry.ordinationId ?: UUID.randomUUID()}"
        entry.ordinationId?.let {
            stmt.identifier = listOf(
                Identifier().setSystem("https://www.sundhed.dk/medication/ordination").setValue(it)
            )
        }
        stmt.status = mapStatus(entry.status?.enumStr)
        stmt.medication = CodeableConcept().apply {
            text = entry.drugMedication ?: entry.activeSubstance ?: "Medication"
            entry.activeSubstance?.let { substance ->
                addCoding(
                    Coding()
                        .setSystem("https://www.sundhed.dk/medication/active-substance")
                        .setCode(substance)
                        .setDisplay(substance)
                )
            }
        }
        stmt.dosage = listOf(
            Dosage().apply {
                text = entry.dosage
                entry.cause?.let { patientInstruction = it }
            }
        )
        stmt.reasonCode = entry.cause?.let { listOf(CodeableConcept().apply { text = it }) } ?: emptyList()
        stmt.effective = Period().apply {
            periodDate(entry.startDate)?.let { start = it }
            periodDate(entry.endDate ?: entry.dosageEndDate)?.let { end = it }
        }
        stmt.dateAsserted = periodDate(entry.startDate)
        return stmt
    }

    private fun mapStatus(raw: String?): MedicationStatement.MedicationStatementStatus {
        return when (raw?.lowercase()) {
            "active", null -> MedicationStatement.MedicationStatementStatus.ACTIVE
            "completed" -> MedicationStatement.MedicationStatementStatus.COMPLETED
            "stopped", "ended" -> MedicationStatement.MedicationStatementStatus.STOPPED
            "entered-in-error" -> MedicationStatement.MedicationStatementStatus.ENTEREDINERROR
            else -> MedicationStatement.MedicationStatementStatus.UNKNOWN
        }
    }

    private fun periodDate(value: String?): Date? {
        if (value.isNullOrBlank()) return null
        return runCatching { Date.from(OffsetDateTime.parse(value).toInstant()) }
            .recoverCatching {
                val dt = LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                Date.from(dt.atZone(java.time.ZoneOffset.UTC).toInstant())
            }
            .getOrNull()
    }
}
