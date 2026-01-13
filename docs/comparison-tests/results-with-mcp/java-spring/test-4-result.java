/**
 * Test JAVA-4: Refactor to clean architecture
 *
 * Original code had issues:
 * - Field injection (@Autowired) instead of constructor injection
 * - Generic RuntimeException instead of custom exceptions
 * - No validation encapsulation
 * - No value objects for CardNumber, Money
 * - Business logic mixed with infrastructure concerns
 *
 * Apply: constructor injection, custom exceptions, value objects.
 */

// ============================================================================
// Value Objects
// ============================================================================

package com.example.payments.domain.vo;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Value object representing a credit card number.
 * Encapsulates validation logic and masking.
 */
public final class CardNumber {

    private static final Pattern CARD_PATTERN = Pattern.compile("^\\d{16}$");
    private static final int VISIBLE_DIGITS = 4;

    private final String value;

    private CardNumber(String value) {
        this.value = value;
    }

    public static CardNumber of(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidCardNumberException("Card number is required");
        }

        String normalized = value.replaceAll("\\s+", "").replaceAll("-", "");

        if (!CARD_PATTERN.matcher(normalized).matches()) {
            throw new InvalidCardNumberException("Card number must be 16 digits");
        }

        return new CardNumber(normalized);
    }

    public String getValue() {
        return value;
    }

    public String getMasked() {
        return "*".repeat(value.length() - VISIBLE_DIGITS) +
               value.substring(value.length() - VISIBLE_DIGITS);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CardNumber that = (CardNumber) o;
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return getMasked();
    }
}

package com.example.payments.domain.vo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * Value object representing monetary amount.
 * Immutable and encapsulates currency handling.
 */
public final class Money {

    private static final Currency DEFAULT_CURRENCY = Currency.getInstance("USD");

    private final BigDecimal amount;
    private final Currency currency;

    private Money(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currency = currency;
    }

    public static Money of(BigDecimal amount) {
        return of(amount, DEFAULT_CURRENCY);
    }

    public static Money of(BigDecimal amount, Currency currency) {
        if (amount == null) {
            throw new InvalidAmountException("Amount is required");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException("Amount must be greater than zero");
        }
        return new Money(amount, currency);
    }

    public static Money zero() {
        return new Money(BigDecimal.ZERO, DEFAULT_CURRENCY);
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Currency getCurrency() {
        return currency;
    }

    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public boolean isGreaterThan(Money other) {
        validateSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }

    private void validateSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Cannot operate on different currencies");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return amount.compareTo(money.amount) == 0 && Objects.equals(currency, money.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount, currency);
    }

    @Override
    public String toString() {
        return currency.getSymbol() + amount;
    }
}

// ============================================================================
// Custom Exceptions
// ============================================================================

package com.example.payments.domain.vo;

public class InvalidCardNumberException extends RuntimeException {
    public InvalidCardNumberException(String message) {
        super(message);
    }
}

package com.example.payments.domain.vo;

public class InvalidAmountException extends RuntimeException {
    public InvalidAmountException(String message) {
        super(message);
    }
}

package com.example.payments.exception;

public class PaymentException extends RuntimeException {

    private final String code;

    public PaymentException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

package com.example.payments.exception;

public class UserNotFoundException extends RuntimeException {

    private final Long userId;

    public UserNotFoundException(Long userId) {
        super("User with id '" + userId + "' not found");
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}

// ============================================================================
// Domain Entities
// ============================================================================

package com.example.payments.domain;

import com.example.payments.domain.vo.CardNumber;
import com.example.payments.domain.vo.Money;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Embedded
    @AttributeOverride(name = "amount", column = @Column(name = "amount", nullable = false))
    private Money money;

    @Column(name = "card_number_masked", nullable = false)
    private String cardNumberMasked;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Payment() {
        // JPA
    }

    private Payment(Long userId, Money money, CardNumber cardNumber) {
        this.userId = userId;
        this.money = money;
        this.cardNumberMasked = cardNumber.getMasked();
        this.status = PaymentStatus.COMPLETED;
        this.createdAt = Instant.now();
    }

    public static Payment create(Long userId, Money money, CardNumber cardNumber) {
        return new Payment(userId, money, cardNumber);
    }

