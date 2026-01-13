# TypeScript Test 2: CRUD Feature

## Prompt

```
Create a ProductService with full CRUD operations in TypeScript.

Requirements:
- Products have: id, name, price, stock
- Price must be positive (> 0)
- Stock cannot be negative (>= 0)
- Include validation errors

Include tests for all operations and validations.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| DTOs | Separate CreateProductInput, UpdateProductInput |
| Validation | Custom ValidationError class |
| Repository | CRUD operations abstracted |
| Tests | Happy path + edge cases + validation errors |
| Types | Readonly where appropriate |
| Null safety | Explicit null vs undefined handling |

## Output File

- Without MCP: `results-without-mcp/typescript/test-2-result.ts`
- With MCP: `results-with-mcp/typescript/test-2-result.ts`
