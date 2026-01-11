# Event-Driven Architecture Guidelines

## Overview

Event-driven architecture enables loose coupling between components through asynchronous messaging. This guide covers domain events, event publishing, and messaging patterns for Spring Boot applications.

## Domain Events

Domain events represent something significant that happened in the domain. They are named in the past tense and carry immutable data.

### Event Structure

```java
// Base domain event
public abstract class DomainEvent {
    private final String eventId;
    private final Instant occurredOn;
    private final String aggregateId;
    private final String aggregateType;

    protected DomainEvent(String aggregateId, String aggregateType) {
        this.eventId = UUID.randomUUID().toString();
        this.occurredOn = Instant.now();
        this.aggregateId = aggregateId;
        this.aggregateType = aggregateType;
    }

    // Getters...
}

// Concrete domain event
public class OrderCreatedEvent extends DomainEvent {
    private final String customerId;
    private final BigDecimal totalAmount;
    private final List<OrderLineData> lines;

    public OrderCreatedEvent(
            String orderId,
            String customerId,
            BigDecimal totalAmount,
            List<OrderLineData> lines) {
        super(orderId, "Order");
        this.customerId = customerId;
        this.totalAmount = totalAmount;
        this.lines = List.copyOf(lines);
    }

    // Immutable record for nested data
    public record OrderLineData(
        String productId,
        int quantity,
        BigDecimal unitPrice
    ) {}
}
```

### Event Naming Conventions

| Pattern | Examples |
|---------|----------|
| Past tense | `OrderCreatedEvent`, `PaymentReceivedEvent`, `OrderShippedEvent` |
| Aggregate + Action | `Order` + `Created` = `OrderCreatedEvent` |
| Descriptive | `CustomerEmailVerifiedEvent`, `InventoryReservedEvent` |

### Common Domain Events

```java
// Order domain events
public class OrderCreatedEvent extends DomainEvent { }
public class OrderConfirmedEvent extends DomainEvent { }
public class OrderShippedEvent extends DomainEvent { }
public class OrderCancelledEvent extends DomainEvent { }
public class OrderDeliveredEvent extends DomainEvent { }

// Payment domain events
public class PaymentInitiatedEvent extends DomainEvent { }
public class PaymentReceivedEvent extends DomainEvent { }
public class PaymentFailedEvent extends DomainEvent { }
public class RefundProcessedEvent extends DomainEvent { }

// Customer domain events
public class CustomerRegisteredEvent extends DomainEvent { }
public class CustomerEmailVerifiedEvent extends DomainEvent { }
public class CustomerAddressUpdatedEvent extends DomainEvent { }
```

## Event Publishing

### Domain Event Publisher Interface

Define the interface in the domain layer (port):

```java
// Domain layer - port
public interface DomainEventPublisher {
    void publish(DomainEvent event);
    void publishAll(List<DomainEvent> events);
}
```

### Aggregate Event Collection

Aggregates collect domain events during business operations:

```java
public abstract class AggregateRoot {
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected void registerEvent(DomainEvent event) {
        domainEvents.add(event);
    }

    public List<DomainEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }
}

public class Order extends AggregateRoot {
    private OrderId id;
    private OrderStatus status;

    public static Order create(OrderId id, CustomerId customerId, List<OrderLine> lines) {
        Order order = new Order();
        order.id = id;
        order.customerId = customerId;
        order.lines = new ArrayList<>(lines);
        order.status = OrderStatus.PENDING;
        order.createdAt = Instant.now();

        // Register domain event
        order.registerEvent(new OrderCreatedEvent(
            id.value(),
            customerId.value(),
            order.calculateTotal().amount(),
            lines.stream().map(OrderLine::toEventData).toList()
        ));

        return order;
    }

    public void confirm() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Order can only be confirmed when pending");
        }
        this.status = OrderStatus.CONFIRMED;
        registerEvent(new OrderConfirmedEvent(id.value()));
    }

    public void ship(TrackingNumber trackingNumber) {
        if (status != OrderStatus.CONFIRMED) {
            throw new IllegalStateException("Order must be confirmed before shipping");
        }
        this.status = OrderStatus.SHIPPED;
        this.trackingNumber = trackingNumber;
        registerEvent(new OrderShippedEvent(id.value(), trackingNumber.value()));
    }
}
```

### Use Case Event Publishing

Publish events after the use case completes successfully:

```java
@Service
@RequiredArgsConstructor
@Transactional
public class PlaceOrderUseCase {

    private final OrderRepository orderRepository;
    private final DomainEventPublisher eventPublisher;

    public OrderId execute(PlaceOrderCommand command) {
        // Create the order (events are registered)
        Order order = Order.create(
            OrderId.generate(),
            command.customerId(),
            command.toOrderLines()
        );

        // Persist the order
        orderRepository.save(order);

        // Publish events after successful persistence
        eventPublisher.publishAll(order.getDomainEvents());
        order.clearDomainEvents();

        return order.getId();
    }
}
```

## Messaging with Kafka

### Kafka Event Publisher Implementation

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaDomainEventPublisher implements DomainEventPublisher {

    private final KafkaTemplate<String, DomainEvent> kafkaTemplate;
    private final TopicResolver topicResolver;

    @Override
    public void publish(DomainEvent event) {
        String topic = topicResolver.resolve(event);
        String key = event.getAggregateId();

        kafkaTemplate.send(topic, key, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event {} to topic {}",
                        event.getClass().getSimpleName(), topic, ex);
                } else {
                    log.debug("Published event {} to topic {} partition {}",
                        event.getClass().getSimpleName(), topic,
                        result.getRecordMetadata().partition());
                }
            });
    }

    @Override
    public void publishAll(List<DomainEvent> events) {
        events.forEach(this::publish);
    }
}
```

### Topic Naming Convention

Format: `{domain}.{aggregate}.{event-type}`

```java
@Component
public class TopicResolver {

