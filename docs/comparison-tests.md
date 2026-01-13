# CORBAT MCP - Comparison Tests

This document compares AI-generated code **with** and **without** Corbat MCP to demonstrate the value of automated coding standards injection.

---

## Methodology

### Setup

**Without MCP:**
```bash
claude mcp remove corbat
# Start new conversation
```

**With MCP:**
```bash
claude mcp add corbat -- npx -y @corbat-tech/coding-standards-mcp
# Start new conversation
```

### Evaluation Criteria

Each test is evaluated on a scale of 1-5:

| Score | Meaning |
|-------|---------|
| 1 | Not present / Poor |
| 2 | Minimal / Basic |
| 3 | Acceptable |
| 4 | Good |
| 5 | Excellent / Best practices |

---

## Test 1: Create a Service (Basic)

### Prompt
```
Create a UserService in TypeScript that can create users and get users by ID.
Use an in-memory repository.
```

### Evaluation Criteria

| Criteria | Without MCP | With MCP | Notes |
|----------|:-----------:|:--------:|-------|
| **TDD** - Tests written first | | | |
| **Architecture** - Separation of concerns | | | |
| **Interfaces** - Repository abstraction | | | |
| **Validation** - Input validation | | | |
| **Error handling** - Domain errors | | | |
| **Naming** - Consistent conventions | | | |
| **SOLID** - Single responsibility | | | |
| **Total** | /35 | /35 | |

### Results Without MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Results With MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Analysis

> [Analysis will be added after tests]

---

## Test 2: CRUD with Validation (Feature)

### Prompt
```
Create a ProductService with CRUD operations. Products have name, price, and stock.
Price must be positive and stock cannot be negative.
```

### Evaluation Criteria

| Criteria | Without MCP | With MCP | Notes |
|----------|:-----------:|:--------:|-------|
| **TDD** - Tests written first | | | |
| **Value Objects** - Price, Stock as VOs | | | |
| **Domain errors** - Custom exceptions | | | |
| **Validation** - Business rules enforced | | | |
| **Architecture** - Hexagonal/Clean | | | |
| **Repository pattern** - Abstraction | | | |
| **SOLID** - All principles | | | |
| **Total** | /35 | /35 | |

### Results Without MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Results With MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Analysis

> [Analysis will be added after tests]

---

## Test 3: Fix a Bug (Bugfix)

### Prompt
```
Fix: the calculateTotal function returns NaN when the cart is empty.

function calculateTotal(cart) {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
}
```

### Evaluation Criteria

| Criteria | Without MCP | With MCP | Notes |
|----------|:-----------:|:--------:|-------|
| **Test first** - Reproduces bug in test | | | |
| **Minimal changes** - No over-engineering | | | |
| **Root cause** - Identifies division by zero | | | |
| **Edge cases** - Considers other scenarios | | | |
| **No refactoring** - Stays focused | | | |
| **Total** | /25 | /25 | |

### Results Without MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Results With MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Analysis

> [Analysis will be added after tests]

---

## Test 4: Refactor Code (Refactor)

### Prompt
```
Refactor this function to be more readable and testable:

function processOrder(order, user, inventory, paymentGateway, emailService) {
  if (!order || !user) return { success: false, error: 'Invalid input' };
  if (order.items.length === 0) return { success: false, error: 'Empty cart' };
  let total = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if (inventory.check(item.id) < item.qty) return { success: false, error: 'Out of stock: ' + item.name };
    total += item.price * item.qty;
  }
  if (user.balance < total) return { success: false, error: 'Insufficient funds' };
  const payment = paymentGateway.charge(user.id, total);
  if (!payment.success) return { success: false, error: 'Payment failed' };
  for (let i = 0; i < order.items.length; i++) {
    inventory.decrease(order.items[i].id, order.items[i].qty);
  }
  emailService.send(user.email, 'Order confirmed', 'Your order #' + order.id + ' is confirmed.');
  return { success: true, orderId: order.id, total: total };
}
```

### Evaluation Criteria

| Criteria | Without MCP | With MCP | Notes |
|----------|:-----------:|:--------:|-------|
| **Tests first** - Tests before refactoring | | | |
| **Incremental** - Small steps | | | |
| **SRP** - Single responsibility | | | |
| **Extract methods** - Readable units | | | |
| **Early returns** - Guard clauses | | | |
| **Behavior preserved** - Same functionality | | | |
| **Total** | /30 | /30 | |

### Results Without MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Results With MCP

<details>
<summary>Click to expand code</summary>

```typescript
// Paste result here
```

</details>

### Analysis

> [Analysis will be added after tests]

---

## Summary

### Overall Scores

| Test | Without MCP | With MCP | Improvement |
|------|:-----------:|:--------:|:-----------:|
| Test 1: Create Service | /35 | /35 | |
| Test 2: CRUD Feature | /35 | /35 | |
| Test 3: Bugfix | /25 | /25 | |
| Test 4: Refactor | /30 | /30 | |
| **TOTAL** | **/125** | **/125** | |

### Key Findings

> [Will be completed after analysis]

### Conclusion

> [Will be completed after analysis]

---

## How to Reproduce

1. Install Corbat MCP:
   ```bash
   claude mcp add corbat -- npx -y @corbat-tech/coding-standards-mcp
   ```

2. Run each test prompt in a fresh conversation

3. Compare results using the criteria above

---

*Tests conducted on: [DATE]*
*Claude version: [VERSION]*
*Corbat MCP version: 1.0.2*
