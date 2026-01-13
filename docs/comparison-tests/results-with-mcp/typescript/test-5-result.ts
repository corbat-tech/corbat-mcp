/**
 * Test TS-5: Event-Driven Order Processing (Advanced)
 * Create an OrderProcessor with event-driven architecture:
 * - Events: 'order.created', 'order.validated', 'order.paid', 'order.shipped', 'order.completed', 'order.failed'
 * - State machine: CREATED → VALIDATED → PAID → SHIPPED → COMPLETED (or FAILED)
 * - Retry logic for payment (max 3 attempts, exponential backoff)
 * - Compensation: if shipping fails after payment, trigger refund
 * - Event listener management (on/off)
 *
 * Include tests for: happy path, retry scenarios, failure at each step, compensation/rollback.
 */

// ============================================================================
// Types
// ============================================================================

type OrderState = 'CREATED' | 'VALIDATED' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'FAILED';

type OrderEventType =
  | 'order.created'
  | 'order.validated'
  | 'order.paid'
  | 'order.shipped'
  | 'order.completed'
  | 'order.failed';

interface OrderEvent {
  readonly type: OrderEventType;
  readonly orderId: string;
  readonly timestamp: Date;
  readonly data?: Record<string, unknown>;
}

interface Order {
  readonly id: string;
  readonly items: Array<{ id: string; name: string; price: number; quantity: number }>;
  readonly total: number;
  readonly customerId: string;
}

interface OrderContext {
  order: Order;
  state: OrderState;
  paymentAttempts: number;
  paymentId?: string;
  shipmentId?: string;
  error?: string;
  refundId?: string;
}

type EventListener = (event: OrderEvent) => void;

// ============================================================================
// Event Emitter
// ============================================================================

class EventEmitter {
  private listeners: Map<OrderEventType, Set<EventListener>> = new Map();

  on(eventType: OrderEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: OrderEventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  emit(event: OrderEvent): void {
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(event);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// ============================================================================
// Service Interfaces
// ============================================================================

interface ValidationService {
  validate(order: Order): Promise<{ valid: boolean; error?: string }>;
}

interface PaymentService {
  charge(orderId: string, amount: number): Promise<{ success: boolean; paymentId?: string; error?: string }>;
  refund(paymentId: string): Promise<{ success: boolean; refundId?: string; error?: string }>;
}

interface ShippingService {
  ship(orderId: string): Promise<{ success: boolean; shipmentId?: string; error?: string }>;
}

// ============================================================================
// State Machine
// ============================================================================

const STATE_TRANSITIONS: Record<OrderState, OrderState[]> = {
  CREATED: ['VALIDATED', 'FAILED'],
  VALIDATED: ['PAID', 'FAILED'],
  PAID: ['SHIPPED', 'FAILED'],
  SHIPPED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

function canTransition(from: OrderState, to: OrderState): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}

// ============================================================================
// Retry with Exponential Backoff
// ============================================================================

async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts: number; baseDelayMs: number; onAttempt?: (attempt: number) => void }
): Promise<{ result?: T; attempts: number; error?: string }> {
  const { maxAttempts, baseDelayMs, onAttempt } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt);

