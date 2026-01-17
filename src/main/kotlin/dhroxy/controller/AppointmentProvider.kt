package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.DateRangeParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.AppointmentService
import org.hl7.fhir.r4.model.Appointment
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import kotlinx.coroutines.runBlocking

@Component
class AppointmentProvider(
    private val appointmentService: AppointmentService
) : IResourceProvider {

    override fun getResourceType(): Class<Appointment> = Appointment::class.java

    @Search
    fun search(
        @OptionalParam(name = Appointment.SP_DATE) date: DateRangeParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val (fra, til) = extractDateRange(date, details.parameters["date"])
        val headers = toHttpHeaders(details)
        val bundle = runBlocking {
            appointmentService.search(headers, fra, til, requestUrl(details))
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Appointment })
    }

    private fun extractDateRange(
        dateRange: DateRangeParam?,
        rawParams: Array<String>?
    ): Pair<String?, String?> {
        val values = when {
            dateRange != null -> {
                val lowers = dateRange.lowerBound?.let { lb ->
                    (lb.prefix?.value?.lowercase().orEmpty()) + (lb.valueAsString ?: "")
                }
                val uppers = dateRange.upperBound?.let { ub ->
                    (ub.prefix?.value?.lowercase().orEmpty()) + (ub.valueAsString ?: "")
                }
                listOfNotNull(lowers, uppers).toTypedArray()
            }
            else -> rawParams
        }
        return parseDateBounds(values)
    }

    private fun parseDateBounds(dateParams: Array<String>?): Pair<String?, String?> {
        var start: String? = null
        var end: String? = null
        dateParams.orEmpty().forEach { value ->
            when {
                value.startsWith("ge") -> start = value.removePrefix("ge")
                value.startsWith("gt") -> start = value.removePrefix("gt")
                value.startsWith("le") -> end = value.removePrefix("le")
                value.startsWith("lt") -> end = value.removePrefix("lt")
                value.startsWith("eq") -> {
                    start = value.removePrefix("eq")
                    end = value.removePrefix("eq")
                }
                start == null -> start = value
                end == null -> end = value
            }
        }
        return start to end
    }

    private fun toHttpHeaders(details: ServletRequestDetails): HttpHeaders =
        HttpHeaders().apply {
            details.headers?.forEach { (k, v) -> addAll(k, v) }
        }

    private fun requestUrl(details: ServletRequestDetails): String =
        details.servletRequest?.let { req ->
            buildString {
                append(req.requestURL.toString())
                req.queryString?.let { append("?").append(it) }
            }
        } ?: (details.requestPath ?: "")
}
