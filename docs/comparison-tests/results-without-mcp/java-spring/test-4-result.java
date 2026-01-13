// Test JAVA-4: Refactor PaymentService to clean architecture

// === Value Objects ===
package com.example.payment.domain;

import java.math.BigDecimal;
import java.util.Objects;

public final class Money {
    private final BigDecimal amount;

    private Money(BigDecimal amount) {
        this.amount = amount;
    }

    public static Money of(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException("Amount must be greater than zero");
        }
        return new Money(amount);
    }

    public BigDecimal getAmount() {
        return amount;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return amount.compareTo(money.amount) == 0;
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount);
    }
}

public final class CardNumber {
    private final String value;

    private CardNumber(String value) {
        this.value = value;
    }

    public static CardNumber of(String cardNumber) {
        if (cardNumber == null || cardNumber.length() != 16) {
            throw new InvalidCardException("Card number must be exactly 16 digits");
        }
        if (!cardNumber.matches("\\d+")) {
            throw new InvalidCardException("Card number must contain only digits");
        }
        return new CardNumber(cardNumber);
    }

    public String getValue() {
        return value;
    }

    public String getMasked() {
        return "****" + value.substring(12);
    }
}

public final class UserId {
    private final Long value;

    private UserId(Long value) {
        this.value = value;
    }

    public static UserId of(Long id) {
        if (id == null || id <= 0) {
            throw new InvalidUserException("Invalid user ID");
        }
        return new UserId(id);
    }

    public Long getValue() {
        return value;
    }
}

// === Custom Exceptions ===
package com.example.payment.domain.exception;

public class PaymentException extends RuntimeException {
    public PaymentException(String message) {
        super(message);
    }
}

public class InvalidAmountException extends PaymentException {
    public InvalidAmountException(String message) {
        super(message);
    }
}

public class InvalidCardException extends PaymentException {
    public InvalidCardException(String message) {
        super(message);
    }
}

public class InvalidUserException extends PaymentException {
    public InvalidUserException(String message) {
        super(message);
    }
}

public class UserNotFoundException extends PaymentException {
    public UserNotFoundException(Long userId) {
        super("User not found with ID: " + userId);
    }
}

// === Domain Entity ===
package com.example.payment.domain;

import java.time.Instant;
import java.util.UUID;

public class Payment {
    private final String id;
    private final UserId userId;
    private final Money amount;
    private final CardNumber cardNumber;
    private final PaymentStatus status;
    private final Instant createdAt;

    private Payment(Builder builder) {
        this.id = builder.id;
        this.userId = builder.userId;
        this.amount = builder.amount;
        this.cardNumber = builder.cardNumber;
        this.status = builder.status;
        this.createdAt = builder.createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // Getters
    public String getId() { return id; }
    public UserId getUserId() { return userId; }
    public Money getAmount() { return amount; }
    public CardNumber getCardNumber() { return cardNumber; }
    public PaymentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private UserId userId;
        private Money amount;
        private CardNumber cardNumber;
        private PaymentStatus status = PaymentStatus.COMPLETED;
        private Instant createdAt = Instant.now();

        public Builder userId(UserId userId) { this.userId = userId; return this; }
        public Builder amount(Money amount) { this.amount = amount; return this; }
        public Builder cardNumber(CardNumber cardNumber) { this.cardNumber = cardNumber; return this; }
        public Builder status(PaymentStatus status) { this.status = status; return this; }

        public Payment build() {
            return new Payment(this);
        }
    }
}

public enum PaymentStatus {
    PENDING, COMPLETED, FAILED, REFUNDED
}

// === Ports (Interfaces) ===
package com.example.payment.domain.port;

import com.example.payment.domain.*;
import java.util.Optional;

public interface PaymentRepository {
    Payment save(Payment payment);
    Optional<Payment> findById(String id);
}

public interface UserRepository {
    Optional<User> findById(Long id);
}

public interface EmailNotificationService {
    void sendPaymentConfirmation(String email, Money amount);
}

// === Application Service ===
package com.example.payment.application;

