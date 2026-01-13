/**
 * Test JAVA-5: Bank Transfer with Saga Pattern (Advanced)
 * Create a BankTransferService that transfers money between accounts using Saga pattern:
 * - Steps: Reserve funds → Debit source → Credit destination → Confirm
 * - If any step fails, execute compensating transactions (rollback)
 * - State: INITIATED → RESERVED → DEBITED → CREDITED → COMPLETED (or ROLLED_BACK)
 * - Idempotency: same transfer ID should not process twice
 * - Value objects: Money, AccountId, TransferId
 * - Domain events for each state change
 *
 * Include tests for: successful transfer, insufficient funds, rollback scenario,
 * concurrent transfers, idempotency.
 */

// ============================================================================
// Value Objects
// ============================================================================

package com.example.transfer.domain.vo;

import java.util.Objects;
import java.util.UUID;

public final class TransferId {

    private final String value;

    private TransferId(String value) {
        this.value = value;
    }

    public static TransferId of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Transfer ID cannot be empty");
        }
        return new TransferId(value);
    }

    public static TransferId generate() {
        return new TransferId(UUID.randomUUID().toString());
    }

    public String getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TransferId that = (TransferId) o;
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value;
    }
}

package com.example.transfer.domain.vo;

import java.util.Objects;

public final class AccountId {

    private final String value;

    private AccountId(String value) {
        this.value = value;
    }

    public static AccountId of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Account ID cannot be empty");
        }
        return new AccountId(value);
    }

    public String getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AccountId accountId = (AccountId) o;
        return Objects.equals(value, accountId.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value;
    }
}

