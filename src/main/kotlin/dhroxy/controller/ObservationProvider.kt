package dhroxy.controller

import ca.uhn.fhir.rest.annotation.OptionalParam
import ca.uhn.fhir.rest.annotation.Search
import ca.uhn.fhir.rest.api.server.IBundleProvider
import ca.uhn.fhir.rest.param.DateRangeParam
import ca.uhn.fhir.rest.param.TokenParam
import ca.uhn.fhir.rest.param.TokenAndListParam
import ca.uhn.fhir.rest.param.TokenOrListParam
import ca.uhn.fhir.rest.server.IResourceProvider
import ca.uhn.fhir.rest.server.SimpleBundleProvider
import ca.uhn.fhir.rest.server.servlet.ServletRequestDetails
import dhroxy.service.HomeMeasurementService
import dhroxy.service.ObservationService
import org.hl7.fhir.r4.model.Observation
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import kotlinx.coroutines.runBlocking

@Component
class ObservationProvider(
    private val observationService: ObservationService,
    private val homeMeasurementService: HomeMeasurementService
) : IResourceProvider {

    override fun getResourceType(): Class<Observation> = Observation::class.java

    @Search
    fun search(
        @OptionalParam(name = Observation.SP_DATE) date: DateRangeParam?,
        @OptionalParam(name = Observation.SP_CATEGORY) category: TokenAndListParam?,
        details: ServletRequestDetails
    ): IBundleProvider {
        val categoryValue = extractCategory(category, details)
        val headers = toHttpHeaders(details)
        val url = requestUrl(details)

        if (isVitalSignsCategory(categoryValue)) {
            val bundle = runBlocking { homeMeasurementService.search(headers, url) }
            return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Observation })
        }

        val (fra, til) = extractDateRange(date, details.parameters["date"])
        val omraade = mapCategoryToOmraade(categoryValue)
        val bundle = runBlocking {
            observationService.search(headers, fra, til, omraade, url)
        }
        return SimpleBundleProvider(bundle.entry.mapNotNull { it.resource as? Observation })
    }

    private fun extractCategory(category: TokenAndListParam?, details: ServletRequestDetails): String? {
        val token = collectTokens(category).firstOrNull()
        val v = token?.value
        return if (!v.isNullOrBlank()) v else details.parameters["category"]?.firstOrNull()
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
        return extractDateRange(values)
    }

    private fun extractDateRange(dateParams: Array<String>?): Pair<String?, String?> {
        var fra: String? = null
        var til: String? = null
        dateParams.orEmpty().forEach { value ->
            when {
                value.startsWith("ge") -> fra = value.removePrefix("ge")
                value.startsWith("gt") -> fra = value.removePrefix("gt")
                value.startsWith("le") -> til = value.removePrefix("le")
                value.startsWith("lt") -> til = value.removePrefix("lt")
                value.startsWith("eq") -> {
                    fra = value.removePrefix("eq")
                    til = value.removePrefix("eq")
                }
                fra == null -> fra = value
                til == null -> til = value
            }
        }
        return fra to til
    }

    private fun isVitalSignsCategory(category: String?): Boolean {
        if (category.isNullOrBlank()) return false
        val normalized = category.lowercase()
        return normalized == "vital-signs" || normalized == "vitalsigns" || normalized.contains("hjemmemåling")
    }

    private fun isMedicationCategory(category: String?): Boolean {
        if (category.isNullOrBlank()) return false
        val normalized = category.lowercase()
        return normalized.contains("medication") || normalized.contains("therapy")
    }

    private fun mapCategoryToOmraade(category: String?): String {
        if (category.isNullOrBlank()) return "Alle"
        val normalized = category.lowercase()
        return when {
            normalized.contains("mikro") -> "Mikrobiologi"
            normalized.contains("patologi") -> "Patologi"
            normalized.contains("klinisk") || normalized.contains("biokemi") -> "KliniskBiokemi"
            else -> "Alle"
        }
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

    private fun collectTokens(param: TokenAndListParam?): List<TokenParam> {
        val result = mutableListOf<TokenParam>()
        val raw = param?.valuesAsQueryTokens
        if (raw is Iterable<*>) {
            raw.forEach { item ->
                when (item) {
                    is TokenParam -> result.add(item)
                    is TokenOrListParam -> {
                        val innerRaw = item.valuesAsQueryTokens
                        if (innerRaw is Iterable<*>) {
                            innerRaw.forEach { inner ->
                                when (inner) {
                                    is TokenParam -> result.add(inner)
                                    is Iterable<*> -> inner.filterIsInstance<TokenParam>().forEach(result::add)
                                }
                            }
                        }
                    }
                    is Iterable<*> -> item.filterIsInstance<TokenParam>().forEach(result::add)
                }
            }
        }
        return result
    }
}
