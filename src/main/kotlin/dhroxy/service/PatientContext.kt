package dhroxy.service

import dhroxy.client.SundhedClient
import dhroxy.mapper.DanishFhir
import org.hl7.fhir.r4.model.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.web.reactive.function.client.WebClientException

/** Resolve the clinical session's patient, never the first person in a delegation list. */
internal suspend fun SundhedClient.withPatientContext(bundle: Bundle, headers: HttpHeaders): Bundle {
    val unresolved = bundle.entry.mapNotNull { entry ->
        when (val resource = entry.resource) {
            is Observation -> resource.subject
            is DiagnosticReport -> resource.subject
            is ImagingStudy -> resource.subject
            is MedicationStatement -> resource.subject
            is MedicationRequest -> resource.subject
            is Immunization -> resource.patient
            is CarePlan -> resource.subject
            is ServiceRequest -> resource.subject
            else -> null
        }
    }.filter { !it.hasReference() && !it.hasIdentifier() }
    if (unresolved.isEmpty()) return bundle
    val cpr = try {
        DanishFhir.normalizeCpr(fetchForloebsoversigt(headers)?.personNummer)
    } catch (_: WebClientException) {
        // An unavailable journal must not prevent access to a different clinical service.
        LoggerFactory.getLogger("dhroxy.service.PatientContext").warn("Patient context unavailable from clinical session")
        null
    }
    unresolved.forEach { reference ->
        reference.type = "Patient"
        reference.extension.removeAll { it.url == DanishFhir.DATA_ABSENT_REASON }
        if (cpr != null) reference.identifier = DanishFhir.cprIdentifier(cpr)
        else reference.addExtension(DanishFhir.DATA_ABSENT_REASON, CodeType("unknown"))
    }
    return bundle
}