    public String getId() { return id; }
    public Long getUserId() { return userId; }
    public Money getMoney() { return money; }
    public String getCardNumberMasked() { return cardNumberMasked; }
    public PaymentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Payment payment = (Payment) o;
        return Objects.equals(id, payment.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

package com.example.payments.domain;

public enum PaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED
}

package com.example.payments.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    protected User() {}

    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
}

// ============================================================================
// Repositories
// ============================================================================

package com.example.payments.repository;

import com.example.payments.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, String> {
}

package com.example.payments.repository;

import com.example.payments.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}

// ============================================================================
// Port Interface for Email (Dependency Inversion)
// ============================================================================

package com.example.payments.port;

public interface EmailSender {
    void sendPaymentConfirmation(String email, String paymentId, String amount);
}

// ============================================================================
// Command (CQRS pattern)
// ============================================================================

package com.example.payments.command;

import com.example.payments.domain.vo.CardNumber;
import com.example.payments.domain.vo.Money;

import java.math.BigDecimal;

public record ProcessPaymentCommand(
    Long userId,
    BigDecimal amount,
    String cardNumber
) {
    public Money toMoney() {
        return Money.of(amount);
    }

    public CardNumber toCardNumber() {
        return CardNumber.of(cardNumber);
    }
}

// ============================================================================
// Result (for explicit error handling)
// ============================================================================

package com.example.payments.result;

import com.example.payments.domain.Payment;

public sealed interface PaymentResult permits PaymentResult.Success, PaymentResult.Failure {

    record Success(Payment payment) implements PaymentResult {}

    record Failure(String code, String message) implements PaymentResult {}

    default boolean isSuccess() {
        return this instanceof Success;
    }

    default Payment getPayment() {
        if (this instanceof Success success) {
            return success.payment();
        }
        throw new IllegalStateException("Cannot get payment from failure result");
    }
}

// ============================================================================
// Service Implementation (Clean Architecture)
// ============================================================================

package com.example.payments.service;

