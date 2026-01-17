package dhroxy.mapper

import dhroxy.model.ForloebEntry
import dhroxy.model.ForloebsoversigtResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.CodeableConcept
import org.hl7.fhir.r4.model.Coding
import org.hl7.fhir.r4.model.Condition
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Reference
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class ConditionMapper {

    fun toBundle(payload: ForloebsoversigtResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(
                Bundle.BundleLinkComponent().apply {
                    relation = "self"
                    url = requestUrl
                }
            )
        }
        val cpr = payload?.personNummer?.replace("-", "")
        payload?.forloeb.orEmpty().forEach { entry ->
            val condition = mapCondition(entry, cpr)
            condition?.let {
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = it
                })
            }
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapCondition(entry: ForloebEntry, cpr: String?): Condition? {
        val codeDisplay = entry.diagnoseNavn ?: entry.diagnoseKode
        if (codeDisplay.isNullOrBlank() && entry.diagnoseKode.isNullOrBlank()) return null

        val condition = Condition()
        condition.id = "cond-${safeId(entry.idNoegle?.noegle ?: UUID.randomUUID().toString())}"
        condition.code = CodeableConcept().apply {
            text = codeDisplay
            entry.diagnoseKode?.let { addCoding(Coding().setSystem("https://www.sundhed.dk/diagnosekode").setCode(it).setDisplay(entry.diagnoseNavn)) }
        }
        condition.clinicalStatus = CodeableConcept().apply {
            addCoding(
                Coding()
                    .setSystem("http://terminology.hl7.org/CodeSystem/condition-clinical")
                    .setCode(if (entry.datoTil.isNullOrBlank()) "active" else "resolved")
            )
        }
        condition.verificationStatus = CodeableConcept().apply {
            addCoding(
                Coding()
                    .setSystem("http://terminology.hl7.org/CodeSystem/condition-ver-status")
                    .setCode("confirmed")
            )
        }
        entry.datoFra?.let { condition.setOnset(org.hl7.fhir.r4.model.DateTimeType(Date.from(OffsetDateTime.parse(it).toInstant()))) }
        entry.datoTil?.let { condition.setAbatement(org.hl7.fhir.r4.model.DateTimeType(Date.from(OffsetDateTime.parse(it).toInstant()))) }
        entry.datoOpdateret?.let { condition.recordedDate = Date.from(OffsetDateTime.parse(it).toInstant()) }

        cpr?.let {
            condition.subject = Reference().apply {
                setIdentifier(Identifier().setSystem("urn:dk:cpr").setValue(it))
            }
        }

        entry.idNoegle?.noegle?.let {
            condition.addIdentifier().setSystem("https://www.sundhed.dk/ejournal/forloeb").value = it
        }

        return condition
    }

    private fun safeId(input: String): String =
        input.lowercase().replace(Regex("[^a-z0-9]+"), "-")
}
