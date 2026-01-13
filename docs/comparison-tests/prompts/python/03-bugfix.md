# Python Test 3: Bugfix (TypeError)

## Prompt

```
Fix this bug: The function raises TypeError when processing empty data.

def calculate_statistics(data):
    total = sum(data)
    average = total / len(data)
    maximum = max(data)
    minimum = min(data)

    return {
        "total": total,
        "average": average,
        "max": maximum,
        "min": minimum,
        "count": len(data)
    }

Write tests that prove the bug exists and is fixed.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Test first | Failing test for empty list |
| Root cause | Division by zero, max/min on empty |
| Guard clause | Early return or exception for empty |
| Type hints | Add proper type annotations |
| Edge cases | Empty, single item, negative numbers |
| Documentation | Docstring explaining behavior |

## Output File

- Without MCP: `results-without-mcp/python/test-3-result.py`
- With MCP: `results-with-mcp/python/test-3-result.py`
