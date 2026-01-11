# Hexagonal Architecture (Ports & Adapters)

## Overview

Hexagonal Architecture, also known as Ports & Adapters, isolates the core business logic from external concerns. The application core is at the center, surrounded by ports (interfaces) and adapters (implementations).

## Structure

```
src/
├── domain/           # Core business logic (innermost)
│   ├── entities/     # Business entities
│   ├── value-objects/# Immutable value objects
│   ├── events/       # Domain events
│   └── ports/        # Interfaces (input & output)
├── application/      # Use cases (middle layer)
│   ├── use-cases/    # Application use cases
│   └── services/     # Application services
└── infrastructure/   # External adapters (outermost)
    └── adapters/
        ├── primary/  # Driving adapters (controllers, CLI)
        └── secondary/# Driven adapters (DB, APIs)
```

## Layer Rules

### Domain Layer
- **NO external dependencies** (no frameworks, no libraries except language stdlib)
- Contains pure business logic
- Defines ports (interfaces) that the outside world must implement
- Entities must have identity and lifecycle
- Value Objects must be immutable

### Application Layer
- Orchestrates domain objects
- Implements use cases
- **Depends only on domain**
- No direct infrastructure dependencies
- Transaction boundaries defined here

### Infrastructure Layer
- Implements domain ports
- Contains framework-specific code
- Can depend on domain and application
- Adapters translate between external world and domain

## Dependency Rule

```
Infrastructure → Application → Domain
     ↓               ↓           ↓
  (outer)        (middle)    (inner)
```

**Dependencies always point inward.** Inner layers never know about outer layers.

## Port Types

### Input Ports (Driving)
Interfaces that define what the application **offers**:
```java
public interface CreateOrderUseCase {
    OrderId execute(CreateOrderCommand command);
}
```

### Output Ports (Driven)
Interfaces that define what the application **needs**:
```java
public interface OrderRepository {
    Order findById(OrderId id);
    void save(Order order);
}
```

## Adapter Types

### Primary Adapters (Driving)
Drive the application:
- REST Controllers
- GraphQL Resolvers
- CLI Commands
- Message Consumers

### Secondary Adapters (Driven)
Driven by the application:
- Database Repositories
- External API Clients
- Message Publishers
- File System Access

## Benefits

1. **Testability**: Domain can be tested without infrastructure
2. **Flexibility**: Easy to swap adapters (change DB, API, etc.)
3. **Focus**: Business logic is isolated and clear
4. **Independence**: Framework changes don't affect domain
