/**
 * Test TS-4: Refactor
 * Refactor this function to be more readable and testable.
 *
 * Original code had issues:
 * - Too many responsibilities
 * - No type safety
 * - Hard to test (tightly coupled dependencies)
 * - Poor error handling
 * - Imperative style
 */

// ============================================================================
// Domain Types
// ============================================================================

interface OrderItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly qty: number;
}

interface Order {
  readonly id: string;
  readonly items: OrderItem[];
}

interface User {
  readonly id: string;
  readonly email: string;
  readonly balance: number;
}

interface PaymentResult {
  readonly success: boolean;
  readonly transactionId?: string;
  readonly error?: string;
}

// ============================================================================
// Result Types (Railway-Oriented Programming)
// ============================================================================

type OrderResult =
  | { readonly success: true; readonly orderId: string; readonly total: number }
  | { readonly success: false; readonly error: OrderError };

type OrderError =
  | { readonly type: 'INVALID_INPUT'; readonly message: string }
  | { readonly type: 'EMPTY_CART'; readonly message: string }
  | { readonly type: 'OUT_OF_STOCK'; readonly itemName: string; readonly message: string }
  | { readonly type: 'INSUFFICIENT_FUNDS'; readonly required: number; readonly available: number; readonly message: string }
  | { readonly type: 'PAYMENT_FAILED'; readonly message: string };

// ============================================================================
// Port Interfaces (Dependency Inversion)
// ============================================================================

interface Inventory {
  checkStock(itemId: string): number;
  decreaseStock(itemId: string, quantity: number): void;
}

interface PaymentGateway {
  charge(userId: string, amount: number): PaymentResult;
}

interface EmailService {
  sendOrderConfirmation(email: string, orderId: string): void;
}

// ============================================================================
// Order Validator
// ============================================================================

class OrderValidator {
  validateOrder(order: Order | null | undefined): OrderError | null {
    if (!order) {
      return { type: 'INVALID_INPUT', message: 'Order is required' };
    }
    if (!order.items || order.items.length === 0) {
      return { type: 'EMPTY_CART', message: 'Cart is empty' };
    }
    return null;
  }

  validateUser(user: User | null | undefined): OrderError | null {
    if (!user) {
      return { type: 'INVALID_INPUT', message: 'User is required' };
    }
    return null;
  }
}

// ============================================================================
// Order Calculator
// ============================================================================

class OrderCalculator {
  calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }
}

// ============================================================================
// Stock Checker
// ============================================================================

class StockChecker {
  constructor(private readonly inventory: Inventory) {}

  checkAvailability(items: OrderItem[]): OrderError | null {
    for (const item of items) {
      const available = this.inventory.checkStock(item.id);
      if (available < item.qty) {
        return {
          type: 'OUT_OF_STOCK',
          itemName: item.name,
          message: `Item '${item.name}' is out of stock`,
        };
      }
    }
    return null;
  }

  reserveItems(items: OrderItem[]): void {
    for (const item of items) {
      this.inventory.decreaseStock(item.id, item.qty);
    }
  }
}

// ============================================================================
// Balance Checker
// ============================================================================

class BalanceChecker {
  checkBalance(user: User, total: number): OrderError | null {
    if (user.balance < total) {
      return {
        type: 'INSUFFICIENT_FUNDS',
        required: total,
        available: user.balance,
        message: 'Insufficient funds',
      };
    }
    return null;
  }
}

// ============================================================================
// Payment Processor
// ============================================================================

class PaymentProcessor {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  processPayment(userId: string, total: number): OrderError | null {
    const result = this.paymentGateway.charge(userId, total);
    if (!result.success) {
      return {
        type: 'PAYMENT_FAILED',
        message: result.error || 'Payment processing failed',
      };
    }
    return null;
  }
}

// ============================================================================
// Notification Service
// ============================================================================

class OrderNotificationService {
  constructor(private readonly emailService: EmailService) {}

  notifyOrderConfirmed(email: string, orderId: string): void {
    this.emailService.sendOrderConfirmation(email, orderId);
  }
}

// ============================================================================
// Order Processor (Orchestrator)
// ============================================================================

