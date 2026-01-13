# Test PY-1: UserService with in-memory repository

from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4
import pytest


@dataclass
class User:
    name: str
    email: str
    id: str = field(default_factory=lambda: str(uuid4()))


class UserRepository:
    def __init__(self):
        self._users: dict[str, User] = {}

    def save(self, user: User) -> User:
        self._users[user.id] = user
        return user

    def find_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def find_all(self) -> list[User]:
        return list(self._users.values())

    def clear(self) -> None:
        self._users.clear()


class UserService:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def create_user(self, name: str, email: str) -> User:
        user = User(name=name, email=email)
        return self._repository.save(user)

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self._repository.find_by_id(user_id)

    def list_all_users(self) -> list[User]:
        return self._repository.find_all()


# Tests
class TestUserService:
    @pytest.fixture
    def repository(self):
        return UserRepository()

    @pytest.fixture
    def service(self, repository):
        return UserService(repository)

    class TestCreateUser:
        def test_creates_user_with_name_and_email(self, service):
            user = service.create_user("John Doe", "john@example.com")

            assert user.id is not None
            assert user.name == "John Doe"
            assert user.email == "john@example.com"

        def test_generates_unique_ids(self, service):
            user1 = service.create_user("User 1", "user1@example.com")
            user2 = service.create_user("User 2", "user2@example.com")

            assert user1.id != user2.id

    class TestGetUserById:
        def test_returns_user_when_found(self, service):
            created = service.create_user("Jane Doe", "jane@example.com")

            found = service.get_user_by_id(created.id)

            assert found == created

        def test_returns_none_when_not_found(self, service):
            found = service.get_user_by_id("non-existent-id")

            assert found is None

    class TestListAllUsers:
        def test_returns_empty_list_when_no_users(self, service):
            users = service.list_all_users()

            assert users == []

        def test_returns_all_created_users(self, service):
            user1 = service.create_user("User 1", "user1@example.com")
            user2 = service.create_user("User 2", "user2@example.com")

            users = service.list_all_users()

            assert len(users) == 2
            assert user1 in users
            assert user2 in users


class TestUserRepository:
    @pytest.fixture
    def repository(self):
        return UserRepository()

    def test_save_persists_user(self, repository):
        user = User(name="Test", email="test@example.com")

        saved = repository.save(user)
        found = repository.find_by_id(user.id)

        assert saved == user
        assert found == user

    def test_find_all_returns_all_users(self, repository):
        user1 = User(name="User 1", email="user1@example.com")
        user2 = User(name="User 2", email="user2@example.com")

        repository.save(user1)
        repository.save(user2)

        users = repository.find_all()

        assert len(users) == 2

    def test_clear_removes_all_users(self, repository):
        repository.save(User(name="Test", email="test@example.com"))
        repository.clear()

        assert repository.find_all() == []
