# Run Benchmark Tests WITH Corbat MCP

## Prerequisites

**IMPORTANT**: Ensure Corbat MCP IS active before running these tests.

```bash
# Add Corbat MCP
claude mcp add corbat -- npx -y @corbat-tech/coding-standards-mcp

# Start a NEW conversation (required for clean context)
```

---

## Prompt to Execute

Copy and paste this entire prompt into a NEW Claude conversation:

---

```
# CORBAT BENCHMARK - WITH MCP

Execute the complete benchmark suite. This measures AI code generation quality WITH coding standards injection.

## STEP 0: Clean Previous Results

First, delete any existing results to ensure clean comparison:

rm -rf docs/comparison-tests/results-with-mcp/*

Then create the folder structure:

mkdir -p docs/comparison-tests/results-with-mcp/{typescript,java-spring,react,python}

## STEP 1: TypeScript Tests

### Test TS-1: Create Service
Create a UserService in TypeScript that can:
- Create users with name and email
- Get users by ID
- List all users

Use an in-memory repository. Include tests.

Save to: docs/comparison-tests/results-with-mcp/typescript/test-1-result.ts

### Test TS-2: CRUD Feature
Create a ProductService with full CRUD operations in TypeScript.
- Products have: id, name, price, stock
- Price must be positive (> 0)
- Stock cannot be negative (>= 0)
- Include validation errors and tests

Save to: docs/comparison-tests/results-with-mcp/typescript/test-2-result.ts

### Test TS-3: Bugfix
Fix this bug: calculateTotal returns NaN when the cart is empty.

function calculateTotal(cart) {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
}

Write tests that prove the bug exists and is fixed.

Save to: docs/comparison-tests/results-with-mcp/typescript/test-3-result.ts

### Test TS-4: Refactor
Refactor this function to be more readable and testable:

function processOrder(order, user, inventory, paymentGateway, emailService) {
  if (!order || !user) return { success: false, error: 'Invalid input' };
  if (order.items.length === 0) return { success: false, error: 'Empty cart' };
  let total = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if (inventory.check(item.id) < item.qty) return { success: false, error: 'Out of stock: ' + item.name };
    total += item.price * item.qty;
  }
  if (user.balance < total) return { success: false, error: 'Insufficient funds' };
  const payment = paymentGateway.charge(user.id, total);
  if (!payment.success) return { success: false, error: 'Payment failed' };
  for (let i = 0; i < order.items.length; i++) {
    inventory.decrease(order.items[i].id, order.items[i].qty);
  }
  emailService.send(user.email, 'Order confirmed', 'Your order #' + order.id + ' is confirmed.');
  return { success: true, orderId: order.id, total: total };
}

Save to: docs/comparison-tests/results-with-mcp/typescript/test-4-result.ts

### Test TS-5: Event-Driven Order Processing (Advanced)
Create an OrderProcessor with event-driven architecture:
- Events: 'order.created', 'order.validated', 'order.paid', 'order.shipped', 'order.completed', 'order.failed'
- State machine: CREATED → VALIDATED → PAID → SHIPPED → COMPLETED (or FAILED)
- Retry logic for payment (max 3 attempts, exponential backoff)
- Compensation: if shipping fails after payment, trigger refund
- Event listener management (on/off)

Include tests for: happy path, retry scenarios, failure at each step, compensation/rollback.

Save to: docs/comparison-tests/results-with-mcp/typescript/test-5-result.ts

---

## STEP 2: Java Spring Tests

### Test JAVA-1: Create Service
Create a UserService in Java Spring Boot that can:
- Create users with name and email
- Get users by ID
- List all users

Use Spring Data JPA with in-memory H2. Include unit tests with JUnit 5 and Mockito.

Save to: docs/comparison-tests/results-with-mcp/java-spring/test-1-result.java

### Test JAVA-2: REST Endpoint
Create a REST API for Products in Spring Boot:
- GET /api/products - list all
- GET /api/products/{id} - get by ID
- POST /api/products - create
- PUT /api/products/{id} - update
- DELETE /api/products/{id} - delete

Products: id, name, price (>0), stock (>=0). Include validation and tests.

Save to: docs/comparison-tests/results-with-mcp/java-spring/test-2-result.java

### Test JAVA-3: Bugfix
Fix this bug: NullPointerException when user has no orders.

@Service
public class OrderSummaryService {
    public OrderSummary getUserOrderSummary(User user) {
        List<Order> orders = user.getOrders();
        double totalSpent = orders.stream().mapToDouble(Order::getTotal).sum();
        Order lastOrder = orders.get(orders.size() - 1);
        return new OrderSummary(orders.size(), totalSpent, lastOrder.getDate());
    }
}

Write tests that prove the bug exists and is fixed.

Save to: docs/comparison-tests/results-with-mcp/java-spring/test-3-result.java

### Test JAVA-4: Refactor
Refactor to clean architecture:

@Service
public class PaymentService {
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailSender emailSender;

    public Payment processPayment(Long userId, BigDecimal amount, String cardNumber) {
        User user = userRepository.findById(userId).get();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("Invalid amount");
        if (cardNumber == null || cardNumber.length() != 16) throw new RuntimeException("Invalid card");
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

Apply: constructor injection, custom exceptions, value objects.

Save to: docs/comparison-tests/results-with-mcp/java-spring/test-4-result.java

### Test JAVA-5: Bank Transfer with Saga Pattern (Advanced)
Create a BankTransferService that transfers money between accounts using Saga pattern:
- Steps: Reserve funds → Debit source → Credit destination → Confirm
- If any step fails, execute compensating transactions (rollback)
- State: INITIATED → RESERVED → DEBITED → CREDITED → COMPLETED (or ROLLED_BACK)
- Idempotency: same transfer ID should not process twice
- Value objects: Money, AccountId, TransferId
- Domain events for each state change

Include tests for: successful transfer, insufficient funds, rollback scenario, concurrent transfers, idempotency.

Save to: docs/comparison-tests/results-with-mcp/java-spring/test-5-result.java

---

## STEP 3: React Tests

### Test REACT-1: Create Component
Create a UserCard React component in TypeScript:
- User avatar, name, email, role
- Loading and error states
- Unit tests with React Testing Library

Save to: docs/comparison-tests/results-with-mcp/react/test-1-result.tsx

### Test REACT-2: Form Validation
Create a ContactForm React component:
- Name (required, min 2 chars)
- Email (required, valid format)
- Message (required, min 10 chars)
- Submit with loading/success/error states
- Include validation tests

Save to: docs/comparison-tests/results-with-mcp/react/test-2-result.tsx

### Test REACT-3: Bugfix
Fix this bug: Infinite re-renders.

function UserList({ fetchUsers }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setLoading(false);
    };
    loadUsers();
  }, [fetchUsers, users]);

  if (loading) return <div>Loading...</div>;
  return <ul>{users.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}

Write tests proving the bug and fix.

Save to: docs/comparison-tests/results-with-mcp/react/test-3-result.tsx

### Test REACT-4: Refactor to Hooks
Refactor to custom hooks (useProduct, useCart):

function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => { setProduct(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [productId]);

  useEffect(() => {
    setCartTotal(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }, [cartItems]);

  const addToCart = () => setCartItems([...cartItems, { ...product, quantity }]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
      <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
      <button onClick={addToCart}>Add to Cart</button>
      <p>Cart Total: ${cartTotal}</p>
    </div>
  );
}

Save to: docs/comparison-tests/results-with-mcp/react/test-4-result.tsx

### Test REACT-5: Multi-Step Checkout Wizard (Advanced)
Create a CheckoutWizard component with proper state management:
- 4 steps: Cart Review → Shipping Info → Payment → Confirmation
- Each step validates before allowing next
- Can go back (data persisted)
- useReducer for state: NEXT_STEP, PREV_STEP, SET_FIELD, VALIDATE, SUBMIT, SET_ERROR
- Async payment with loading state, timeout handling (>10s = retry option)
- Accessibility: announce step changes, focus management

Include tests for: full flow, validation errors, back navigation, payment failure/retry, timeout, keyboard navigation.

Save to: docs/comparison-tests/results-with-mcp/react/test-5-result.tsx

---

## STEP 4: Python Tests

### Test PY-1: Create Service
Create a UserService in Python:
- Create users with name and email
- Get users by ID
- List all users

Use dataclasses and in-memory repository. Include pytest tests.

Save to: docs/comparison-tests/results-with-mcp/python/test-1-result.py

### Test PY-2: FastAPI Endpoint
Create FastAPI REST API for Products:
- GET /products, GET /products/{id}
- POST /products, PUT /products/{id}
- DELETE /products/{id}

Products: id, name, price (>0), stock (>=0). Include Pydantic validation and tests.

Save to: docs/comparison-tests/results-with-mcp/python/test-2-result.py

### Test PY-3: Bugfix
Fix: TypeError when processing empty data.

def calculate_statistics(data):
    total = sum(data)
    average = total / len(data)
    maximum = max(data)
    minimum = min(data)
    return {"total": total, "average": average, "max": maximum, "min": minimum, "count": len(data)}

Write tests proving the bug and fix.

Save to: docs/comparison-tests/results-with-mcp/python/test-3-result.py

### Test PY-4: Refactor
Refactor to Python best practices:

def process_order(order, user, inventory, payment_gateway, email_service):
    if order is None or user is None:
        return {"success": False, "error": "Invalid input"}
    if len(order["items"]) == 0:
        return {"success": False, "error": "Empty cart"}
    total = 0
    for i in range(len(order["items"])):
        item = order["items"][i]
        if inventory.check(item["id"]) < item["qty"]:
            return {"success": False, "error": "Out of stock: " + item["name"]}
        total = total + item["price"] * item["qty"]
    if user["balance"] < total:
        return {"success": False, "error": "Insufficient funds"}
    payment = payment_gateway.charge(user["id"], total)
    if payment["success"] == False:
        return {"success": False, "error": "Payment failed"}
    for i in range(len(order["items"])):
        inventory.decrease(order["items"][i]["id"], order["items"][i]["qty"])
    email_service.send(user["email"], "Order confirmed", "Your order #" + order["id"] + " is confirmed.")
    return {"success": True, "order_id": order["id"], "total": total}

Apply: dataclasses, type hints, protocols, Pythonic idioms.

Save to: docs/comparison-tests/results-with-mcp/python/test-4-result.py

### Test PY-5: Async Data Aggregator with Rate Limiting (Advanced)
Create a DataAggregator that fetches data from multiple APIs concurrently:
- Concurrent fetching with asyncio
- Rate limiting: max 10 requests/second
- Retry with exponential backoff (max 3 attempts)
- Timeout per request: 5 seconds
- Circuit breaker: skip endpoint after 5 consecutive failures (recover after 30s)
- Progress callback reporting

Interface:
```python
async def fetch_all(endpoints: list[str], on_progress: Callable | None) -> AggregatedResult

