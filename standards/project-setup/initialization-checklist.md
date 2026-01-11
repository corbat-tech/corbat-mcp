# Project Initialization Checklist

## Overview

This checklist guides the complete setup of a new Spring Boot backend application following Corbat standards.

## Project Creation Steps

### 1. Project Structure

Create the following directory structure:

```
project-name/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/projectname/
│   │   │       ├── domain/
│   │   │       │   ├── model/
│   │   │       │   ├── event/
│   │   │       │   ├── exception/
│   │   │       │   ├── port/
│   │   │       │   │   ├── in/
│   │   │       │   │   └── out/
│   │   │       │   └── service/
│   │   │       ├── application/
│   │   │       │   ├── usecase/
│   │   │       │   ├── command/
│   │   │       │   └── query/
│   │   │       └── infrastructure/
│   │   │           ├── adapter/
│   │   │           │   ├── in/
│   │   │           │   │   └── rest/
│   │   │           │   └── out/
│   │   │           │       ├── persistence/
│   │   │           │       ├── messaging/
│   │   │           │       └── http/
│   │   │           └── config/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-local.yml
│   │       ├── application-production.yml
│   │       └── db/
│   │           └── migration/
│   └── test/
│       └── java/
│           └── com/example/projectname/
│               ├── domain/
│               ├── application/
│               ├── infrastructure/
│               ├── architecture/
│               └── integration/
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   └── prometheus/
│       └── prometheus.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── pom.xml
├── .gitignore
├── .dockerignore
├── README.md
└── CHANGELOG.md
```

