FROM maven:3.9-eclipse-temurin-17 as build

WORKDIR /app

# Copy the project files
COPY pom.xml .
COPY src/ ./src/

# Build the application
RUN mvn clean package assembly:single

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

# Copy the built jar from the build stage
COPY --from=build /app/target/market-data-service-*-jar-with-dependencies.jar /app/market-data-service.jar

# Run the application
CMD ["java", "-jar", "/app/market-data-service.jar"] 