    public String resolve(DomainEvent event) {
        String aggregateType = event.getAggregateType().toLowerCase();
        String eventType = extractEventType(event.getClass().getSimpleName());
        return String.format("%s.%s.%s", "orders", aggregateType, eventType);
    }

    private String extractEventType(String className) {
        // OrderCreatedEvent -> created
        return className
            .replace("Event", "")
            .replaceAll("([a-z])([A-Z])", "$1-$2")
            .toLowerCase()
            .substring(className.indexOf(className.replaceAll("^[A-Z][a-z]+", "").substring(0, 1)));
    }
}
```

Example topics:
- `orders.order.created`
- `orders.order.confirmed`
- `orders.order.shipped`
- `payments.payment.received`
- `inventory.stock.reserved`

### Kafka Configuration

```java
@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, DomainEvent> producerFactory(KafkaProperties kafkaProperties) {
        Map<String, Object> props = new HashMap<>(kafkaProperties.buildProducerProperties());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, DomainEvent> kafkaTemplate(
            ProducerFactory<String, DomainEvent> producerFactory) {
        KafkaTemplate<String, DomainEvent> template = new KafkaTemplate<>(producerFactory);
        template.setObservationEnabled(true); // Enable tracing
        return template;
    }
}
```

### Application Properties

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      acks: all
      retries: 3
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: ${spring.application.name}
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        isolation.level: read_committed
```

## Event Consumers

### Kafka Listener

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    @KafkaListener(
        topics = "orders.order.created",
        groupId = "notification-service"
    )
    public void onOrderCreated(
            @Payload OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            Acknowledgment ack) {

        log.info("Received OrderCreatedEvent for order {}", event.getAggregateId());

        try {
            // Process the event
            notificationService.sendOrderConfirmation(event);

            // Acknowledge successful processing
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process OrderCreatedEvent", e);
            // Don't acknowledge - message will be redelivered
            throw e;
        }
    }

    @KafkaListener(
        topics = "orders.order.confirmed",
        groupId = "inventory-service"
    )
    public void onOrderConfirmed(OrderConfirmedEvent event, Acknowledgment ack) {
        log.info("Order {} confirmed, reserving inventory", event.getAggregateId());
        inventoryService.reserveInventory(event.getAggregateId());
        ack.acknowledge();
    }
}
```

### Consumer Configuration

```java
@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, DomainEvent> consumerFactory(KafkaProperties kafkaProperties) {
        Map<String, Object> props = new HashMap<>(kafkaProperties.buildConsumerProperties());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.example.domain.event");

        return new DefaultKafkaConsumerFactory<>(
            props,
            new StringDeserializer(),
            new JsonDeserializer<>(DomainEvent.class)
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, DomainEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, DomainEvent> consumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, DomainEvent> factory =
            new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(AckMode.MANUAL);
        factory.getContainerProperties().setObservationEnabled(true);

        return factory;
    }
}
```

## Transactional Outbox Pattern

For guaranteed event delivery, use the Transactional Outbox pattern:

### Outbox Entity

```java
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id
    private String id;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private String aggregateId;

    @Column(nullable = false)
    private String eventType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Instant processedAt;

    // Factory method
    public static OutboxEvent from(DomainEvent event, ObjectMapper objectMapper) {
        OutboxEvent outbox = new OutboxEvent();
        outbox.id = event.getEventId();
        outbox.aggregateType = event.getAggregateType();
        outbox.aggregateId = event.getAggregateId();
        outbox.eventType = event.getClass().getSimpleName();
        outbox.payload = objectMapper.writeValueAsString(event);
        outbox.createdAt = Instant.now();
        return outbox;
    }
}
```

### Outbox Publisher

```java
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher implements DomainEventPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void publish(DomainEvent event) {
        OutboxEvent outboxEvent = OutboxEvent.from(event, objectMapper);
        outboxRepository.save(outboxEvent);
    }
}
```

### Outbox Processor (Scheduled)

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxProcessor {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final TopicResolver topicResolver;

    @Scheduled(fixedDelayString = "${outbox.processing.interval:1000}")
    @Transactional
    public void processOutbox() {
        List<OutboxEvent> events = outboxRepository.findUnprocessed(100);

        for (OutboxEvent event : events) {
            try {
                String topic = topicResolver.resolve(event.getAggregateType(), event.getEventType());
                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload()).get();
                event.markAsProcessed();
                outboxRepository.save(event);
            } catch (Exception e) {
                log.error("Failed to process outbox event {}", event.getId(), e);
            }
        }
    }
}
```

## Best Practices

1. **Events are immutable**: Never modify event data after creation
2. **Events are facts**: Name them in past tense (OrderCreated, not CreateOrder)
3. **Include enough context**: Events should be self-contained for consumers
4. **Version your events**: Plan for schema evolution
5. **Use idempotent consumers**: Handle duplicate deliveries gracefully
6. **Consider ordering**: Use partition keys for ordered delivery when needed
7. **Monitor event processing**: Track lag, errors, and processing time
8. **Handle failures gracefully**: Implement retry and dead letter queues
9. **Test event flows**: Include integration tests for event producers and consumers
10. **Document event schemas**: Maintain an event catalog for discovery

## Event Schema Evolution

When events need to change:

```java
// Version 1
public class OrderCreatedEventV1 extends DomainEvent {
    private String customerId;
    private BigDecimal total;
}

// Version 2 - Add new field with default
public class OrderCreatedEventV2 extends DomainEvent {
    private String customerId;
    private BigDecimal total;
    private String currency = "USD"; // New field with default
}
```

Use schema registry (e.g., Confluent Schema Registry) for production systems.
