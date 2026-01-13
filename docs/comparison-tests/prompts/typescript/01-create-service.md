# TypeScript Test 1: Create a Service

## Prompt

```
Create a UserService in TypeScript that can:
- Create users with name and email
- Get users by ID
- List all users

Use an in-memory repository. Include tests.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| TDD | Tests written alongside or before implementation |
| Architecture | Separation of Service and Repository |
| Interfaces | Repository interface abstraction |
| Types | Explicit types, no `any` |
| Validation | Email format, required fields |
| Error handling | User not found, duplicate email |
| SOLID | Single responsibility per class |

## Output File

- Without MCP: `results-without-mcp/typescript/test-1-result.ts`
- With MCP: `results-with-mcp/typescript/test-1-result.ts`
