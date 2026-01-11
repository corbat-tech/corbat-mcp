# Domain-Driven Design (DDD)

## Overview

Domain-Driven Design is an approach to software development that centers the development on the core business domain. It provides tactical and strategic patterns for modeling complex domains.

## Tactical Patterns

### Entities

Objects with a unique identity that persists over time:

```java
public class Order {
    private final OrderId id;  // Unique identity
    private OrderStatus status;
    private List<OrderLine> lines;

    // Identity-based equality
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order order)) return false;
        return id.equals(order.id);
    }
}
```

**Rules:**
- Must have a unique identifier
- Equality based on identity, not attributes
- Can change state over time
- Protect invariants

### Value Objects

Immutable objects defined by their attributes:

```java
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
        Objects.requireNonNull(currency);
    }

    public Money add(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Cannot add different currencies");
        }
        return new Money(amount.add(other.amount), currency);
    }
}
```

**Rules:**
- Immutable (use Java records when possible)
- Equality based on all attributes
- Self-validating
- No identity

### Aggregates

A cluster of entities and value objects with a root entity:

```java
public class Order {  // Aggregate Root
    private final OrderId id;
    private final CustomerId customerId;
    private List<OrderLine> lines;  // Part of aggregate
    private OrderStatus status;

    public void addLine(Product product, int quantity) {
        // Invariant protection
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify confirmed order");
        }
        lines.add(new OrderLine(product.getId(), quantity, product.getPrice()));
    }
}
```

**Rules:**
- Access only through the root
- Root enforces invariants
- Transactional consistency boundary
- Reference other aggregates by ID only

### Domain Events

Record of something that happened in the domain:

```java
public record OrderPlaced(
    OrderId orderId,
    CustomerId customerId,
    Money totalAmount,
    Instant occurredAt
) implements DomainEvent {
    public OrderPlaced {
        Objects.requireNonNull(orderId);
        Objects.requireNonNull(customerId);
        Objects.requireNonNull(totalAmount);
        occurredAt = occurredAt != null ? occurredAt : Instant.now();
    }
}
```

**Rules:**
- Immutable
- Named in past tense
- Contain all relevant data
- Published after state change

### Repositories

Collection-like interface for aggregate persistence:

```java
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
    void delete(Order order);
    List<Order> findByCustomerId(CustomerId customerId);
}
```

**Rules:**
- One repository per aggregate
- Interface in domain, implementation in infrastructure
- Return domain objects, not DTOs

### Domain Services

Stateless operations that don't belong to entities:

```java
public class PricingService {
    public Money calculateDiscount(Order order, Customer customer) {
        // Complex calculation involving multiple aggregates
    }
}
```

**Rules:**
- Stateless
- Named after domain operations
- Use when logic doesn't fit in entities

## Strategic Patterns

### Bounded Contexts

Explicit boundaries where a domain model is defined and applicable:
- Each context has its own ubiquitous language
- Models can differ between contexts
- Define clear interfaces between contexts

### Ubiquitous Language

A shared language between developers and domain experts:
- Use domain terms in code
- Class names = domain concepts
- Method names = domain operations
- Avoid technical jargon in domain layer

## Anti-Patterns to Avoid

1. **Anemic Domain Model**: Entities with only getters/setters, logic in services
2. **God Aggregate**: Too large aggregates with too many entities
3. **Aggregate Reference by Object**: Referencing other aggregates by object instead of ID
4. **Repository in Entity**: Entities accessing repositories directly
