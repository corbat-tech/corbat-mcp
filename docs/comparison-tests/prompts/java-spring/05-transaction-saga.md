# Java Spring Test 5: Bank Transfer with Saga Pattern

## Prompt

```
Create a BankTransferService in Java Spring Boot that transfers money between accounts using the Saga pattern.

Requirements:
- Transfer money from source account to destination account
- Validate: sufficient balance, accounts exist, daily limit not exceeded
- Steps: Reserve funds → Debit source → Credit destination → Confirm transfer
- If any step fails, execute compensating transactions (rollback)
- Track transfer state: INITIATED → RESERVED → DEBITED → CREDITED → COMPLETED (or ROLLED_BACK)
- Implement idempotency (same transfer ID should not process twice)
- Log all state transitions for audit

Constraints:
- Use @Transactional appropriately
- Custom exceptions for each failure type
- Value objects for Money, AccountId, TransferId
- Events for each state change (TransferInitiated, FundsReserved, etc.)

Include tests:
- Successful transfer
- Insufficient funds
- Destination account not found (after debit - requires rollback)
- Concurrent transfers to same account
- Idempotency check
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Saga pattern | Orchestration or choreography approach |
| Transactions | Proper @Transactional boundaries |
| Compensation | Rollback handlers for each step |
| Value objects | Money, AccountId as immutable types |
| Domain events | Event publishing for state changes |
| Idempotency | Transfer ID check, idempotency key |
| Error handling | Specific exceptions, no generic RuntimeException |
| Testing | @Transactional test rollback, concurrent tests |

## Output File

- Without MCP: `results-without-mcp/java-spring/test-5-result.java`
- With MCP: `results-with-mcp/java-spring/test-5-result.java`
