# Python Test 1: Create a Service

## Prompt

```
Create a UserService in Python that can:
- Create users with name and email
- Get users by ID
- List all users

Use dataclasses for models and an in-memory repository.
Include tests with pytest.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Type hints | Full type annotations |
| Dataclasses | @dataclass for User model |
| Repository pattern | Separate UserRepository class |
| Validation | Email format, required fields |
| Exceptions | Custom UserNotFoundError, ValidationError |
| Testing | pytest with fixtures |
| SOLID | Interface/Protocol for repository |

## Output File

- Without MCP: `results-without-mcp/python/test-1-result.py`
- With MCP: `results-with-mcp/python/test-1-result.py`
