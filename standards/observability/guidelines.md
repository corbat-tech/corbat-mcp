# Observability Guidelines

## Overview

Observability is the ability to understand the internal state of a system by examining its external outputs. The three pillars of observability are: **Logs**, **Metrics**, and **Traces**.

## The Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY                              │
├──────────────────┬──────────────────┬──────────────────────────┤
│      LOGS        │     METRICS      │         TRACES           │
│                  │                  │                          │
│  What happened?  │   How much?      │   Where did it go?       │
│                  │   How many?      │   How long did it take?  │
│                  │   How fast?      │                          │
├──────────────────┼──────────────────┼──────────────────────────┤
│  • Errors        │  • Counters      │  • Request flow          │
│  • Events        │  • Gauges        │  • Service dependencies  │
│  • Debug info    │  • Histograms    │  • Latency breakdown     │
│  • Audit trail   │  • Timers        │  • Error propagation     │
└──────────────────┴──────────────────┴──────────────────────────┘
```

## Logging

### Framework: SLF4J + Logback

Always use SLF4J as the logging facade:

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    // Or with Lombok
    // @Slf4j on the class
}
```

### Structured Logging (JSON Format)

Configure Logback for JSON output in production:

```xml
<!-- logback-spring.xml -->
<configuration>
    <springProfile name="production">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>spanId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
                <includeMdcKeyName>requestId</includeMdcKeyName>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>

    <springProfile name="!production">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Unexpected failures requiring attention | Database connection failed, unhandled exception |
| WARN | Potential issues, recoverable errors | Retry attempt, deprecated API usage |
| INFO | Business events, state changes | Order created, payment received |
| DEBUG | Detailed flow information | Method entry/exit, variable values |
| TRACE | Very detailed debugging | Loop iterations, SQL queries |

### Logging Best Practices

```java
@Service
@Slf4j
public class PlaceOrderUseCase {

    public OrderId execute(PlaceOrderCommand command) {
        // Good: Include relevant context
        log.info("Creating order for customer {}", command.customerId());

        try {
            Order order = Order.create(command);
            orderRepository.save(order);

            // Good: Log business events at INFO level
            log.info("Order {} created successfully with {} items",
                order.getId(), order.getLines().size());

            return order.getId();
        } catch (InsufficientStockException e) {
            // Good: Log exception with context
            log.warn("Failed to create order: insufficient stock for product {}",
                e.getProductId());
            throw e;
        } catch (Exception e) {
            // Good: Log unexpected errors at ERROR level
            log.error("Unexpected error creating order for customer {}",
                command.customerId(), e);
            throw e;
        }
    }
}
```

### What NOT to Log

```java
// BAD - Never log sensitive data
log.info("User logged in with password: {}", password);
log.debug("Credit card number: {}", cardNumber);
log.info("API key used: {}", apiKey);

// BAD - Don't use System.out
System.out.println("Order created");

// BAD - Don't use printStackTrace
catch (Exception e) {
    e.printStackTrace();  // Use log.error instead
}

// BAD - Don't log in tight loops
for (Item item : items) {
    log.debug("Processing item {}", item.getId()); // Too verbose
}

