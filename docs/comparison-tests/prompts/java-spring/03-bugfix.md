# Java Spring Test 3: Bugfix (NullPointerException)

## Prompt

```
Fix this bug: The service throws NullPointerException when user has no orders.

@Service
public class OrderSummaryService {

    public OrderSummary getUserOrderSummary(User user) {
        List<Order> orders = user.getOrders();

        double totalSpent = orders.stream()
            .mapToDouble(Order::getTotal)
            .sum();

        Order lastOrder = orders.get(orders.size() - 1);

        return new OrderSummary(
            orders.size(),
            totalSpent,
            lastOrder.getDate()
        );
    }
}

Write tests that prove the bug exists and is fixed.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Test first | Failing test demonstrates the bug |
| Null checks | Handles null orders list |
| Empty checks | Handles empty orders list |
| Optional | Uses Optional for lastOrder |
| Minimal change | Doesn't over-engineer |
| Edge cases | null user, null orders, empty orders, single order |

## Output File

- Without MCP: `results-without-mcp/java-spring/test-3-result.java`
- With MCP: `results-with-mcp/java-spring/test-3-result.java`
