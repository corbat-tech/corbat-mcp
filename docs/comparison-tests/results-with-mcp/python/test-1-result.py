"""
Test PY-1: Create Service
Create a UserService in Python:
- Create users with name and email
- Get users by ID
- List all users

Use dataclasses and in-memory repository. Include pytest tests.
"""

from __future__ import annotations

import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


# ============================================================================
# Domain Types
# ============================================================================

@dataclass(frozen=True)
class User:
    """Immutable user entity."""
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("User ID cannot be empty")
        if not self.name:
            raise ValueError("User name cannot be empty")
        if not self.email:
            raise ValueError("User email cannot be empty")


@dataclass(frozen=True)
class CreateUserInput:
    """Input data for creating a user."""
    name: str
    email: str


# ============================================================================
# Custom Exceptions
# ============================================================================

class UserNotFoundError(Exception):
    """Raised when a user is not found."""

    def __init__(self, user_id: str) -> None:
        self.user_id = user_id
        super().__init__(f"User with id '{user_id}' not found")


class InvalidUserDataError(Exception):
    """Raised when user data is invalid."""
    pass


class DuplicateEmailError(Exception):
    """Raised when email already exists."""

    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"User with email '{email}' already exists")


# ============================================================================
# Repository Protocol (Port)
# ============================================================================

class UserRepository(Protocol):
    """Protocol defining the user repository interface."""

    def save(self, user: User) -> User:
        """Save a user and return it."""
        ...

    def find_by_id(self, user_id: str) -> User | None:
        """Find a user by ID."""
        ...

    def find_by_email(self, email: str) -> User | None:
        """Find a user by email."""
        ...

    def find_all(self) -> list[User]:
        """Return all users."""
        ...


# ============================================================================
# In-Memory Repository Implementation (Adapter)
# ============================================================================

class InMemoryUserRepository:
    """In-memory implementation of the user repository."""

    def __init__(self) -> None:
        self._users: dict[str, User] = {}

    def save(self, user: User) -> User:
        self._users[user.id] = user
        return user

    def find_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def find_by_email(self, email: str) -> User | None:
        normalized_email = email.lower().strip()
        for user in self._users.values():
            if user.email == normalized_email:
                return user
        return None

    def find_all(self) -> list[User]:
        return list(self._users.values())

    def clear(self) -> None:
        """Clear all users (useful for testing)."""
        self._users.clear()


# ============================================================================
# ID Generator Protocol
# ============================================================================

class IdGenerator(Protocol):
    """Protocol for ID generation."""

    def generate(self) -> str:
        """Generate a unique ID."""
        ...


class UuidGenerator:
    """UUID-based ID generator."""

    def generate(self) -> str:
        return str(uuid.uuid4())


# ============================================================================
# Email Validator
# ============================================================================

class EmailValidator:
    """Email validation utility."""

    EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

    @classmethod
    def is_valid(cls, email: str) -> bool:
        """Check if email format is valid."""
        return bool(cls.EMAIL_PATTERN.match(email))


# ============================================================================
# User Service
# ============================================================================

class UserService:
    """Service for managing users."""

    def __init__(
        self,
        user_repository: UserRepository,
        id_generator: IdGenerator,
    ) -> None:
        self._repository = user_repository
        self._id_generator = id_generator

    def create_user(self, input_data: CreateUserInput) -> User:
        """Create a new user."""
        self._validate_input(input_data)
        self._ensure_email_not_taken(input_data.email)

        user = User(
            id=self._id_generator.generate(),
            name=input_data.name.strip(),
            email=input_data.email.lower().strip(),
        )

        return self._repository.save(user)

    def get_user_by_id(self, user_id: str) -> User:
        """Get a user by ID."""
        user = self._repository.find_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user

    def list_all_users(self) -> list[User]:
        """List all users."""
        return self._repository.find_all()

    def _validate_input(self, input_data: CreateUserInput) -> None:
        """Validate user input data."""
        if not input_data.name or not input_data.name.strip():
            raise InvalidUserDataError("Name is required")

        if not input_data.email or not input_data.email.strip():
            raise InvalidUserDataError("Email is required")

        if not EmailValidator.is_valid(input_data.email):
            raise InvalidUserDataError("Invalid email format")

    def _ensure_email_not_taken(self, email: str) -> None:
        """Ensure email is not already in use."""
        normalized_email = email.lower().strip()
        existing_user = self._repository.find_by_email(normalized_email)
        if existing_user is not None:
            raise DuplicateEmailError(normalized_email)


# ============================================================================
# Mock ID Generator for Testing
# ============================================================================

class MockIdGenerator:
    """Mock ID generator for testing."""

    def __init__(self) -> None:
        self._counter = 0

    def generate(self) -> str:
        self._counter += 1
        return f"user-{self._counter}"

    def reset(self) -> None:
        self._counter = 0


# ============================================================================
# Tests
# ============================================================================

import pytest


@pytest.fixture
def repository() -> InMemoryUserRepository:
    """Create a fresh repository for each test."""
    return InMemoryUserRepository()


@pytest.fixture
def id_generator() -> MockIdGenerator:
    """Create a mock ID generator."""
    return MockIdGenerator()


@pytest.fixture
def user_service(repository: InMemoryUserRepository, id_generator: MockIdGenerator) -> UserService:
    """Create a user service with test dependencies."""
    return UserService(repository, id_generator)


