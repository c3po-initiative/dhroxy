package dhroxy.mapper

import dhroxy.model.PersonDelegationData
import dhroxy.model.PersonSelectionResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.HumanName
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Patient
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class PatientMapper {

    fun toPatientBundle(payload: PersonSelectionResponse?, requestUrl: String): Bundle {
        val bundle = Bundle().apply {
            type = Bundle.BundleType.SEARCHSET
            link = listOf(Bundle.BundleLinkComponent().apply {
                relation = "self"
                url = requestUrl
            })
        }
        payload?.personDelegationData.orEmpty().forEach { person ->
            val patient = mapPatient(person)
            bundle.addEntry(Bundle.BundleEntryComponent().apply {
                fullUrl = "urn:uuid:${patient.idElement.idPart}"
                resource = patient
            })
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapPatient(person: PersonDelegationData): Patient {
        val patient = Patient()
        val idBase = person.cpr ?: person.id ?: UUID.randomUUID().toString()
        patient.id = "pat-$idBase"
        person.cpr?.let {
            patient.identifier = listOf(
                Identifier().setSystem("urn:dk:cpr").setValue(it)
            )
        }
        val nameParts = person.name.orEmpty().trim().split(" ").filter { it.isNotBlank() }
        patient.addName(
            HumanName().apply {
                if (nameParts.isNotEmpty()) {
                    family = nameParts.last()
                    given = nameParts.dropLast(1).map { org.hl7.fhir.r4.model.StringType(it) }
                } else {
                    text = person.name
                }
            }
        )
        person.relationType?.let { rel ->
            patient.extension = listOf(
                org.hl7.fhir.r4.model.Extension(
                    "https://www.sundhed.dk/fhir/StructureDefinition/relationType",
                    org.hl7.fhir.r4.model.CodeType(rel)
                )
            )
        }
        return patient
    }
}
