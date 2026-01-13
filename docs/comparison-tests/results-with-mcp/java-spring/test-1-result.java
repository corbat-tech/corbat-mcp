/**
 * Test JAVA-1: UserService
 * Create a UserService in Java Spring Boot that can:
 * - Create users with name and email
 * - Get users by ID
 * - List all users
 *
 * Use Spring Data JPA with in-memory H2. Include unit tests with JUnit 5 and Mockito.
 */

// ============================================================================
// Domain Entity
// ============================================================================

package com.example.users.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
        // JPA requires default constructor
    }

    public User(String name, String email) {
        this.name = name;
        this.email = email.toLowerCase().trim();
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

// ============================================================================
// Repository Interface
// ============================================================================

package com.example.users.repository;

import com.example.users.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}

// ============================================================================
// Custom Exceptions
// ============================================================================

package com.example.users.exception;

public class UserNotFoundException extends RuntimeException {

    private final String userId;

    public UserNotFoundException(String userId) {
        super("User with id '" + userId + "' not found");
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }
}

package com.example.users.exception;

public class DuplicateEmailException extends RuntimeException {

    private final String email;

    public DuplicateEmailException(String email) {
        super("User with email '" + email + "' already exists");
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}

package com.example.users.exception;

public class InvalidUserDataException extends RuntimeException {

    public InvalidUserDataException(String message) {
        super(message);
    }
}

// ============================================================================
// DTOs
// ============================================================================

package com.example.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email
) {}

package com.example.users.dto;

import java.time.Instant;

public record UserResponse(
    String id,
    String name,
    String email,
    Instant createdAt
) {
    public static UserResponse from(com.example.users.domain.User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getCreatedAt()
        );
    }
}

// ============================================================================
// Service Interface
// ============================================================================

package com.example.users.service;

import com.example.users.dto.CreateUserRequest;
import com.example.users.dto.UserResponse;

import java.util.List;

public interface UserService {

    UserResponse createUser(CreateUserRequest request);

    UserResponse getUserById(String id);

    List<UserResponse> listAllUsers();
}

// ============================================================================
// Service Implementation
// ============================================================================

package com.example.users.service;

import com.example.users.domain.User;
import com.example.users.dto.CreateUserRequest;
import com.example.users.dto.UserResponse;
import com.example.users.exception.DuplicateEmailException;
import com.example.users.exception.InvalidUserDataException;
import com.example.users.exception.UserNotFoundException;
import com.example.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        validateRequest(request);
        ensureEmailNotTaken(request.email());

        User user = new User(request.name().trim(), request.email());
        User savedUser = userRepository.save(user);

        return UserResponse.from(savedUser);
    }

    @Override
    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));

        return UserResponse.from(user);
    }

    @Override
    public List<UserResponse> listAllUsers() {
        return userRepository.findAll()
            .stream()
            .map(UserResponse::from)
            .toList();
    }

    private void validateRequest(CreateUserRequest request) {
        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new InvalidUserDataException("Name is required");
        }
        if (request.email() == null || request.email().trim().isEmpty()) {
            throw new InvalidUserDataException("Email is required");
        }
    }

    private void ensureEmailNotTaken(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateEmailException(normalizedEmail);
        }
    }
}

// ============================================================================
// Unit Tests with JUnit 5 and Mockito
// ============================================================================

package com.example.users.service;

import com.example.users.domain.User;
import com.example.users.dto.CreateUserRequest;
import com.example.users.dto.UserResponse;
import com.example.users.exception.DuplicateEmailException;
import com.example.users.exception.InvalidUserDataException;
import com.example.users.exception.UserNotFoundException;
import com.example.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository);
    }

    @Nested
    @DisplayName("createUser")
    class CreateUserTests {

        @Test
        @DisplayName("should create user with valid data")
        void shouldCreateUserWithValidData() {
            // Given
            CreateUserRequest request = new CreateUserRequest("John Doe", "john@example.com");
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            UserResponse response = userService.createUser(request);

            // Then
            assertThat(response.name()).isEqualTo("John Doe");
            assertThat(response.email()).isEqualTo("john@example.com");

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());
            assertThat(userCaptor.getValue().getName()).isEqualTo("John Doe");
        }

        @Test
        @DisplayName("should normalize email to lowercase")
        void shouldNormalizeEmailToLowercase() {
            // Given
            CreateUserRequest request = new CreateUserRequest("Test User", "TEST@EXAMPLE.COM");
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            UserResponse response = userService.createUser(request);

            // Then
            assertThat(response.email()).isEqualTo("test@example.com");
        }

        @Test
        @DisplayName("should throw InvalidUserDataException for empty name")
        void shouldThrowExceptionForEmptyName() {
            // Given
            CreateUserRequest request = new CreateUserRequest("", "test@example.com");

            // When/Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(InvalidUserDataException.class)
                .hasMessageContaining("Name is required");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw InvalidUserDataException for empty email")
        void shouldThrowExceptionForEmptyEmail() {
            // Given
            CreateUserRequest request = new CreateUserRequest("John", "");

            // When/Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(InvalidUserDataException.class)
                .hasMessageContaining("Email is required");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw DuplicateEmailException for existing email")
        void shouldThrowExceptionForDuplicateEmail() {
            // Given
            CreateUserRequest request = new CreateUserRequest("John", "existing@example.com");
            when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(DuplicateEmailException.class)
                .hasMessageContaining("already exists");

            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("getUserById")
    class GetUserByIdTests {

        @Test
        @DisplayName("should return user when found")
        void shouldReturnUserWhenFound() {
            // Given
            User user = new User("Jane Doe", "jane@example.com");
            when(userRepository.findById("user-123")).thenReturn(Optional.of(user));

            // When
            UserResponse response = userService.getUserById("user-123");

            // Then
            assertThat(response.name()).isEqualTo("Jane Doe");
            assertThat(response.email()).isEqualTo("jane@example.com");
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user not found")
        void shouldThrowExceptionWhenUserNotFound() {
            // Given
            when(userRepository.findById("non-existent")).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> userService.getUserById("non-existent"))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("non-existent");
        }
    }

    @Nested
    @DisplayName("listAllUsers")
    class ListAllUsersTests {

        @Test
        @DisplayName("should return all users")
        void shouldReturnAllUsers() {
            // Given
            List<User> users = List.of(
                new User("User 1", "user1@example.com"),
                new User("User 2", "user2@example.com"),
                new User("User 3", "user3@example.com")
            );
            when(userRepository.findAll()).thenReturn(users);

            // When
            List<UserResponse> response = userService.listAllUsers();

            // Then
            assertThat(response).hasSize(3);
            assertThat(response).extracting(UserResponse::name)
                .containsExactly("User 1", "User 2", "User 3");
        }

        @Test
        @DisplayName("should return empty list when no users exist")
        void shouldReturnEmptyListWhenNoUsers() {
            // Given
            when(userRepository.findAll()).thenReturn(Collections.emptyList());

            // When
            List<UserResponse> response = userService.listAllUsers();

            // Then
            assertThat(response).isEmpty();
        }
    }
}

// ============================================================================
// Application Properties (src/main/resources/application.properties)
// ============================================================================
/*
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.h2.console.enabled=true
*/
