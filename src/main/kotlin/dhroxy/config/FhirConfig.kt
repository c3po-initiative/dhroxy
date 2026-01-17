package dhroxy.config

import ca.uhn.fhir.context.FhirContext
import ca.uhn.fhir.parser.IParser
import ca.uhn.fhir.parser.LenientErrorHandler
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class FhirConfig {
    @Bean
    fun fhirContext(): FhirContext =
        FhirContext.forR4().apply {
            setParserErrorHandler(LenientErrorHandler())
        }

    @Bean
    fun jsonParser(fhirContext: FhirContext): IParser =
        fhirContext.newJsonParser().setPrettyPrint(true)
}
