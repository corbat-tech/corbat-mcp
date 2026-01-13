# TypeScript Test 4: Refactor

## Prompt

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

Preserve behavior. Include tests.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Types | Full TypeScript interfaces |
| Extraction | Helper functions for validation, calculation |
| Early returns | Clear error handling flow |
| Modern syntax | for...of, reduce, template literals |
| Dependency injection | Interfaces for dependencies |
| Testability | Mock factories for dependencies |
| Tests | All error scenarios + happy path |

## Output File

- Without MCP: `results-without-mcp/typescript/test-4-result.ts`
- With MCP: `results-with-mcp/typescript/test-4-result.ts`
