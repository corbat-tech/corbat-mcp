// Test TS-4: Refactor processOrder to be more readable and testable

// Original function was monolithic and hard to test

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  items: OrderItem[];
}

interface User {
  id: string;
  email: string;
  balance: number;
}

interface Inventory {
  check(itemId: string): number;
  decrease(itemId: string, quantity: number): void;
}

interface PaymentGateway {
  charge(userId: string, amount: number): { success: boolean };
}

interface EmailService {
  send(to: string, subject: string, body: string): void;
}

interface OrderResult {
  success: boolean;
  error?: string;
  orderId?: string;
  total?: number;
}

class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

class OrderProcessor {
  constructor(
    private inventory: Inventory,
    private paymentGateway: PaymentGateway,
    private emailService: EmailService
  ) {}

  processOrder(order: Order | null, user: User | null): OrderResult {
    try {
      this.validateInput(order, user);
      const total = this.calculateTotalAndCheckInventory(order!);
      this.validateUserBalance(user!, total);
      this.processPayment(user!, total);
      this.updateInventory(order!);
      this.sendConfirmationEmail(user!, order!);

      return { success: true, orderId: order!.id, total };
    } catch (error) {
      if (error instanceof OrderValidationError) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  }

  private validateInput(order: Order | null, user: User | null): void {
    if (!order || !user) {
      throw new OrderValidationError('Invalid input');
    }
    if (order.items.length === 0) {
      throw new OrderValidationError('Empty cart');
    }
  }

  private calculateTotalAndCheckInventory(order: Order): number {
    let total = 0;
    for (const item of order.items) {
      const availableStock = this.inventory.check(item.id);
      if (availableStock < item.qty) {
        throw new OrderValidationError(`Out of stock: ${item.name}`);
      }
      total += item.price * item.qty;
    }
    return total;
  }

  private validateUserBalance(user: User, total: number): void {
    if (user.balance < total) {
      throw new OrderValidationError('Insufficient funds');
    }
  }

  private processPayment(user: User, total: number): void {
    const payment = this.paymentGateway.charge(user.id, total);
    if (!payment.success) {
      throw new OrderValidationError('Payment failed');
    }
  }

  private updateInventory(order: Order): void {
    for (const item of order.items) {
      this.inventory.decrease(item.id, item.qty);
    }
  }

  private sendConfirmationEmail(user: User, order: Order): void {
    this.emailService.send(
      user.email,
      'Order confirmed',
      `Your order #${order.id} is confirmed.`
    );
  }
}

// Tests
describe('OrderProcessor', () => {
  let inventory: jest.Mocked<Inventory>;
  let paymentGateway: jest.Mocked<PaymentGateway>;
  let emailService: jest.Mocked<EmailService>;
  let processor: OrderProcessor;

  const createOrder = (items: OrderItem[] = []): Order => ({
    id: 'order-123',
    items,
  });

  const createUser = (balance = 100): User => ({
    id: 'user-1',
    email: 'test@example.com',
    balance,
  });

  const createItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
    id: 'item-1',
    name: 'Test Item',
    price: 10,
    qty: 1,
    ...overrides,
  });

  beforeEach(() => {
    inventory = {
      check: jest.fn().mockReturnValue(100),
      decrease: jest.fn(),
    };
    paymentGateway = {
      charge: jest.fn().mockReturnValue({ success: true }),
    };
    emailService = {
      send: jest.fn(),
    };
    processor = new OrderProcessor(inventory, paymentGateway, emailService);
  });

  describe('input validation', () => {
    it('should return error when order is null', () => {
      const result = processor.processOrder(null, createUser());
      expect(result).toEqual({ success: false, error: 'Invalid input' });
    });

    it('should return error when user is null', () => {
      const result = processor.processOrder(createOrder([createItem()]), null);
      expect(result).toEqual({ success: false, error: 'Invalid input' });
    });

    it('should return error when cart is empty', () => {
      const result = processor.processOrder(createOrder([]), createUser());
      expect(result).toEqual({ success: false, error: 'Empty cart' });
    });
  });

  describe('inventory check', () => {
    it('should return error when item is out of stock', () => {
      inventory.check.mockReturnValue(0);
      const order = createOrder([createItem({ name: 'Widget', qty: 5 })]);

      const result = processor.processOrder(order, createUser());

      expect(result).toEqual({ success: false, error: 'Out of stock: Widget' });
    });

    it('should check inventory for each item', () => {
      const order = createOrder([
        createItem({ id: 'item-1', qty: 2 }),
        createItem({ id: 'item-2', qty: 3 }),
      ]);

      processor.processOrder(order, createUser());

      expect(inventory.check).toHaveBeenCalledWith('item-1');
      expect(inventory.check).toHaveBeenCalledWith('item-2');
    });
  });

  describe('balance validation', () => {
    it('should return error when user has insufficient funds', () => {
      const order = createOrder([createItem({ price: 50, qty: 3 })]); // Total: 150
      const user = createUser(100);

      const result = processor.processOrder(order, user);

      expect(result).toEqual({ success: false, error: 'Insufficient funds' });
    });
  });

  describe('payment processing', () => {
    it('should return error when payment fails', () => {
      paymentGateway.charge.mockReturnValue({ success: false });
      const order = createOrder([createItem()]);

      const result = processor.processOrder(order, createUser());

      expect(result).toEqual({ success: false, error: 'Payment failed' });
    });

    it('should charge correct amount', () => {
      const order = createOrder([
        createItem({ price: 10, qty: 2 }),
        createItem({ price: 5, qty: 4 }),
      ]);
      const user = createUser(100);

      processor.processOrder(order, user);

      expect(paymentGateway.charge).toHaveBeenCalledWith('user-1', 40);
    });
  });

  describe('successful order', () => {
    it('should update inventory for each item', () => {
      const order = createOrder([
        createItem({ id: 'item-1', qty: 2 }),
        createItem({ id: 'item-2', qty: 3 }),
      ]);

      processor.processOrder(order, createUser());

      expect(inventory.decrease).toHaveBeenCalledWith('item-1', 2);
      expect(inventory.decrease).toHaveBeenCalledWith('item-2', 3);
    });

    it('should send confirmation email', () => {
      const order = createOrder([createItem()]);
      const user = createUser();

      processor.processOrder(order, user);

      expect(emailService.send).toHaveBeenCalledWith(
        'test@example.com',
        'Order confirmed',
        'Your order #order-123 is confirmed.'
      );
    });

    it('should return success result with order details', () => {
      const order = createOrder([createItem({ price: 25, qty: 2 })]);

      const result = processor.processOrder(order, createUser());

      expect(result).toEqual({
        success: true,
        orderId: 'order-123',
        total: 50,
      });
    });
  });
});
