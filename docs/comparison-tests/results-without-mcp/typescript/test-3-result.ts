// Test TS-3: Bugfix - calculateTotal returns NaN when cart is empty

// Original buggy function:
// function calculateTotal(cart) {
//   return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) / cart.items.length;
// }
// Bug: When cart.items is empty, length is 0, causing division by zero (NaN)

interface CartItem {
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
}

// Fixed function
function calculateTotal(cart: Cart): number {
  if (cart.items.length === 0) {
    return 0;
  }
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return total / cart.items.length;
}

// Tests
describe('calculateTotal', () => {
  describe('bug reproduction - empty cart', () => {
    it('should return 0 for empty cart instead of NaN', () => {
      const emptyCart: Cart = { items: [] };
      const result = calculateTotal(emptyCart);

      // This test proves the bug is fixed - original would return NaN
      expect(result).toBe(0);
      expect(Number.isNaN(result)).toBe(false);
    });
  });

  describe('normal operation', () => {
    it('should calculate average item total for single item', () => {
      const cart: Cart = {
        items: [{ price: 10, quantity: 2 }], // total: 20, avg: 20/1 = 20
      };

      expect(calculateTotal(cart)).toBe(20);
    });

    it('should calculate average item total for multiple items', () => {
      const cart: Cart = {
        items: [
          { price: 10, quantity: 1 }, // 10
          { price: 20, quantity: 2 }, // 40
        ],
      };
      // Total: 50, average: 50/2 = 25

      expect(calculateTotal(cart)).toBe(25);
    });

    it('should handle items with zero quantity', () => {
      const cart: Cart = {
        items: [
          { price: 10, quantity: 0 },
          { price: 20, quantity: 1 },
        ],
      };
      // Total: 0 + 20 = 20, average: 20/2 = 10

      expect(calculateTotal(cart)).toBe(10);
    });

    it('should handle decimal prices', () => {
      const cart: Cart = {
        items: [
          { price: 9.99, quantity: 1 },
          { price: 19.99, quantity: 1 },
        ],
      };
      // Total: 29.98, average: 29.98/2 = 14.99

      expect(calculateTotal(cart)).toBeCloseTo(14.99);
    });
  });

  describe('edge cases', () => {
    it('should handle very large quantities', () => {
      const cart: Cart = {
        items: [{ price: 1, quantity: 1000000 }],
      };

      expect(calculateTotal(cart)).toBe(1000000);
    });

    it('should handle very small prices', () => {
      const cart: Cart = {
        items: [{ price: 0.01, quantity: 1 }],
      };

      expect(calculateTotal(cart)).toBeCloseTo(0.01);
    });
  });
});