@dataclass
class AggregatedResult:
    successful: dict[str, Any]
    failed: dict[str, str]
    duration_seconds: float
```

Include tests for: all succeed, partial success, rate limiting timing, retry logic, circuit breaker, timeout.

Save to: docs/comparison-tests/results-with-mcp/python/test-5-result.py

---

## STEP 5: Save Metrics

After completing ALL tests, save metrics to:

docs/comparison-tests/results-with-mcp/metrics.json

Format:
{
  "timestamp": "ISO date",
  "mode": "with-mcp",
  "stacks": {
    "typescript": {
      "test-1": { "lines_of_code": X, "num_tests": X },
      "test-2": { "lines_of_code": X, "num_tests": X },
      "test-3": { "lines_of_code": X, "num_tests": X },
      "test-4": { "lines_of_code": X, "num_tests": X },
      "test-5": { "lines_of_code": X, "num_tests": X }
    },
    "java-spring": {
      "test-1": { "lines_of_code": X, "num_tests": X },
      "test-2": { "lines_of_code": X, "num_tests": X },
      "test-3": { "lines_of_code": X, "num_tests": X },
      "test-4": { "lines_of_code": X, "num_tests": X },
      "test-5": { "lines_of_code": X, "num_tests": X }
    },
    "react": {
      "test-1": { "lines_of_code": X, "num_tests": X },
      "test-2": { "lines_of_code": X, "num_tests": X },
      "test-3": { "lines_of_code": X, "num_tests": X },
      "test-4": { "lines_of_code": X, "num_tests": X },
      "test-5": { "lines_of_code": X, "num_tests": X }
    },
    "python": {
      "test-1": { "lines_of_code": X, "num_tests": X },
      "test-2": { "lines_of_code": X, "num_tests": X },
      "test-3": { "lines_of_code": X, "num_tests": X },
      "test-4": { "lines_of_code": X, "num_tests": X },
      "test-5": { "lines_of_code": X, "num_tests": X }
    }
  },
  "totals": {
    "total_lines_of_code": X,
    "total_tests": X
  }
}

---

Execute ALL 20 tests now, then save the metrics file.
```

---

## After Completion

You should have these files:

```
results-with-mcp/
├── typescript/
│   ├── test-1-result.ts
│   ├── test-2-result.ts
│   ├── test-3-result.ts
│   ├── test-4-result.ts
│   └── test-5-result.ts
├── java-spring/
│   ├── test-1-result.java
│   ├── test-2-result.java
│   ├── test-3-result.java
│   ├── test-4-result.java
│   └── test-5-result.java
├── react/
│   ├── test-1-result.tsx
│   ├── test-2-result.tsx
│   ├── test-3-result.tsx
│   ├── test-4-result.tsx
│   └── test-5-result.tsx
├── python/
│   ├── test-1-result.py
│   ├── test-2-result.py
│   ├── test-3-result.py
│   ├── test-4-result.py
│   └── test-5-result.py
└── metrics.json
```

## Next Step

Analyze results: [ANALYZE-RESULTS.md](./ANALYZE-RESULTS.md)
