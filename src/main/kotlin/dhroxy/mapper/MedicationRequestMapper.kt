package dhroxy.mapper

import dhroxy.model.MedicationCardEntry
import dhroxy.model.OrdinationDetails
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.Dosage
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.MedicationRequest
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class MedicationRequestMapper {

    fun toMedicationRequestBundle(details: List<OrdinationDetails>, entries: List<MedicationCardEntry>, requestUrl: String): Bundle {
        val entryById = entries.associateBy { it.ordinationId }
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
        details.forEach { detail ->
            val resource = mapDetail(detail, entryById[detail.drugMedication?.ordinationIdentifier])
            bundle.addEntry(Bundle.BundleEntryComponent().apply {
                fullUrl = "urn:uuid:${resource.idElement.idPart}"
                this.resource = resource
            })
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapDetail(detail: OrdinationDetails, entry: MedicationCardEntry?): MedicationRequest {
        val request = MedicationRequest()
        val ordId = detail.drugMedication?.ordinationIdentifier ?: UUID.randomUUID().toString()
        request.id = "medreq-$ordId"
        request.status = if (detail.drugMedication?.hasNegativeConsent == true) {
            MedicationRequest.MedicationRequestStatus.STOPPED
        } else {
            MedicationRequest.MedicationRequestStatus.ACTIVE
        }
        request.intent = MedicationRequest.MedicationRequestIntent.ORDER
        request.identifier = buildList {
            detail.drugMedication?.ordinationIdentifier?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/medicinkort/ordination").setValue(it))
            }
            detail.drugMedication?.drugMedicationIdentifier?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/medicinkort/drug-medication").setValue(it))
            }
        }
        request.medication = CodeableConcept().apply {
            text = detail.drugMedication?.name ?: entry?.drugMedication ?: entry?.activeSubstance ?: "Medication"
            detail.drugMedication?.atcCode?.let { code ->
                addCoding(
                    Coding()
                        .setSystem("http://www.whocc.no/atc")
                        .setCode(code)
                        .setDisplay(detail.drugMedication.atcText ?: code)
                )
            }
        }
        request.authoredOn = parseDate(entry?.startDate ?: detail.treatment?.startDate)
        detail.treatment?.cause?.let { request.addNote().text = it }
        detail.treatment?.administration?.let {
            request.addDosageInstruction(
                Dosage().apply { route = CodeableConcept().apply { text = it } }
            )
        }
        val dosageText = detail.dosage?.text ?: entry?.dosage
        dosageText?.let {
            if (request.dosageInstruction.isEmpty()) {
                request.addDosageInstruction(Dosage())
            }
            request.dosageInstructionFirstRep.text = it
        }
        detail.createdBy?.let { creator ->
            val display = listOfNotNull(creator.name, creator.organisationName).joinToString(" - ").takeIf { it.isNotBlank() }
            if (!display.isNullOrBlank()) {
                request.requester = org.hl7.fhir.r4.model.Reference().apply { this.display = display }
            }
        }
        return request
    }

    private fun parseDate(dateTime: String?): Date? {
        if (dateTime.isNullOrBlank()) return null
        val normalized = if (dateTime.endsWith("Z") || dateTime.contains("+")) dateTime else "${dateTime}Z"
        return runCatching { Date.from(OffsetDateTime.parse(normalized).toInstant()) }.getOrNull()
    }
}
