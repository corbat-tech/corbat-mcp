# Naming Conventions

## Overview

Consistent naming is crucial for code readability. These conventions apply to Java/Kotlin development but principles extend to other languages.

## General Rules

1. **Be descriptive**: Names should reveal intent
2. **Be consistent**: Same concept = same name throughout codebase
3. **Be searchable**: Avoid single-letter names except for loops
4. **Avoid abbreviations**: Use `customerId` not `custId`
5. **Use domain language**: Names from the ubiquitous language

## Case Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase | `OrderService` |
| Interface | PascalCase | `OrderRepository` |
| Method | camelCase | `calculateTotal()` |
| Variable | camelCase | `orderTotal` |
| Constant | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Package | lowercase.separated | `com.company.domain` |
| Enum | PascalCase | `OrderStatus` |
| Enum Value | SCREAMING_SNAKE_CASE | `PENDING_PAYMENT` |

## Class Naming

### Entities
Name after the domain concept:
```java
Order, Customer, Product, Invoice
```

### Value Objects
Name after what they represent:
```java
Money, Email, PhoneNumber, Address, OrderId
```

### Services
`[Domain][Action]Service`:
```java
OrderPlacementService, PaymentProcessingService
```

### Repositories
`[Aggregate]Repository`:
```java
OrderRepository, CustomerRepository
```

### Controllers
`[Resource]Controller`:
```java
OrderController, CustomerController
```

### Use Cases
`[Action][Subject]UseCase`:
```java
PlaceOrderUseCase, CancelOrderUseCase, GetCustomerUseCase
```

### DTOs
`[Purpose][Subject]Dto` or `[Subject][Purpose]`:
```java
CreateOrderRequest, OrderResponse, CustomerDto
```

### Exceptions
`[Problem]Exception`:
```java
OrderNotFoundException, InsufficientFundsException
```

## Method Naming

### Query Methods (return data, no side effects)
```java
findById(), getCustomer(), calculateTotal()
findAllByStatus(), existsById(), countByType()
```

### Command Methods (perform actions)
```java
save(), delete(), process(), execute()
placeOrder(), cancelSubscription(), sendNotification()
```

### Boolean Methods
Use `is`, `has`, `can`, `should`:
```java
isValid(), hasPermission(), canExecute(), shouldRetry()
isEmpty(), isEnabled(), hasItems()
```

### Factory Methods
```java
of(), from(), create(), valueOf()
Money.of(100, "USD")
Order.from(orderDto)
```

## Variable Naming

### Collections
Use plural nouns:
```java
List<Order> orders;
Set<Customer> customers;
Map<OrderId, Order> ordersById;
```

### Booleans
Use affirmative names:
```java
boolean isActive;    // not: isNotActive
boolean hasAccess;   // not: noAccess
boolean enabled;     // not: disabled
```

### Avoid Noise Words
```java
// Bad
String nameString;
Customer customerObject;
List<Order> orderList;

// Good
String name;
Customer customer;
List<Order> orders;
```

## Test Naming

Use descriptive pattern `should_ExpectedBehavior_When_Condition`:

```java
@Test
void should_ThrowException_When_OrderIsEmpty() { }

@Test
void should_ApplyDiscount_When_CustomerIsPremium() { }

@Test
void should_ReturnEmptyList_When_NoOrdersExist() { }
```

Alternative patterns:
- `givenX_whenY_thenZ`
- `methodName_StateUnderTest_ExpectedBehavior`

## Package Naming

Follow architecture layers:
```
com.company.project.domain.order
com.company.project.domain.customer
com.company.project.application.usecase
com.company.project.infrastructure.persistence
com.company.project.infrastructure.web
```

## Anti-Patterns

### Avoid
- `Manager`, `Handler`, `Processor` (too generic)
- `Utils`, `Helper`, `Common` (often becomes a dumping ground)
- `Data`, `Info` (noise words)
- Hungarian notation (`strName`, `iCount`)
- Single letters (except `i`, `j`, `k` in loops)
- Acronyms unless universal (`HTML`, `URL` are OK)
