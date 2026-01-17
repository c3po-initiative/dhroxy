package dhroxy.mcp

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import io.modelcontextprotocol.spec.McpSchema

object ToolFactory {

    private const val READ_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "type of the resource to read"
            },
            "id": {
            "type": "string",
            "description": "id of the resource to read"
            }
        }
        
        }
        """

    private const val CREATE_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to create"
            },
            "resource": {
            "type": "object",
            "description": "Resource content in JSON format"
            },
            "headers": {
            "type": "object",
            "description": "Headers for create request.\nAvailable headers: If-None-Exist header for conditional create where the value is search param string.\nFor example: {\"If-None-Exist\": \"active=false\"}"
            }
        },
        "required": ["resource"]
        }
        """

    private const val UPDATE_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to update"
            },
            "id": {
            "type": "string",
            "description": "ID of the resource to update"
            },
            "resource": {
            "type": "object",
            "description": "Updated resource content in JSON format"
            }
        },
        "required": ["resourceType", "id", "resource"]
        }
        """

    private const val CONDITIONAL_UPDATE_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to update"
            },
            "resource": {
            "type": "object",
            "description": "Updated resource content in JSON format"
            },
            "query": {
            "type": "string",
            "description": "Query string with search params separate by \",\". For example: \"_id=pt-1,name=ivan\". Uses for conditional update."
            },
            "headers": {
            "type": "object",
            "description": "Headers for create request.\nAvailable headers: If-None-Match header for conditional update where the value is ETag.\nFor example: {\"If-None-Match\": \"12345\"}"
            }
        },
        "required": ["resourceType", "resource"]
        }
        """

    private const val CONDITIONAL_PATCH_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to patch"
            },
            "resource": {
            "type": "object",
            "description": "Resource content to patch in JSON format"
            },
            "query": {
            "type": "string",
            "description": "Query string with search params separate by \",\". For example: \"_id=pt-1,name=ivan\". Uses for conditional patch."
            },
            "headers": {
            "type": "object",
            "description": "Headers for create request.\nAvailable headers: If-None-Match header for conditional patch where the value is ETag.\nFor example: {\"If-None-Match\": \"12345\"}"
            }
        },
        "required": ["resourceType", "resource"]
        }
        """

    private const val PATCH_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to patch"
            },
            "id": {
            "type": "string",
            "description": "ID of the resource to patch"
            },
            "resource": {
            "type": "object",
            "description": "Resource content to patch in JSON format"
            }
        },
        "required": ["resourceType", "id", "resource"]
        }
        """

    private const val DELETE_FHIR_RESOURCE_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to delete"
            },
            "id": {
            "type": "string",
            "description": "ID of the resource to delete"
            }
        },
        "required": ["resourceType", "id"]
        }
        """

    private const val SEARCH_FHIR_RESOURCES_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "Type of the resource to search"
            },
            "query": {
            "type": "string",
            "description": "Query string with search params separate by \",\". For example: \"_id=pt-1,name=ivan\""
            }
        },
        "required": ["resourceType", "query"]
        }
        """

    private const val CREATE_FHIR_TRANSACTION_SCHEMA = """
        {
        "type": "object",
        "properties": {
            "resourceType": {
            "type": "string",
            "description": "A Bundle resource type with type 'transaction' containing multiple FHIR resources"
            },
            "resource": {
            "type": "object",
            "description": "A FHIR Bundle Resource content in JSON format"
            }
        },
        "required": ["resourceType", "resource"]
        }
        """

    @Throws(JsonProcessingException::class)
    private fun parseSchema(schemaText: String): McpSchema.JsonSchema {
        val objectMapper = ObjectMapper()
        objectMapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        objectMapper.configure(JsonParser.Feature.ALLOW_COMMENTS, true)
        return objectMapper.readValue(schemaText, McpSchema.JsonSchema::class.java)
    }

    private fun toolBuilder(): McpSchema.Tool.Builder =
        McpSchema.Tool.Builder().description("FHIR MCP tool")

    @Throws(JsonProcessingException::class)
    fun createFhirResource(): McpSchema.Tool =
        toolBuilder().name("create-fhir-resource").inputSchema(parseSchema(CREATE_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun readFhirResource(): McpSchema.Tool =
        toolBuilder().name("read-fhir-resource").inputSchema(parseSchema(READ_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun updateFhirResource(): McpSchema.Tool =
        toolBuilder().name("update-fhir-resource").inputSchema(parseSchema(UPDATE_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun deleteFhirResource(): McpSchema.Tool =
        toolBuilder().name("delete-fhir-resource").inputSchema(parseSchema(DELETE_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun searchFhirResources(): McpSchema.Tool =
        toolBuilder().name("search-fhir-resources").inputSchema(parseSchema(SEARCH_FHIR_RESOURCES_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun patchFhirResource(): McpSchema.Tool =
        toolBuilder().name("patch-fhir-resource").inputSchema(parseSchema(PATCH_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun conditionalPatchFhirResource(): McpSchema.Tool =
        toolBuilder().name("conditional-patch-fhir-resource")
            .inputSchema(parseSchema(CONDITIONAL_PATCH_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun conditionalUpdateFhirResource(): McpSchema.Tool =
        toolBuilder().name("conditional-update-fhir-resource")
            .inputSchema(parseSchema(CONDITIONAL_UPDATE_FHIR_RESOURCE_SCHEMA)).build()

    @Throws(JsonProcessingException::class)
    fun createFhirTransaction(): McpSchema.Tool =
        toolBuilder().name("create-fhir-transaction").inputSchema(parseSchema(CREATE_FHIR_TRANSACTION_SCHEMA)).build()
}
