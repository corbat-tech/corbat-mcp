"""
Test PY-4: Refactor
Refactor to Python best practices.

Original code had issues:
- Dictionary-based data instead of dataclasses
- No type hints
- C-style loops (range(len(...)))
- Boolean comparison with == False
- String concatenation instead of f-strings
- No proper error handling

Apply: dataclasses, type hints, protocols, Pythonic idioms.
"""

from __future__ import annotations

from abc import abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum, auto
from typing import Protocol


# ============================================================================
# Custom Exceptions
# ============================================================================

class OrderError(Exception):
    """Base exception for order errors."""
    pass


class InvalidInputError(OrderError):
    """Raised when input is invalid."""
    pass


class EmptyCartError(OrderError):
    """Raised when cart is empty."""
    pass


class OutOfStockError(OrderError):
    """Raised when item is out of stock."""

    def __init__(self, item_name: str) -> None:
        self.item_name = item_name
        super().__init__(f"Item '{item_name}' is out of stock")


class InsufficientFundsError(OrderError):
    """Raised when user has insufficient funds."""

    def __init__(self, required: Decimal, available: Decimal) -> None:
        self.required = required
        self.available = available
        super().__init__(f"Insufficient funds: required {required}, available {available}")


class PaymentFailedError(OrderError):
    """Raised when payment processing fails."""
    pass


# ============================================================================
# Domain Types (Value Objects and Entities)
# ============================================================================

@dataclass(frozen=True)
class OrderItem:
    """Immutable order item."""
    id: str
    name: str
    price: Decimal
    quantity: int

    @property
    def subtotal(self) -> Decimal:
        """Calculate item subtotal."""
        return self.price * self.quantity


@dataclass(frozen=True)
class Order:
    """Immutable order entity."""
    id: str
    items: tuple[OrderItem, ...]

    @property
    def total(self) -> Decimal:
        """Calculate order total."""
        return sum((item.subtotal for item in self.items), Decimal(0))

    @property
    def is_empty(self) -> bool:
        """Check if order has no items."""
        return len(self.items) == 0


@dataclass(frozen=True)
class User:
    """User entity."""
    id: str
    email: str
    balance: Decimal


@dataclass(frozen=True)
class PaymentResult:
    """Result of a payment operation."""
    success: bool
    transaction_id: str | None = None
    error_message: str | None = None


class OrderStatus(Enum):
    """Order processing status."""
    SUCCESS = auto()
    INVALID_INPUT = auto()
    EMPTY_CART = auto()
    OUT_OF_STOCK = auto()
    INSUFFICIENT_FUNDS = auto()
    PAYMENT_FAILED = auto()


@dataclass(frozen=True)
class OrderResult:
    """Result of order processing."""
    success: bool
    status: OrderStatus
    order_id: str | None = None
    total: Decimal | None = None
    error_message: str | None = None

    @classmethod
    def successful(cls, order_id: str, total: Decimal) -> OrderResult:
        """Create a successful result."""
        return cls(
            success=True,
            status=OrderStatus.SUCCESS,
            order_id=order_id,
            total=total,
        )

    @classmethod
    def failed(cls, status: OrderStatus, message: str) -> OrderResult:
        """Create a failed result."""
        return cls(
            success=False,
            status=status,
            error_message=message,
        )


# ============================================================================
# Protocol Interfaces (Dependency Inversion)
# ============================================================================

class Inventory(Protocol):
    """Protocol for inventory operations."""

    @abstractmethod
    def check_stock(self, item_id: str) -> int:
        """Check available stock for an item."""
        ...

    @abstractmethod
    def decrease_stock(self, item_id: str, quantity: int) -> None:
        """Decrease stock for an item."""
        ...


class PaymentGateway(Protocol):
    """Protocol for payment processing."""

    @abstractmethod
    def charge(self, user_id: str, amount: Decimal) -> PaymentResult:
        """Charge a user."""
        ...


class EmailService(Protocol):
    """Protocol for email notifications."""

    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        """Send an email."""
        ...


# ============================================================================
# Order Validator
# ============================================================================

