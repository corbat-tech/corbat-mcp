# Containerization Guidelines

## Overview

Guidelines for containerizing Spring Boot applications following security best practices, multi-stage builds, and optimization techniques.

## Dockerfile Best Practices

### Multi-Stage Build (Recommended)

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml first (better caching)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (cached if pom.xml unchanged)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the application
RUN ./mvnw package -DskipTests -B

# Extract layers for better caching
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# ============================================
# Stage 2: Runtime
# ============================================
FROM eclipse-temurin:21-jre-alpine AS runtime

# Security: Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copy layers in order of change frequency
COPY --from=builder /app/extracted/dependencies/ ./
COPY --from=builder /app/extracted/spring-boot-loader/ ./
COPY --from=builder /app/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/extracted/application/ ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Expose port
EXPOSE 8080

# JVM optimization flags
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -XX:+ExitOnOutOfMemoryError \
  -Djava.security.egd=file:/dev/./urandom"

# Run with Spring Boot launcher
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
```

### Alternative: Simple Dockerfile

For simpler cases:

```dockerfile
FROM eclipse-temurin:21-jre-alpine

# Security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copy pre-built JAR
COPY --chown=appuser:appgroup target/*.jar app.jar

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### With Buildpacks (No Dockerfile)

Use Cloud Native Buildpacks via Spring Boot Maven plugin:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <image>
            <name>${project.artifactId}:${project.version}</name>
            <env>
                <BP_JVM_VERSION>21</BP_JVM_VERSION>
            </env>
        </image>
    </configuration>
</plugin>
```

```bash
./mvnw spring-boot:build-image
```

## Base Image Selection

| Image | Size | Use Case |
|-------|------|----------|
| `eclipse-temurin:21-jre-alpine` | ~180MB | Production (smallest) |
| `eclipse-temurin:21-jre` | ~280MB | Production (more compatible) |
| `eclipse-temurin:21-jdk-alpine` | ~340MB | Build stage only |
| `amazoncorretto:21-alpine` | ~190MB | AWS environments |
| `gcr.io/distroless/java21-debian12` | ~220MB | Maximum security |

### Distroless Image (Most Secure)

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM gcr.io/distroless/java21-debian12
COPY --from=builder /app/target/*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

## Docker Compose

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=local
      - DATABASE_URL=jdbc:postgresql://postgres:5432/orderdb
      - DATABASE_USERNAME=postgres
      - DATABASE_PASSWORD=postgres
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: orderdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
    healthcheck:
      test: ["CMD", "kafka-topics", "--bootstrap-server", "localhost:9092", "--list"]
      interval: 10s
      timeout: 10s
      retries: 5
    networks:
      - app-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - app-network

  # Observability stack
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - app-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  grafana-data:
```

### Production-Like Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: ${DOCKER_REGISTRY}/order-service:${VERSION}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - DATABASE_URL=${DATABASE_URL}
      - DATABASE_USERNAME=${DATABASE_USERNAME}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - KAFKA_BOOTSTRAP_SERVERS=${KAFKA_BOOTSTRAP_SERVERS}
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

## .dockerignore

```
# Build artifacts
target/
!target/*.jar
build/
*.class

# IDE
.idea/
*.iml
.vscode/
*.swp

# Git
.git
.gitignore

# Documentation
*.md
docs/

# Tests
src/test/
tests/

# CI/CD
.github/
.gitlab-ci.yml
Jenkinsfile

# Docker
Dockerfile*
docker-compose*
.docker/

# Misc
*.log
*.tmp
.env
.env.*
```

## Security Checklist

- [ ] Use non-root user (`USER appuser`)
- [ ] Use specific image tags (not `latest`)
- [ ] Minimize image size (Alpine, multi-stage)
- [ ] Don't copy secrets into image
- [ ] Enable health checks
- [ ] Scan for vulnerabilities (`docker scan`, `trivy`)
- [ ] Use read-only filesystem where possible
- [ ] Limit resource usage (CPU, memory)
- [ ] Don't expose unnecessary ports

## JVM Container Settings

```dockerfile
ENV JAVA_OPTS="\
  # Use container limits
  -XX:+UseContainerSupport \
  # Memory settings (percentage of container limit)
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  # Fail fast on OOM
  -XX:+ExitOnOutOfMemoryError \
  # Faster startup with entropy
  -Djava.security.egd=file:/dev/./urandom \
  # GC settings (G1 is default in JDK 21)
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  # Better container awareness
  -XX:+UseStringDeduplication"
```

## Local Development Commands

```bash
# Build image
docker build -t order-service:latest .

# Run container
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=local \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/orderdb \
  order-service:latest

# Build and run with compose
docker-compose up --build

# Run specific service
docker-compose up -d postgres kafka

# View logs
docker-compose logs -f app

# Clean up
docker-compose down -v
```

## Image Optimization Tips

1. **Order layers by change frequency**: Dependencies change less than code
2. **Use multi-stage builds**: Smaller final image
3. **Leverage Spring Boot layered JARs**: Better Docker layer caching
4. **Use Alpine images**: Smaller base image
5. **Clean up in same layer**: `RUN apt-get install && apt-get clean && rm -rf /var/lib/apt/lists/*`
6. **Minimize number of layers**: Combine related commands

## CI/CD Integration

```yaml
# Build and push in GitHub Actions
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