package com.example.transfer.domain.vo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public final class Money {

    public static final Money ZERO = new Money(BigDecimal.ZERO);

    private final BigDecimal amount;

    private Money(BigDecimal amount) {
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static Money of(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
        return new Money(amount);
    }

    public static Money of(double amount) {
        return of(BigDecimal.valueOf(amount));
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Money add(Money other) {
        return new Money(this.amount.add(other.amount));
    }

    public Money subtract(Money other) {
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new InsufficientFundsException(this, other);
        }
        return new Money(result);
    }

    public boolean isGreaterThanOrEqual(Money other) {
        return this.amount.compareTo(other.amount) >= 0;
    }

    public boolean isPositive() {
        return this.amount.compareTo(BigDecimal.ZERO) > 0;
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

    @Override
    public String toString() {
        return "$" + amount;
    }
}

package com.example.transfer.domain.vo;

public class InsufficientFundsException extends RuntimeException {

    private final Money available;
    private final Money required;

    public InsufficientFundsException(Money available, Money required) {
        super(String.format("Insufficient funds: available %s, required %s", available, required));
        this.available = available;
        this.required = required;
    }

    public Money getAvailable() { return available; }
    public Money getRequired() { return required; }
}

// ============================================================================
// Transfer State
// ============================================================================

package com.example.transfer.domain;

public enum TransferState {
    INITIATED,
    RESERVED,
    DEBITED,
    CREDITED,
    COMPLETED,
    ROLLING_BACK,
    ROLLED_BACK,
    FAILED;

    public boolean isTerminal() {
        return this == COMPLETED || this == ROLLED_BACK || this == FAILED;
    }

    public boolean canTransitionTo(TransferState next) {
        return switch (this) {
            case INITIATED -> next == RESERVED || next == FAILED;
            case RESERVED -> next == DEBITED || next == ROLLING_BACK;
            case DEBITED -> next == CREDITED || next == ROLLING_BACK;
            case CREDITED -> next == COMPLETED || next == ROLLING_BACK;
            case ROLLING_BACK -> next == ROLLED_BACK || next == FAILED;
            case COMPLETED, ROLLED_BACK, FAILED -> false;
        };
    }
}

// ============================================================================
// Domain Events
// ============================================================================

package com.example.transfer.domain.event;

import com.example.transfer.domain.vo.TransferId;
import java.time.Instant;

public sealed interface TransferEvent permits
        TransferEvent.TransferInitiated,
        TransferEvent.FundsReserved,
        TransferEvent.SourceDebited,
        TransferEvent.DestinationCredited,
        TransferEvent.TransferCompleted,
        TransferEvent.TransferFailed,
        TransferEvent.RollbackStarted,
        TransferEvent.TransferRolledBack {

    TransferId transferId();
    Instant timestamp();

    record TransferInitiated(TransferId transferId, Instant timestamp, String sourceAccount, String destAccount, String amount) implements TransferEvent {}
    record FundsReserved(TransferId transferId, Instant timestamp) implements TransferEvent {}
    record SourceDebited(TransferId transferId, Instant timestamp) implements TransferEvent {}
    record DestinationCredited(TransferId transferId, Instant timestamp) implements TransferEvent {}
    record TransferCompleted(TransferId transferId, Instant timestamp) implements TransferEvent {}
    record TransferFailed(TransferId transferId, Instant timestamp, String reason) implements TransferEvent {}
    record RollbackStarted(TransferId transferId, Instant timestamp, String reason) implements TransferEvent {}
    record TransferRolledBack(TransferId transferId, Instant timestamp) implements TransferEvent {}
}

// ============================================================================
// Transfer Aggregate
// ============================================================================

package com.example.transfer.domain;

import com.example.transfer.domain.event.TransferEvent;
import com.example.transfer.domain.vo.AccountId;
import com.example.transfer.domain.vo.Money;
import com.example.transfer.domain.vo.TransferId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Transfer {

    private final TransferId id;
    private final AccountId sourceAccount;
    private final AccountId destinationAccount;
    private final Money amount;
    private TransferState state;
    private String failureReason;
    private final Instant createdAt;
    private Instant completedAt;
    private final List<TransferEvent> domainEvents;

    public Transfer(TransferId id, AccountId sourceAccount, AccountId destinationAccount, Money amount) {
        this.id = id;
        this.sourceAccount = sourceAccount;
        this.destinationAccount = destinationAccount;
        this.amount = amount;
        this.state = TransferState.INITIATED;
        this.createdAt = Instant.now();
        this.domainEvents = new ArrayList<>();

        addEvent(new TransferEvent.TransferInitiated(
            id, Instant.now(),
            sourceAccount.getValue(),
            destinationAccount.getValue(),
            amount.toString()
        ));
    }

    public void markReserved() {
        transitionTo(TransferState.RESERVED);
        addEvent(new TransferEvent.FundsReserved(id, Instant.now()));
    }

    public void markDebited() {
        transitionTo(TransferState.DEBITED);
        addEvent(new TransferEvent.SourceDebited(id, Instant.now()));
    }

    public void markCredited() {
        transitionTo(TransferState.CREDITED);
        addEvent(new TransferEvent.DestinationCredited(id, Instant.now()));
    }

    public void markCompleted() {
        transitionTo(TransferState.COMPLETED);
        this.completedAt = Instant.now();
        addEvent(new TransferEvent.TransferCompleted(id, Instant.now()));
    }

    public void startRollback(String reason) {
        transitionTo(TransferState.ROLLING_BACK);
        this.failureReason = reason;
        addEvent(new TransferEvent.RollbackStarted(id, Instant.now(), reason));
    }

    public void markRolledBack() {
        transitionTo(TransferState.ROLLED_BACK);
        this.completedAt = Instant.now();
        addEvent(new TransferEvent.TransferRolledBack(id, Instant.now()));
    }

    public void markFailed(String reason) {
        this.state = TransferState.FAILED;
        this.failureReason = reason;
        this.completedAt = Instant.now();
        addEvent(new TransferEvent.TransferFailed(id, Instant.now(), reason));
    }

    private void transitionTo(TransferState newState) {
        if (!state.canTransitionTo(newState)) {
            throw new IllegalStateException(
                String.format("Cannot transition from %s to %s", state, newState)
            );
        }
        this.state = newState;
    }

    private void addEvent(TransferEvent event) {
        domainEvents.add(event);
    }

    public List<TransferEvent> getDomainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }

    // Getters
    public TransferId getId() { return id; }
    public AccountId getSourceAccount() { return sourceAccount; }
    public AccountId getDestinationAccount() { return destinationAccount; }
    public Money getAmount() { return amount; }
    public TransferState getState() { return state; }
    public String getFailureReason() { return failureReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
}

// ============================================================================
// Account Service Port
// ============================================================================

package com.example.transfer.port;

import com.example.transfer.domain.vo.AccountId;
import com.example.transfer.domain.vo.Money;
import com.example.transfer.domain.vo.TransferId;

public interface AccountService {

    void reserveFunds(AccountId accountId, TransferId transferId, Money amount);

    void debit(AccountId accountId, TransferId transferId, Money amount);

    void credit(AccountId accountId, TransferId transferId, Money amount);

    void releaseReservation(AccountId accountId, TransferId transferId);

    void reverseDebit(AccountId accountId, TransferId transferId, Money amount);

    Money getBalance(AccountId accountId);
}

// ============================================================================
// Transfer Repository Port
// ============================================================================

package com.example.transfer.port;

import com.example.transfer.domain.Transfer;
import com.example.transfer.domain.vo.TransferId;

import java.util.Optional;

public interface TransferRepository {

    void save(Transfer transfer);

    Optional<Transfer> findById(TransferId id);

    boolean exists(TransferId id);
}

// ============================================================================
// Event Publisher Port
// ============================================================================

package com.example.transfer.port;

import com.example.transfer.domain.event.TransferEvent;

public interface EventPublisher {
    void publish(TransferEvent event);
}

// ============================================================================
// Bank Transfer Service (Saga Orchestrator)
// ============================================================================

package com.example.transfer.service;

import com.example.transfer.domain.Transfer;
import com.example.transfer.domain.TransferState;
import com.example.transfer.domain.event.TransferEvent;
import com.example.transfer.domain.vo.AccountId;
import com.example.transfer.domain.vo.Money;
import com.example.transfer.domain.vo.TransferId;
import com.example.transfer.port.AccountService;
import com.example.transfer.port.EventPublisher;
import com.example.transfer.port.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BankTransferService {

    private final TransferRepository transferRepository;
    private final AccountService accountService;
    private final EventPublisher eventPublisher;

    public BankTransferService(
            TransferRepository transferRepository,
            AccountService accountService,
            EventPublisher eventPublisher) {
        this.transferRepository = transferRepository;
        this.accountService = accountService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Transfer initiateTransfer(TransferId transferId, AccountId source, AccountId destination, Money amount) {
        // Idempotency check
        if (transferRepository.exists(transferId)) {
            return transferRepository.findById(transferId)
                .orElseThrow(() -> new IllegalStateException("Transfer exists but not found"));
        }

        Transfer transfer = new Transfer(transferId, source, destination, amount);
        transferRepository.save(transfer);
        publishEvents(transfer);

        return executeTransferSaga(transfer);
    }

    private Transfer executeTransferSaga(Transfer transfer) {
        try {
            // Step 1: Reserve funds
            accountService.reserveFunds(
                transfer.getSourceAccount(),
                transfer.getId(),
                transfer.getAmount()
            );
            transfer.markReserved();
            transferRepository.save(transfer);
            publishEvents(transfer);

            // Step 2: Debit source account
            accountService.debit(
                transfer.getSourceAccount(),
                transfer.getId(),
                transfer.getAmount()
            );
            transfer.markDebited();
            transferRepository.save(transfer);
            publishEvents(transfer);

            // Step 3: Credit destination account
            accountService.credit(
                transfer.getDestinationAccount(),
                transfer.getId(),
                transfer.getAmount()
            );
            transfer.markCredited();
            transferRepository.save(transfer);
            publishEvents(transfer);

            // Step 4: Complete
            transfer.markCompleted();
            transferRepository.save(transfer);
            publishEvents(transfer);

            return transfer;

        } catch (Exception e) {
            return executeCompensation(transfer, e.getMessage());
        }
    }

    private Transfer executeCompensation(Transfer transfer, String reason) {
        transfer.startRollback(reason);
        transferRepository.save(transfer);
        publishEvents(transfer);

        try {
            // Compensate based on current state
            TransferState failedAt = transfer.getState();

            if (failedAt == TransferState.ROLLING_BACK) {
                // Check previous state from events to determine compensation
                boolean wasDebited = transfer.getDomainEvents().stream()
                    .anyMatch(e -> e instanceof TransferEvent.SourceDebited);
                boolean wasReserved = transfer.getDomainEvents().stream()
                    .anyMatch(e -> e instanceof TransferEvent.FundsReserved);

                if (wasDebited) {
                    // Reverse the debit
                    accountService.reverseDebit(
                        transfer.getSourceAccount(),
                        transfer.getId(),
                        transfer.getAmount()
                    );
                }

                if (wasReserved) {
                    // Release the reservation
                    accountService.releaseReservation(
                        transfer.getSourceAccount(),
                        transfer.getId()
                    );
                }
            }

            transfer.markRolledBack();
            transferRepository.save(transfer);
            publishEvents(transfer);

        } catch (Exception compensationError) {
            transfer.markFailed("Compensation failed: " + compensationError.getMessage());
            transferRepository.save(transfer);
            publishEvents(transfer);
        }

        return transfer;
    }

    private void publishEvents(Transfer transfer) {
        transfer.getDomainEvents().forEach(eventPublisher::publish);
        transfer.clearDomainEvents();
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

package com.example.transfer.service;

import com.example.transfer.domain.Transfer;
import com.example.transfer.domain.TransferState;
import com.example.transfer.domain.event.TransferEvent;
import com.example.transfer.domain.vo.AccountId;
import com.example.transfer.domain.vo.InsufficientFundsException;
import com.example.transfer.domain.vo.Money;
import com.example.transfer.domain.vo.TransferId;
import com.example.transfer.port.AccountService;
import com.example.transfer.port.EventPublisher;
import com.example.transfer.port.TransferRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankTransferServiceTest {

    @Mock
    private TransferRepository transferRepository;

    @Mock
    private AccountService accountService;

    @Mock
    private EventPublisher eventPublisher;

    private BankTransferService bankTransferService;

    private TransferId transferId;
    private AccountId sourceAccount;
    private AccountId destAccount;
    private Money amount;

    @BeforeEach
    void setUp() {
        bankTransferService = new BankTransferService(transferRepository, accountService, eventPublisher);

        transferId = TransferId.of("transfer-123");
        sourceAccount = AccountId.of("account-source");
        destAccount = AccountId.of("account-dest");
        amount = Money.of(100.00);

        when(transferRepository.exists(any())).thenReturn(false);
    }

    @Nested
    @DisplayName("Successful Transfer")
    class SuccessfulTransferTests {

        @Test
        @DisplayName("should complete transfer successfully")
        void shouldCompleteTransferSuccessfully() {
            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then
            assertThat(result.getState()).isEqualTo(TransferState.COMPLETED);
            assertThat(result.getId()).isEqualTo(transferId);
            assertThat(result.getAmount()).isEqualTo(amount);

            // Verify saga steps executed in order
            var inOrder = inOrder(accountService);
            inOrder.verify(accountService).reserveFunds(sourceAccount, transferId, amount);
            inOrder.verify(accountService).debit(sourceAccount, transferId, amount);
            inOrder.verify(accountService).credit(destAccount, transferId, amount);
        }

        @Test
        @DisplayName("should publish domain events for successful transfer")
        void shouldPublishEventsForSuccessfulTransfer() {
            // Given
            ArgumentCaptor<TransferEvent> eventCaptor = ArgumentCaptor.forClass(TransferEvent.class);

            // When
            bankTransferService.initiateTransfer(transferId, sourceAccount, destAccount, amount);

            // Then
            verify(eventPublisher, atLeast(5)).publish(eventCaptor.capture());
            List<TransferEvent> events = eventCaptor.getAllValues();

            assertThat(events).extracting(e -> e.getClass().getSimpleName())
                .contains(
                    "TransferInitiated",
                    "FundsReserved",
                    "SourceDebited",
                    "DestinationCredited",
                    "TransferCompleted"
                );
        }
    }

    @Nested
    @DisplayName("Insufficient Funds")
    class InsufficientFundsTests {

        @Test
        @DisplayName("should rollback when insufficient funds at reservation")
        void shouldRollbackWhenInsufficientFundsAtReservation() {
            // Given
            doThrow(new InsufficientFundsException(Money.of(50), amount))
                .when(accountService).reserveFunds(any(), any(), any());

            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then
            assertThat(result.getState()).isEqualTo(TransferState.ROLLED_BACK);
            assertThat(result.getFailureReason()).contains("Insufficient");

            // Verify no debit or credit occurred
            verify(accountService, never()).debit(any(), any(), any());
            verify(accountService, never()).credit(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Rollback Scenarios")
    class RollbackTests {

        @Test
        @DisplayName("should rollback after debit failure")
        void shouldRollbackAfterDebitFailure() {
            // Given
            doThrow(new RuntimeException("Debit failed"))
                .when(accountService).debit(any(), any(), any());

            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then
            assertThat(result.getState()).isEqualTo(TransferState.ROLLED_BACK);

            // Verify compensation was executed
            verify(accountService).releaseReservation(sourceAccount, transferId);
        }

        @Test
        @DisplayName("should rollback and reverse debit after credit failure")
        void shouldRollbackAndReverseDebitAfterCreditFailure() {
            // Given
            doThrow(new RuntimeException("Credit failed"))
                .when(accountService).credit(any(), any(), any());

            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then
            assertThat(result.getState()).isEqualTo(TransferState.ROLLED_BACK);

            // Verify compensation: reverse debit and release reservation
            verify(accountService).reverseDebit(sourceAccount, transferId, amount);
            verify(accountService).releaseReservation(sourceAccount, transferId);
        }

        @Test
        @DisplayName("should publish rollback events")
        void shouldPublishRollbackEvents() {
            // Given
            doThrow(new RuntimeException("Credit failed"))
                .when(accountService).credit(any(), any(), any());
            ArgumentCaptor<TransferEvent> eventCaptor = ArgumentCaptor.forClass(TransferEvent.class);

            // When
            bankTransferService.initiateTransfer(transferId, sourceAccount, destAccount, amount);

            // Then
            verify(eventPublisher, atLeast(1)).publish(eventCaptor.capture());
            List<TransferEvent> events = eventCaptor.getAllValues();

            assertThat(events).extracting(e -> e.getClass().getSimpleName())
                .contains("RollbackStarted", "TransferRolledBack");
        }
    }

    @Nested
    @DisplayName("Idempotency")
    class IdempotencyTests {

        @Test
        @DisplayName("should return existing transfer for duplicate request")
        void shouldReturnExistingTransferForDuplicateRequest() {
            // Given
            Transfer existingTransfer = new Transfer(transferId, sourceAccount, destAccount, amount);
            when(transferRepository.exists(transferId)).thenReturn(true);
            when(transferRepository.findById(transferId)).thenReturn(Optional.of(existingTransfer));

            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then
            assertThat(result).isSameAs(existingTransfer);

            // Verify no saga steps were executed
            verify(accountService, never()).reserveFunds(any(), any(), any());
            verify(accountService, never()).debit(any(), any(), any());
            verify(accountService, never()).credit(any(), any(), any());
        }

        @Test
        @DisplayName("should not process same transfer twice")
        void shouldNotProcessSameTransferTwice() {
            // Given - first call succeeds
            when(transferRepository.exists(transferId)).thenReturn(false, true);

            Transfer firstResult = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );
            when(transferRepository.findById(transferId)).thenReturn(Optional.of(firstResult));

            // When - second call with same ID
            Transfer secondResult = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then - should return first result, not execute saga again
            // reserveFunds should only be called once (from first transfer)
            verify(accountService, times(1)).reserveFunds(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Value Objects")
    class ValueObjectTests {

        @Test
        @DisplayName("TransferId should generate unique IDs")
        void transferIdShouldGenerateUniqueIds() {
            TransferId id1 = TransferId.generate();
            TransferId id2 = TransferId.generate();

            assertThat(id1).isNotEqualTo(id2);
        }

        @Test
        @DisplayName("Money should handle arithmetic correctly")
        void moneyShouldHandleArithmetic() {
            Money m1 = Money.of(100);
            Money m2 = Money.of(30);

            assertThat(m1.subtract(m2)).isEqualTo(Money.of(70));
            assertThat(m1.add(m2)).isEqualTo(Money.of(130));
            assertThat(m1.isGreaterThanOrEqual(m2)).isTrue();
        }

        @Test
        @DisplayName("Money should throw for insufficient funds")
        void moneyShouldThrowForInsufficientFunds() {
            Money m1 = Money.of(50);
            Money m2 = Money.of(100);

            assertThatThrownBy(() -> m1.subtract(m2))
                .isInstanceOf(InsufficientFundsException.class);
        }
    }

    @Nested
    @DisplayName("State Transitions")
    class StateTransitionTests {

        @Test
        @DisplayName("should follow correct state machine transitions")
        void shouldFollowCorrectStateTransitions() {
            // When
            Transfer result = bankTransferService.initiateTransfer(
                transferId, sourceAccount, destAccount, amount
            );

            // Then - verify save was called at each state
            verify(transferRepository, atLeast(4)).save(any(Transfer.class));
        }

        @Test
        @DisplayName("terminal states should not allow transitions")
        void terminalStatesShouldNotAllowTransitions() {
            assertThat(TransferState.COMPLETED.isTerminal()).isTrue();
            assertThat(TransferState.ROLLED_BACK.isTerminal()).isTrue();
            assertThat(TransferState.FAILED.isTerminal()).isTrue();

            assertThat(TransferState.COMPLETED.canTransitionTo(TransferState.FAILED)).isFalse();
        }
    }
}

// ============================================================================
// In-Memory Implementations for Testing
// ============================================================================

package com.example.transfer.adapter;

import com.example.transfer.domain.vo.AccountId;
import com.example.transfer.domain.vo.InsufficientFundsException;
import com.example.transfer.domain.vo.Money;
import com.example.transfer.domain.vo.TransferId;
import com.example.transfer.port.AccountService;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryAccountService implements AccountService {

    private final Map<AccountId, Money> balances = new ConcurrentHashMap<>();
    private final Map<AccountId, Set<TransferId>> reservations = new ConcurrentHashMap<>();

    public void setBalance(AccountId accountId, Money balance) {
        balances.put(accountId, balance);
    }

    @Override
    public void reserveFunds(AccountId accountId, TransferId transferId, Money amount) {
        Money balance = balances.getOrDefault(accountId, Money.ZERO);
        if (!balance.isGreaterThanOrEqual(amount)) {
            throw new InsufficientFundsException(balance, amount);
        }
        reservations.computeIfAbsent(accountId, k -> ConcurrentHashMap.newKeySet()).add(transferId);
    }

    @Override
    public void debit(AccountId accountId, TransferId transferId, Money amount) {
        Money balance = balances.getOrDefault(accountId, Money.ZERO);
        balances.put(accountId, balance.subtract(amount));
    }

    @Override
    public void credit(AccountId accountId, TransferId transferId, Money amount) {
        Money balance = balances.getOrDefault(accountId, Money.ZERO);
        balances.put(accountId, balance.add(amount));
    }

    @Override
    public void releaseReservation(AccountId accountId, TransferId transferId) {
        Set<TransferId> accountReservations = reservations.get(accountId);
        if (accountReservations != null) {
            accountReservations.remove(transferId);
        }
    }

    @Override
    public void reverseDebit(AccountId accountId, TransferId transferId, Money amount) {
        credit(accountId, transferId, amount);
    }

    @Override
    public Money getBalance(AccountId accountId) {
        return balances.getOrDefault(accountId, Money.ZERO);
    }
}
