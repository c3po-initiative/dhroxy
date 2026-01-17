package dhroxy.mcp

import ca.uhn.fhir.rest.api.RequestTypeEnum

enum class Interaction(val interactionName: String) {
    SEARCH("search"),
    READ("read"),
    CREATE("create"),
    UPDATE("update"),
    DELETE("delete"),
    PATCH("patch"),
    TRANSACTION("transaction");

    fun asRequestType(): RequestTypeEnum =
        when (this) {
            SEARCH, READ -> RequestTypeEnum.GET
            CREATE, TRANSACTION -> RequestTypeEnum.POST
            UPDATE -> RequestTypeEnum.PUT
            DELETE -> RequestTypeEnum.DELETE
            PATCH -> RequestTypeEnum.PATCH
        }
}
