"""
Test PY-3: Bugfix
Fix: TypeError when processing empty data.

Original buggy code:
def calculate_statistics(data):
    total = sum(data)
    average = total / len(data)
    maximum = max(data)
    minimum = min(data)
    return {"total": total, "average": average, "max": maximum, "min": minimum, "count": len(data)}

Bug analysis:
1. ZeroDivisionError when data is empty (division by len(data) which is 0)
2. ValueError when calling max() or min() on empty sequence
3. No type checking for None input
4. No handling of non-numeric values

Write tests proving the bug and fix.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence
import math

import pytest


# ============================================================================
# Types
# ============================================================================

@dataclass(frozen=True)
class Statistics:
    """Immutable statistics result."""
    total: float
    average: float | None
    maximum: float | None
    minimum: float | None
    count: int

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "total": self.total,
            "average": self.average,
            "max": self.maximum,
            "min": self.minimum,
            "count": self.count,
        }

    @classmethod
    def empty(cls) -> Statistics:
        """Create an empty statistics result."""
        return cls(total=0.0, average=None, maximum=None, minimum=None, count=0)


# ============================================================================
# Original Buggy Implementation (for demonstration)
# ============================================================================

def calculate_statistics_buggy(data: Sequence[float]) -> dict:
    """
    BUGGY IMPLEMENTATION - DO NOT USE
    This function demonstrates the original buggy code.
    """
    total = sum(data)
    average = total / len(data)  # Bug: ZeroDivisionError when empty
    maximum = max(data)           # Bug: ValueError when empty
    minimum = min(data)           # Bug: ValueError when empty
    return {"total": total, "average": average, "max": maximum, "min": minimum, "count": len(data)}


# ============================================================================
# Fixed Implementation
# ============================================================================

def calculate_statistics(data: Sequence[float] | None) -> Statistics:
    """
    Calculate statistics for a sequence of numbers.

    Fixes applied:
    1. Handles None input gracefully
    2. Handles empty sequence without errors
    3. Returns None for average/max/min when no data
    4. Uses a proper result type instead of raw dict

    Args:
        data: Sequence of numeric values, or None

    Returns:
        Statistics object with total, average, max, min, and count
    """
    # Handle None input
    if data is None:
        return Statistics.empty()

    # Convert to list to allow multiple iterations and handle generators
    values = list(data)

    # Handle empty sequence
    if not values:
        return Statistics.empty()

    # Calculate statistics
    total = sum(values)
    count = len(values)
    average = total / count
    maximum = max(values)
    minimum = min(values)

    return Statistics(
        total=total,
        average=average,
        maximum=maximum,
        minimum=minimum,
        count=count,
    )


def calculate_statistics_dict(data: Sequence[float] | None) -> dict:
    """
    Calculate statistics and return as dictionary.
    This is an alternative that returns a dict for backwards compatibility.
    """
    return calculate_statistics(data).to_dict()


# ============================================================================
# Extended Implementation with More Features
# ============================================================================

@dataclass(frozen=True)
class ExtendedStatistics:
    """Extended statistics with additional metrics."""
    total: float
    average: float | None
    maximum: float | None
    minimum: float | None
    count: int
    median: float | None
    variance: float | None
    std_dev: float | None

    @classmethod
    def from_data(cls, data: Sequence[float] | None) -> ExtendedStatistics:
        """Calculate extended statistics from data."""
        if data is None or len(list(data)) == 0:
            return cls(
                total=0.0,
                average=None,
                maximum=None,
                minimum=None,
                count=0,
                median=None,
                variance=None,
                std_dev=None,
            )

        values = sorted(data)
        count = len(values)
        total = sum(values)
        average = total / count
        maximum = values[-1]
        minimum = values[0]

        # Calculate median
        mid = count // 2
        if count % 2 == 0:
            median = (values[mid - 1] + values[mid]) / 2
        else:
            median = values[mid]

        # Calculate variance and standard deviation
        if count > 1:
            variance = sum((x - average) ** 2 for x in values) / (count - 1)
            std_dev = math.sqrt(variance)
        else:
            variance = 0.0
            std_dev = 0.0

        return cls(
            total=total,
            average=average,
            maximum=maximum,
            minimum=minimum,
            count=count,
            median=median,
            variance=variance,
            std_dev=std_dev,
        )


# ============================================================================
# Tests
# ============================================================================

class TestBuggyImplementation:
    """Tests proving the bug exists in the original implementation."""

    def test_buggy_raises_zero_division_for_empty_list(self) -> None:
        """BUG: Raises ZeroDivisionError for empty list."""
        with pytest.raises(ZeroDivisionError):
            calculate_statistics_buggy([])

    def test_buggy_raises_value_error_for_empty_list_max(self) -> None:
        """BUG: Raises ValueError when calling max on empty sequence."""
        # This test documents that max([]) raises ValueError
        with pytest.raises(ValueError, match="empty sequence"):
            max([])

    def test_buggy_raises_value_error_for_empty_list_min(self) -> None:
        """BUG: Raises ValueError when calling min on empty sequence."""
        with pytest.raises(ValueError, match="empty sequence"):
            min([])

    def test_buggy_raises_type_error_for_none(self) -> None:
        """BUG: Raises TypeError for None input."""
        with pytest.raises(TypeError):
            calculate_statistics_buggy(None)  # type: ignore


class TestFixedImplementation:
    """Tests proving the fix works."""

    def test_returns_empty_statistics_for_empty_list(self) -> None:
        """FIX: Returns empty statistics for empty list."""
        result = calculate_statistics([])

        assert result.count == 0
        assert result.total == 0.0
        assert result.average is None
        assert result.maximum is None
        assert result.minimum is None

    def test_returns_empty_statistics_for_none(self) -> None:
        """FIX: Returns empty statistics for None input."""
        result = calculate_statistics(None)

        assert result.count == 0
        assert result.total == 0.0
        assert result.average is None
        assert result.maximum is None
        assert result.minimum is None

    def test_calculates_correct_statistics_for_single_value(self) -> None:
        """FIX: Calculates correct statistics for single value."""
        result = calculate_statistics([42.0])

        assert result.count == 1
        assert result.total == 42.0
        assert result.average == 42.0
        assert result.maximum == 42.0
        assert result.minimum == 42.0

    def test_calculates_correct_statistics_for_multiple_values(self) -> None:
        """FIX: Calculates correct statistics for multiple values."""
        data = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = calculate_statistics(data)

        assert result.count == 5
        assert result.total == 150.0
        assert result.average == 30.0
        assert result.maximum == 50.0
        assert result.minimum == 10.0

    def test_handles_negative_values(self) -> None:
        """FIX: Handles negative values correctly."""
        data = [-10.0, 0.0, 10.0]
        result = calculate_statistics(data)

        assert result.count == 3
        assert result.total == 0.0
        assert result.average == 0.0
        assert result.maximum == 10.0
        assert result.minimum == -10.0

    def test_handles_decimal_values(self) -> None:
        """FIX: Handles decimal values correctly."""
        data = [0.1, 0.2, 0.3]
        result = calculate_statistics(data)

        assert result.count == 3
        assert pytest.approx(result.total) == 0.6
        assert pytest.approx(result.average) == 0.2
        assert result.maximum == 0.3
        assert result.minimum == 0.1

    def test_handles_large_numbers(self) -> None:
        """FIX: Handles large numbers."""
        data = [1e10, 2e10, 3e10]
        result = calculate_statistics(data)

        assert result.count == 3
        assert result.total == 6e10
        assert result.average == 2e10
        assert result.maximum == 3e10
        assert result.minimum == 1e10

    def test_handles_integers(self) -> None:
        """FIX: Handles integers."""
        data = [1, 2, 3, 4, 5]
        result = calculate_statistics(data)

        assert result.count == 5
        assert result.total == 15
        assert result.average == 3.0

    def test_to_dict_returns_correct_format(self) -> None:
        """FIX: to_dict returns correct format."""
        result = calculate_statistics([10.0, 20.0]).to_dict()

        assert "total" in result
        assert "average" in result
        assert "max" in result
        assert "min" in result
        assert "count" in result

    def test_dict_helper_function(self) -> None:
        """FIX: Dict helper returns dictionary."""
        result = calculate_statistics_dict([10.0, 20.0])

        assert isinstance(result, dict)
        assert result["count"] == 2
        assert result["total"] == 30.0


class TestExtendedStatistics:
    """Tests for extended statistics."""

    def test_calculates_median_for_odd_count(self) -> None:
        """Should calculate correct median for odd count."""
        result = ExtendedStatistics.from_data([1, 2, 3, 4, 5])

        assert result.median == 3

    def test_calculates_median_for_even_count(self) -> None:
        """Should calculate correct median for even count."""
        result = ExtendedStatistics.from_data([1, 2, 3, 4])

        assert result.median == 2.5

    def test_calculates_variance(self) -> None:
        """Should calculate correct variance."""
        result = ExtendedStatistics.from_data([2, 4, 4, 4, 5, 5, 7, 9])

        assert pytest.approx(result.variance, rel=0.01) == 4.57

    def test_calculates_std_dev(self) -> None:
        """Should calculate correct standard deviation."""
        result = ExtendedStatistics.from_data([2, 4, 4, 4, 5, 5, 7, 9])

        assert pytest.approx(result.std_dev, rel=0.01) == 2.14

    def test_handles_single_value(self) -> None:
        """Should handle single value for variance/std_dev."""
        result = ExtendedStatistics.from_data([42])

        assert result.variance == 0.0
        assert result.std_dev == 0.0

    def test_handles_empty_data(self) -> None:
        """Should handle empty data."""
        result = ExtendedStatistics.from_data([])

        assert result.count == 0
        assert result.median is None
        assert result.variance is None


class TestStatisticsDataclass:
    """Tests for Statistics dataclass behavior."""

    def test_statistics_is_immutable(self) -> None:
        """Statistics should be immutable (frozen dataclass)."""
        stats = Statistics(total=100, average=50, maximum=75, minimum=25, count=2)

        with pytest.raises(Exception):  # FrozenInstanceError
            stats.total = 200  # type: ignore

    def test_empty_factory_method(self) -> None:
        """Empty factory should create valid empty statistics."""
        empty = Statistics.empty()

        assert empty.count == 0
        assert empty.total == 0.0
        assert empty.average is None
        assert empty.maximum is None
        assert empty.minimum is None

    def test_statistics_equality(self) -> None:
        """Two Statistics with same values should be equal."""
        stats1 = Statistics(total=100, average=50, maximum=75, minimum=25, count=2)
        stats2 = Statistics(total=100, average=50, maximum=75, minimum=25, count=2)

        assert stats1 == stats2


class TestEdgeCases:
    """Tests for edge cases."""

    def test_handles_all_same_values(self) -> None:
        """Should handle all same values."""
        result = calculate_statistics([5.0, 5.0, 5.0, 5.0])

        assert result.total == 20.0
        assert result.average == 5.0
        assert result.maximum == 5.0
        assert result.minimum == 5.0

    def test_handles_tuple_input(self) -> None:
        """Should handle tuple input."""
        result = calculate_statistics((1.0, 2.0, 3.0))

        assert result.count == 3
        assert result.total == 6.0

    def test_handles_generator_input(self) -> None:
        """Should handle generator input."""
        result = calculate_statistics(x for x in [1.0, 2.0, 3.0])

        assert result.count == 3
        assert result.total == 6.0

    def test_handles_very_small_numbers(self) -> None:
        """Should handle very small numbers."""
        data = [1e-10, 2e-10, 3e-10]
        result = calculate_statistics(data)

        assert result.count == 3
        assert pytest.approx(result.total) == 6e-10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
