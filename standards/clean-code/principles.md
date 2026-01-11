# Clean Code Principles

## Overview

Clean code is code that is easy to read, understand, and maintain. These principles, largely from Robert C. Martin, guide the creation of high-quality code.

## Core Principles

### 1. Meaningful Names

Names should reveal intent:

```java
// Bad
int d; // elapsed time in days

// Good
int elapsedTimeInDays;
```

**Rules:**
- Use intention-revealing names
- Avoid disinformation
- Make meaningful distinctions
- Use pronounceable names
- Use searchable names
- Avoid encodings (Hungarian notation)

### 2. Functions

Functions should be small and do one thing:

```java
// Bad
public void processOrder(Order order) {
    validateOrder(order);
    calculateTotals(order);
    applyDiscounts(order);
    saveOrder(order);
    sendConfirmationEmail(order);
    updateInventory(order);
    notifyWarehouse(order);
}

// Good
public void processOrder(Order order) {
    Order validatedOrder = validateOrder(order);
    Order pricedOrder = applyPricing(validatedOrder);
    placeOrder(pricedOrder);
}

private void placeOrder(Order order) {
    orderRepository.save(order);
    eventPublisher.publish(new OrderPlaced(order));
}
```

**Rules:**
- Small (max 20 lines)
- Do one thing
- One level of abstraction
- Max 3-4 parameters
- No side effects
- Command-Query Separation

### 3. Comments

Good code is self-documenting. Comments should explain "why", not "what":

```java
// Bad - explains what (obvious from code)
// increment counter by one
counter++;

// Good - explains why
// We retry 3 times because the external service has transient failures
private static final int MAX_RETRIES = 3;
```

**When to comment:**
- Legal/license headers
- Explanation of intent
- Clarification of obscure code
- Warning of consequences
- TODO (sparingly)
- Public API documentation

### 4. Formatting

Consistent formatting improves readability:

- **Vertical**: Related code together, separate concepts with blank lines
- **Horizontal**: Max 120 characters per line
- **Indentation**: Consistent (2 or 4 spaces)

### 5. Error Handling

Exceptions over error codes:

```java
// Bad
public int withdraw(Money amount) {
    if (balance.lessThan(amount)) {
        return -1;  // Error code
    }
    balance = balance.subtract(amount);
    return 0;
}

// Good
public void withdraw(Money amount) {
    if (balance.lessThan(amount)) {
        throw new InsufficientFundsException(balance, amount);
    }
    balance = balance.subtract(amount);
}
```

**Rules:**
- Use exceptions, not error codes
- Create informative error messages
- Define exception classes by caller's needs
- Don't return null
- Don't pass null

### 6. Classes

Classes should be small and focused:

```java
// Bad - multiple responsibilities
public class UserService {
    public void createUser() { }
    public void sendEmail() { }
    public void generateReport() { }
    public void validatePayment() { }
}

// Good - single responsibility
public class UserRegistrationService {
    public void register(UserRegistrationCommand command) { }
}
```

**Rules:**
- Small (max 200 lines)
- Single Responsibility Principle
- High cohesion
- Low coupling

## SOLID Principles

### S - Single Responsibility
A class should have only one reason to change.

### O - Open/Closed
Open for extension, closed for modification.

### L - Liskov Substitution
Subtypes must be substitutable for their base types.

### I - Interface Segregation
Many specific interfaces are better than one general interface.

### D - Dependency Inversion
Depend on abstractions, not concretions.

## Code Smells to Avoid

1. **Long Method**: Methods over 20 lines
2. **Large Class**: Classes over 200 lines
3. **Long Parameter List**: More than 4 parameters
4. **Duplicate Code**: Same code in multiple places
5. **Dead Code**: Unused code
6. **Speculative Generality**: Code for "future" needs
7. **Feature Envy**: Method uses another class's data more than its own
8. **Data Clumps**: Same data groups appearing together
9. **Primitive Obsession**: Using primitives instead of small objects
10. **Switch Statements**: Often indicate missing polymorphism