class OrderValidator:
    """Validates orders before processing."""

    def validate(self, order: Order | None, user: User | None) -> OrderResult | None:
        """
        Validate order and user.
        Returns None if valid, otherwise returns an error result.
        """
        if order is None or user is None:
            return OrderResult.failed(
                OrderStatus.INVALID_INPUT,
                "Order and user are required",
            )

        if order.is_empty:
            return OrderResult.failed(
                OrderStatus.EMPTY_CART,
                "Cart is empty",
            )

        return None


# ============================================================================
# Stock Checker
# ============================================================================

class StockChecker:
    """Checks and manages inventory stock."""

    def __init__(self, inventory: Inventory) -> None:
        self._inventory = inventory

    def check_availability(self, items: tuple[OrderItem, ...]) -> str | None:
        """
        Check if all items are in stock.
        Returns item name if out of stock, None if all available.
        """
        for item in items:
            available = self._inventory.check_stock(item.id)
            if available < item.quantity:
                return item.name
        return None

    def reserve_items(self, items: tuple[OrderItem, ...]) -> None:
        """Reserve items by decreasing stock."""
        for item in items:
            self._inventory.decrease_stock(item.id, item.quantity)


# ============================================================================
# Refactored Order Processor
# ============================================================================

class OrderProcessor:
    """Processes orders with proper validation and error handling."""

    def __init__(
        self,
        inventory: Inventory,
        payment_gateway: PaymentGateway,
        email_service: EmailService,
    ) -> None:
        self._inventory = inventory
        self._payment_gateway = payment_gateway
        self._email_service = email_service
        self._validator = OrderValidator()
        self._stock_checker = StockChecker(inventory)

    def process_order(self, order: Order | None, user: User | None) -> OrderResult:
        """
        Process an order.

        This is the refactored version with:
        - Type hints
        - Dataclasses instead of dicts
        - Pythonic iteration
        - Proper exception handling
        - Single responsibility (delegating to specialized classes)
        """
        # Validate inputs
        validation_error = self._validator.validate(order, user)
        if validation_error:
            return validation_error

        # Type narrowing - at this point we know order and user are not None
        assert order is not None
        assert user is not None

        # Check stock availability
        out_of_stock_item = self._stock_checker.check_availability(order.items)
        if out_of_stock_item:
            return OrderResult.failed(
                OrderStatus.OUT_OF_STOCK,
                f"Out of stock: {out_of_stock_item}",
            )

        # Calculate total
        total = order.total

        # Check user balance
        if user.balance < total:
            return OrderResult.failed(
                OrderStatus.INSUFFICIENT_FUNDS,
                f"Insufficient funds: required {total}, available {user.balance}",
            )

        # Process payment
        payment_result = self._payment_gateway.charge(user.id, total)
        if not payment_result.success:
            return OrderResult.failed(
                OrderStatus.PAYMENT_FAILED,
                payment_result.error_message or "Payment processing failed",
            )

        # Reserve inventory
        self._stock_checker.reserve_items(order.items)

        # Send confirmation email
        self._send_confirmation(user.email, order.id)

        return OrderResult.successful(order.id, total)

    def _send_confirmation(self, email: str, order_id: str) -> None:
        """Send order confirmation email."""
        self._email_service.send(
            to=email,
            subject="Order confirmed",
            body=f"Your order #{order_id} is confirmed.",
        )


# ============================================================================
# Mock Implementations for Testing
# ============================================================================

@dataclass
class MockInventory:
    """Mock inventory for testing."""
    stock: dict[str, int] = field(default_factory=dict)
    decreased: list[tuple[str, int]] = field(default_factory=list)

    def check_stock(self, item_id: str) -> int:
        return self.stock.get(item_id, 0)

    def decrease_stock(self, item_id: str, quantity: int) -> None:
        self.decreased.append((item_id, quantity))
        self.stock[item_id] = self.stock.get(item_id, 0) - quantity


