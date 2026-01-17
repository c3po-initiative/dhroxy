package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.StringParam
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.PatientService
import kotlinx.coroutines.runBlocking
import org.hl7.fhir.r4.model.Patient
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

@Component
class PatientProvider(
    private val patientService: PatientService
) : IResourceProvider {

    override fun getResourceType(): Class<Patient> = Patient::class.java

    @Search
    fun search(
        @OptionalParam(name = Patient.SP_NAME) name: StringParam?,
        @OptionalParam(name = Patient.SP_IDENTIFIER) identifier: TokenParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val headers = toHttpHeaders(details)
        val bundle = runBlocking {
            patientService.search(headers, name?.value, identifier?.value, requestUrl(details))
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Patient })
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply {
            details.headers?.forEach { entry: Map.Entry<String, MutableList<String>> ->
                addAll(entry.key, entry.value)
            }
        }

    private fun requestUrl(details: ServletRequestDetails): String =
        details.servletRequest?.let { req ->
            buildString {
                append(req.requestURL.toString())
                req.queryString?.let { append("?").append(it) }
            }
        } ?: (details.requestPath ?: "")
}