class OrderProcessor {
  private readonly validator: OrderValidator;
  private readonly calculator: OrderCalculator;
  private readonly stockChecker: StockChecker;
  private readonly balanceChecker: BalanceChecker;
  private readonly paymentProcessor: PaymentProcessor;
  private readonly notificationService: OrderNotificationService;

  constructor(
    inventory: Inventory,
    paymentGateway: PaymentGateway,
    emailService: EmailService
  ) {
    this.validator = new OrderValidator();
    this.calculator = new OrderCalculator();
    this.stockChecker = new StockChecker(inventory);
    this.balanceChecker = new BalanceChecker();
    this.paymentProcessor = new PaymentProcessor(paymentGateway);
    this.notificationService = new OrderNotificationService(emailService);
  }

  processOrder(order: Order | null | undefined, user: User | null | undefined): OrderResult {
    // Step 1: Validate inputs
    const orderError = this.validator.validateOrder(order);
    if (orderError) {
      return { success: false, error: orderError };
    }

    const userError = this.validator.validateUser(user);
    if (userError) {
      return { success: false, error: userError };
    }

    // TypeScript now knows these are not null
    const validOrder = order!;
    const validUser = user!;

    // Step 2: Check stock availability
    const stockError = this.stockChecker.checkAvailability(validOrder.items);
    if (stockError) {
      return { success: false, error: stockError };
    }

    // Step 3: Calculate total
    const total = this.calculator.calculateTotal(validOrder.items);

    // Step 4: Check user balance
    const balanceError = this.balanceChecker.checkBalance(validUser, total);
    if (balanceError) {
      return { success: false, error: balanceError };
    }

    // Step 5: Process payment
    const paymentError = this.paymentProcessor.processPayment(validUser.id, total);
    if (paymentError) {
      return { success: false, error: paymentError };
    }

    // Step 6: Reserve inventory
    this.stockChecker.reserveItems(validOrder.items);

    // Step 7: Send notification
    this.notificationService.notifyOrderConfirmed(validUser.email, validOrder.id);

    // Step 8: Return success
    return {
      success: true,
      orderId: validOrder.id,
      total,
    };
  }
}

// ============================================================================
// Functional alternative using pipe
// ============================================================================

function processOrderFunctional(
  order: Order | null | undefined,
  user: User | null | undefined,
  inventory: Inventory,
  paymentGateway: PaymentGateway,
  emailService: EmailService
): OrderResult {
  // Validation
  if (!order || !user) {
    return { success: false, error: { type: 'INVALID_INPUT', message: 'Invalid input' } };
  }
  if (order.items.length === 0) {
    return { success: false, error: { type: 'EMPTY_CART', message: 'Cart is empty' } };
  }

  // Stock check
  const outOfStockItem = order.items.find(
    item => inventory.checkStock(item.id) < item.qty
  );
  if (outOfStockItem) {
    return {
      success: false,
      error: {
        type: 'OUT_OF_STOCK',
        itemName: outOfStockItem.name,
        message: `Item '${outOfStockItem.name}' is out of stock`,
      },
    };
  }

  // Calculate total
  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Balance check
  if (user.balance < total) {
    return {
      success: false,
      error: {
        type: 'INSUFFICIENT_FUNDS',
        required: total,
        available: user.balance,
        message: 'Insufficient funds',
      },
    };
  }

  // Payment
  const payment = paymentGateway.charge(user.id, total);
  if (!payment.success) {
    return {
      success: false,
      error: { type: 'PAYMENT_FAILED', message: payment.error || 'Payment failed' },
    };
  }

  // Reserve inventory
  order.items.forEach(item => inventory.decreaseStock(item.id, item.qty));

  // Notification
  emailService.sendOrderConfirmation(user.email, order.id);

  return { success: true, orderId: order.id, total };
}

// ============================================================================
// Tests
// ============================================================================