@dataclass
class MockPaymentGateway:
    """Mock payment gateway for testing."""
    should_succeed: bool = True
    charged: list[tuple[str, Decimal]] = field(default_factory=list)

    def charge(self, user_id: str, amount: Decimal) -> PaymentResult:
        self.charged.append((user_id, amount))
        if self.should_succeed:
            return PaymentResult(success=True, transaction_id="tx-123")
        return PaymentResult(success=False, error_message="Card declined")


@dataclass
class MockEmailService:
    """Mock email service for testing."""
    sent: list[tuple[str, str, str]] = field(default_factory=list)

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, subject, body))


# ============================================================================
# Tests
# ============================================================================

import pytest


@pytest.fixture
def inventory() -> MockInventory:
    """Create mock inventory with default stock."""
    return MockInventory(stock={"item-1": 10, "item-2": 5})


@pytest.fixture
def payment_gateway() -> MockPaymentGateway:
    """Create mock payment gateway."""
    return MockPaymentGateway(should_succeed=True)


@pytest.fixture
def email_service() -> MockEmailService:
    """Create mock email service."""
    return MockEmailService()


@pytest.fixture
def processor(
    inventory: MockInventory,
    payment_gateway: MockPaymentGateway,
    email_service: MockEmailService,
) -> OrderProcessor:
    """Create order processor with mock dependencies."""
    return OrderProcessor(inventory, payment_gateway, email_service)


@pytest.fixture
def valid_order() -> Order:
    """Create a valid test order."""
    return Order(
        id="order-123",
        items=(
            OrderItem(id="item-1", name="Widget", price=Decimal("10"), quantity=2),
            OrderItem(id="item-2", name="Gadget", price=Decimal("20"), quantity=1),
        ),
    )


@pytest.fixture
def valid_user() -> User:
    """Create a valid test user."""
    return User(id="user-123", email="test@example.com", balance=Decimal("100"))


class TestOrderProcessor:
    """Tests for OrderProcessor."""

    def test_successful_order(
        self,
        processor: OrderProcessor,
        valid_order: Order,
        valid_user: User,
        email_service: MockEmailService,
    ) -> None:
        """Should process order successfully."""
        result = processor.process_order(valid_order, valid_user)

        assert result.success is True
        assert result.status == OrderStatus.SUCCESS
        assert result.order_id == "order-123"
        assert result.total == Decimal("40")  # 10*2 + 20*1
        assert len(email_service.sent) == 1

    def test_fails_with_none_order(self, processor: OrderProcessor, valid_user: User) -> None:
        """Should fail when order is None."""
        result = processor.process_order(None, valid_user)

        assert result.success is False
        assert result.status == OrderStatus.INVALID_INPUT

    def test_fails_with_none_user(self, processor: OrderProcessor, valid_order: Order) -> None:
        """Should fail when user is None."""
        result = processor.process_order(valid_order, None)

        assert result.success is False
        assert result.status == OrderStatus.INVALID_INPUT

    def test_fails_with_empty_cart(self, processor: OrderProcessor, valid_user: User) -> None:
        """Should fail when cart is empty."""
        empty_order = Order(id="order-123", items=())

        result = processor.process_order(empty_order, valid_user)

        assert result.success is False
        assert result.status == OrderStatus.EMPTY_CART

    def test_fails_when_out_of_stock(
        self,
        inventory: MockInventory,
        payment_gateway: MockPaymentGateway,
        email_service: MockEmailService,
        valid_user: User,
    ) -> None:
        """Should fail when item is out of stock."""
        inventory.stock["item-1"] = 1  # Only 1 in stock, but order needs 2
        processor = OrderProcessor(inventory, payment_gateway, email_service)
        order = Order(
            id="order-123",
            items=(OrderItem(id="item-1", name="Widget", price=Decimal("10"), quantity=2),),
        )

        result = processor.process_order(order, valid_user)

        assert result.success is False
        assert result.status == OrderStatus.OUT_OF_STOCK
        assert "Widget" in (result.error_message or "")

    def test_fails_with_insufficient_funds(
        self,
        processor: OrderProcessor,
        valid_order: Order,
    ) -> None:
        """Should fail when user has insufficient funds."""
        poor_user = User(id="user-123", email="test@example.com", balance=Decimal("30"))

        result = processor.process_order(valid_order, poor_user)

        assert result.success is False
        assert result.status == OrderStatus.INSUFFICIENT_FUNDS

    def test_fails_when_payment_fails(
        self,
        inventory: MockInventory,
        email_service: MockEmailService,
        valid_order: Order,
        valid_user: User,
    ) -> None:
        """Should fail when payment fails."""
        failed_payment = MockPaymentGateway(should_succeed=False)
        processor = OrderProcessor(inventory, failed_payment, email_service)

        result = processor.process_order(valid_order, valid_user)

        assert result.success is False
        assert result.status == OrderStatus.PAYMENT_FAILED

    def test_decreases_inventory_on_success(
        self,
        processor: OrderProcessor,
        valid_order: Order,
        valid_user: User,
        inventory: MockInventory,
    ) -> None:
        """Should decrease inventory on successful order."""
        processor.process_order(valid_order, valid_user)

        assert ("item-1", 2) in inventory.decreased
        assert ("item-2", 1) in inventory.decreased

    def test_does_not_decrease_inventory_on_payment_failure(
        self,
        inventory: MockInventory,
        email_service: MockEmailService,
        valid_order: Order,
        valid_user: User,
    ) -> None:
        """Should not decrease inventory when payment fails."""
        failed_payment = MockPaymentGateway(should_succeed=False)
        processor = OrderProcessor(inventory, failed_payment, email_service)

        processor.process_order(valid_order, valid_user)

        assert len(inventory.decreased) == 0

    def test_sends_email_on_success(
        self,
        processor: OrderProcessor,
        valid_order: Order,
        valid_user: User,
        email_service: MockEmailService,
    ) -> None:
        """Should send confirmation email on success."""
        processor.process_order(valid_order, valid_user)

        assert len(email_service.sent) == 1
        to, subject, body = email_service.sent[0]
        assert to == "test@example.com"
        assert "confirmed" in subject.lower()
        assert "order-123" in body