    try {
      const result = await operation();
      return { result, attempts: attempt };
    } catch (error) {
      if (attempt === maxAttempts) {
        return { attempts: attempt, error: String(error) };
      }

      // Exponential backoff: 100ms, 200ms, 400ms, ...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  return { attempts: maxAttempts, error: 'Max attempts reached' };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Order Processor
// ============================================================================

class OrderProcessor extends EventEmitter {
  private contexts: Map<string, OrderContext> = new Map();

  constructor(
    private readonly validationService: ValidationService,
    private readonly paymentService: PaymentService,
    private readonly shippingService: ShippingService
  ) {
    super();
  }

  async processOrder(order: Order): Promise<OrderContext> {
    const context: OrderContext = {
      order,
      state: 'CREATED',
      paymentAttempts: 0,
    };

    this.contexts.set(order.id, context);
    this.emitOrderEvent('order.created', order.id);

    try {
      // Step 1: Validate
      await this.validateOrder(context);

      // Step 2: Process Payment with retry
      await this.processPayment(context);

      // Step 3: Ship Order
      await this.shipOrder(context);

      // Step 4: Complete
      this.completeOrder(context);
    } catch (error) {
      await this.handleFailure(context, String(error));
    }

    return context;
  }

  getContext(orderId: string): OrderContext | undefined {
    return this.contexts.get(orderId);
  }

  private async validateOrder(context: OrderContext): Promise<void> {
    const result = await this.validationService.validate(context.order);

    if (!result.valid) {
      throw new Error(result.error || 'Validation failed');
    }

    this.transition(context, 'VALIDATED');
    this.emitOrderEvent('order.validated', context.order.id);
  }

  private async processPayment(context: OrderContext): Promise<void> {
    const result = await withRetry(
      async () => {
        const paymentResult = await this.paymentService.charge(
          context.order.id,
          context.order.total
        );

        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Payment failed');
        }

        return paymentResult;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        onAttempt: attempt => {
          context.paymentAttempts = attempt;
        },
      }
    );

    if (!result.result) {
      throw new Error(result.error || 'Payment failed after retries');
    }

    context.paymentId = result.result.paymentId;
    this.transition(context, 'PAID');
    this.emitOrderEvent('order.paid', context.order.id, { paymentId: result.result.paymentId });
  }

  private async shipOrder(context: OrderContext): Promise<void> {
    const result = await this.shippingService.ship(context.order.id);

    if (!result.success) {
      // Compensation: Refund payment if shipping fails
      if (context.paymentId) {
        await this.refundPayment(context);
      }
      throw new Error(result.error || 'Shipping failed');
    }

    context.shipmentId = result.shipmentId;
    this.transition(context, 'SHIPPED');
    this.emitOrderEvent('order.shipped', context.order.id, { shipmentId: result.shipmentId });
  }

  private async refundPayment(context: OrderContext): Promise<void> {
    if (!context.paymentId) return;

    const result = await this.paymentService.refund(context.paymentId);
    if (result.success) {
      context.refundId = result.refundId;
    }
  }

  private completeOrder(context: OrderContext): void {
    this.transition(context, 'COMPLETED');
    this.emitOrderEvent('order.completed', context.order.id);
  }

  private async handleFailure(context: OrderContext, error: string): Promise<void> {
    context.error = error;
    context.state = 'FAILED';
    this.emitOrderEvent('order.failed', context.order.id, { error });
  }

  private transition(context: OrderContext, newState: OrderState): void {
    if (!canTransition(context.state, newState)) {
      throw new Error(`Invalid transition from ${context.state} to ${newState}`);
    }
    context.state = newState;
  }

  private emitOrderEvent(type: OrderEventType, orderId: string, data?: Record<string, unknown>): void {
    this.emit({
      type,
      orderId,
      timestamp: new Date(),
      data,
    });
  }
}

// ============================================================================
// Tests
// ============================================================================

async function runTests(): Promise<void> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
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

  function assertArrayEqual<T>(actual: T[], expected: T[], message?: string): void {
    if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) {
      throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
  }

  // Mock services
  function createMockValidationService(shouldPass: boolean): ValidationService {
    return {
      validate: async () => ({
        valid: shouldPass,
        error: shouldPass ? undefined : 'Invalid order',
      }),
    };
  }

  function createMockPaymentService(options: {
    shouldSucceed: boolean;
    failUntilAttempt?: number;
  }): PaymentService & { chargeCount: number; refundCount: number } {
    let chargeCount = 0;
    let refundCount = 0;

    return {
      charge: async () => {
        chargeCount++;
        const succeed = options.failUntilAttempt
          ? chargeCount >= options.failUntilAttempt
          : options.shouldSucceed;

        return succeed
          ? { success: true, paymentId: `pay-${chargeCount}` }
          : { success: false, error: 'Payment declined' };
      },
      refund: async paymentId => {
        refundCount++;
        return { success: true, refundId: `refund-${paymentId}` };
      },
      get chargeCount() { return chargeCount; },
      get refundCount() { return refundCount; },
    };
  }

