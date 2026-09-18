package dhroxy.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("eu-health-data-api")
data class EuHealthDataApiProperties(
    val capabilityStatement: CapabilityStatementProperties = CapabilityStatementProperties(),
    val smartConfiguration: SmartConfigurationProperties = SmartConfigurationProperties()
) {
    data class CapabilityStatementProperties(
        val instantiates: List<String> = listOf(
            "http://hl7.org/fhir/uv/ipa/CapabilityStatement/ipa-server"
        ),
        val implementationGuides: List<String> = emptyList()
    )

    data class SmartConfigurationProperties(
        val enabled: Boolean = false,
        val tokenEndpoint: String? = null,
        val jwksUri: String? = null,
        val grantTypesSupported: List<String> = listOf("client_credentials"),
        val capabilities: List<String> = listOf("client-confidential-asymmetric"),
        val scopesSupported: List<String> = emptyList(),
        val tokenEndpointAuthMethodsSupported: List<String> = listOf("private_key_jwt"),
        val tokenEndpointAuthSigningAlgValuesSupported: List<String> = listOf("RS384", "ES384")
    )
}