class TestOrderItem:
    """Tests for OrderItem dataclass."""

    def test_subtotal_calculation(self) -> None:
        """Should calculate subtotal correctly."""
        item = OrderItem(id="1", name="Test", price=Decimal("10.50"), quantity=3)

        assert item.subtotal == Decimal("31.50")

    def test_is_immutable(self) -> None:
        """OrderItem should be immutable."""
        item = OrderItem(id="1", name="Test", price=Decimal("10"), quantity=1)

        with pytest.raises(Exception):  # FrozenInstanceError
            item.quantity = 5  # type: ignore


class TestOrder:
    """Tests for Order dataclass."""

    def test_total_calculation(self) -> None:
        """Should calculate total correctly."""
        order = Order(
            id="1",
            items=(
                OrderItem(id="1", name="A", price=Decimal("10"), quantity=2),
                OrderItem(id="2", name="B", price=Decimal("5"), quantity=4),
            ),
        )

        assert order.total == Decimal("40")  # 20 + 20

    def test_is_empty(self) -> None:
        """Should detect empty order."""
        empty = Order(id="1", items=())
        non_empty = Order(id="2", items=(OrderItem(id="1", name="A", price=Decimal("10"), quantity=1),))

        assert empty.is_empty is True
        assert non_empty.is_empty is False


class TestOrderResult:
    """Tests for OrderResult dataclass."""

    def test_successful_factory(self) -> None:
        """Should create successful result."""
        result = OrderResult.successful("order-1", Decimal("100"))

        assert result.success is True
        assert result.status == OrderStatus.SUCCESS
        assert result.order_id == "order-1"
        assert result.total == Decimal("100")

    def test_failed_factory(self) -> None:
        """Should create failed result."""
        result = OrderResult.failed(OrderStatus.OUT_OF_STOCK, "Widget out of stock")

        assert result.success is False
        assert result.status == OrderStatus.OUT_OF_STOCK
        assert result.error_message == "Widget out of stock"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
