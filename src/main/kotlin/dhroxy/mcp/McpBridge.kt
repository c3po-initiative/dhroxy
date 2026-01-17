package dhroxy.mcp

import io.modelcontextprotocol.server.McpServerFeatures

interface McpBridge {
    fun generateTools(): List<McpServerFeatures.SyncToolSpecification>
}
