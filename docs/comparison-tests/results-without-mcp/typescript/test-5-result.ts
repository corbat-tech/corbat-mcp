// Test TS-5: Event-Driven Order Processing with State Machine

type OrderState = 'CREATED' | 'VALIDATED' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'FAILED';

type OrderEvent =
  | 'order.created'
  | 'order.validated'
  | 'order.paid'
  | 'order.shipped'
  | 'order.completed'
  | 'order.failed';

interface Order {
  id: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  total: number;
  state: OrderState;
  paymentAttempts: number;
  failureReason?: string;
}

interface EventPayload {
  order: Order;
  previousState?: OrderState;
  error?: string;
}

type EventListener = (payload: EventPayload) => void | Promise<void>;

interface PaymentService {
  charge(orderId: string, amount: number): Promise<{ success: boolean; error?: string }>;
  refund(orderId: string, amount: number): Promise<{ success: boolean }>;
}

interface ShippingService {
  ship(orderId: string): Promise<{ success: boolean; error?: string }>;
}

interface ValidationService {
  validate(order: Order): Promise<{ valid: boolean; error?: string }>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class OrderProcessor {
  private listeners: Map<OrderEvent, Set<EventListener>> = new Map();
  private orders: Map<string, Order> = new Map();

  constructor(
    private paymentService: PaymentService,
    private shippingService: ShippingService,
    private validationService: ValidationService
  ) {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    const events: OrderEvent[] = [
      'order.created',
      'order.validated',
      'order.paid',
      'order.shipped',
      'order.completed',
      'order.failed',
    ];
    events.forEach(event => this.listeners.set(event, new Set()));
  }

  on(event: OrderEvent, listener: EventListener): void {
    this.listeners.get(event)?.add(listener);
  }

  off(event: OrderEvent, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private async emit(event: OrderEvent, payload: EventPayload): Promise<void> {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        await listener(payload);
      }
    }
  }

