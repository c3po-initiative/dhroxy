package dhroxy.mapper

import org.hl7.fhir.r4.model.*

/** Shared Danish identifiers and conservative unit normalization (DK Core 3.7.0). */
object DanishFhir {
    const val CPR_SYSTEM = "urn:oid:1.2.208.176.1.2"
    const val CVR_SYSTEM = "http://cvr.dk"
    const val DATA_ABSENT_REASON = "http://hl7.org/fhir/StructureDefinition/data-absent-reason"

    // CPR has no universal modulus-11 requirement. Preserve leading zeroes.
    fun normalizeCpr(raw: String?): String? = raw?.trim()?.replace("-", "")
        ?.takeIf { it.matches(Regex("(((0[1-9]|[12][0-9]|3[01])(01|03|05|07|08|10|12))|((0[1-9]|[12][0-9]|30)(04|06|09|11))|((0[1-9]|[12][0-9])(02)))[0-9]{6}")) }

    fun cprIdentifier(raw: String?): Identifier? = normalizeCpr(raw)?.let {
        Identifier().setSystem(CPR_SYSTEM).setValue(it).setUse(Identifier.IdentifierUse.OFFICIAL)
    }

    fun patientReference(raw: String? = null): Reference = Reference().apply {
        type = "Patient"
        val cpr = cprIdentifier(raw)
        if (cpr != null) identifier = cpr
        else addExtension(DATA_ABSENT_REASON, CodeType("unknown"))
    }

    /** Only exact, known unit spellings are coded; an unfamiliar unit stays as source text. */
    fun quantity(value: java.math.BigDecimal, sourceUnit: String?): Quantity = Quantity().apply {
        this.value = value
        val displayUnit = sourceUnit?.trim()?.takeIf { it.isNotEmpty() }
        if (displayUnit != null) unit = displayUnit
        val ucum = when (displayUnit) {
            "kg", "g", "mg", "mmol/L", "mol/L", "mg/L", "g/L", "mg/dL", "cm", "m", "%" -> displayUnit
            "mmHg", "mm[Hg]" -> "mm[Hg]"
            "°C", "Cel" -> "Cel"
            else -> null
        }
        if (ucum != null) { system = "http://unitsofmeasure.org"; code = ucum }
    }
}
