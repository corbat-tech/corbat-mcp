# TypeScript Test 5: Event-Driven Order Processing

## Prompt

```
Create an OrderProcessor in TypeScript that handles orders through an event-driven architecture.

Requirements:
- OrderProcessor emits events: 'order.created', 'order.validated', 'order.paid', 'order.shipped', 'order.completed', 'order.failed'
- Each step can fail and should emit 'order.failed' with reason
- Implement retry logic for payment (max 3 attempts with exponential backoff)
- Support event listeners that can be added/removed
- Maintain order state machine: CREATED → VALIDATED → PAID → SHIPPED → COMPLETED (or FAILED at any step)
- Include compensation logic: if shipping fails after payment, trigger refund event

Interface:
- process(order: Order): Promise<OrderResult>
- on(event: string, handler: Function): void
- off(event: string, handler: Function): void
- getOrderState(orderId: string): OrderState

Include comprehensive tests covering:
- Happy path (all steps succeed)
- Payment retry scenarios
- Failure at each step
- Compensation/rollback
- Event listener management
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Event system | Typed events, proper EventEmitter pattern |
| State machine | Valid transitions only, state persistence |
| Retry logic | Exponential backoff, max attempts |
| Compensation | Saga pattern, rollback on failure |
| Async handling | Proper Promise/async-await usage |
| Error types | Specific errors for each failure mode |
| Testing | Async tests, event spy/mock |
| SOLID | Single responsibility per handler |

## Output File

- Without MCP: `results-without-mcp/typescript/test-5-result.ts`
- With MCP: `results-with-mcp/typescript/test-5-result.ts`
