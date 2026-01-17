package dhroxy.mapper

import dhroxy.model.EnhedsInformation
import dhroxy.model.ForloebEntry
import dhroxy.model.KontaktperioderResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.Encounter
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Reference
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class EncounterMapper {

    fun toBundle(
        forloeb: List<ForloebEntry>,
        kontaktperioderByForloeb: Map<String, KontaktperioderResponse>,
        patientIdentifier: String?,
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

        forloeb.forEach { entry ->
            val key = entry.idNoegle?.noegle ?: return@forEach
            val kontaktperioder = kontaktperioderByForloeb[key]?.kontaktperioder.orEmpty()
            kontaktperioder.forEach { kp ->
                val encounter = Encounter()
                encounter.id = "enc-${safeId(kp.noegle ?: UUID.randomUUID().toString())}"
                kp.noegle?.let {
                    encounter.addIdentifier().setSystem("https://www.sundhed.dk/ejournal/kontaktperiode").value = it
                }
                encounter.addIdentifier().setSystem("https://www.sundhed.dk/ejournal/forloeb").value = key
                encounter.status = mapEncounterStatus(kp.status, kp.datoTil)
                val period = encounter.period ?: org.hl7.fhir.r4.model.Period()
                kp.datoFra?.let { period.start = Date.from(OffsetDateTime.parse(it).toInstant()) }
                kp.datoTil?.let { period.end = Date.from(OffsetDateTime.parse(it).toInstant()) }
                encounter.setPeriod(period)
                encounter.serviceProvider = kp.enhedsInformation?.let { toOrganizationRef(it) }
                patientIdentifier?.let {
                    encounter.setSubject(
                        Reference().apply {
                            setIdentifier(Identifier().setSystem("urn:dk:cpr").setValue(it))
                        }
                    )
                }
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = encounter
                })
            }
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapEncounterStatus(status: String?, end: String?): Encounter.EncounterStatus =
        when {
            status?.contains("Finished", ignoreCase = true) == true -> Encounter.EncounterStatus.FINISHED
            !end.isNullOrBlank() -> Encounter.EncounterStatus.FINISHED
            status?.contains("planned", ignoreCase = true) == true -> Encounter.EncounterStatus.PLANNED
            else -> Encounter.EncounterStatus.INPROGRESS
        }

    private fun toOrganizationRef(info: EnhedsInformation): Reference =
        Reference().apply {
            display = listOfNotNull(info.institution, info.afdeling).joinToString(" - ").takeIf { it.isNotBlank() }
            setIdentifier(
                Identifier()
                    .setSystem("https://www.sundhed.dk/ejournal/enhed")
                    .setValue(
                        listOfNotNull(info.sygehusKode, info.afdelingsKode, info.kode).joinToString(":")
                    )
            )
        }

    private fun safeId(input: String): String =
        input.lowercase().replace(Regex("[^a-z0-9]+"), "-")
}
