# Java Spring Test 4: Refactor to Clean Architecture

## Prompt

```
Refactor this service to follow clean architecture principles:

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailSender emailSender;

    public Payment processPayment(Long userId, BigDecimal amount, String cardNumber) {
        User user = userRepository.findById(userId).get();

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Invalid amount");
        }

        if (cardNumber == null || cardNumber.length() != 16) {
            throw new RuntimeException("Invalid card");
        }

        Payment payment = new Payment();
        payment.setUserId(userId);
        payment.setAmount(amount);
        payment.setCardNumber(cardNumber);
        payment.setStatus("COMPLETED");
        payment.setDate(new Date());

        paymentRepository.save(payment);

        emailSender.send(user.getEmail(), "Payment of $" + amount + " processed");

        return payment;
    }
}

Apply: constructor injection, custom exceptions, value objects, and proper layering.
Include tests.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Constructor injection | No @Autowired on fields |
| Custom exceptions | PaymentException, InvalidAmountException |
| Value objects | Money, CardNumber classes |
| DTOs | PaymentRequest, PaymentResponse |
| Validation | Separate validation logic |
| Testability | Dependencies via interfaces |
| Tests | Unit tests with mocks |

## Output File

- Without MCP: `results-without-mcp/java-spring/test-4-result.java`
- With MCP: `results-with-mcp/java-spring/test-4-result.java`
