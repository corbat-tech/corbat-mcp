# Spring Boot Best Practices

## Overview

Best practices for Spring Boot 3.x development following modern Java conventions and enterprise patterns.

## Dependency Injection

### Use Constructor Injection

```java
// Bad - Field injection
@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
}

// Good - Constructor injection
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}

// Better - Lombok (if using)
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
}
```

**Benefits:**
- Immutable dependencies (final)
- Explicit dependencies
- Easy to test
- Fails fast if dependency missing

## Configuration

### Use @ConfigurationProperties

```java
// Bad
@Value("${app.payment.timeout}")
private int timeout;

// Good
@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    int timeout,
    String apiKey,
    boolean retryEnabled,
    RetryProperties retry
) {
    public record RetryProperties(
        int maxAttempts,
        Duration backoff
    ) {}
}

@Configuration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentConfig { }
```

### Separate Configuration Classes

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    // Web-specific configuration
}

@Configuration
public class SecurityConfig {
    // Security-specific configuration
}

@Configuration
public class PersistenceConfig {
    // Database-specific configuration
}

@Configuration
public class KafkaConfig {
    // Messaging-specific configuration
}
```

## HTTP Clients

### When to Use HttpInterface vs RestClient

| Scenario | Recommended Client |
|----------|-------------------|
| Simple CRUD operations | HttpInterface |
| Standard REST endpoints | HttpInterface |
| Complex error handling | RestClient |
| Dynamic headers/query params | RestClient |
| Retry policies | RestClient |
| Circuit breaker integration | RestClient |

### HttpInterface (Declarative - Simple Cases)

Best for simple, standard REST API calls with minimal customization.

```java
// Define the client interface
@HttpExchange("/api/v1/users")
public interface UserClient {

    @GetExchange("/{id}")
    UserResponse getUser(@PathVariable String id);

    @GetExchange
    List<UserResponse> getAllUsers();

    @PostExchange
    UserResponse createUser(@RequestBody CreateUserRequest request);

    @PutExchange("/{id}")
    UserResponse updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request);

    @DeleteExchange("/{id}")
    void deleteUser(@PathVariable String id);
}

// Configure the client
@Configuration
public class UserClientConfig {

    @Bean
    public UserClient userClient(RestClient.Builder builder) {
        RestClient restClient = builder
            .baseUrl("https://api.example.com")
            .build();

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(restClient))
            .build();

        return factory.createClient(UserClient.class);
    }
}
```

### RestClient (Fluent API - Complex Cases)

Best for complex scenarios requiring fine-grained control.

```java
@Component
@RequiredArgsConstructor
public class PaymentGatewayClient {

    private final RestClient restClient;

    public PaymentResponse processPayment(PaymentRequest request) {
        return restClient.post()
            .uri("/payments")
            .header("X-Idempotency-Key", request.idempotencyKey())
            .header("X-Correlation-Id", MDC.get("correlationId"))
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, this::handleClientError)
            .onStatus(HttpStatusCode::is5xxServerError, this::handleServerError)
            .body(PaymentResponse.class);
    }

    public Optional<PaymentStatus> getPaymentStatus(String paymentId) {
        return restClient.get()
            .uri("/payments/{id}/status", paymentId)
            .retrieve()
            .onStatus(status -> status.value() == 404, (req, res) -> {})
            .body(new ParameterizedTypeReference<Optional<PaymentStatus>>() {});
    }

    private void handleClientError(HttpRequest request, ClientHttpResponse response) {
        // Custom error handling logic
        throw new PaymentClientException("Payment failed: " + response.getStatusCode());
    }

    private void handleServerError(HttpRequest request, ClientHttpResponse response) {
        throw new PaymentGatewayException("Gateway unavailable");
    }
}

