# Test PY-3: Bugfix - TypeError when processing empty data

# Original buggy code:
# def calculate_statistics(data):
#     total = sum(data)
#     average = total / len(data)  # ZeroDivisionError when empty
#     maximum = max(data)           # ValueError: max() arg is empty
#     minimum = min(data)           # ValueError: min() arg is empty
#     return {"total": total, "average": average, "max": maximum, "min": minimum, "count": len(data)}

from dataclasses import dataclass
from typing import Optional
import pytest


@dataclass
class Statistics:
    total: float
    average: Optional[float]
    max: Optional[float]
    min: Optional[float]
    count: int


def calculate_statistics(data: list[float]) -> Statistics:
    """
    Calculate statistics for a list of numbers.

    Handles empty data gracefully by returning appropriate defaults.
    """
    if not data:
        return Statistics(
            total=0,
            average=None,
            max=None,
            min=None,
            count=0
        )

    total = sum(data)
    count = len(data)

    return Statistics(
        total=total,
        average=total / count,
        max=max(data),
        min=min(data),
        count=count
    )


# Alternative: Return dict for backwards compatibility
def calculate_statistics_dict(data: list[float]) -> dict:
    """
    Calculate statistics for a list of numbers, returning a dictionary.

    Handles empty data gracefully.
    """
    if not data:
        return {
            "total": 0,
            "average": None,
            "max": None,
            "min": None,
            "count": 0
        }

    total = sum(data)
    count = len(data)

    return {
        "total": total,
        "average": total / count,
        "max": max(data),
        "min": min(data),
        "count": count
    }


# Tests
class TestCalculateStatistics:
    """Tests for the calculate_statistics function."""

    class TestBugReproduction:
        """Tests that prove the bug existed and is now fixed."""

        def test_empty_list_does_not_raise_zero_division_error(self):
            """Original bug: ZeroDivisionError when data is empty."""
            # This would raise ZeroDivisionError in the buggy version
            result = calculate_statistics([])

            assert result.count == 0
            assert result.total == 0
            assert result.average is None

        def test_empty_list_does_not_raise_value_error_for_max(self):
            """Original bug: ValueError for max() on empty sequence."""
            result = calculate_statistics([])

            assert result.max is None

        def test_empty_list_does_not_raise_value_error_for_min(self):
            """Original bug: ValueError for min() on empty sequence."""
            result = calculate_statistics([])

            assert result.min is None

    class TestNormalOperation:
        """Tests for normal operation with valid data."""

        def test_single_value(self):
            result = calculate_statistics([42])

            assert result.total == 42
            assert result.average == 42
            assert result.max == 42
            assert result.min == 42
            assert result.count == 1

        def test_multiple_values(self):
            result = calculate_statistics([10, 20, 30])

            assert result.total == 60
            assert result.average == 20
            assert result.max == 30
            assert result.min == 10
            assert result.count == 3

        def test_negative_values(self):
            result = calculate_statistics([-5, -10, -3])

            assert result.total == -18
            assert result.average == -6
            assert result.max == -3
            assert result.min == -10
            assert result.count == 3

        def test_mixed_positive_and_negative(self):
            result = calculate_statistics([-10, 0, 10])

            assert result.total == 0
            assert result.average == 0
            assert result.max == 10
            assert result.min == -10

        def test_decimal_values(self):
            result = calculate_statistics([1.5, 2.5, 3.0])

            assert result.total == 7.0
            assert result.average == pytest.approx(2.333, rel=0.01)
            assert result.max == 3.0
            assert result.min == 1.5

    class TestEdgeCases:
        """Tests for edge cases."""

        def test_all_same_values(self):
            result = calculate_statistics([5, 5, 5, 5])

            assert result.average == 5
            assert result.max == 5
            assert result.min == 5

        def test_all_zeros(self):
            result = calculate_statistics([0, 0, 0])

            assert result.total == 0
            assert result.average == 0
            assert result.max == 0
            assert result.min == 0

        def test_large_dataset(self):
            data = list(range(1, 1001))  # 1 to 1000
            result = calculate_statistics(data)

            assert result.total == 500500
            assert result.average == 500.5
            assert result.max == 1000
            assert result.min == 1
            assert result.count == 1000


class TestCalculateStatisticsDict:
    """Tests for the dictionary-returning version."""

    def test_empty_list_returns_safe_defaults(self):
        result = calculate_statistics_dict([])

        assert result == {
            "total": 0,
            "average": None,
            "max": None,
            "min": None,
            "count": 0
        }

    def test_normal_operation(self):
        result = calculate_statistics_dict([10, 20, 30])

        assert result["total"] == 60
        assert result["average"] == 20
        assert result["max"] == 30
        assert result["min"] == 10
        assert result["count"] == 3
