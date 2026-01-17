package dhroxy.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties("sundhed.client")
data class SundhedClientProperties(
    val baseUrl: String = "https://www.sundhed.dk",
    val connectTimeout: Duration = Duration.ofSeconds(5),
    val readTimeout: Duration = Duration.ofSeconds(20),
    val forwardedHeaders: List<String> = listOf(
        "accept",
        "cookie",
        "conversation-uuid",
        "x-xsrf-token",
        "x-queueit-ajaxpageurl",
        "referer",
        "user-agent",
        "accept-language",
        "page-app-id",
        "dnt"
    ),
    /**
     * Optional static header values to inject into every outbound call.
     * Map key should be lowercase header name.
     */
    val staticHeaders: Map<String, String> = emptyMap(),
    /**
     * Eservices identifier used for the medication card endpoint (/api/eserviceslink/{id}).
     */
    val medicationCardEservicesId: String? = null
)
