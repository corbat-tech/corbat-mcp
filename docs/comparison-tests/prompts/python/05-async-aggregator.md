# Python Test 5: Async Data Aggregator with Rate Limiting

## Prompt

```
Create a DataAggregator in Python that fetches data from multiple APIs concurrently with rate limiting.

Requirements:
- Fetch data from multiple endpoints concurrently (asyncio)
- Rate limiting: max 10 requests per second across all endpoints
- Retry failed requests with exponential backoff (max 3 attempts)
- Timeout per request: 5 seconds
- Circuit breaker: if endpoint fails 5 times in a row, skip it for 30 seconds
- Aggregate results: combine successful responses, track failures
- Progress callback: report progress as requests complete

Interface:
```python
class DataAggregator:
    async def fetch_all(
        self,
        endpoints: list[str],
        on_progress: Callable[[int, int], None] | None = None
    ) -> AggregatedResult

@dataclass
class AggregatedResult:
    successful: dict[str, Any]  # endpoint -> data
    failed: dict[str, str]      # endpoint -> error message
    duration_seconds: float
    requests_made: int
    retries: int
```

Include tests:
- All endpoints succeed
- Some endpoints fail (partial success)
- Rate limiting is respected (measure timing)
- Retry logic works
- Circuit breaker activates and recovers
- Timeout handling
- Progress callback is called correctly
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Async/await | Proper asyncio usage, gather/TaskGroup |
| Rate limiting | Token bucket or sliding window |
| Circuit breaker | State tracking, recovery logic |
| Retry logic | Exponential backoff implementation |
| Error handling | Specific exception types, no bare except |
| Dataclasses | Proper use of @dataclass, type hints |
| Testing | pytest-asyncio, mock aiohttp |
| Protocols | Abstract interfaces for dependencies |

## Output File

- Without MCP: `results-without-mcp/python/test-5-result.py`
- With MCP: `results-with-mcp/python/test-5-result.py`
