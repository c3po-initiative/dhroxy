import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

object Versions {
    const val springBoot = "3.5.9"
    const val springDepMgmt = "1.1.7"
    const val kotlin = "2.2.0"
    const val hapi = "8.6.1"
    const val gson = "2.11.0"
    const val springAi = "1.1.2"
    const val mockk = "1.13.11"
}

plugins {
    // Plugin versions must be literals inside the plugins block
    id("org.springframework.boot") version "3.5.9"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("jvm") version "2.2.0"
    kotlin("plugin.spring") version "2.2.0"
}

group = "dhroxy"
version = "0.1.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

kotlin {
    jvmToolchain(21)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-webflux") // WebClient
    implementation("ca.uhn.hapi.fhir:hapi-fhir-base:${Versions.hapi}")
    implementation("ca.uhn.hapi.fhir:hapi-fhir-structures-r4:${Versions.hapi}")
    implementation("ca.uhn.hapi.fhir:hapi-fhir-validation:${Versions.hapi}")
    implementation("ca.uhn.hapi.fhir:hapi-fhir-server:${Versions.hapi}")
    implementation("com.google.code.gson:gson:${Versions.gson}")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")
    implementation("org.springframework:spring-test")
    implementation("org.springframework.ai:spring-ai-mcp:${Versions.springAi}")
    implementation("org.springframework.ai:spring-ai-starter-mcp-server:${Versions.springAi}")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("io.mockk:mockk:${Versions.mockk}")
    testImplementation("ca.uhn.hapi.fhir:hapi-fhir-client:${Versions.hapi}")
}

tasks.withType<KotlinCompile>().configureEach {
    compilerOptions {
        freeCompilerArgs.addAll(
            listOf(
                "-Xjsr305=strict",
                "-Xannotation-default-target=param-property"
            )
        )
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
