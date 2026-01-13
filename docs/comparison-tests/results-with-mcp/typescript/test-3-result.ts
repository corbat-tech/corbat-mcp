/**
 * Test TS-3: Bugfix
 * Fix this bug: calculateTotal returns NaN when the cart is empty.
 *
 * Original buggy code:
 * function calculateTotal(cart) {
 *   return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
 * }
 *
 * Bug analysis:
 * - When cart.items is empty, cart.items.length is 0
 * - Division by zero (0/0) results in NaN
 * - The formula seems incorrect: dividing by item count gives average, not total
 *
 * Write tests that prove the bug exists and is fixed.
 */

// ============================================================================
// Types
// ============================================================================

interface CartItem {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

interface Cart {
  readonly items: CartItem[];
}

// ============================================================================
// Original Buggy Implementation (for demonstration)
// ============================================================================

function calculateTotalBuggy(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
}

// ============================================================================
// Fixed Implementation
// ============================================================================

/**
 * Calculates the total price of all items in the cart.
 *
 * The original implementation had two bugs:
 * 1. It divided by items.length, which would give an average, not a total
 * 2. When the cart is empty, it divides by 0, resulting in NaN
 *
 * The fix removes the division since we want the sum, not the average.
 * For an empty cart, we correctly return 0.
 */
function calculateTotal(cart: Cart): number {
  if (!cart || !cart.items) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ============================================================================
// Alternative: If average price was intended
// ============================================================================

/**
 * If the original intent was to calculate average item price,
 * this would be the correct implementation.
 */
function calculateAverageItemPrice(cart: Cart): number {
  if (!cart || !cart.items || cart.items.length === 0) {
    return 0;
  }

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return totalQuantity > 0 ? total / totalQuantity : 0;
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

  function assertIsNaN(value: number, message?: string): void {
    if (!Number.isNaN(value)) {
      throw new Error(message || `Expected NaN, got ${value}`);
    }
  }

  function assertNotNaN(value: number, message?: string): void {
    if (Number.isNaN(value)) {
      throw new Error(message || `Expected a number, got NaN`);
    }
  }

  // =========================================================================
  // Tests proving the bug exists in the original implementation
  // =========================================================================

  test('BUG: Original function returns NaN for empty cart', () => {
    const emptyCart: Cart = { items: [] };
    const result = calculateTotalBuggy(emptyCart);
    assertIsNaN(result, 'Expected buggy function to return NaN for empty cart');
  });

  test('BUG: Original function returns wrong value (average instead of total)', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Item 1', price: 10, quantity: 2 }, // 20
        { id: '2', name: 'Item 2', price: 15, quantity: 1 }, // 15
      ],
    };
    const result = calculateTotalBuggy(cart);
    // Buggy: (20 + 15) / 2 = 17.5 (wrong - this is average, not total)
    // Should be: 35 (total)
    assertEqual(result, 17.5, 'Buggy function gives average, not total');
  });

  // =========================================================================
  // Tests proving the fix works
  // =========================================================================

  test('FIX: Returns 0 for empty cart', () => {
    const emptyCart: Cart = { items: [] };
    const result = calculateTotal(emptyCart);
    assertEqual(result, 0);
    assertNotNaN(result);
  });

  test('FIX: Returns 0 for null cart', () => {
    const result = calculateTotal(null as unknown as Cart);
    assertEqual(result, 0);
    assertNotNaN(result);
  });

  test('FIX: Returns 0 for undefined cart', () => {
    const result = calculateTotal(undefined as unknown as Cart);
    assertEqual(result, 0);
    assertNotNaN(result);
  });

  test('FIX: Returns 0 for cart with null items', () => {
    const cart = { items: null } as unknown as Cart;
    const result = calculateTotal(cart);
    assertEqual(result, 0);
    assertNotNaN(result);
  });

  test('FIX: Returns correct total for single item', () => {
    const cart: Cart = {
      items: [{ id: '1', name: 'Widget', price: 10, quantity: 3 }],
    };
    const result = calculateTotal(cart);
    assertEqual(result, 30);
  });

  test('FIX: Returns correct total for multiple items', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Item 1', price: 10, quantity: 2 }, // 20
        { id: '2', name: 'Item 2', price: 15, quantity: 1 }, // 15
      ],
    };
    const result = calculateTotal(cart);
    assertEqual(result, 35); // Total, not average!
  });

  test('FIX: Handles items with quantity 0', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Item 1', price: 10, quantity: 0 },
        { id: '2', name: 'Item 2', price: 20, quantity: 2 },
      ],
    };
    const result = calculateTotal(cart);
    assertEqual(result, 40);
  });

  test('FIX: Handles items with price 0', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Free Item', price: 0, quantity: 5 },
        { id: '2', name: 'Paid Item', price: 10, quantity: 1 },
      ],
    };
    const result = calculateTotal(cart);
    assertEqual(result, 10);
  });

  test('FIX: Handles decimal prices correctly', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Item 1', price: 9.99, quantity: 2 },
        { id: '2', name: 'Item 2', price: 4.50, quantity: 3 },
      ],
    };
    const result = calculateTotal(cart);
    // 9.99 * 2 + 4.50 * 3 = 19.98 + 13.50 = 33.48
    assertEqual(Math.round(result * 100) / 100, 33.48);
  });

  test('FIX: Handles large quantities', () => {
    const cart: Cart = {
      items: [{ id: '1', name: 'Bulk Item', price: 0.01, quantity: 10000 }],
    };
    const result = calculateTotal(cart);
    assertEqual(result, 100);
  });

  // =========================================================================
  // Tests for alternative average function (if that was the intent)
  // =========================================================================

  test('AVERAGE: Returns 0 for empty cart', () => {
    const emptyCart: Cart = { items: [] };
    const result = calculateAverageItemPrice(emptyCart);
    assertEqual(result, 0);
    assertNotNaN(result);
  });

  test('AVERAGE: Returns correct average price per unit', () => {
    const cart: Cart = {
      items: [
        { id: '1', name: 'Item 1', price: 10, quantity: 2 }, // 20 for 2 units
        { id: '2', name: 'Item 2', price: 20, quantity: 2 }, // 40 for 2 units
      ],
    };
    const result = calculateAverageItemPrice(cart);
    // Total: 60, Total quantity: 4, Average: 15 per unit
    assertEqual(result, 15);
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
