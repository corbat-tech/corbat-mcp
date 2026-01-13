# Test PY-5: Async Data Aggregator with Rate Limiting

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from enum import Enum
import pytest


@dataclass
class AggregatedResult:
    successful: dict[str, Any]
    failed: dict[str, str]
    duration_seconds: float


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"


@dataclass
class CircuitBreaker:
    max_failures: int = 5
    recovery_time: float = 30.0
    _failure_count: int = field(default=0, init=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _last_failure_time: float = field(default=0, init=False)

    def record_success(self) -> None:
        self._failure_count = 0
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self.max_failures:
            self._state = CircuitState.OPEN

    def is_available(self) -> bool:
        if self._state == CircuitState.CLOSED:
            return True
        # Check if recovery time has passed
        if time.monotonic() - self._last_failure_time >= self.recovery_time:
            return True
        return False


class RateLimiter:
    def __init__(self, max_requests: int, time_window: float):
        self._max_requests = max_requests
        self._time_window = time_window
        self._requests: list[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            # Remove old requests outside the time window
            self._requests = [t for t in self._requests if now - t < self._time_window]

            if len(self._requests) >= self._max_requests:
                # Calculate wait time
                oldest = self._requests[0]
                wait_time = self._time_window - (now - oldest)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    # Clean up again after waiting
                    now = time.monotonic()
                    self._requests = [t for t in self._requests if now - t < self._time_window]

            self._requests.append(time.monotonic())


class DataAggregator:
    def __init__(
        self,
        max_requests_per_second: int = 10,
        max_retries: int = 3,
        timeout_seconds: float = 5.0,
        circuit_breaker_threshold: int = 5,
        circuit_breaker_recovery: float = 30.0,
    ):
        self._rate_limiter = RateLimiter(max_requests_per_second, 1.0)
        self._max_retries = max_retries
        self._timeout = timeout_seconds
        self._circuit_breakers: dict[str, CircuitBreaker] = {}
        self._cb_threshold = circuit_breaker_threshold
        self._cb_recovery = circuit_breaker_recovery

    def _get_circuit_breaker(self, endpoint: str) -> CircuitBreaker:
        if endpoint not in self._circuit_breakers:
            self._circuit_breakers[endpoint] = CircuitBreaker(
                max_failures=self._cb_threshold,
                recovery_time=self._cb_recovery,
            )
        return self._circuit_breakers[endpoint]

    async def fetch_all(
        self,
        endpoints: list[str],
        on_progress: Optional[Callable[[int, int], None]] = None,
        fetcher: Optional[Callable[[str], Any]] = None,
    ) -> AggregatedResult:
        start_time = time.monotonic()
        successful: dict[str, Any] = {}
        failed: dict[str, str] = {}

        total = len(endpoints)
        completed = 0

        async def fetch_one(endpoint: str) -> tuple[str, Any, Optional[str]]:
            nonlocal completed

            circuit_breaker = self._get_circuit_breaker(endpoint)

            if not circuit_breaker.is_available():
                return endpoint, None, "Circuit breaker open"

            last_error: Optional[str] = None

            for attempt in range(self._max_retries):
                try:
                    await self._rate_limiter.acquire()

                    if fetcher:
                        result = await asyncio.wait_for(
                            fetcher(endpoint),
                            timeout=self._timeout,
                        )
                    else:
                        result = await asyncio.wait_for(
                            self._default_fetch(endpoint),
                            timeout=self._timeout,
                        )

                    circuit_breaker.record_success()
                    return endpoint, result, None

                except asyncio.TimeoutError:
                    last_error = "Timeout"
                    circuit_breaker.record_failure()
                except Exception as e:
                    last_error = str(e)
                    circuit_breaker.record_failure()

                # Exponential backoff
                if attempt < self._max_retries - 1:
                    backoff = (2 ** attempt) * 0.1
                    await asyncio.sleep(backoff)

            return endpoint, None, last_error

        # Process all endpoints concurrently
        tasks = [fetch_one(endpoint) for endpoint in endpoints]
        results = await asyncio.gather(*tasks)

        for endpoint, result, error in results:
            if error is None:
                successful[endpoint] = result
            else:
                failed[endpoint] = error

            completed += 1
            if on_progress:
                on_progress(completed, total)

        duration = time.monotonic() - start_time

        return AggregatedResult(
            successful=successful,
            failed=failed,
            duration_seconds=duration,
        )

    async def _default_fetch(self, endpoint: str) -> dict:
        # Simulate HTTP fetch
        await asyncio.sleep(0.01)
        return {"url": endpoint, "status": "ok"}


# Tests
class TestDataAggregator:
    @pytest.fixture
    def aggregator(self):
        return DataAggregator(
            max_requests_per_second=10,
            max_retries=3,
            timeout_seconds=1.0,
            circuit_breaker_threshold=5,
            circuit_breaker_recovery=0.1,  # Short for testing
        )

    @pytest.mark.asyncio
    async def test_all_successful(self, aggregator):
        endpoints = ["http://api1.com", "http://api2.com", "http://api3.com"]

        async def mock_fetcher(endpoint: str) -> dict:
            return {"data": endpoint}

        result = await aggregator.fetch_all(endpoints, fetcher=mock_fetcher)

        assert len(result.successful) == 3
        assert len(result.failed) == 0
        assert result.duration_seconds > 0

    @pytest.mark.asyncio
    async def test_partial_success(self, aggregator):
        call_count = {"count": 0}

        async def mock_fetcher(endpoint: str) -> dict:
            call_count["count"] += 1
            if "fail" in endpoint:
                raise Exception("Simulated failure")
            return {"data": endpoint}

        endpoints = ["http://api1.com", "http://fail.com", "http://api2.com"]

        result = await aggregator.fetch_all(endpoints, fetcher=mock_fetcher)

        assert len(result.successful) == 2
        assert len(result.failed) == 1
        assert "http://fail.com" in result.failed

    @pytest.mark.asyncio
    async def test_retry_logic(self, aggregator):
        attempts = {"count": 0}

        async def flaky_fetcher(endpoint: str) -> dict:
            attempts["count"] += 1
            if attempts["count"] < 3:
                raise Exception("Temporary failure")
            return {"data": "success"}

        result = await aggregator.fetch_all(["http://flaky.com"], fetcher=flaky_fetcher)

        assert len(result.successful) == 1
        assert attempts["count"] == 3  # 2 failures + 1 success

    @pytest.mark.asyncio
    async def test_timeout_handling(self, aggregator):
        async def slow_fetcher(endpoint: str) -> dict:
            await asyncio.sleep(5)  # Longer than timeout
            return {"data": endpoint}

        result = await aggregator.fetch_all(["http://slow.com"], fetcher=slow_fetcher)

        assert len(result.failed) == 1
        assert "Timeout" in result.failed["http://slow.com"]

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_threshold(self):
        aggregator = DataAggregator(
            circuit_breaker_threshold=2,
            max_retries=1,
            circuit_breaker_recovery=60,  # Long recovery
        )

        async def always_fail(endpoint: str) -> dict:
            raise Exception("Always fails")

        # First request - will fail and increment counter
        result1 = await aggregator.fetch_all(["http://fail.com"], fetcher=always_fail)
        assert len(result1.failed) == 1

        # Second request - will fail and open circuit
        result2 = await aggregator.fetch_all(["http://fail.com"], fetcher=always_fail)
        assert len(result2.failed) == 1

        # Third request - circuit should be open
        result3 = await aggregator.fetch_all(["http://fail.com"], fetcher=always_fail)
        assert "Circuit breaker open" in result3.failed["http://fail.com"]

    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        aggregator = DataAggregator(
            circuit_breaker_threshold=1,
            max_retries=1,
            circuit_breaker_recovery=0.1,  # 100ms recovery
        )

        call_count = {"count": 0}

        async def eventually_works(endpoint: str) -> dict:
            call_count["count"] += 1
            if call_count["count"] == 1:
                raise Exception("First call fails")
            return {"data": "success"}

        # First call fails, opens circuit
        result1 = await aggregator.fetch_all(["http://test.com"], fetcher=eventually_works)
        assert len(result1.failed) == 1

        # Circuit is open
        result2 = await aggregator.fetch_all(["http://test.com"], fetcher=eventually_works)
        assert "Circuit breaker open" in result2.failed["http://test.com"]

        # Wait for recovery
        await asyncio.sleep(0.15)

        # Circuit should allow retry now
        result3 = await aggregator.fetch_all(["http://test.com"], fetcher=eventually_works)
        assert len(result3.successful) == 1

    @pytest.mark.asyncio
    async def test_progress_callback(self, aggregator):
        progress_updates = []

        def on_progress(completed: int, total: int):
            progress_updates.append((completed, total))

        endpoints = ["http://api1.com", "http://api2.com", "http://api3.com"]

        async def mock_fetcher(endpoint: str) -> dict:
            return {"data": endpoint}

        await aggregator.fetch_all(endpoints, on_progress=on_progress, fetcher=mock_fetcher)

        assert len(progress_updates) == 3
        assert progress_updates[-1] == (3, 3)

    @pytest.mark.asyncio
    async def test_rate_limiting_timing(self):
        aggregator = DataAggregator(max_requests_per_second=5, max_retries=1)
        request_times = []

        async def timing_fetcher(endpoint: str) -> dict:
            request_times.append(time.monotonic())
            return {"data": endpoint}

        # 10 requests with rate limit of 5/second should take ~1+ second
        endpoints = [f"http://api{i}.com" for i in range(10)]

        start = time.monotonic()
        await aggregator.fetch_all(endpoints, fetcher=timing_fetcher)
        duration = time.monotonic() - start

        # Should take at least 1 second due to rate limiting
        assert duration >= 1.0


class TestRateLimiter:
    @pytest.mark.asyncio
    async def test_allows_requests_within_limit(self):
        limiter = RateLimiter(max_requests=5, time_window=1.0)

        start = time.monotonic()
        for _ in range(5):
            await limiter.acquire()
        duration = time.monotonic() - start

        # 5 requests within limit should be fast
        assert duration < 0.1

    @pytest.mark.asyncio
    async def test_delays_requests_over_limit(self):
        limiter = RateLimiter(max_requests=2, time_window=0.5)

        start = time.monotonic()
        for _ in range(4):
            await limiter.acquire()
        duration = time.monotonic() - start

        # 4 requests with limit of 2 per 0.5s should take ~0.5s
        assert duration >= 0.5


class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = CircuitBreaker()
        assert cb.is_available()

    def test_opens_after_threshold_failures(self):
        cb = CircuitBreaker(max_failures=3, recovery_time=60)

        for _ in range(3):
            cb.record_failure()

        assert not cb.is_available()

    def test_resets_on_success(self):
        cb = CircuitBreaker(max_failures=3)

        cb.record_failure()
        cb.record_failure()
        cb.record_success()

        # Should still be available after success
        assert cb.is_available()

        # And failure count should be reset
        cb.record_failure()
        cb.record_failure()
        assert cb.is_available()  # Not at threshold yet