// GOOD - Log summary instead
log.debug("Processing {} items", items.size());
```

### MDC (Mapped Diagnostic Context)

Use MDC to add context to all log messages:

```java
@Component
public class CorrelationIdFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        String correlationId = ((HttpServletRequest) request)
            .getHeader("X-Correlation-ID");

        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }

        try {
            MDC.put("correlationId", correlationId);
            MDC.put("requestId", UUID.randomUUID().toString());
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

## Metrics

### Framework: Micrometer

Micrometer provides a vendor-neutral metrics facade.

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Metric Types

| Type | Purpose | Example |
|------|---------|---------|
| Counter | Counts occurrences | `orders.created.total` |
| Gauge | Current value | `orders.pending.count` |
| Timer | Measures duration | `order.processing.time` |
| Distribution Summary | Measures distribution | `order.total.amount` |

### Custom Metrics

```java
@Service
@RequiredArgsConstructor
public class OrderMetrics {

    private final MeterRegistry meterRegistry;

    private Counter ordersCreated;
    private Counter ordersFailed;
    private Timer orderProcessingTime;
    private AtomicInteger pendingOrders;

    @PostConstruct
    public void init() {
        ordersCreated = Counter.builder("orders.created.total")
            .description("Total number of orders created")
            .tag("service", "order-service")
            .register(meterRegistry);

        ordersFailed = Counter.builder("orders.failed.total")
            .description("Total number of failed orders")
            .tag("service", "order-service")
            .register(meterRegistry);

        orderProcessingTime = Timer.builder("order.processing.time")
            .description("Time to process an order")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);

        pendingOrders = meterRegistry.gauge("orders.pending.count",
            new AtomicInteger(0));
    }

    public void recordOrderCreated() {
        ordersCreated.increment();
    }

    public void recordOrderFailed(String reason) {
        ordersFailed.increment();
        Counter.builder("orders.failed.total")
            .tag("reason", reason)
            .register(meterRegistry)
            .increment();
    }

    public Timer.Sample startTimer() {
        return Timer.start(meterRegistry);
    }

    public void stopTimer(Timer.Sample sample) {
        sample.stop(orderProcessingTime);
    }

    public void setPendingOrdersCount(int count) {
        pendingOrders.set(count);
    }
}
```

### Using Metrics in Services

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PlaceOrderUseCase {

    private final OrderRepository orderRepository;
    private final OrderMetrics orderMetrics;

    public OrderId execute(PlaceOrderCommand command) {
        Timer.Sample timer = orderMetrics.startTimer();

        try {
            Order order = Order.create(command);
            orderRepository.save(order);

            orderMetrics.recordOrderCreated();
            log.info("Order {} created", order.getId());

            return order.getId();
        } catch (Exception e) {
            orderMetrics.recordOrderFailed(e.getClass().getSimpleName());
            throw e;
        } finally {
            orderMetrics.stopTimer(timer);
        }
    }
}
```

### Metrics with Annotations

```java
@Service
public class PaymentService {

    @Timed(value = "payment.processing.time", description = "Time to process payment")
    @Counted(value = "payment.attempts.total", description = "Payment attempts")
    public PaymentResult processPayment(PaymentRequest request) {
        // ...
    }
}
```

### Prometheus Endpoint

Configure the Prometheus endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${ENVIRONMENT:local}
```

### Common Metrics to Track

```java
// Business metrics
- orders.created.total
- orders.completed.total
- orders.cancelled.total
- orders.amount.total (sum)
- payments.received.total
- payments.failed.total

// Technical metrics
- http.server.requests (auto by Spring)
- jvm.memory.used
- jvm.gc.pause
- db.pool.active.connections
- kafka.consumer.lag

// SLI (Service Level Indicators)
- request.latency.p99
- error.rate
- availability
```

## Distributed Tracing

### Framework: Micrometer Tracing (formerly Spring Cloud Sleuth)

### Dependencies

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

### Configuration

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # 100% sampling in dev, reduce in production
  zipkin:
    tracing:
      endpoint: ${ZIPKIN_ENDPOINT:http://localhost:9411/api/v2/spans}
```

### Trace Propagation

W3C Trace Context is the default propagation format:

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

### Custom Spans

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final Tracer tracer;

    public Order processOrder(OrderRequest request) {
        // Create a custom span
        Span span = tracer.nextSpan().name("process-order");

        try (Tracer.SpanInScope ws = tracer.withSpan(span.start())) {
            // Add attributes to the span
            span.tag("orderId", request.orderId());
            span.tag("customerId", request.customerId());

            Order order = validateOrder(request);
            processPayment(order);
            notifyWarehouse(order);

            span.event("order-processed");
            return order;
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Observation API (Spring 6+)

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final ObservationRegistry observationRegistry;

    public Order processOrder(OrderRequest request) {
        return Observation.createNotStarted("order.processing", observationRegistry)
            .lowCardinalityKeyValue("orderType", request.type())
            .highCardinalityKeyValue("orderId", request.orderId())
            .observe(() -> {
                // Business logic here
                return doProcessOrder(request);
            });
    }
}
```

### Trace Context in Logs

Enable trace context in logs:

```xml
<!-- logback-spring.xml -->
<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%X{traceId:-},%X{spanId:-}] %-5level %logger{36} - %msg%n</pattern>
```

## Health Checks

### Actuator Health Endpoints

```yaml
management:
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true  # Kubernetes probes
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

### Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/actuator/health` | Overall health | General health status |
| `/actuator/health/liveness` | Is the app running? | Kubernetes liveness probe |
| `/actuator/health/readiness` | Can the app handle traffic? | Kubernetes readiness probe |

### Custom Health Indicators

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                    .withDetail("database", "PostgreSQL")
                    .withDetail("connection", "valid")
                    .build();
            }
        } catch (SQLException e) {
            return Health.down()
                .withException(e)
                .build();
        }
        return Health.down().build();
    }
}