import com.example.payment.domain.*;
import com.example.payment.domain.exception.*;
import com.example.payment.domain.port.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailService;

    public PaymentService(
            PaymentRepository paymentRepository,
            UserRepository userRepository,
            EmailNotificationService emailService) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Payment processPayment(Long userId, BigDecimal amount, String cardNumber) {
        UserId validUserId = UserId.of(userId);
        Money validAmount = Money.of(amount);
        CardNumber validCard = CardNumber.of(cardNumber);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        Payment payment = Payment.builder()
            .userId(validUserId)
            .amount(validAmount)
            .cardNumber(validCard)
            .status(PaymentStatus.COMPLETED)
            .build();

        Payment savedPayment = paymentRepository.save(payment);

        emailService.sendPaymentConfirmation(user.getEmail(), validAmount);

        return savedPayment;
    }
}

// === Tests ===
package com.example.payment;

import com.example.payment.application.PaymentService;
import com.example.payment.domain.*;
import com.example.payment.domain.exception.*;
import com.example.payment.domain.port.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailNotificationService emailService;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, userRepository, emailService);
    }

    @Test
    void processPayment_WithValidData_ShouldCreatePayment() {
        User user = new User(1L, "test@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment result = paymentService.processPayment(1L, new BigDecimal("100.00"), "1234567890123456");

        assertNotNull(result);
        assertEquals(PaymentStatus.COMPLETED, result.getStatus());
        verify(emailService).sendPaymentConfirmation(eq("test@example.com"), any(Money.class));
    }

    @Test
    void processPayment_WithInvalidAmount_ShouldThrowException() {
        assertThrows(InvalidAmountException.class, () ->
            paymentService.processPayment(1L, BigDecimal.ZERO, "1234567890123456"));

        assertThrows(InvalidAmountException.class, () ->
            paymentService.processPayment(1L, new BigDecimal("-10"), "1234567890123456"));
    }

    @Test
    void processPayment_WithInvalidCard_ShouldThrowException() {
        User user = new User(1L, "test@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThrows(InvalidCardException.class, () ->
            paymentService.processPayment(1L, new BigDecimal("100"), "123")); // Too short

        assertThrows(InvalidCardException.class, () ->
            paymentService.processPayment(1L, new BigDecimal("100"), null));
    }

    @Test
    void processPayment_WithNonExistentUser_ShouldThrowException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () ->
            paymentService.processPayment(999L, new BigDecimal("100"), "1234567890123456"));
    }
}

// Value Object Tests
class MoneyTest {
    @Test
    void of_WithPositiveAmount_ShouldCreateMoney() {
        Money money = Money.of(new BigDecimal("50.00"));
        assertEquals(new BigDecimal("50.00"), money.getAmount());
    }

    @Test
    void of_WithZeroAmount_ShouldThrowException() {
        assertThrows(InvalidAmountException.class, () -> Money.of(BigDecimal.ZERO));
    }

    @Test
    void of_WithNegativeAmount_ShouldThrowException() {
        assertThrows(InvalidAmountException.class, () -> Money.of(new BigDecimal("-10")));
    }
}

class CardNumberTest {
    @Test
    void of_WithValid16Digits_ShouldCreateCardNumber() {
        CardNumber card = CardNumber.of("1234567890123456");
        assertEquals("1234567890123456", card.getValue());
    }

    @Test
    void getMasked_ShouldReturnMaskedNumber() {
        CardNumber card = CardNumber.of("1234567890123456");
        assertEquals("****3456", card.getMasked());
    }

    @Test
    void of_WithInvalidLength_ShouldThrowException() {
        assertThrows(InvalidCardException.class, () -> CardNumber.of("123"));
    }

    @Test
    void of_WithNonDigits_ShouldThrowException() {
        assertThrows(InvalidCardException.class, () -> CardNumber.of("123456789012345a"));
    }
}

class UserIdTest {
    @Test
    void of_WithValidId_ShouldCreateUserId() {
        UserId userId = UserId.of(1L);
        assertEquals(1L, userId.getValue());
    }

    @Test
    void of_WithNullId_ShouldThrowException() {
        assertThrows(InvalidUserException.class, () -> UserId.of(null));
    }

    @Test
    void of_WithZeroId_ShouldThrowException() {
        assertThrows(InvalidUserException.class, () -> UserId.of(0L));
    }
}