class TestCreateUser:
    """Tests for user creation."""

    def test_create_user_with_valid_data(self, user_service: UserService) -> None:
        """Should create a user with valid data."""
        input_data = CreateUserInput(name="John Doe", email="john@example.com")

        user = user_service.create_user(input_data)

        assert user.id == "user-1"
        assert user.name == "John Doe"
        assert user.email == "john@example.com"

    def test_create_user_normalizes_email_to_lowercase(self, user_service: UserService) -> None:
        """Should normalize email to lowercase."""
        input_data = CreateUserInput(name="Test User", email="TEST@EXAMPLE.COM")

        user = user_service.create_user(input_data)

        assert user.email == "test@example.com"

    def test_create_user_trims_whitespace(self, user_service: UserService) -> None:
        """Should trim whitespace from name and email."""
        input_data = CreateUserInput(name="  John Doe  ", email="  john@example.com  ")

        user = user_service.create_user(input_data)

        assert user.name == "John Doe"
        assert user.email == "john@example.com"

    def test_create_user_fails_with_empty_name(self, user_service: UserService) -> None:
        """Should fail when name is empty."""
        input_data = CreateUserInput(name="", email="test@example.com")

        with pytest.raises(InvalidUserDataError, match="Name is required"):
            user_service.create_user(input_data)

    def test_create_user_fails_with_whitespace_only_name(self, user_service: UserService) -> None:
        """Should fail when name is whitespace only."""
        input_data = CreateUserInput(name="   ", email="test@example.com")

        with pytest.raises(InvalidUserDataError, match="Name is required"):
            user_service.create_user(input_data)

    def test_create_user_fails_with_empty_email(self, user_service: UserService) -> None:
        """Should fail when email is empty."""
        input_data = CreateUserInput(name="Test User", email="")

        with pytest.raises(InvalidUserDataError, match="Email is required"):
            user_service.create_user(input_data)

    def test_create_user_fails_with_invalid_email(self, user_service: UserService) -> None:
        """Should fail when email format is invalid."""
        input_data = CreateUserInput(name="Test User", email="invalid-email")

        with pytest.raises(InvalidUserDataError, match="Invalid email format"):
            user_service.create_user(input_data)

    def test_create_user_fails_with_duplicate_email(self, user_service: UserService) -> None:
        """Should fail when email already exists."""
        user_service.create_user(CreateUserInput(name="User 1", email="duplicate@example.com"))

        with pytest.raises(DuplicateEmailError, match="already exists"):
            user_service.create_user(CreateUserInput(name="User 2", email="duplicate@example.com"))

    def test_create_user_fails_with_duplicate_email_case_insensitive(self, user_service: UserService) -> None:
        """Should fail for duplicate email regardless of case."""
        user_service.create_user(CreateUserInput(name="User 1", email="test@example.com"))

        with pytest.raises(DuplicateEmailError):
            user_service.create_user(CreateUserInput(name="User 2", email="TEST@EXAMPLE.COM"))


class TestGetUserById:
    """Tests for getting user by ID."""

    def test_get_user_by_id_returns_user(self, user_service: UserService) -> None:
        """Should return user when found."""
        created = user_service.create_user(CreateUserInput(name="Jane Doe", email="jane@example.com"))

        found = user_service.get_user_by_id(created.id)

        assert found.id == created.id
        assert found.name == "Jane Doe"
        assert found.email == "jane@example.com"

    def test_get_user_by_id_raises_when_not_found(self, user_service: UserService) -> None:
        """Should raise UserNotFoundError when user does not exist."""
        with pytest.raises(UserNotFoundError, match="non-existent"):
            user_service.get_user_by_id("non-existent")

    def test_get_user_by_id_includes_user_id_in_error(self, user_service: UserService) -> None:
        """Should include user ID in the error."""
        try:
            user_service.get_user_by_id("missing-user-123")
        except UserNotFoundError as e:
            assert e.user_id == "missing-user-123"


class TestListAllUsers:
    """Tests for listing all users."""

    def test_list_all_users_returns_all(self, user_service: UserService) -> None:
        """Should return all users."""
        user_service.create_user(CreateUserInput(name="User 1", email="user1@example.com"))
        user_service.create_user(CreateUserInput(name="User 2", email="user2@example.com"))
        user_service.create_user(CreateUserInput(name="User 3", email="user3@example.com"))

        users = user_service.list_all_users()

        assert len(users) == 3
        names = [u.name for u in users]
        assert "User 1" in names
        assert "User 2" in names
        assert "User 3" in names

    def test_list_all_users_returns_empty_when_no_users(self, user_service: UserService) -> None:
        """Should return empty list when no users exist."""
        users = user_service.list_all_users()

        assert users == []


class TestEmailValidator:
    """Tests for email validation."""

    @pytest.mark.parametrize("email", [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@example.co.uk",
    ])
    def test_valid_emails(self, email: str) -> None:
        """Should accept valid email formats."""
        assert EmailValidator.is_valid(email) is True

    @pytest.mark.parametrize("email", [
        "invalid",
        "missing@domain",
        "@nodomain.com",
        "spaces in@email.com",
    ])
    def test_invalid_emails(self, email: str) -> None:
        """Should reject invalid email formats."""
        assert EmailValidator.is_valid(email) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