### 2. Dependencies (pom.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>project-name</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>Project Name</name>
    <description>Description of the project</description>

    <properties>
        <java.version>21</java.version>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
        <archunit.version>1.2.0</archunit.version>
        <testcontainers.version>1.19.3</testcontainers.version>
    </properties>

    <dependencies>
        <!-- Core -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Persistence -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>

        <!-- Messaging (optional) -->
        <dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
        </dependency>

        <!-- Caching (optional) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-cache</artifactId>
        </dependency>

        <!-- Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- Observability -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-tracing-bridge-brave</artifactId>
        </dependency>
        <dependency>
            <groupId>io.zipkin.reporter2</groupId>
            <artifactId>zipkin-reporter-brave</artifactId>
        </dependency>

        <!-- API Documentation -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.3.0</version>
        </dependency>

        <!-- Utilities -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.tngtech.archunit</groupId>
            <artifactId>archunit-junit5</artifactId>
            <version>${archunit.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>kafka</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.testcontainers</groupId>
                <artifactId>testcontainers-bom</artifactId>
                <version>${testcontainers.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                    <layers>
                        <enabled>true</enabled>
                    </layers>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>${lombok.version}</version>
                        </path>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-failsafe-plugin</artifactId>
                <executions>
                    <execution>
                        <goals>
                            <goal>integration-test</goal>
                            <goal>verify</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.11</version>
                <executions>
                    <execution>
                        <goals>
                            <goal>prepare-agent</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>report</id>
                        <phase>test</phase>
                        <goals>
                            <goal>report</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### 3. Application Configuration

```yaml
# application.yml
spring:
  application:
    name: project-name

  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/projectdb}
    username: ${DATABASE_USERNAME:postgres}
    password: ${DATABASE_PASSWORD:postgres}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false

  flyway:
    enabled: true
    locations: classpath:db/migration

  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
  tracing:
    sampling:
      probability: ${TRACING_SAMPLING_PROBABILITY:1.0}

server:
  shutdown: graceful

logging:
  level:
    root: INFO
    com.example: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%X{traceId:-},%X{spanId:-}] %-5level %logger{36} - %msg%n"

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
```

### 4. Core Classes to Create

#### Domain Layer

```java
// domain/model/OrderId.java - Value Object
public record OrderId(String value) {
    public OrderId {
        Objects.requireNonNull(value, "Order ID cannot be null");
        if (value.isBlank()) {
            throw new IllegalArgumentException("Order ID cannot be blank");
        }
    }

    public static OrderId generate() {
        return new OrderId(UUID.randomUUID().toString());
    }

    public static OrderId of(String value) {
        return new OrderId(value);
    }
}

// domain/model/Order.java - Aggregate
public class Order extends AggregateRoot {
    private OrderId id;
    private CustomerId customerId;
    private OrderStatus status;
    private List<OrderLine> lines;
    private Instant createdAt;

    public static Order create(CustomerId customerId, List<OrderLine> lines) {
        Order order = new Order();
        order.id = OrderId.generate();
        order.customerId = customerId;
        order.status = OrderStatus.PENDING;
        order.lines = new ArrayList<>(lines);
        order.createdAt = Instant.now();

        order.registerEvent(new OrderCreatedEvent(order.id.value(), customerId.value()));
        return order;
    }

    // Business methods...
}

// domain/port/out/OrderRepository.java - Output Port
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}

// domain/port/in/PlaceOrderUseCase.java - Input Port
public interface PlaceOrderUseCase {
    OrderId execute(PlaceOrderCommand command);
}
```

#### Application Layer

```java
// application/command/PlaceOrderCommand.java
public record PlaceOrderCommand(
    String customerId,
    List<OrderLineData> lines
) {
    public record OrderLineData(String productId, int quantity) {}
}

// application/usecase/PlaceOrderUseCaseImpl.java
@Service
@RequiredArgsConstructor
@Transactional
public class PlaceOrderUseCaseImpl implements PlaceOrderUseCase {

    private final OrderRepository orderRepository;
    private final DomainEventPublisher eventPublisher;

    @Override
    public OrderId execute(PlaceOrderCommand command) {
        Order order = Order.create(
            CustomerId.of(command.customerId()),
            command.lines().stream()
                .map(line -> OrderLine.of(ProductId.of(line.productId()), line.quantity()))
                .toList()
        );

        orderRepository.save(order);
        eventPublisher.publishAll(order.getDomainEvents());
        order.clearDomainEvents();

        return order.getId();
    }
}
```

#### Infrastructure Layer

```java
// infrastructure/adapter/in/rest/OrderController.java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders")
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;
    private final GetOrderUseCase getOrderUseCase;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new order")
    public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderId orderId = placeOrderUseCase.execute(request.toCommand());
        return getOrderUseCase.execute(orderId)
            .map(OrderResponse::from)
            .orElseThrow();
    }
}

// infrastructure/adapter/out/persistence/JpaOrderRepository.java
@Repository
@RequiredArgsConstructor
public class JpaOrderRepository implements OrderRepository {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.value())
            .map(mapper::toDomain);
    }

    @Override
    public void save(Order order) {
        jpaRepository.save(mapper.toEntity(order));
    }
}
```

### 5. Testing Structure

```java
// test/architecture/HexagonalArchTest.java
@AnalyzeClasses(packages = "com.example.projectname")
class HexagonalArchTest {

    @ArchTest
    static final ArchRule domain_should_not_depend_on_infrastructure =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..infrastructure..");
}

// test/integration/OrderControllerIT.java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class OrderControllerIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void should_CreateOrder_When_ValidRequest() throws Exception {
        // Test implementation
    }
}
```

## Initialization Checklist

### Project Setup
- [ ] Create project structure (hexagonal architecture)
- [ ] Configure pom.xml with all dependencies
- [ ] Set up application.yml for all environments
- [ ] Create .gitignore and .dockerignore
- [ ] Initialize Git repository

### Domain Layer
- [ ] Define value objects (IDs, Money, etc.)
- [ ] Define aggregate roots
- [ ] Define domain events
- [ ] Define domain exceptions
- [ ] Define repository interfaces (ports)
- [ ] Define use case interfaces (ports)

### Application Layer
- [ ] Implement commands and queries
- [ ] Implement use cases
- [ ] Define DTOs

### Infrastructure Layer
- [ ] Implement REST controllers
- [ ] Implement JPA entities and repositories
- [ ] Implement mappers (MapStruct)
- [ ] Configure security
- [ ] Configure Kafka (if needed)
- [ ] Configure Redis (if needed)
- [ ] Create database migrations

### Testing
- [ ] Create ArchUnit tests
- [ ] Create unit tests for domain
- [ ] Create unit tests for use cases
- [ ] Create integration tests (*IT.java)
- [ ] Configure test coverage (JaCoCo)
- [ ] Set up Testcontainers

### Observability
- [ ] Configure structured logging
- [ ] Configure metrics (Micrometer)
- [ ] Configure tracing
- [ ] Create custom health indicators
- [ ] Set up Prometheus endpoint

### CI/CD
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Create GitHub Actions CI workflow
- [ ] Create GitHub Actions CD workflow
- [ ] Create Kubernetes manifests

### Documentation
- [ ] Write README.md
- [ ] Configure OpenAPI/Swagger
- [ ] Document API endpoints
- [ ] Create CHANGELOG.md

### Verification
- [ ] Run all tests (`./mvnw verify`)
- [ ] Check test coverage (80%+)
- [ ] Build Docker image
- [ ] Run application locally
- [ ] Test with docker-compose
- [ ] Verify health endpoints
- [ ] Verify metrics endpoint
- [ ] Verify API documentation

## Quick Commands

```bash
# Create project with Spring Initializr
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.2.0 \
  -d baseDir=project-name \
  -d groupId=com.example \
  -d artifactId=project-name \
  -d name=ProjectName \
  -d javaVersion=21 \
  -d dependencies=web,validation,data-jpa,postgresql,flyway,actuator,security \
  -o project-name.zip

# Build
./mvnw clean verify

# Run tests
./mvnw test

# Run integration tests
./mvnw verify -Pfailsafe

# Build Docker image
docker build -t project-name:latest .

# Run with Docker Compose
docker-compose up -d

# Check application health
curl http://localhost:8080/actuator/health
```
