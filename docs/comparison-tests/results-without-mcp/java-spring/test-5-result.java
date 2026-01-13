// Test JAVA-5: Bank Transfer with Saga Pattern

// === Value Objects ===
package com.example.transfer.domain;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

public final class Money {
    private final BigDecimal amount;

    private Money(BigDecimal amount) {
        this.amount = amount;
    }

    public static Money of(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        return new Money(amount);
    }

    public BigDecimal getAmount() { return amount; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Money money = (Money) o;
        return amount.compareTo(money.amount) == 0;
    }

    @Override
    public int hashCode() { return Objects.hash(amount); }
}

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

    public String getValue() { return value; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AccountId accountId = (AccountId) o;
        return Objects.equals(value, accountId.value);
    }

    @Override
    public int hashCode() { return Objects.hash(value); }
}

public final class TransferId {
    private final String value;

    private TransferId(String value) {
        this.value = value;
    }

    public static TransferId generate() {
        return new TransferId(UUID.randomUUID().toString());
    }

    public static TransferId of(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Transfer ID cannot be empty");
        }
        return new TransferId(value);
    }

    public String getValue() { return value; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TransferId that = (TransferId) o;
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() { return Objects.hash(value); }
}

// === Transfer State ===
public enum TransferState {
    INITIATED, RESERVED, DEBITED, CREDITED, COMPLETED, ROLLED_BACK
}

// === Domain Events ===
package com.example.transfer.domain.event;

import com.example.transfer.domain.*;
import java.time.Instant;

public sealed interface TransferEvent {
    TransferId transferId();
    Instant occurredAt();
}

public record TransferInitiated(TransferId transferId, AccountId source, AccountId destination, Money amount, Instant occurredAt) implements TransferEvent {}
public record FundsReserved(TransferId transferId, AccountId accountId, Money amount, Instant occurredAt) implements TransferEvent {}
public record SourceDebited(TransferId transferId, AccountId accountId, Money amount, Instant occurredAt) implements TransferEvent {}
public record DestinationCredited(TransferId transferId, AccountId accountId, Money amount, Instant occurredAt) implements TransferEvent {}
public record TransferCompleted(TransferId transferId, Instant occurredAt) implements TransferEvent {}
public record TransferRolledBack(TransferId transferId, String reason, Instant occurredAt) implements TransferEvent {}

// === Transfer Entity ===
package com.example.transfer.domain;

import com.example.transfer.domain.event.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Transfer {
    private final TransferId id;
    private final AccountId sourceAccount;
    private final AccountId destinationAccount;
    private final Money amount;
    private TransferState state;
    private String failureReason;
    private final List<TransferEvent> events;

    public Transfer(TransferId id, AccountId source, AccountId destination, Money amount) {
        this.id = id;
        this.sourceAccount = source;
        this.destinationAccount = destination;
        this.amount = amount;
        this.state = TransferState.INITIATED;
        this.events = new ArrayList<>();
        addEvent(new TransferInitiated(id, source, destination, amount, Instant.now()));
    }

    public void markReserved() {
        this.state = TransferState.RESERVED;
        addEvent(new FundsReserved(id, sourceAccount, amount, Instant.now()));
    }

    public void markDebited() {
        this.state = TransferState.DEBITED;
        addEvent(new SourceDebited(id, sourceAccount, amount, Instant.now()));
    }

    public void markCredited() {
        this.state = TransferState.CREDITED;
        addEvent(new DestinationCredited(id, destinationAccount, amount, Instant.now()));
    }

    public void markCompleted() {
        this.state = TransferState.COMPLETED;
        addEvent(new TransferCompleted(id, Instant.now()));
    }

    public void markRolledBack(String reason) {
        this.state = TransferState.ROLLED_BACK;
        this.failureReason = reason;
        addEvent(new TransferRolledBack(id, reason, Instant.now()));
    }

    private void addEvent(TransferEvent event) {
        events.add(event);
    }

    // Getters
    public TransferId getId() { return id; }
    public AccountId getSourceAccount() { return sourceAccount; }
    public AccountId getDestinationAccount() { return destinationAccount; }
    public Money getAmount() { return amount; }
    public TransferState getState() { return state; }
    public String getFailureReason() { return failureReason; }
    public List<TransferEvent> getEvents() { return List.copyOf(events); }
}