  async createOrder(items: Order['items']): Promise<Order> {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: Order = {
      id: crypto.randomUUID(),
      items,
      total,
      state: 'CREATED',
      paymentAttempts: 0,
    };
    this.orders.set(order.id, order);
    await this.emit('order.created', { order });
    return order;
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  async processOrder(orderId: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    try {
      await this.validateOrder(order);
      await this.processPayment(order);
      await this.shipOrder(order);
      await this.completeOrder(order);
    } catch (error) {
      // Error handling is done in individual steps
    }

    return order;
  }

  private async validateOrder(order: Order): Promise<void> {
    const previousState = order.state;
    const result = await this.validationService.validate(order);

    if (!result.valid) {
      order.state = 'FAILED';
      order.failureReason = result.error;
      await this.emit('order.failed', { order, previousState, error: result.error });
      throw new Error(result.error);
    }

    order.state = 'VALIDATED';
    await this.emit('order.validated', { order, previousState });
  }

  private async processPayment(order: Order): Promise<void> {
    const maxAttempts = 3;
    let lastError: string | undefined;

    while (order.paymentAttempts < maxAttempts) {
      order.paymentAttempts++;
      const backoffMs = Math.pow(2, order.paymentAttempts - 1) * 100;

      if (order.paymentAttempts > 1) {
        await delay(backoffMs);
      }

      const result = await this.paymentService.charge(order.id, order.total);

      if (result.success) {
        const previousState = order.state;
        order.state = 'PAID';
        await this.emit('order.paid', { order, previousState });
        return;
      }

      lastError = result.error;
    }

    const previousState = order.state;
    order.state = 'FAILED';
    order.failureReason = `Payment failed after ${maxAttempts} attempts: ${lastError}`;
    await this.emit('order.failed', { order, previousState, error: order.failureReason });
    throw new Error(order.failureReason);
  }

  private async shipOrder(order: Order): Promise<void> {
    const previousState = order.state;
    const result = await this.shippingService.ship(order.id);

    if (!result.success) {
      // Compensation: refund payment
      await this.paymentService.refund(order.id, order.total);

      order.state = 'FAILED';
      order.failureReason = `Shipping failed: ${result.error}. Payment refunded.`;
      await this.emit('order.failed', { order, previousState, error: order.failureReason });
      throw new Error(order.failureReason);
    }

    order.state = 'SHIPPED';
    await this.emit('order.shipped', { order, previousState });
  }

  private async completeOrder(order: Order): Promise<void> {
    const previousState = order.state;
    order.state = 'COMPLETED';
    await this.emit('order.completed', { order, previousState });
  }
}

// Tests
describe('OrderProcessor', () => {
  let paymentService: jest.Mocked<PaymentService>;
  let shippingService: jest.Mocked<ShippingService>;
  let validationService: jest.Mocked<ValidationService>;
  let processor: OrderProcessor;

  const testItems = [
    { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
    { id: 'item-2', name: 'Product B', price: 50, quantity: 1 },
  ];

  beforeEach(() => {
    paymentService = {
      charge: jest.fn().mockResolvedValue({ success: true }),
      refund: jest.fn().mockResolvedValue({ success: true }),
    };
    shippingService = {
      ship: jest.fn().mockResolvedValue({ success: true }),
    };
    validationService = {
      validate: jest.fn().mockResolvedValue({ valid: true }),
    };
    processor = new OrderProcessor(paymentService, shippingService, validationService);
  });

  describe('happy path', () => {
    it('should process order through all states to completion', async () => {
      const stateChanges: OrderState[] = [];
      processor.on('order.created', ({ order }) => stateChanges.push(order.state));
      processor.on('order.validated', ({ order }) => stateChanges.push(order.state));
      processor.on('order.paid', ({ order }) => stateChanges.push(order.state));
      processor.on('order.shipped', ({ order }) => stateChanges.push(order.state));
      processor.on('order.completed', ({ order }) => stateChanges.push(order.state));

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(stateChanges).toEqual(['CREATED', 'VALIDATED', 'PAID', 'SHIPPED', 'COMPLETED']);
      expect(order.state).toBe('COMPLETED');
    });

    it('should calculate total correctly', async () => {
      const order = await processor.createOrder(testItems);
      expect(order.total).toBe(250); // 100*2 + 50*1
    });
  });

  describe('validation failure', () => {
    it('should fail order when validation fails', async () => {
      validationService.validate.mockResolvedValue({ valid: false, error: 'Invalid items' });

      const failedListener = jest.fn();
      processor.on('order.failed', failedListener);

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(order.state).toBe('FAILED');
      expect(order.failureReason).toBe('Invalid items');
      expect(failedListener).toHaveBeenCalled();
    });
  });

  describe('payment retry logic', () => {
    it('should retry payment up to 3 times with exponential backoff', async () => {
      paymentService.charge
        .mockResolvedValueOnce({ success: false, error: 'Timeout' })
        .mockResolvedValueOnce({ success: false, error: 'Timeout' })
        .mockResolvedValueOnce({ success: true });

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(paymentService.charge).toHaveBeenCalledTimes(3);
      expect(order.state).toBe('COMPLETED');
      expect(order.paymentAttempts).toBe(3);
    });

    it('should fail after max payment attempts', async () => {
      paymentService.charge.mockResolvedValue({ success: false, error: 'Card declined' });

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(paymentService.charge).toHaveBeenCalledTimes(3);
      expect(order.state).toBe('FAILED');
      expect(order.failureReason).toContain('Payment failed after 3 attempts');
    });
  });

  describe('shipping failure and compensation', () => {
    it('should refund payment when shipping fails', async () => {
      shippingService.ship.mockResolvedValue({ success: false, error: 'Address invalid' });

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(paymentService.refund).toHaveBeenCalledWith(order.id, order.total);
      expect(order.state).toBe('FAILED');
      expect(order.failureReason).toContain('Payment refunded');
    });
  });

  describe('event listener management', () => {
    it('should add and trigger event listeners', async () => {
      const listener = jest.fn();
      processor.on('order.created', listener);

      await processor.createOrder(testItems);

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const listener = jest.fn();
      processor.on('order.created', listener);
      processor.off('order.created', listener);

      await processor.createOrder(testItems);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      processor.on('order.created', listener1);
      processor.on('order.created', listener2);

      await processor.createOrder(testItems);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('should emit events with previous state', async () => {
      const transitions: Array<{ from?: OrderState; to: OrderState }> = [];

      processor.on('order.validated', ({ order, previousState }) => {
        transitions.push({ from: previousState, to: order.state });
      });
      processor.on('order.paid', ({ order, previousState }) => {
        transitions.push({ from: previousState, to: order.state });
      });

      const order = await processor.createOrder(testItems);
      await processor.processOrder(order.id);

      expect(transitions).toEqual([
        { from: 'CREATED', to: 'VALIDATED' },
        { from: 'VALIDATED', to: 'PAID' },
      ]);
    });
  });
});
