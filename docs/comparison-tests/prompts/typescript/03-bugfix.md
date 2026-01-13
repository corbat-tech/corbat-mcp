# TypeScript Test 3: Bugfix

## Prompt

```
Fix this bug: calculateTotal returns NaN when the cart is empty.

function calculateTotal(cart) {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
}

Write tests that prove the bug exists and is fixed.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Test first | Failing test before fix |
| Root cause | Identifies division by zero AND incorrect logic |
| Minimal change | Doesn't over-engineer the fix |
| Types | Adds TypeScript types |
| Edge cases | Empty cart, single item, multiple items, zero quantity |
| Documentation | Explains what was wrong |

## Output File

- Without MCP: `results-without-mcp/typescript/test-3-result.ts`
- With MCP: `results-with-mcp/typescript/test-3-result.ts`
