package dhroxy

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class DhroxyApplication

fun main(args: Array<String>) {
    runApplication<DhroxyApplication>(*args)
}
