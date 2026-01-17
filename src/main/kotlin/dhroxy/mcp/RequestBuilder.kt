package dhroxy.mcp

import ca.uhn.fhir.context.FhirContext
import com.google.gson.Gson
import org.springframework.mock.web.MockHttpServletRequest
import java.nio.charset.StandardCharsets

class RequestBuilder(
    private val fhirContext: FhirContext,
    private val config: Map<String, Any?>,
    private val interaction: Interaction
) {

    private val resourceType: String = when {
        interaction == Interaction.TRANSACTION -> ""
        config["resourceType"] is String && !config["resourceType"].toString().isBlank() ->
            config["resourceType"].toString()
        else -> throw IllegalArgumentException("Missing or invalid 'resourceType' in contextMap")
    }

    fun buildRequest(): MockHttpServletRequest {
        val basePath = "/$resourceType"
        val req: MockHttpServletRequest =
            when (interaction) {
                Interaction.SEARCH -> {
                    val sp = when (val q = config["query"] ?: config["searchParams"]) {
                        is Map<*, *> -> q
                        else -> null
                    }
                    MockHttpServletRequest("GET", basePath).also { request ->
                        sp?.forEach { (k, v) -> request.addParameter(k.toString(), v.toString()) }
                    }
                }

                Interaction.READ -> {
                    val id = requireString("id")
                    MockHttpServletRequest("GET", "$basePath/$id")
                }

                Interaction.CREATE, Interaction.TRANSACTION -> {
                    MockHttpServletRequest("POST", basePath).also { applyResourceBody(it) }
                }

                Interaction.UPDATE -> {
                    val id = requireString("id")
                    MockHttpServletRequest("PUT", "$basePath/$id").also { applyResourceBody(it) }
                }

                Interaction.DELETE -> {
                    val id = requireString("id")
                    MockHttpServletRequest("DELETE", "$basePath/$id")
                }

                Interaction.PATCH -> {
                    val id = requireString("id")
                    MockHttpServletRequest("PATCH", "$basePath/$id").also { applyPatchBody(it) }
                }
            }

        req.contentType = "application/fhir+json"
        req.addHeader("Accept", "application/fhir+json")
        return req
    }

    private fun applyResourceBody(req: MockHttpServletRequest) {
        val resourceObj = config["resource"]
            ?: throw IllegalArgumentException("Missing 'resource' body")
        val json = when (resourceObj) {
            is Map<*, *> -> Gson().toJson(resourceObj)
            is String -> resourceObj
            else -> throw IllegalArgumentException("Unsupported resource body type: ${resourceObj::class.java}")
        }
        req.setContent(json.toByteArray(StandardCharsets.UTF_8))
    }

    private fun applyPatchBody(req: MockHttpServletRequest) {
        val patchBody = config["resource"]
            ?: throw IllegalArgumentException("Missing 'resource' for patch interaction")
        val content = when (patchBody) {
            is String -> patchBody
            is org.hl7.fhir.instance.model.api.IBaseResource ->
                fhirContext.newJsonParser().encodeResourceToString(patchBody)
            else -> throw IllegalArgumentException("Unsupported patch body type: ${patchBody::class.java}")
        }
        req.setContent(content.toByteArray(StandardCharsets.UTF_8))
    }

    private fun requireString(key: String): String {
        val valObj = config[key]
        if (valObj !is String || valObj.isBlank()) {
            throw IllegalArgumentException("Missing or invalid '$key'")
        }
        return valObj
    }
}