@Component
public class KafkaHealthIndicator implements HealthIndicator {

    private final KafkaTemplate<?, ?> kafkaTemplate;

    @Override
    public Health health() {
        try {
            kafkaTemplate.getDefaultTopic(); // Check connection
            return Health.up()
                .withDetail("kafka", "connected")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}

@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final RestClient restClient;

    @Override
    public Health health() {
        try {
            restClient.get()
                .uri("/health")
                .retrieve()
                .toBodilessEntity();
            return Health.up().build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("api", "external-service")
                .withException(e)
                .build();
        }
    }
}
```

## Application Configuration

### Complete Observability Configuration

```yaml
spring:
  application:
    name: order-service

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
  metrics:
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
    tags:
      application: ${spring.application.name}
      environment: ${ENVIRONMENT:local}
  tracing:
    sampling:
      probability: ${TRACING_SAMPLING_PROBABILITY:1.0}
  zipkin:
    tracing:
      endpoint: ${ZIPKIN_ENDPOINT:http://localhost:9411/api/v2/spans}

logging:
  level:
    root: INFO
    com.example: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} [%X{traceId:-},%X{spanId:-}] %-5level %logger{36} - %msg%n"
```

## Dashboards and Alerting

### Prometheus Alert Rules

```yaml
groups:
  - name: order-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_server_requests_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected (p99 > 1s)

      - alert: LowOrderRate
        expr: rate(orders_created_total[1h]) < 10
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: Low order creation rate
```

### Grafana Dashboard Queries

```promql
# Request rate
rate(http_server_requests_seconds_count[5m])

# Error rate
rate(http_server_requests_seconds_count{status=~"5.."}[5m])
/ rate(http_server_requests_seconds_count[5m])

# Latency p99
histogram_quantile(0.99, rate(http_server_requests_seconds_bucket[5m]))

# Orders created per minute
rate(orders_created_total[1m]) * 60

# Active database connections
hikaricp_connections_active
```

## Best Practices Summary

1. **Logs**: Use structured logging (JSON) with MDC context
2. **Metrics**: Track business and technical metrics with Micrometer
3. **Traces**: Enable distributed tracing for request flow visibility
4. **Correlation**: Include traceId/spanId in all logs
5. **Health**: Implement custom health indicators for dependencies
6. **Alerts**: Set up alerts for SLOs (error rate, latency, availability)
7. **Dashboards**: Create dashboards for key business and technical metrics
8. **Sampling**: Use appropriate sampling rates in production
9. **Avoid noise**: Don't log or trace too verbosely
10. **Security**: Never log sensitive data (passwords, tokens, PII)