// RestClient configuration with interceptors
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient paymentRestClient(RestClient.Builder builder) {
        return builder
            .baseUrl("https://payment.gateway.com/api/v1")
            .defaultHeader("Authorization", "Bearer " + getToken())
            .requestInterceptor(new LoggingInterceptor())
            .requestInterceptor(new RetryInterceptor(3, Duration.ofMillis(500)))
            .build();
    }
}
```

## REST API Design

### Use Problem Details (RFC 7807)

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail handleOrderNotFound(OrderNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problem.setTitle("Order Not Found");
        problem.setType(URI.create("https://api.example.com/errors/order-not-found"));
        problem.setProperty("orderId", ex.getOrderId());
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ProblemDetail handleBusinessRuleViolation(BusinessRuleViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.UNPROCESSABLE_ENTITY,
            ex.getMessage()
        );
        problem.setTitle("Business Rule Violation");
        problem.setType(URI.create("https://api.example.com/errors/business-rule-violation"));
        problem.setProperty("rule", ex.getRuleName());
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleValidation(ConstraintViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "Validation failed"
        );
        problem.setTitle("Validation Error");
        problem.setProperty("violations", ex.getConstraintViolations().stream()
            .map(v -> Map.of(
                "field", v.getPropertyPath().toString(),
                "message", v.getMessage()
            ))
            .toList());
        return problem;
    }
}
```

### Use DTOs for API

```java
// Request DTO with validation
public record CreateOrderRequest(
    @NotNull(message = "Customer ID is required")
    String customerId,

    @NotEmpty(message = "Order must have at least one line")
    @Size(max = 100, message = "Order cannot have more than 100 lines")
    List<@Valid OrderLineRequest> lines,

    @Email(message = "Invalid email format")
    String contactEmail
) {
    public CreateOrderCommand toCommand() {
        return new CreateOrderCommand(
            CustomerId.of(customerId),
            lines.stream().map(OrderLineRequest::toLine).toList()
        );
    }
}

// Response DTO
public record OrderResponse(
    String id,
    String status,
    BigDecimal total,
    List<OrderLineResponse> lines,
    Instant createdAt
) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId().value(),
            order.getStatus().name(),
            order.getTotal().amount(),
            order.getLines().stream().map(OrderLineResponse::from).toList(),
            order.getCreatedAt()
        );
    }
}
```

### Controller Structure

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;
    private final GetOrderUseCase getOrderUseCase;
    private final ListOrdersUseCase listOrdersUseCase;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new order")
    @ApiResponse(responseCode = "201", description = "Order created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        Order order = placeOrderUseCase.execute(request.toCommand());
        return OrderResponse.from(order);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID")
    @ApiResponse(responseCode = "200", description = "Order found")
    @ApiResponse(responseCode = "404", description = "Order not found")
    public OrderResponse getOrder(@PathVariable String id) {
        return getOrderUseCase.execute(OrderId.of(id))
            .map(OrderResponse::from)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }

    @GetMapping
    @Operation(summary = "List orders with pagination")
    public Page<OrderResponse> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return listOrdersUseCase.execute(PageRequest.of(page, size))
            .map(OrderResponse::from);
    }
}
```

## Validation

### Use Bean Validation

```java
public record CreateOrderRequest(
    @NotNull(message = "Customer ID is required")
    String customerId,

    @NotEmpty(message = "Order must have at least one line")
    @Size(max = 100, message = "Order cannot have more than 100 lines")
    List<@Valid OrderLineRequest> lines,

    @Email(message = "Invalid email format")
    String contactEmail,

    @Pattern(regexp = "^[A-Z]{2}$", message = "Country code must be 2 uppercase letters")
    String countryCode
) { }
```

### Custom Validators

```java
@Constraint(validatedBy = ValidOrderIdValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidOrderId {
    String message() default "Invalid order ID format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class ValidOrderIdValidator implements ConstraintValidator<ValidOrderId, String> {
    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("^ORD-[A-Z0-9]{8}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true; // Use @NotNull for null checks
        return ORDER_ID_PATTERN.matcher(value).matches();
    }
}
```

## Persistence

### Entity Design

```java
@Entity
@Table(name = "orders")
public class OrderJpaEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private List<OrderLineJpaEntity> lines = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    // Domain entity conversion
    public Order toDomain() {
        return Order.reconstitute(
            OrderId.of(id),
            CustomerId.of(customerId),
            status,
            lines.stream().map(OrderLineJpaEntity::toDomain).toList(),
            createdAt
        );
    }

    public static OrderJpaEntity fromDomain(Order order) {
        OrderJpaEntity entity = new OrderJpaEntity();
        entity.id = order.getId().value();
        entity.customerId = order.getCustomerId().value();
        entity.status = order.getStatus();
        entity.lines = order.getLines().stream()
            .map(OrderLineJpaEntity::fromDomain)
            .toList();
        entity.createdAt = order.getCreatedAt();
        entity.updatedAt = Instant.now();
        return entity;
    }
}
```

### Repository Pattern

```java
// Domain port (in domain layer)
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    List<Order> findByCustomerId(CustomerId customerId);
    void save(Order order);
    void delete(OrderId id);
}