  function createMockShippingService(shouldSucceed: boolean): ShippingService {
    return {
      ship: async orderId => ({
        success: shouldSucceed,
        shipmentId: shouldSucceed ? `ship-${orderId}` : undefined,
        error: shouldSucceed ? undefined : 'Shipping failed',
      }),
    };
  }

  const testOrder: Order = {
    id: 'order-123',
    items: [{ id: 'item-1', name: 'Widget', price: 10, quantity: 2 }],
    total: 20,
    customerId: 'customer-1',
  };

  // Happy Path Tests
  await test('should complete order successfully (happy path)', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const events: OrderEventType[] = [];
    const listener = (event: OrderEvent) => events.push(event.type);

    processor.on('order.created', listener);
    processor.on('order.validated', listener);
    processor.on('order.paid', listener);
    processor.on('order.shipped', listener);
    processor.on('order.completed', listener);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'COMPLETED');
    assertEqual(result.paymentId, 'pay-1');
    assertEqual(result.shipmentId, 'ship-order-123');
    assertArrayEqual(events, [
      'order.created',
      'order.validated',
      'order.paid',
      'order.shipped',
      'order.completed',
    ]);
  });

  // Validation Failure Tests
  await test('should fail on validation error', async () => {
    const validation = createMockValidationService(false);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'FAILED');
    assertEqual(result.error?.includes('Validation'), true);
    assertEqual(payment.chargeCount, 0);
  });

  // Payment Retry Tests
  await test('should retry payment and succeed on 2nd attempt', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true, failUntilAttempt: 2 });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'COMPLETED');
    assertEqual(payment.chargeCount, 2);
    assertEqual(result.paymentAttempts, 2);
  });

  await test('should retry payment and succeed on 3rd attempt', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true, failUntilAttempt: 3 });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'COMPLETED');
    assertEqual(payment.chargeCount, 3);
    assertEqual(result.paymentAttempts, 3);
  });

  await test('should fail after max payment retries', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: false });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'FAILED');
    assertEqual(payment.chargeCount, 3);
    assertEqual(result.error?.includes('Payment'), true);
  });

  // Shipping Failure + Compensation Tests
  await test('should refund payment when shipping fails', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(false);
    const processor = new OrderProcessor(validation, payment, shipping);

    const result = await processor.processOrder(testOrder);

    assertEqual(result.state, 'FAILED');
    assertEqual(payment.refundCount, 1);
    assertEqual(result.refundId, 'refund-pay-1');
    assertEqual(result.error?.includes('Shipping'), true);
  });

  // Event Listener Tests
  await test('should allow adding and removing event listeners', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const events: string[] = [];
    const listener = (event: OrderEvent) => events.push(event.type);

    processor.on('order.created', listener);
    processor.on('order.completed', listener);

    await processor.processOrder({ ...testOrder, id: 'order-1' });
    assertEqual(events.length, 2);

    processor.off('order.completed', listener);

    await processor.processOrder({ ...testOrder, id: 'order-2' });
    assertEqual(events.length, 3); // Only created was captured
  });

  await test('should emit failed event on any failure', async () => {
    const validation = createMockValidationService(false);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    let failedEvent: OrderEvent | null = null;
    processor.on('order.failed', event => { failedEvent = event; });

    await processor.processOrder(testOrder);

    assertEqual(failedEvent !== null, true);
    assertEqual(failedEvent!.type, 'order.failed');
    assertEqual((failedEvent!.data?.error as string).includes('Validation'), true);
  });

  // State Machine Tests
  await test('should track correct state transitions', async () => {
    const validation = createMockValidationService(true);
    const payment = createMockPaymentService({ shouldSucceed: true });
    const shipping = createMockShippingService(true);
    const processor = new OrderProcessor(validation, payment, shipping);

    const states: OrderState[] = [];
    const captureState = () => {
      const ctx = processor.getContext(testOrder.id);
      if (ctx) states.push(ctx.state);
    };

    processor.on('order.created', captureState);
    processor.on('order.validated', captureState);
    processor.on('order.paid', captureState);
    processor.on('order.shipped', captureState);
    processor.on('order.completed', captureState);

    await processor.processOrder(testOrder);

    assertArrayEqual(states, ['CREATED', 'VALIDATED', 'PAID', 'SHIPPED', 'COMPLETED']);
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