function runTests(): void {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void): void {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: String(error) });
    }
  }

  function assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  // Mock implementations
  function createMockInventory(stock: Record<string, number>): Inventory & { decreasedItems: Array<{ id: string; qty: number }> } {
    const decreasedItems: Array<{ id: string; qty: number }> = [];
    return {
      checkStock: (id: string) => stock[id] || 0,
      decreaseStock: (id: string, qty: number) => {
        decreasedItems.push({ id, qty });
        stock[id] = (stock[id] || 0) - qty;
      },
      decreasedItems,
    };
  }

  function createMockPaymentGateway(shouldSucceed: boolean): PaymentGateway & { chargedAmounts: number[] } {
    const chargedAmounts: number[] = [];
    return {
      charge: (_userId: string, amount: number) => {
        chargedAmounts.push(amount);
        return shouldSucceed
          ? { success: true, transactionId: 'tx-123' }
          : { success: false, error: 'Card declined' };
      },
      chargedAmounts,
    };
  }

  function createMockEmailService(): EmailService & { sentEmails: Array<{ email: string; orderId: string }> } {
    const sentEmails: Array<{ email: string; orderId: string }> = [];
    return {
      sendOrderConfirmation: (email: string, orderId: string) => {
        sentEmails.push({ email, orderId });
      },
      sentEmails,
    };
  }

  // Test fixtures
  const validOrder: Order = {
    id: 'order-123',
    items: [
      { id: 'item-1', name: 'Widget', price: 10, qty: 2 },
      { id: 'item-2', name: 'Gadget', price: 20, qty: 1 },
    ],
  };

  const validUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    balance: 100,
  };

  // Tests for OrderProcessor class
  test('should process order successfully', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const result = processor.processOrder(validOrder, validUser);

    assertEqual(result.success, true);
    if (result.success) {
      assertEqual(result.orderId, 'order-123');
      assertEqual(result.total, 40);
    }
  });

  test('should fail with null order', () => {
    const inventory = createMockInventory({});
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const result = processor.processOrder(null, validUser);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'INVALID_INPUT');
    }
  });

  test('should fail with null user', () => {
    const inventory = createMockInventory({});
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const result = processor.processOrder(validOrder, null);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'INVALID_INPUT');
    }
  });

  test('should fail with empty cart', () => {
    const inventory = createMockInventory({});
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const emptyOrder: Order = { id: 'order-123', items: [] };
    const result = processor.processOrder(emptyOrder, validUser);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'EMPTY_CART');
    }
  });

  test('should fail when item out of stock', () => {
    const inventory = createMockInventory({ 'item-1': 1, 'item-2': 5 }); // Only 1 of item-1
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const result = processor.processOrder(validOrder, validUser);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'OUT_OF_STOCK');
      if (result.error.type === 'OUT_OF_STOCK') {
        assertEqual(result.error.itemName, 'Widget');
      }
    }
  });

  test('should fail when insufficient funds', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const poorUser: User = { ...validUser, balance: 30 };
    const result = processor.processOrder(validOrder, poorUser);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'INSUFFICIENT_FUNDS');
    }
  });

  test('should fail when payment fails', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(false);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    const result = processor.processOrder(validOrder, validUser);

    assertEqual(result.success, false);
    if (!result.success) {
      assertEqual(result.error.type, 'PAYMENT_FAILED');
    }
  });

  test('should decrease inventory after successful order', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    processor.processOrder(validOrder, validUser);

    assertEqual(inventory.decreasedItems.length, 2);
    assertEqual(inventory.decreasedItems[0].id, 'item-1');
    assertEqual(inventory.decreasedItems[0].qty, 2);
  });

  test('should send email after successful order', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(true);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    processor.processOrder(validOrder, validUser);

    assertEqual(email.sentEmails.length, 1);
    assertEqual(email.sentEmails[0].email, 'test@example.com');
    assertEqual(email.sentEmails[0].orderId, 'order-123');
  });

  test('should not decrease inventory when payment fails', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(false);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    processor.processOrder(validOrder, validUser);

    assertEqual(inventory.decreasedItems.length, 0);
  });

  test('should not send email when payment fails', () => {
    const inventory = createMockInventory({ 'item-1': 10, 'item-2': 5 });
    const payment = createMockPaymentGateway(false);
    const email = createMockEmailService();
    const processor = new OrderProcessor(inventory, payment, email);

    processor.processOrder(validOrder, validUser);

    assertEqual(email.sentEmails.length, 0);
  });

  // Print results
  console.log('\n=== Test Results ===\n');
  let passed = 0;
  let failed = 0;
  for (const result of results) {
    if (result.passed) {
      console.log(`✓ ${result.name}`);
      passed++;
    } else {
      console.log(`✗ ${result.name}`);
      console.log(`  Error: ${result.error}`);
      failed++;
    }
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
}

runTests();
