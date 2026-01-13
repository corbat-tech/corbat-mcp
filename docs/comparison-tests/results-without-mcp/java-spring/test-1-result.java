// Test JAVA-1: UserService with Spring Data JPA

// === Entity ===
package com.example.user;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    public User() {
        this.id = UUID.randomUUID().toString();
    }

    public User(String name, String email) {
        this();
        this.name = name;
        this.email = email;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

// === Repository ===
package com.example.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
}

// === Service ===
package com.example.user;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(String name, String email) {
        User user = new User(name, email);
        return userRepository.save(user);
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public List<User> listAllUsers() {
        return userRepository.findAll();
    }
}

// === Tests ===
package com.example.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void createUser_ShouldSaveAndReturnUser() {
        User user = new User("John Doe", "john@example.com");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = userService.createUser("John Doe", "john@example.com");

        assertNotNull(result);
        assertEquals("John Doe", result.getName());
        assertEquals("john@example.com", result.getEmail());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void getUserById_WhenUserExists_ShouldReturnUser() {
        User user = new User("Jane Doe", "jane@example.com");
        when(userRepository.findById("test-id")).thenReturn(Optional.of(user));

        Optional<User> result = userService.getUserById("test-id");

        assertTrue(result.isPresent());
        assertEquals("Jane Doe", result.get().getName());
    }

    @Test
    void getUserById_WhenUserNotExists_ShouldReturnEmpty() {
        when(userRepository.findById("invalid-id")).thenReturn(Optional.empty());

        Optional<User> result = userService.getUserById("invalid-id");

        assertFalse(result.isPresent());
    }

    @Test
    void listAllUsers_ShouldReturnAllUsers() {
        List<User> users = Arrays.asList(
            new User("User 1", "user1@example.com"),
            new User("User 2", "user2@example.com")
        );
        when(userRepository.findAll()).thenReturn(users);

        List<User> result = userService.listAllUsers();

        assertEquals(2, result.size());
    }

    @Test
    void listAllUsers_WhenNoUsers_ShouldReturnEmptyList() {
        when(userRepository.findAll()).thenReturn(List.of());

        List<User> result = userService.listAllUsers();

        assertTrue(result.isEmpty());
    }
}