// JPA Repository (in infrastructure layer)
public interface OrderJpaRepository extends JpaRepository<OrderJpaEntity, String> {
    List<OrderJpaEntity> findByCustomerId(String customerId);
    @Query("SELECT o FROM OrderJpaEntity o WHERE o.status = :status")
    List<OrderJpaEntity> findByStatus(@Param("status") OrderStatus status);
}

// Infrastructure adapter (implements domain port)
@Repository
@RequiredArgsConstructor
public class JpaOrderRepository implements OrderRepository {

    private final OrderJpaRepository jpaRepository;

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.value())
            .map(OrderJpaEntity::toDomain);
    }

    @Override
    public List<Order> findByCustomerId(CustomerId customerId) {
        return jpaRepository.findByCustomerId(customerId.value())
            .stream()
            .map(OrderJpaEntity::toDomain)
            .toList();
    }

    @Override
    @Transactional
    public void save(Order order) {
        jpaRepository.save(OrderJpaEntity.fromDomain(order));
    }

    @Override
    @Transactional
    public void delete(OrderId id) {
        jpaRepository.deleteById(id.value());
    }
}
```

## Object Mapping with MapStruct

```java
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface OrderMapper {

    @Mapping(target = "id", source = "id.value")
    @Mapping(target = "customerId", source = "customerId.value")
    @Mapping(target = "total", source = "total.amount")
    OrderResponse toResponse(Order order);

    @Mapping(target = "id", expression = "java(OrderId.of(entity.getId()))")
    @Mapping(target = "customerId", expression = "java(CustomerId.of(entity.getCustomerId()))")
    Order toDomain(OrderJpaEntity entity);

    @InheritInverseConfiguration
    OrderJpaEntity toEntity(Order order);
}
```

## Slice Tests

### Web Layer Only

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean PlaceOrderUseCase placeOrderUseCase;
    @MockBean GetOrderUseCase getOrderUseCase;
}
```

### Repository Layer Only

```java
@DataJpaTest
class OrderJpaRepositoryTest {
    @Autowired TestEntityManager entityManager;
    @Autowired OrderJpaRepository repository;
}
```

## Security Practices

1. Never store secrets in code or properties files
2. Use environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
3. Enable HTTPS in production
4. Validate and sanitize all input
5. Use parameterized queries (JPA handles this)
6. Implement proper CORS configuration
7. Use Spring Security for authentication/authorization
8. Set security headers (CSP, X-Frame-Options, X-Content-Type-Options)
9. Implement rate limiting for public APIs
10. Use JWT with proper expiration and refresh tokens

## Application Properties Best Practices

```yaml
# application.yml
spring:
  application:
    name: order-service

  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}

  jpa:
    hibernate:
      ddl-auto: validate  # Never use create/update in production
    open-in-view: false   # Disable OSIV

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

server:
  shutdown: graceful
  tomcat:
    connection-timeout: 5s
    max-connections: 10000
    threads:
      max: 200
      min-spare: 10
```