// === Ports ===
package com.example.transfer.domain.port;

import com.example.transfer.domain.*;
import java.util.Optional;

public interface AccountService {
    boolean reserveFunds(AccountId accountId, Money amount);
    void releaseReservation(AccountId accountId, Money amount);
    void debit(AccountId accountId, Money amount);
    void credit(AccountId accountId, Money amount);
    void reverseDebit(AccountId accountId, Money amount);
}

public interface TransferRepository {
    Transfer save(Transfer transfer);
    Optional<Transfer> findById(TransferId id);
    boolean existsById(TransferId id);
}

public interface EventPublisher {
    void publish(Object event);
}

// === Service ===
package com.example.transfer.application;

import com.example.transfer.domain.*;
import com.example.transfer.domain.port.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class BankTransferService {
    private final AccountService accountService;
    private final TransferRepository transferRepository;
    private final EventPublisher eventPublisher;

    public BankTransferService(
            AccountService accountService,
            TransferRepository transferRepository,
            EventPublisher eventPublisher) {
        this.accountService = accountService;
        this.transferRepository = transferRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Transfer initiateTransfer(
            String transferIdValue,
            String sourceAccountId,
            String destinationAccountId,
            BigDecimal amount) {

        TransferId transferId = TransferId.of(transferIdValue);

        // Idempotency check
        if (transferRepository.existsById(transferId)) {
            return transferRepository.findById(transferId).orElseThrow();
        }

        AccountId source = AccountId.of(sourceAccountId);
        AccountId destination = AccountId.of(destinationAccountId);
        Money money = Money.of(amount);

        Transfer transfer = new Transfer(transferId, source, destination, money);
        transferRepository.save(transfer);

        try {
            executeTransfer(transfer);
        } catch (TransferException e) {
            rollback(transfer, e.getMessage());
        }

        publishEvents(transfer);
        return transferRepository.save(transfer);
    }

    private void executeTransfer(Transfer transfer) {
        // Step 1: Reserve funds
        boolean reserved = accountService.reserveFunds(
            transfer.getSourceAccount(),
            transfer.getAmount()
        );
        if (!reserved) {
            throw new InsufficientFundsException("Insufficient funds in source account");
        }
        transfer.markReserved();

        // Step 2: Debit source
        try {
            accountService.debit(transfer.getSourceAccount(), transfer.getAmount());
            transfer.markDebited();
        } catch (Exception e) {
            accountService.releaseReservation(transfer.getSourceAccount(), transfer.getAmount());
            throw new TransferException("Failed to debit source account: " + e.getMessage());
        }

        // Step 3: Credit destination
        try {
            accountService.credit(transfer.getDestinationAccount(), transfer.getAmount());
            transfer.markCredited();
        } catch (Exception e) {
            // Compensate: reverse debit
            accountService.reverseDebit(transfer.getSourceAccount(), transfer.getAmount());
            throw new TransferException("Failed to credit destination account: " + e.getMessage());
        }

        // Step 4: Complete
        transfer.markCompleted();
    }

    private void rollback(Transfer transfer, String reason) {
        transfer.markRolledBack(reason);
    }

    private void publishEvents(Transfer transfer) {
        transfer.getEvents().forEach(eventPublisher::publish);
    }
}

// === Exceptions ===
public class TransferException extends RuntimeException {
    public TransferException(String message) { super(message); }
}

public class InsufficientFundsException extends TransferException {
    public InsufficientFundsException(String message) { super(message); }
}

// === Tests ===
package com.example.transfer;

import com.example.transfer.application.BankTransferService;
import com.example.transfer.domain.*;
import com.example.transfer.domain.port.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankTransferServiceTest {

    @Mock private AccountService accountService;
    @Mock private TransferRepository transferRepository;
    @Mock private EventPublisher eventPublisher;

    private BankTransferService service;

    @BeforeEach
    void setUp() {
        service = new BankTransferService(accountService, transferRepository, eventPublisher);
        when(transferRepository.save(any(Transfer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transferRepository.existsById(any())).thenReturn(false);
    }

    @Test
    void initiateTransfer_SuccessfulTransfer_ShouldCompleteAllSteps() {
        when(accountService.reserveFunds(any(), any())).thenReturn(true);

        Transfer result = service.initiateTransfer(
            UUID.randomUUID().toString(),
            "account-1",
            "account-2",
            new BigDecimal("100.00")
        );

        assertEquals(TransferState.COMPLETED, result.getState());
        verify(accountService).reserveFunds(any(), any());
        verify(accountService).debit(any(), any());
        verify(accountService).credit(any(), any());
        assertEquals(5, result.getEvents().size()); // Initiated, Reserved, Debited, Credited, Completed
    }

    @Test
    void initiateTransfer_InsufficientFunds_ShouldRollback() {
        when(accountService.reserveFunds(any(), any())).thenReturn(false);

        Transfer result = service.initiateTransfer(
            UUID.randomUUID().toString(),
            "account-1",
            "account-2",
            new BigDecimal("100.00")
        );

        assertEquals(TransferState.ROLLED_BACK, result.getState());
        assertTrue(result.getFailureReason().contains("Insufficient funds"));
    }

    @Test
    void initiateTransfer_CreditFails_ShouldReverseDebit() {
        when(accountService.reserveFunds(any(), any())).thenReturn(true);
        doThrow(new RuntimeException("Credit failed")).when(accountService).credit(any(), any());

        Transfer result = service.initiateTransfer(
            UUID.randomUUID().toString(),
            "account-1",
            "account-2",
            new BigDecimal("100.00")
        );

        assertEquals(TransferState.ROLLED_BACK, result.getState());
        verify(accountService).reverseDebit(any(), any());
    }

    @Test
    void initiateTransfer_SameIdTwice_ShouldReturnExistingTransfer() {
        String transferId = UUID.randomUUID().toString();
        Transfer existingTransfer = new Transfer(
            TransferId.of(transferId),
            AccountId.of("acc-1"),
            AccountId.of("acc-2"),
            Money.of(new BigDecimal("50"))
        );

        when(transferRepository.existsById(any())).thenReturn(true);
        when(transferRepository.findById(any())).thenReturn(Optional.of(existingTransfer));

        Transfer result = service.initiateTransfer(
            transferId,
            "account-1",
            "account-2",
            new BigDecimal("100.00")
        );

        assertSame(existingTransfer, result);
        verify(accountService, never()).reserveFunds(any(), any());
    }

    @Test
    void initiateTransfer_ConcurrentTransfers_ShouldHandleIndependently() {
        when(accountService.reserveFunds(any(), any())).thenReturn(true);

        Transfer transfer1 = service.initiateTransfer(
            UUID.randomUUID().toString(),
            "account-1",
            "account-2",
            new BigDecimal("50.00")
        );

        Transfer transfer2 = service.initiateTransfer(
            UUID.randomUUID().toString(),
            "account-3",
            "account-4",
            new BigDecimal("75.00")
        );

        assertEquals(TransferState.COMPLETED, transfer1.getState());
        assertEquals(TransferState.COMPLETED, transfer2.getState());
        assertNotEquals(transfer1.getId(), transfer2.getId());
    }
}

// Value Object Tests
class TransferValueObjectTests {

    @Test
    void money_WithValidAmount_ShouldCreate() {
        Money money = Money.of(new BigDecimal("100"));
        assertEquals(new BigDecimal("100"), money.getAmount());
    }

    @Test
    void money_WithInvalidAmount_ShouldThrow() {
        assertThrows(IllegalArgumentException.class, () -> Money.of(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> Money.of(new BigDecimal("-10")));
    }

    @Test
    void accountId_WithValidValue_ShouldCreate() {
        AccountId id = AccountId.of("ACC-123");
        assertEquals("ACC-123", id.getValue());
    }

    @Test
    void accountId_WithEmptyValue_ShouldThrow() {
        assertThrows(IllegalArgumentException.class, () -> AccountId.of(""));
        assertThrows(IllegalArgumentException.class, () -> AccountId.of(null));
    }

    @Test
    void transferId_Generate_ShouldCreateUnique() {
        TransferId id1 = TransferId.generate();
        TransferId id2 = TransferId.generate();
        assertNotEquals(id1, id2);
    }
}
