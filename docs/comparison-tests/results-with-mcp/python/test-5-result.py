"""
Test PY-5: Async Data Aggregator with Rate Limiting (Advanced)
Create a DataAggregator that fetches data from multiple APIs concurrently:
- Concurrent fetching with asyncio
- Rate limiting: max 10 requests/second
- Retry with exponential backoff (max 3 attempts)
- Timeout per request: 5 seconds
- Circuit breaker: skip endpoint after 5 consecutive failures (recover after 30s)
- Progress callback reporting

Interface:
async def fetch_all(endpoints: list[str], on_progress: Callable | None) -> AggregatedResult

@dataclass
class AggregatedResult:
    successful: dict[str, Any]
    failed: dict[str, str]
    duration_seconds: float

Include tests for: all succeed, partial success, rate limiting timing, retry logic,
circuit breaker, timeout.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Protocol


# ============================================================================
# Types
# ============================================================================

@dataclass
class AggregatedResult:
    """Result of aggregating data from multiple endpoints."""
    successful: dict[str, Any]
    failed: dict[str, str]
    duration_seconds: float

    @property
    def success_count(self) -> int:
        """Number of successful fetches."""
        return len(self.successful)

    @property
    def failure_count(self) -> int:
        """Number of failed fetches."""
        return len(self.failed)

    @property
    def total_count(self) -> int:
        """Total number of endpoints processed."""
        return self.success_count + self.failure_count


@dataclass
class ProgressInfo:
    """Progress information for callbacks."""
    completed: int
    total: int
    endpoint: str
    success: bool
    error: str | None = None


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = auto()
    OPEN = auto()
    HALF_OPEN = auto()


# ============================================================================
# HTTP Client Protocol
# ============================================================================

class HttpClient(Protocol):
    """Protocol for HTTP client."""

    async def get(self, url: str, timeout: float) -> dict[str, Any]:
        """Fetch data from URL."""
        ...


# ============================================================================
# Rate Limiter
# ============================================================================

class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, max_requests: int, time_window: float) -> None:
        self._max_requests = max_requests
        self._time_window = time_window
        self._tokens = max_requests
        self._last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            await self._wait_for_token()
            self._tokens -= 1

    async def _wait_for_token(self) -> None:
        """Wait until a token is available."""
        while self._tokens <= 0:
            self._refill()
            if self._tokens <= 0:
                wait_time = self._time_window / self._max_requests
                await asyncio.sleep(wait_time)
                self._refill()

    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.monotonic()
        elapsed = now - self._last_update
        new_tokens = elapsed * (self._max_requests / self._time_window)
        self._tokens = min(self._max_requests, self._tokens + new_tokens)
        self._last_update = now


# ============================================================================
# Circuit Breaker
# ============================================================================

@dataclass
class CircuitBreaker:
    """Circuit breaker for endpoint protection."""
    failure_threshold: int = 5
    recovery_timeout: float = 30.0

    _failure_counts: dict[str, int] = field(default_factory=dict)
    _open_times: dict[str, float] = field(default_factory=dict)
    _states: dict[str, CircuitState] = field(default_factory=dict)

    def get_state(self, endpoint: str) -> CircuitState:
        """Get circuit state for an endpoint."""
        if endpoint not in self._states:
            return CircuitState.CLOSED

        state = self._states[endpoint]

        if state == CircuitState.OPEN:
            open_time = self._open_times.get(endpoint, 0)
            if time.monotonic() - open_time >= self.recovery_timeout:
                self._states[endpoint] = CircuitState.HALF_OPEN
                return CircuitState.HALF_OPEN

        return state

    def is_open(self, endpoint: str) -> bool:
        """Check if circuit is open (should skip endpoint)."""
        return self.get_state(endpoint) == CircuitState.OPEN

    def record_success(self, endpoint: str) -> None:
        """Record a successful request."""
        self._failure_counts[endpoint] = 0
        self._states[endpoint] = CircuitState.CLOSED

    def record_failure(self, endpoint: str) -> None:
        """Record a failed request."""
        self._failure_counts[endpoint] = self._failure_counts.get(endpoint, 0) + 1

        if self._failure_counts[endpoint] >= self.failure_threshold:
            self._states[endpoint] = CircuitState.OPEN
            self._open_times[endpoint] = time.monotonic()


# ============================================================================
# Retry Logic
# ============================================================================

async def retry_with_backoff(
    func: Callable[[], Any],
    max_attempts: int = 3,
    base_delay: float = 0.1,
) -> Any:
    """
    Retry a function with exponential backoff.

    Args:
        func: Async function to retry
        max_attempts: Maximum number of attempts
        base_delay: Base delay in seconds

    Returns:
        Result of the function

    Raises:
        Last exception if all attempts fail
    """
    last_exception: Exception | None = None

    for attempt in range(max_attempts):
        try:
            return await func()
        except Exception as e:
            last_exception = e
            if attempt < max_attempts - 1:
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)

    raise last_exception  # type: ignore


# ============================================================================
# Data Aggregator
# ============================================================================

class DataAggregator:
    """Fetches and aggregates data from multiple endpoints."""

    DEFAULT_TIMEOUT = 5.0
    DEFAULT_MAX_REQUESTS_PER_SECOND = 10
    DEFAULT_MAX_RETRY_ATTEMPTS = 3

    def __init__(
        self,
        http_client: HttpClient,
        rate_limit: int = DEFAULT_MAX_REQUESTS_PER_SECOND,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRY_ATTEMPTS,
        circuit_breaker: CircuitBreaker | None = None,
    ) -> None:
        self._http_client = http_client
        self._rate_limiter = RateLimiter(rate_limit, 1.0)
        self._timeout = timeout
        self._max_retries = max_retries
        self._circuit_breaker = circuit_breaker or CircuitBreaker()

    async def fetch_all(
        self,
        endpoints: list[str],
        on_progress: Callable[[ProgressInfo], None] | None = None,
    ) -> AggregatedResult:
        """
        Fetch data from all endpoints concurrently.

        Args:
            endpoints: List of endpoint URLs
            on_progress: Optional callback for progress updates

        Returns:
            AggregatedResult with successful and failed fetches
        """
        start_time = time.monotonic()

        successful: dict[str, Any] = {}
        failed: dict[str, str] = {}
        completed = 0
        total = len(endpoints)

        async def fetch_one(endpoint: str) -> None:
            nonlocal completed

            # Check circuit breaker
            if self._circuit_breaker.is_open(endpoint):
                error = "Circuit breaker open"
                failed[endpoint] = error
                completed += 1
                if on_progress:
                    on_progress(ProgressInfo(completed, total, endpoint, False, error))
                return

            try:
                # Acquire rate limit token
                await self._rate_limiter.acquire()

                # Fetch with retry
                data = await retry_with_backoff(
                    lambda: self._fetch_endpoint(endpoint),
                    max_attempts=self._max_retries,
                )

                successful[endpoint] = data
                self._circuit_breaker.record_success(endpoint)

                completed += 1
                if on_progress:
                    on_progress(ProgressInfo(completed, total, endpoint, True))

            except Exception as e:
                error = str(e)
                failed[endpoint] = error
                self._circuit_breaker.record_failure(endpoint)

                completed += 1
                if on_progress:
                    on_progress(ProgressInfo(completed, total, endpoint, False, error))

        # Run all fetches concurrently
        await asyncio.gather(*[fetch_one(ep) for ep in endpoints])

        duration = time.monotonic() - start_time

        return AggregatedResult(
            successful=successful,
            failed=failed,
            duration_seconds=duration,
        )

    async def _fetch_endpoint(self, endpoint: str) -> dict[str, Any]:
        """Fetch a single endpoint with timeout."""
        return await asyncio.wait_for(
            self._http_client.get(endpoint, self._timeout),
            timeout=self._timeout,
        )


# ============================================================================
# Convenience Function
# ============================================================================

async def fetch_all(
    endpoints: list[str],
    http_client: HttpClient,
    on_progress: Callable[[ProgressInfo], None] | None = None,
) -> AggregatedResult:
    """
    Fetch data from multiple endpoints.

    This is the main interface function as specified in the requirements.
    """
    aggregator = DataAggregator(http_client)
    return await aggregator.fetch_all(endpoints, on_progress)


# ============================================================================
# Mock HTTP Client for Testing
# ============================================================================

@dataclass
class MockHttpClient:
    """Mock HTTP client for testing."""
    responses: dict[str, dict[str, Any]] = field(default_factory=dict)
    failures: set[str] = field(default_factory=set)
    delays: dict[str, float] = field(default_factory=dict)
    request_count: int = 0
    request_times: list[float] = field(default_factory=list)

    async def get(self, url: str, timeout: float) -> dict[str, Any]:
        """Mock get request."""
        self.request_count += 1
        self.request_times.append(time.monotonic())

        # Simulate delay
        if url in self.delays:
            await asyncio.sleep(self.delays[url])

        # Check for failure
        if url in self.failures:
            raise Exception(f"Failed to fetch {url}")

        # Return response or default
        return self.responses.get(url, {"data": "ok"})


# ============================================================================
# Tests
# ============================================================================

import pytest


@pytest.fixture
def mock_client() -> MockHttpClient:
    """Create a mock HTTP client."""
    return MockHttpClient()


class TestDataAggregator:
    """Tests for DataAggregator."""

    @pytest.mark.asyncio
    async def test_all_succeed(self, mock_client: MockHttpClient) -> None:
        """Should return all successful results."""
        endpoints = ["http://api1.com", "http://api2.com", "http://api3.com"]
        mock_client.responses = {
            "http://api1.com": {"id": 1},
            "http://api2.com": {"id": 2},
            "http://api3.com": {"id": 3},
        }

        aggregator = DataAggregator(mock_client)
        result = await aggregator.fetch_all(endpoints)

        assert result.success_count == 3
        assert result.failure_count == 0
        assert result.successful["http://api1.com"]["id"] == 1

    @pytest.mark.asyncio
    async def test_partial_success(self, mock_client: MockHttpClient) -> None:
        """Should handle partial failures."""
        endpoints = ["http://api1.com", "http://api2.com", "http://api3.com"]
        mock_client.responses = {
            "http://api1.com": {"id": 1},
            "http://api3.com": {"id": 3},
        }
        mock_client.failures = {"http://api2.com"}

        aggregator = DataAggregator(mock_client, max_retries=1)
        result = await aggregator.fetch_all(endpoints)

        assert result.success_count == 2
        assert result.failure_count == 1
        assert "http://api2.com" in result.failed

    @pytest.mark.asyncio
    async def test_all_fail(self, mock_client: MockHttpClient) -> None:
        """Should handle all failures."""
        endpoints = ["http://api1.com", "http://api2.com"]
        mock_client.failures = {"http://api1.com", "http://api2.com"}

        aggregator = DataAggregator(mock_client, max_retries=1)
        result = await aggregator.fetch_all(endpoints)

        assert result.success_count == 0
        assert result.failure_count == 2

    @pytest.mark.asyncio
    async def test_progress_callback(self, mock_client: MockHttpClient) -> None:
        """Should call progress callback."""
        endpoints = ["http://api1.com", "http://api2.com"]
        progress_calls: list[ProgressInfo] = []

        def on_progress(info: ProgressInfo) -> None:
            progress_calls.append(info)

        aggregator = DataAggregator(mock_client)
        await aggregator.fetch_all(endpoints, on_progress)

        assert len(progress_calls) == 2
        assert all(p.success for p in progress_calls)

    @pytest.mark.asyncio
    async def test_timeout_handling(self, mock_client: MockHttpClient) -> None:
        """Should handle timeouts."""
        endpoints = ["http://slow.com"]
        mock_client.delays = {"http://slow.com": 10.0}  # 10 second delay

        aggregator = DataAggregator(mock_client, timeout=0.1, max_retries=1)
        result = await aggregator.fetch_all(endpoints)

        assert result.failure_count == 1
        assert "http://slow.com" in result.failed

    @pytest.mark.asyncio
    async def test_retry_logic(self, mock_client: MockHttpClient) -> None:
        """Should retry failed requests."""
        endpoints = ["http://flaky.com"]
        call_count = 0

        async def flaky_get(url: str, timeout: float) -> dict:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return {"data": "success"}

        mock_client.get = flaky_get  # type: ignore

        aggregator = DataAggregator(mock_client, max_retries=3)
        result = await aggregator.fetch_all(endpoints)

        assert result.success_count == 1
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_duration_tracking(self, mock_client: MockHttpClient) -> None:
        """Should track duration."""
        endpoints = ["http://api.com"]

        aggregator = DataAggregator(mock_client)
        result = await aggregator.fetch_all(endpoints)

        assert result.duration_seconds >= 0
        assert result.duration_seconds < 10  # Should be fast


class TestCircuitBreaker:
    """Tests for CircuitBreaker."""

    def test_starts_closed(self) -> None:
        """Should start in closed state."""
        cb = CircuitBreaker()
        assert cb.get_state("endpoint") == CircuitState.CLOSED
        assert not cb.is_open("endpoint")

    def test_opens_after_failures(self) -> None:
        """Should open after threshold failures."""
        cb = CircuitBreaker(failure_threshold=3)

        for _ in range(3):
            cb.record_failure("endpoint")

        assert cb.is_open("endpoint")

    def test_closes_on_success(self) -> None:
        """Should close on success."""
        cb = CircuitBreaker(failure_threshold=3)

        for _ in range(3):
            cb.record_failure("endpoint")

        assert cb.is_open("endpoint")

        cb.record_success("endpoint")
        assert not cb.is_open("endpoint")

    @pytest.mark.asyncio
    async def test_recovery_after_timeout(self) -> None:
        """Should recover after timeout."""
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)

        cb.record_failure("endpoint")
        assert cb.is_open("endpoint")

        await asyncio.sleep(0.15)
        assert cb.get_state("endpoint") == CircuitState.HALF_OPEN

    @pytest.mark.asyncio
    async def test_aggregator_with_circuit_breaker(self, mock_client: MockHttpClient) -> None:
        """Should skip endpoints with open circuit."""
        mock_client.failures = {"http://bad.com"}

        cb = CircuitBreaker(failure_threshold=1)
        aggregator = DataAggregator(mock_client, circuit_breaker=cb, max_retries=1)

        # First call opens circuit
        await aggregator.fetch_all(["http://bad.com"])

        # Reset request count
        mock_client.request_count = 0

        # Second call should skip due to circuit breaker
        result = await aggregator.fetch_all(["http://bad.com"])

        assert result.failure_count == 1
        assert "Circuit breaker open" in result.failed["http://bad.com"]


class TestRateLimiter:
    """Tests for RateLimiter."""

    @pytest.mark.asyncio
    async def test_allows_burst(self) -> None:
        """Should allow burst up to limit."""
        limiter = RateLimiter(max_requests=5, time_window=1.0)

        start = time.monotonic()
        for _ in range(5):
            await limiter.acquire()
        elapsed = time.monotonic() - start

        # Should be fast (no waiting)
        assert elapsed < 0.1

    @pytest.mark.asyncio
    async def test_rate_limits_requests(self) -> None:
        """Should rate limit excess requests."""
        limiter = RateLimiter(max_requests=2, time_window=1.0)

        start = time.monotonic()
        for _ in range(4):
            await limiter.acquire()
        elapsed = time.monotonic() - start

        # Should take at least 1 second due to rate limiting
        assert elapsed >= 0.5


class TestAggregatedResult:
    """Tests for AggregatedResult."""

    def test_counts(self) -> None:
        """Should calculate counts correctly."""
        result = AggregatedResult(
            successful={"a": 1, "b": 2},
            failed={"c": "error"},
            duration_seconds=1.0,
        )

        assert result.success_count == 2
        assert result.failure_count == 1
        assert result.total_count == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
