package dhroxy.mapper

import dhroxy.model.OrdinationOverviewResponse
import dhroxy.model.PrescriptionOverviewResponse
import dhroxy.model.OrdinationDetails
import dhroxy.model.MedicationCardEntry
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.Observation
import org.hl7.fhir.r4.model.Quantity
import org.hl7.fhir.r4.model.Identifier
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class MedicationOverviewMapper {

    private val therapyCategory =
        CodeableConcept().addCoding(
            Coding()
                .setSystem("http://terminology.hl7.org/CodeSystem/observation-category")
                .setCode("therapy")
                .setDisplay("Therapy")
        )

    fun toObservationBundle(
        details: List<OrdinationDetails>,
        entries: List<MedicationCardEntry>,
        requestUrl: String
    ): Bundle {
        val byId = entries.associateBy { it.ordinationId }
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(
                Bundle.BundleLinkComponent().apply {
                    relation = "self"
                    url = requestUrl
                }
            )
        }
        details.forEach { detail ->
            bundle.addEntry(Bundle.BundleEntryComponent().apply {
                resource = mapDetailToObservation(detail, byId[detail.drugMedication?.ordinationIdentifier])
                fullUrl = "urn:uuid:${resource.idElement.idPart}"
            })
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    fun toObservationBundle(
        ordination: OrdinationOverviewResponse?,
        prescriptions: PrescriptionOverviewResponse?,
        requestUrl: String
    ): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(
                Bundle.BundleLinkComponent().apply {
                    relation = "self"
                    url = requestUrl
                }
            )
        }
        val observation = Observation()
        observation.id = "med-overview-${UUID.randomUUID()}"
        observation.status = Observation.ObservationStatus.FINAL
        observation.category = listOf(therapyCategory)
        observation.code = CodeableConcept().apply {
            text = "Medication card overview"
            addCoding(
                Coding()
                    .setSystem("https://www.sundhed.dk/medicinkort/overview")
                    .setCode("summary")
                    .setDisplay("Medication overview")
            )
        }

        ordination?.let { addOrdinationComponents(observation, it) }
        prescriptions?.let { addPrescriptionComponents(observation, it) }

        bundle.addEntry(
            Bundle.BundleEntryComponent().apply {
                fullUrl = "urn:uuid:${observation.id}"
                resource = observation
            }
        )
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapDetailToObservation(detail: OrdinationDetails, entry: MedicationCardEntry?): Observation {
        val obs = Observation()
        val ordId = detail.drugMedication?.ordinationIdentifier ?: UUID.randomUUID().toString()
        obs.id = "med-detail-$ordId"
        obs.status = if (detail.drugMedication?.hasNegativeConsent == true) {
            Observation.ObservationStatus.CANCELLED
        } else {
            Observation.ObservationStatus.FINAL
        }
        obs.category = listOf(therapyCategory)
        obs.identifier = buildList {
            detail.drugMedication?.ordinationIdentifier?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/medicinkort/ordination").setValue(it))
            }
            detail.drugMedication?.drugMedicationIdentifier?.let {
                add(Identifier().setSystem("https://www.sundhed.dk/medicinkort/drug-medication").setValue(it))
            }
        }
        obs.code = CodeableConcept().apply {
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
        val valueText = detail.dosage?.text ?: entry?.dosage ?: detail.treatment?.administration
        valueText?.let { obs.value = org.hl7.fhir.r4.model.StringType(it) }
            detail.treatment?.let { treatment ->
            obs.effective = org.hl7.fhir.r4.model.Period().apply {
                treatment.startDate?.let { start = parseDate(it) }
                treatment.endDate?.let { end = parseDate(it) }
            }
            treatment.cause?.let {
                obs.note = listOf(org.hl7.fhir.r4.model.Annotation().apply { text = it })
            }
        }
        return obs
    }

    private fun parseDate(dateTime: String): java.util.Date? {
        val cleaned = if (dateTime.endsWith("Z") || dateTime.contains("+")) {
            dateTime
        } else {
            "${dateTime}Z"
        }
        return runCatching {
            java.util.Date.from(java.time.OffsetDateTime.parse(cleaned).toInstant())
        }.getOrNull()
    }

    private fun addOrdinationComponents(obs: Observation, overview: OrdinationOverviewResponse) {
        val components = mutableListOf<Observation.ObservationComponentComponent>()
        countComponent("NumberOfActive", "Active ordinations", overview.numberOfActive)?.let { components.add(it) }
        countComponent("NumberOfNonStopped", "Non-stopped ordinations", overview.numberOfNonStopped)?.let { components.add(it) }
        countComponent("NumberOfStopped", "Stopped ordinations", overview.numberOfStopped)?.let { components.add(it) }
        countComponent("NumberOfTemporarilyStopped", "Temporarily stopped ordinations", overview.numberOfTemporarilyStopped)?.let { components.add(it) }
        countComponent("NumberOfFutureDosageStart", "Future dosage start", overview.numberOfFutureDosageStart)?.let { components.add(it) }
        countComponent("NumberOfDosagePeriodExceeded", "Dosage period exceeded", overview.numberOfDosagePeriodExceeded)?.let { components.add(it) }
        flagComponent("HasNegativeConsent", "Has drug medication with negative consent", overview.hasDrugMedicationWithNegativeConsent)?.let { components.add(it) }
        flagComponent("HasEndedNegativeConsent", "Has ended drug medication with negative consent", overview.hasEndedDrugMedicationWithNegativeConsent)?.let { components.add(it) }
        flagComponent("HasVkaExceeded", "Has VKA drug medication where dosage period exceeded", overview.hasVkaDrugMedicationWhereDosagePeriodExceeded)?.let { components.add(it) }
        obs.component = obs.component + components
    }

    private fun addPrescriptionComponents(obs: Observation, overview: PrescriptionOverviewResponse) {
        val components = mutableListOf<Observation.ObservationComponentComponent>()
        countComponent("NumTotal", "Prescriptions total", overview.numTotal)?.let { components.add(it) }
        countComponent("NumOpen", "Prescriptions open", overview.numOpen)?.let { components.add(it) }
        countComponent("NumClosed", "Prescriptions closed", overview.numClosed)?.let { components.add(it) }
        countComponent("NumFuture", "Prescriptions future", overview.numFuture)?.let { components.add(it) }
        countComponent("NumUnconnected", "Prescriptions unconnected", overview.numUnconnected)?.let { components.add(it) }
        countComponent("NumDispensings", "Dispensing count", overview.numDispensings)?.let { components.add(it) }
        obs.component = obs.component + components
    }

    private fun countComponent(code: String, display: String, value: Int?): Observation.ObservationComponentComponent? {
        val safe = value ?: return null
        return Observation.ObservationComponentComponent().apply {
            this.code = CodeableConcept().addCoding(
                Coding()
                    .setSystem("https://www.sundhed.dk/medicinkort/overview")
                    .setCode(code)
                    .setDisplay(display)
            )
            this.value = Quantity().apply {
                this.value = safe.toBigDecimal()
                unit = "count"
            }
        }
    }

    private fun flagComponent(code: String, display: String, value: Boolean?): Observation.ObservationComponentComponent? {
        val flag = value ?: return null
        return Observation.ObservationComponentComponent().apply {
            this.code = CodeableConcept().addCoding(
                Coding()
                    .setSystem("https://www.sundhed.dk/medicinkort/overview")
                    .setCode(code)
                    .setDisplay(display)
            )
            this.value = org.hl7.fhir.r4.model.BooleanType(flag)
        }
    }
}
