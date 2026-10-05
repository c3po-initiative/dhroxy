package dhroxy.stub

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.nio.charset.StandardCharsets.UTF_8
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors

/** Synthetic upstream based on SundhedClient, mapper tests and documented regressions. */
class SundhedStub(port: Int = 0, val scenario: Scenario = Scenario.HAPPY) : AutoCloseable {
    enum class Scenario {
        HAPPY, EMPTY, GP_UNAVAILABLE, LARGE_LABS, UNAUTHORIZED, FORBIDDEN, UPSTREAM_ERROR;

        companion object {
            fun parse(value: String) = valueOf(value.uppercase().replace('-', '_'))
        }
    }

    data class Request(val method: String, val path: String, val query: Map<String, String>,
                       val headers: Map<String, List<String>>, val body: String)

    private val mapper = jacksonObjectMapper()
    private val fixtures: JsonNode = requireNotNull(javaClass.getResourceAsStream("/sundhed-stub/fixtures.json"))
        .use { mapper.readTree(it) }
    private val history = ConcurrentLinkedQueue<Request>()
    val requests: List<Request> get() = history.toList()
    private val executor = Executors.newCachedThreadPool()
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", port), 0).apply {
        executor = this@SundhedStub.executor
        createContext("/") { exchange -> handle(exchange) }
    }
    val baseUrl: String get() = "http://127.0.0.1:${server.address.port}"

    private val routes = mapOf(
        "/app/personvaelgerportal/api/v1/GetPersonSelection" to "person",
        "/app/proevesvarportal/api/v1/svaroversigt" to "labs",
        "/app/vaccination/api/v1/effectuatedvaccinations" to "vaccinations",
        "/app/vaccination/api/v1/effectuatedvaccinations/1001/history" to "vaccinationHistory",
        "/app/medicinkort2borger/api/v1/ordinations" to "ordinations",
        "/app/medicinkort2borger/api/v1/ordinations/overview" to "ordinationOverview",
        "/app/medicinkort2borger/api/v1/ordinations/ord-1/details" to "ordinationDetails",
        "/app/medicinkort2borger/api/v1/prescriptions" to "prescriptions",
        "/app/medicinkort2borger/api/v1/prescriptions/overview" to "prescriptionOverview",
        "/app/aftalerborger/api/v1/aftaler/cpr" to "appointments",
        "/api/minlaegeorganization" to "gp",
        "/api/core/organisation/12345" to "organization",
        "/app/diagnoserborger/api/v1/diagnoser" to "diagnoses",
        "/app/ejournalportalborger/api/ejournal/forloebsoversigt" to "courses",
        "/app/ejournalportalborger/api/ejournal/kontaktperioder" to "contacts",
        "/app/ejournalportalborger/api/ejournal/epikriser" to "discharge",
        "/app/ejournalportalborger/api/ejournal/notater" to "notes",
        "/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisninger" to "imagingList",
        "/app/billedbeskrivelserborger/api/v1/billedbeskrivelser/henvisning" to "imagingDetail",
        "/app/DenNationaleHenvisningsformidling/api/v1/henvisninger" to "referrals",
        "/app/hjemmemaalingerborger/api/v1/maalinger" to "measurements",
        "/app/planerportalborger/api/v1/plans" to "plans"
    )

    init {
        server.start()
    }

    private fun handle(exchange: HttpExchange) {
        exchange.use { ex ->
            try {
                val query = ex.requestURI.rawQuery.orEmpty().split('&').filter { it.isNotEmpty() }.associate {
                    val pair = it.split('=', limit = 2)
                    URLDecoder.decode(pair[0], UTF_8) to URLDecoder.decode(pair.getOrElse(1) { "" }, UTF_8)
                }
                val request = Request(ex.requestMethod, ex.requestURI.path.trimEnd('/'), query,
                    ex.requestHeaders.entries.associate { it.key.lowercase() to it.value.toList() },
                    ex.requestBody.bufferedReader(UTF_8).readText())
                history.add(request)
                while (history.size > 1000) history.poll()
                val fixture = routes[request.path] ?: return reply(ex, 404, "Unknown stub endpoint", plain = true)
                val method = if (fixture == "appointments") "POST" else "GET"
                if (request.method != method) {
                    ex.responseHeaders.set("Allow", method)
                    return reply(ex, 405, "Expected $method")
                }
                when (scenario) {
                    Scenario.UNAUTHORIZED -> return reply(ex, 401, "Synthetic session expired")
                    Scenario.FORBIDDEN -> return reply(ex, 403, "Synthetic access denied")
                    Scenario.UPSTREAM_ERROR -> return reply(ex, 500, "Synthetic upstream failure")
                    Scenario.GP_UNAVAILABLE -> if (fixture == "gp") return reply(ex, 404, "Not Found", plain = true)
                    else -> Unit
                }
                val payload = fixtures[fixture].deepCopy<JsonNode>()
                when (fixture) {
                    "labs" -> filterLabs(payload, request)
                    "appointments" -> filterAppointments(payload, request)
                    "courses" -> {
                        val page = positiveInt(query["Side"] ?: "1")
                        val size = positiveInt(query["ItemsPerPage"] ?: "10")
                        val courses = payload["forloeb"].toList()
                        val offset = (page.toLong() - 1) * size
                        (payload as ObjectNode).set<ArrayNode>("forloeb", mapper.valueToTree(
                            courses.drop(offset.coerceAtMost(courses.size.toLong()).toInt()).take(size)))
                    }
                    "contacts", "discharge", "notes" -> {
                        val key = mapper.readTree(requireNotNull(query["noegle"]) { "noegle is required" })
                        require(key != null && key.hasNonNull("Noegle")) { "noegle must contain Noegle" }
                        if (key["Noegle"].asText() != "course-1") return reply(ex, 404, "Unknown course")
                    }
                    "imagingDetail" -> {
                        require(query.containsKey("Id") || query.containsKey("undersoegelsesId")) { "Id or undersoegelsesId is required" }
                        if (query["Id"]?.let { it != "ref-1" } == true ||
                            query["undersoegelsesId"]?.let { it != "study-1" } == true) return reply(ex, 404, "Unknown imaging referral")
                    }
                    "ordinations" -> {
                        require(query["orderBy"] == "StartDate" && query["sortBy"] == "desc" && query["status"] == "active") {
                            "Expected orderBy=StartDate&sortBy=desc&status=active"
                        }
                    }
                }
                val response = if (scenario == Scenario.EMPTY && fixture == "gp") mapper.createObjectNode().putNull("OrganizationId")
                    else if (scenario == Scenario.EMPTY) emptyPayload(payload) else payload
                reply(ex, 200, mapper.writeValueAsString(response), json = true)
            } catch (e: IllegalArgumentException) {
                reply(ex, 400, e.message ?: "Invalid request")
            } catch (e: com.fasterxml.jackson.core.JsonProcessingException) {
                reply(ex, 400, "Invalid JSON")
            } catch (e: java.time.DateTimeException) {
                reply(ex, 400, "Invalid ISO date")
            }
        }
    }

    private fun positiveInt(value: String): Int = requireNotNull(value.toIntOrNull()?.takeIf { it > 0 }) {
        "Pagination values must be positive integers"
    }

    private fun filterLabs(payload: JsonNode, request: Request) {
        val q = request.query
        require(q["source"] == "RegionaleProevesvar") { "source=RegionaleProevesvar is required" }
        val from = LocalDateTime.parse(requireNotNull(q["fra"]) { "fra is required" })
        val to = LocalDateTime.parse(requireNotNull(q["til"]) { "til is required" })
        require(!from.isAfter(to)) { "fra must not be after til" }
        val overview = payload["Svaroversigt"] as ObjectNode
        var results = overview["Laboratorieresultater"].filter {
            val date = java.time.OffsetDateTime.parse(it["Resultatdato"].asText()).toLocalDateTime()
            !date.isBefore(from) && !date.isAfter(to) &&
                (q["omraade"].isNullOrBlank() || q["omraade"] == "Alle" || q["omraade"] == it["AnalysetypeId"].asText())
        }
        if (scenario == Scenario.LARGE_LABS) results = results.flatMap { result ->
            (1..1500).map { index -> result.deepCopy<ObjectNode>().apply {
                put("ProevenummerLaboratorie", "${result["ProevenummerLaboratorie"].asText()}-$index")
            } }
        }
        overview.set<ArrayNode>("Laboratorieresultater", mapper.valueToTree(results))
        val ids = results.map { it["RekvisitionsId"].asText() }.toSet()
        overview.set<ArrayNode>("Rekvisitioner", mapper.valueToTree(overview["Rekvisitioner"].filter { it["Id"].asText() in ids }))
    }

    private fun filterAppointments(payload: JsonNode, request: Request) {
        require(request.headers["content-type"]?.any { it.startsWith("application/json") } == true) { "Expected application/json" }
        val body = mapper.readTree(request.body)
        require(body != null && body.hasNonNull("FromDate") && body.hasNonNull("ToDate")) { "FromDate and ToDate are required" }
        val from = LocalDate.parse(body["FromDate"].asText())
        val to = LocalDate.parse(body["ToDate"].asText())
        require(!from.isAfter(to)) { "FromDate must not be after ToDate" }
        require(body.path("Version").asInt() == 2 && body.path("WithPartials").asBoolean()) { "Expected Version=2 and WithPartials=true" }
        val selected = payload["appointments"].filter {
            val date = java.time.OffsetDateTime.parse(it["startTime"].asText()).toLocalDate()
            !date.isBefore(from) && !date.isAfter(to)
        }
        (payload as ObjectNode).set<ArrayNode>("appointments", mapper.valueToTree(selected))
    }

    private fun emptyPayload(node: JsonNode): JsonNode = when {
        node.isArray -> mapper.createArrayNode()
        node.isObject -> mapper.createObjectNode().also { empty ->
            node.properties().forEach { (key, value) ->
                empty.set<JsonNode>(key, when {
                    value.isIntegralNumber -> mapper.nodeFactory.numberNode(0)
                    value.isArray || value.isObject -> emptyPayload(value)
                    else -> value
                })
            }
        }
        else -> node
    }

    private fun reply(ex: HttpExchange, status: Int, body: String, plain: Boolean = false, json: Boolean = false) {
        val bytes = (if (plain || json) body else mapper.writeValueAsString(mapOf("error" to body))).toByteArray(UTF_8)
        ex.responseHeaders.set("Content-Type", if (plain) "text/plain; charset=utf-8" else "application/json; charset=utf-8")
        ex.sendResponseHeaders(status, bytes.size.toLong())
        ex.responseBody.write(bytes)
    }

    override fun close() {
        server.stop(0)
        executor.shutdownNow()
    }
}

fun main(args: Array<String>) {
    if (args.contentEquals(arrayOf("--help"))) {
        println("sundhedStub [--port=9090] [--scenario=happy|empty|gp-unavailable|large-labs|unauthorized|forbidden|upstream-error]")
        return
    }
    require(args.all { it.startsWith("--port=") || it.startsWith("--scenario=") }) { "Unknown option; use --help" }
    val port = args.firstOrNull { it.startsWith("--port=") }?.substringAfter('=')?.toInt() ?: 9090
    val scenario = args.firstOrNull { it.startsWith("--scenario=") }?.substringAfter('=')?.let(SundhedStub.Scenario::parse)
        ?: SundhedStub.Scenario.HAPPY
    val stub = SundhedStub(port, scenario)
    Runtime.getRuntime().addShutdownHook(Thread { stub.close() })
    println("Synthetic sundhed.dk stub: ${stub.baseUrl} (${scenario.name.lowercase()})")
    CountDownLatch(1).await()
}
