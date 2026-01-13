# Test PY-4: Refactor to Python best practices

from dataclasses import dataclass
from typing import Protocol, Optional
from decimal import Decimal
from enum import Enum
import pytest


# Custom exceptions
class OrderError(Exception):
    """Base exception for order processing errors."""
    pass


class InvalidInputError(OrderError):
    """Raised when order or user input is invalid."""
    pass


class EmptyCartError(OrderError):
    """Raised when cart has no items."""
    pass


class InsufficientStockError(OrderError):
    """Raised when item is out of stock."""
    def __init__(self, item_name: str):
        self.item_name = item_name
        super().__init__(f"Out of stock: {item_name}")


class InsufficientFundsError(OrderError):
    """Raised when user balance is insufficient."""
    pass


class PaymentError(OrderError):
    """Raised when payment processing fails."""
    pass


# Value objects
@dataclass(frozen=True)
class OrderItem:
    id: str
    name: str
    price: Decimal
    quantity: int

    @property
    def subtotal(self) -> Decimal:
        return self.price * self.quantity


@dataclass(frozen=True)
class Order:
    id: str
    items: tuple[OrderItem, ...]

    @property
    def total(self) -> Decimal:
        return sum(item.subtotal for item in self.items)


@dataclass(frozen=True)
class User:
    id: str
    email: str
    balance: Decimal


@dataclass(frozen=True)
class OrderResult:
    success: bool
    order_id: Optional[str] = None
    total: Optional[Decimal] = None
    error: Optional[str] = None


# Protocols (interfaces)
class InventoryProtocol(Protocol):
    def check(self, item_id: str) -> int:
        ...

    def decrease(self, item_id: str, quantity: int) -> None:
        ...


class PaymentGatewayProtocol(Protocol):
    def charge(self, user_id: str, amount: Decimal) -> dict:
        ...


class EmailServiceProtocol(Protocol):
    def send(self, to: str, subject: str, body: str) -> None:
        ...


# Refactored service
class OrderProcessor:
    def __init__(
        self,
        inventory: InventoryProtocol,
        payment_gateway: PaymentGatewayProtocol,
        email_service: EmailServiceProtocol,
    ):
        self._inventory = inventory
        self._payment_gateway = payment_gateway
        self._email_service = email_service

    def process_order(self, order: Optional[Order], user: Optional[User]) -> OrderResult:
        try:
            self._validate_input(order, user)
            self._check_inventory(order)
            self._validate_balance(user, order.total)
            self._process_payment(user, order.total)
            self._update_inventory(order)
            self._send_confirmation(user, order)

            return OrderResult(
                success=True,
                order_id=order.id,
                total=order.total,
            )
        except OrderError as e:
            return OrderResult(success=False, error=str(e))

    def _validate_input(self, order: Optional[Order], user: Optional[User]) -> None:
        if order is None or user is None:
            raise InvalidInputError("Invalid input")
        if not order.items:
            raise EmptyCartError("Empty cart")

    def _check_inventory(self, order: Order) -> None:
        for item in order.items:
            available = self._inventory.check(item.id)
            if available < item.quantity:
                raise InsufficientStockError(item.name)

    def _validate_balance(self, user: User, total: Decimal) -> None:
        if user.balance < total:
            raise InsufficientFundsError("Insufficient funds")

    def _process_payment(self, user: User, total: Decimal) -> None:
        result = self._payment_gateway.charge(user.id, total)
        if not result.get("success"):
            raise PaymentError("Payment failed")

    def _update_inventory(self, order: Order) -> None:
        for item in order.items:
            self._inventory.decrease(item.id, item.quantity)

    def _send_confirmation(self, user: User, order: Order) -> None:
        self._email_service.send(
            user.email,
            "Order confirmed",
            f"Your order #{order.id} is confirmed.",
        )


# Tests
class MockInventory:
    def __init__(self, stock: dict[str, int] = None):
        self._stock = stock or {}
        self.decreases: list[tuple[str, int]] = []

    def check(self, item_id: str) -> int:
        return self._stock.get(item_id, 0)

    def decrease(self, item_id: str, quantity: int) -> None:
        self.decreases.append((item_id, quantity))


