# Multi-stage build for the sundhed.dk FHIR proxy

FROM gradle:9.2.1-jdk21-alpine AS build
WORKDIR /workspace
COPY . .
# Produce the Spring Boot fat jar
RUN ./gradlew bootJar --no-daemon

FROM gcr.io/distroless/java21-debian12:nonroot
WORKDIR /app
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["/usr/bin/java","-jar","/app/app.jar"]
