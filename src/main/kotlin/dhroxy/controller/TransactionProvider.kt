package dhroxy.controller

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.rest.api.RequestTypeEnum
import ca.uhn.fhir.rest.server.RestfulServer
import ca.uhn.fhir.rest.server.exceptions.InvalidRequestException
import dhroxy.mcp.Interaction
import dhroxy.mcp.RequestBuilder
import jakarta.servlet.http.HttpServletResponse
import org.hl7.fhir.r4.model.Bundle
import org.springframework.beans.factory.ObjectProvider
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.stereotype.Component

@Component
class TransactionProvider(
    private val restfulServerProvider: ObjectProvider<RestfulServer>,
    private val fhirContext: FhirContext
) {

    private val handleRequestMethod = RestfulServer::class.java.getDeclaredMethod(
        "handleRequest",
        RequestTypeEnum::class.java,
        jakarta.servlet.http.HttpServletRequest::class.java,
        HttpServletResponse::class.java
    ).apply { isAccessible = true }

    @ca.uhn.fhir.rest.annotation.Transaction
    fun transaction(
        @ca.uhn.fhir.rest.annotation.TransactionParam bundle: Bundle
    ): Bundle {
        if (bundle.type != Bundle.BundleType.TRANSACTION) {
            throw InvalidRequestException("Only Bundle.type=transaction is supported")
        }

        val responseBundle = Bundle().apply { type = Bundle.BundleType.TRANSACTIONRESPONSE }

        bundle.entry.forEach { entry ->
            val request = entry.request ?: throw InvalidRequestException("Entry missing request")
            if (request.method != Bundle.HTTPVerb.GET) {
                throw InvalidRequestException("Only GET operations (read/search) are allowed in transaction")
            }
            val url = request.url ?: throw InvalidRequestException("Entry missing request.url")
            val (resource, status) = executeGet(url)
            val responseEntry = Bundle.BundleEntryComponent().apply {
                this.resource = resource
                this.response = Bundle.BundleEntryResponseComponent().apply { this.status = status.toString() }
            }
            responseBundle.addEntry(responseEntry)
        }

        return responseBundle
    }

    private fun executeGet(relativeUrl: String): Pair<org.hl7.fhir.r4.model.Resource, Int> {
        val trimmed = relativeUrl.trimStart('/')
        val path = trimmed.substringBefore('?')
        val queryString = trimmed.substringAfter('?', "")

        val pathSegments = path.trim('/').split('/').filter { it.isNotBlank() }
        val resourceType = pathSegments.getOrNull(0) ?: throw InvalidRequestException("Missing resource type in url: $relativeUrl")
        val idPart = pathSegments.getOrNull(1)

        val queryParams = if (queryString.isBlank()) null else queryString.split("&")
            ?.mapNotNull {
                val parts = it.split("=", limit = 2)
                if (parts.isNotEmpty() && parts[0].isNotBlank()) parts[0] to (parts.getOrNull(1) ?: "") else null
            }?.toMap()

        val interaction = if (!idPart.isNullOrBlank() && queryParams.isNullOrEmpty()) Interaction.READ else Interaction.SEARCH
        val config: MutableMap<String, Any?> = mutableMapOf("resourceType" to resourceType)
        if (interaction == Interaction.READ) {
            config["id"] = idPart
        } else if (queryParams != null) {
            config["searchParams"] = queryParams
        }

        val request = RequestBuilder(fhirContext, config, interaction).buildRequest()
        // align with servlet mapping
        request.servletPath = "/fhir"
        request.requestURI = "/fhir${request.requestURI}"
        val response = MockHttpServletResponse()

        val restfulServer = restfulServerProvider.getObject()
        handleRequestMethod.invoke(restfulServer, interaction.asRequestType(), request, response)

        if (response.status < HttpServletResponse.SC_OK || response.status >= HttpServletResponse.SC_MULTIPLE_CHOICES) {
            throw InvalidRequestException("Nested request failed with status ${response.status}: ${response.contentAsString}")
        }

        val parsed = fhirContext.newJsonParser().parseResource(response.contentAsString)
        val resource = parsed as? org.hl7.fhir.r4.model.Resource
            ?: throw InvalidRequestException("Unexpected resource type in transaction response")
        return resource to response.status
    }
}