import com.example.payments.command.ProcessPaymentCommand;
import com.example.payments.domain.Payment;
import com.example.payments.domain.User;
import com.example.payments.domain.vo.CardNumber;
import com.example.payments.domain.vo.Money;
import com.example.payments.exception.UserNotFoundException;
import com.example.payments.port.EmailSender;
import com.example.payments.repository.PaymentRepository;
import com.example.payments.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;

    // Constructor injection (no @Autowired needed)
    public PaymentService(
            PaymentRepository paymentRepository,
            UserRepository userRepository,
            EmailSender emailSender) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.emailSender = emailSender;
    }

    @Transactional
    public Payment processPayment(ProcessPaymentCommand command) {
        // Validation happens in value objects (fail fast)
        Money money = command.toMoney();
        CardNumber cardNumber = command.toCardNumber();

        // Find user (throws if not found)
        User user = findUserOrThrow(command.userId());

        // Create and save payment
        Payment payment = Payment.create(command.userId(), money, cardNumber);
        Payment savedPayment = paymentRepository.save(payment);

        // Send notification
        emailSender.sendPaymentConfirmation(
            user.getEmail(),
            savedPayment.getId(),
            money.toString()
        );

        return savedPayment;
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

package com.example.payments.service;

import com.example.payments.command.ProcessPaymentCommand;
import com.example.payments.domain.Payment;
import com.example.payments.domain.User;
import com.example.payments.domain.vo.InvalidAmountException;
import com.example.payments.domain.vo.InvalidCardNumberException;
import com.example.payments.exception.UserNotFoundException;
import com.example.payments.port.EmailSender;
import com.example.payments.repository.PaymentRepository;
import com.example.payments.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailSender emailSender;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, userRepository, emailSender);
    }

    @Nested
    @DisplayName("processPayment")
    class ProcessPaymentTests {

        @Test
        @DisplayName("should process payment successfully")
        void shouldProcessPaymentSuccessfully() {
            // Given
            User user = new User("John Doe", "john@example.com");
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("99.99"), "1234567890123456"
            );

            when(userRepository.findById(1L)).thenReturn(Optional.of(user));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Payment result = paymentService.processPayment(command);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getUserId()).isEqualTo(1L);
            assertThat(result.getMoney().getAmount()).isEqualByComparingTo(new BigDecimal("99.99"));
            assertThat(result.getCardNumberMasked()).isEqualTo("************3456");

            verify(emailSender).sendPaymentConfirmation(
                eq("john@example.com"),
                any(),
                eq("$99.99")
            );
        }

        @Test
        @DisplayName("should throw UserNotFoundException when user not found")
        void shouldThrowWhenUserNotFound() {
            // Given
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                999L, new BigDecimal("50.00"), "1234567890123456"
            );
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> paymentService.processPayment(command))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("999");

            verify(paymentRepository, never()).save(any());
            verify(emailSender, never()).sendPaymentConfirmation(any(), any(), any());
        }

        @Test
        @DisplayName("should throw InvalidAmountException for zero amount")
        void shouldThrowForZeroAmount() {
            // Given
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, BigDecimal.ZERO, "1234567890123456"
            );

            // When/Then
            assertThatThrownBy(() -> paymentService.processPayment(command))
                .isInstanceOf(InvalidAmountException.class)
                .hasMessageContaining("greater than zero");

            verify(userRepository, never()).findById(any());
        }

        @Test
        @DisplayName("should throw InvalidAmountException for negative amount")
        void shouldThrowForNegativeAmount() {
            // Given
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("-10.00"), "1234567890123456"
            );

            // When/Then
            assertThatThrownBy(() -> paymentService.processPayment(command))
                .isInstanceOf(InvalidAmountException.class);
        }

        @Test
        @DisplayName("should throw InvalidCardNumberException for invalid card")
        void shouldThrowForInvalidCard() {
            // Given
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("50.00"), "1234"
            );

            // When/Then
            assertThatThrownBy(() -> paymentService.processPayment(command))
                .isInstanceOf(InvalidCardNumberException.class)
                .hasMessageContaining("16 digits");
        }

        @Test
        @DisplayName("should throw InvalidCardNumberException for null card")
        void shouldThrowForNullCard() {
            // Given
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("50.00"), null
            );

            // When/Then
            assertThatThrownBy(() -> paymentService.processPayment(command))
                .isInstanceOf(InvalidCardNumberException.class)
                .hasMessageContaining("required");
        }

        @Test
        @DisplayName("should accept card number with spaces")
        void shouldAcceptCardWithSpaces() {
            // Given
            User user = new User("John Doe", "john@example.com");
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("50.00"), "1234 5678 9012 3456"
            );

            when(userRepository.findById(1L)).thenReturn(Optional.of(user));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Payment result = paymentService.processPayment(command);

            // Then
            assertThat(result.getCardNumberMasked()).isEqualTo("************3456");
        }

        @Test
        @DisplayName("should accept card number with dashes")
        void shouldAcceptCardWithDashes() {
            // Given
            User user = new User("John Doe", "john@example.com");
            ProcessPaymentCommand command = new ProcessPaymentCommand(
                1L, new BigDecimal("50.00"), "1234-5678-9012-3456"
            );

            when(userRepository.findById(1L)).thenReturn(Optional.of(user));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            Payment result = paymentService.processPayment(command);

            // Then
            assertThat(result.getCardNumberMasked()).isEqualTo("************3456");
        }
    }

    @Nested
    @DisplayName("Value Objects")
    class ValueObjectTests {

        @Test
        @DisplayName("CardNumber should mask correctly")
        void cardNumberShouldMask() {
            var cardNumber = com.example.payments.domain.vo.CardNumber.of("1234567890123456");
            assertThat(cardNumber.getMasked()).isEqualTo("************3456");
            assertThat(cardNumber.getValue()).isEqualTo("1234567890123456");
        }

        @Test
        @DisplayName("Money should format correctly")
        void moneyShouldFormat() {
            var money = com.example.payments.domain.vo.Money.of(new BigDecimal("123.456"));
            assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("123.46"));
            assertThat(money.toString()).isEqualTo("$123.46");
        }
    }
}

// ============================================================================
// Email Adapter Implementation (Infrastructure)
// ============================================================================

package com.example.payments.adapter;

import com.example.payments.port.EmailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailSender implements EmailSender {

    @Override
    public void sendPaymentConfirmation(String email, String paymentId, String amount) {
        // In real implementation, use Spring Mail or external service
        System.out.printf("Sending payment confirmation to %s: Payment %s of %s processed%n",
            email, paymentId, amount);
    }
}
