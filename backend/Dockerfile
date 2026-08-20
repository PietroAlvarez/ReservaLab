FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 centroti
COPY --from=build /workspace/target/centro-ti-api-0.1.0-SNAPSHOT.jar app.jar
USER centroti
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