class MockPaymentGateway:
    def __init__(self, success: bool = True):
        self._success = success
        self.charges: list[tuple[str, Decimal]] = []

    def charge(self, user_id: str, amount: Decimal) -> dict:
        self.charges.append((user_id, amount))
        return {"success": self._success}


class MockEmailService:
    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, subject, body))


class TestOrderProcessor:
    @pytest.fixture
    def inventory(self):
        return MockInventory({"item-1": 100, "item-2": 50})

    @pytest.fixture
    def payment_gateway(self):
        return MockPaymentGateway(success=True)

    @pytest.fixture
    def email_service(self):
        return MockEmailService()

    @pytest.fixture
    def processor(self, inventory, payment_gateway, email_service):
        return OrderProcessor(inventory, payment_gateway, email_service)

    @pytest.fixture
    def sample_order(self):
        return Order(
            id="order-123",
            items=(
                OrderItem(id="item-1", name="Product A", price=Decimal("10.00"), quantity=2),
                OrderItem(id="item-2", name="Product B", price=Decimal("5.00"), quantity=1),
            ),
        )

    @pytest.fixture
    def sample_user(self):
        return User(id="user-1", email="test@example.com", balance=Decimal("100.00"))

    class TestInputValidation:
        def test_returns_error_when_order_is_none(self, processor, sample_user):
            result = processor.process_order(None, sample_user)

            assert result.success is False
            assert result.error == "Invalid input"

        def test_returns_error_when_user_is_none(self, processor, sample_order):
            result = processor.process_order(sample_order, None)

            assert result.success is False
            assert result.error == "Invalid input"

        def test_returns_error_when_cart_is_empty(self, processor, sample_user):
            empty_order = Order(id="order-1", items=())

            result = processor.process_order(empty_order, sample_user)

            assert result.success is False
            assert result.error == "Empty cart"

    class TestInventoryCheck:
        def test_returns_error_when_out_of_stock(self, processor, sample_user):
            order = Order(
                id="order-1",
                items=(OrderItem(id="item-1", name="Widget", price=Decimal("10"), quantity=200),),
            )

            result = processor.process_order(order, sample_user)

            assert result.success is False
            assert "Out of stock: Widget" in result.error

    class TestBalanceValidation:
        def test_returns_error_when_insufficient_funds(self, processor, sample_order):
            poor_user = User(id="user-1", email="test@example.com", balance=Decimal("1.00"))

            result = processor.process_order(sample_order, poor_user)

            assert result.success is False
            assert result.error == "Insufficient funds"

    class TestPayment:
        def test_returns_error_when_payment_fails(self, inventory, email_service, sample_order, sample_user):
            failed_payment = MockPaymentGateway(success=False)
            processor = OrderProcessor(inventory, failed_payment, email_service)

            result = processor.process_order(sample_order, sample_user)

            assert result.success is False
            assert result.error == "Payment failed"

    class TestSuccessfulOrder:
        def test_updates_inventory(self, processor, inventory, sample_order, sample_user):
            processor.process_order(sample_order, sample_user)

            assert ("item-1", 2) in inventory.decreases
            assert ("item-2", 1) in inventory.decreases

        def test_sends_confirmation_email(self, processor, email_service, sample_order, sample_user):
            processor.process_order(sample_order, sample_user)

            assert len(email_service.sent) == 1
            to, subject, body = email_service.sent[0]
            assert to == "test@example.com"
            assert subject == "Order confirmed"
            assert "order-123" in body

        def test_returns_success_result(self, processor, sample_order, sample_user):
            result = processor.process_order(sample_order, sample_user)

            assert result.success is True
            assert result.order_id == "order-123"
            assert result.total == Decimal("25.00")  # 10*2 + 5*1

        def test_charges_correct_amount(self, processor, payment_gateway, sample_order, sample_user):
            processor.process_order(sample_order, sample_user)

            assert len(payment_gateway.charges) == 1
            user_id, amount = payment_gateway.charges[0]
            assert user_id == "user-1"
            assert amount == Decimal("25.00")
