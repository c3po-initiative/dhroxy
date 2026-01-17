package dhroxy.mapper

import dhroxy.model.EpikriseEntry
import dhroxy.model.EpikriserResponse
import dhroxy.model.ForloebEntry
import dhroxy.model.NotatEntry
import dhroxy.model.NotaterResponse
import org.hl7.fhir.r4.model.Bundle
import org.hl7.fhir.r4.model.DocumentReference
import org.hl7.fhir.r4.model.Identifier
import org.hl7.fhir.r4.model.Reference
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.Date
import java.util.UUID

@Component
class DocumentReferenceMapper {

    fun toBundle(
        forloeb: List<ForloebEntry>,
        epikriser: Map<String, EpikriserResponse>,
        notater: Map<String, NotaterResponse>,
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
            epikriser[key]?.epikriser.orEmpty().forEachIndexed { idx, e ->
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = mapDocumentReference(
                        e,
                        patientIdentifier,
                        key,
                        "epikrise",
                        "$key-$idx",
                        contentType = "text/html"
                    )
                })
            }
            notater[key]?.notater.orEmpty().forEachIndexed { idx, n ->
                bundle.addEntry(Bundle.BundleEntryComponent().apply {
                    fullUrl = "urn:uuid:${UUID.randomUUID()}"
                    resource = mapDocumentReference(
                        n,
                        patientIdentifier,
                        key,
                        "notat",
                        "$key-$idx",
                        contentType = "text/html"
                    )
                })
            }
        }
        bundle.total = bundle.entry.size
        return bundle
    }

    private fun mapDocumentReference(
        entry: EpikriseEntry,
        patientIdentifier: String?,
        forloebId: String,
        category: String,
        suffixId: String,
        contentType: String
    ): DocumentReference {
        val doc = DocumentReference()
        doc.id = "doc-$category-${safeId(suffixId)}"
        doc.addIdentifier().setSystem("https://www.sundhed.dk/ejournal/forloeb").value = forloebId
        doc.type = org.hl7.fhir.r4.model.CodeableConcept().apply { text = entry.notatType ?: category }
        doc.status = org.hl7.fhir.r4.model.Enumerations.DocumentReferenceStatus.CURRENT
        entry.datoFra?.let { doc.date = Date.from(OffsetDateTime.parse(it).toInstant()) }
        doc.description = entry.overskrift
        patientIdentifier?.let {
            doc.subject = Reference().apply {
                setIdentifier(Identifier().setSystem("urn:dk:cpr").setValue(it))
            }
        }
        val content = DocumentReference.DocumentReferenceContentComponent().apply {
            val dataBytes = (entry.broedtekst ?: entry.fritekst ?: "").toByteArray(Charsets.UTF_8)
            attachment = org.hl7.fhir.r4.model.Attachment().apply {
                this.contentType = contentType
                this.data = dataBytes
                this.title = entry.overskrift ?: entry.notatType ?: category
            }
        }
        doc.content.add(content)
        return doc
    }

    private fun mapDocumentReference(
        entry: NotatEntry,
        patientIdentifier: String?,
        forloebId: String,
        category: String,
        suffixId: String,
        contentType: String
    ): DocumentReference {
        val doc = DocumentReference()
        doc.id = "doc-$category-${safeId(suffixId)}"
        doc.addIdentifier().setSystem("https://www.sundhed.dk/ejournal/forloeb").value = forloebId
        doc.type = org.hl7.fhir.r4.model.CodeableConcept().apply { text = entry.notatType ?: category }
        doc.status = org.hl7.fhir.r4.model.Enumerations.DocumentReferenceStatus.CURRENT
        entry.datoFra?.let { doc.date = Date.from(OffsetDateTime.parse(it).toInstant()) }
        doc.description = entry.overskrift
        patientIdentifier?.let {
            doc.subject = Reference().apply {
                setIdentifier(Identifier().setSystem("urn:dk:cpr").setValue(it))
            }
        }
        val content = DocumentReference.DocumentReferenceContentComponent().apply {
            val dataBytes = (entry.broedtekst ?: entry.fritekst ?: "").toByteArray(Charsets.UTF_8)
            attachment = org.hl7.fhir.r4.model.Attachment().apply {
                this.contentType = contentType
                this.data = dataBytes
                this.title = entry.overskrift ?: entry.notatType ?: category
            }
        }
        doc.content.add(content)
        return doc
    }

    private fun safeId(input: String): String =
        input.lowercase().replace(Regex("[^a-z0-9]+"), "-")
}
