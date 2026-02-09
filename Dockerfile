# Multi-stage build for the sundhed.dk FHIR proxy

# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot backend (with frontend static assets)
FROM gradle:9.2.1-jdk21-alpine AS build
WORKDIR /workspace
COPY . .
# Copy built frontend into Spring Boot static resources
COPY --from=frontend-build /frontend/build /workspace/src/main/resources/static
# Produce the Spring Boot fat jar
RUN gradle bootJar --no-daemon

# Stage 3: Minimal runtime image
FROM gcr.io/distroless/java21-debian12:nonroot
WORKDIR /app
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["/usr/bin/java","-jar","/app/app.jar"]
