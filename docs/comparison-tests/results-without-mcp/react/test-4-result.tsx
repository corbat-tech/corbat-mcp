// Test REACT-4: Refactor to Custom Hooks

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';

// Types
interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

interface UseCartReturn {
  cartItems: CartItem[];
  cartTotal: number;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

// Custom Hooks
const useProduct = (productId: string): UseProductReturn => {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { product, loading, error };
};

const useCart = (): UseCartReturn => {
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);

  const cartTotal = React.useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const addToCart = React.useCallback((product: Product, quantity: number) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeFromCart = React.useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearCart = React.useCallback(() => {
    setCartItems([]);
  }, []);

  return { cartItems, cartTotal, addToCart, removeFromCart, clearCart };
};

// Refactored Component
interface ProductPageProps {
  productId: string;
}

const ProductPage: React.FC<ProductPageProps> = ({ productId }) => {
  const { product, loading, error } = useProduct(productId);
  const { cartItems, cartTotal, addToCart } = useCart();
  const [quantity, setQuantity] = React.useState(1);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div data-testid="product-page">
      <h1>{product.name}</h1>
      <p data-testid="product-price">${product.price}</p>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        min={1}
        data-testid="quantity-input"
      />
      <button onClick={handleAddToCart} data-testid="add-to-cart">
        Add to Cart
      </button>
      <p data-testid="cart-total">Cart Total: ${cartTotal}</p>
      <p data-testid="cart-count">Items in cart: {cartItems.length}</p>
    </div>
  );
};

export { useProduct, useCart, ProductPage };

// Tests
describe('useProduct hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should start in loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useProduct('123'));

    expect(result.current.loading).toBe(true);
    expect(result.current.product).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return product on successful fetch', async () => {
    const mockProduct = { id: '123', name: 'Test Product', price: 99.99 };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    const { result } = renderHook(() => useProduct('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toEqual(mockProduct);
    expect(result.current.error).toBeNull();
  });

  it('should return error on failed fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const { result } = renderHook(() => useProduct('123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toBeNull();
    expect(result.current.error).toBe('Failed to fetch product');
  });

  it('should refetch when productId changes', async () => {
    const product1 = { id: '1', name: 'Product 1', price: 10 };
    const product2 = { id: '2', name: 'Product 2', price: 20 };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(product1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(product2) });

    const { result, rerender } = renderHook(
      ({ id }) => useProduct(id),
      { initialProps: { id: '1' } }
    );

    await waitFor(() => {
      expect(result.current.product?.name).toBe('Product 1');
    });

    rerender({ id: '2' });

    await waitFor(() => {
      expect(result.current.product?.name).toBe('Product 2');
    });
  });
});

describe('useCart hook', () => {
  const mockProduct: Product = { id: '1', name: 'Test', price: 10 };

  it('should start with empty cart', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, 2);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.cartTotal).toBe(20);
  });

  it('should increase quantity when adding same product', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.addToCart(mockProduct, 2);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(3);
  });

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.removeFromCart('1');
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('should clear cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, 1);
      result.current.addToCart({ id: '2', name: 'Other', price: 20 }, 1);
      result.current.clearCart();
    });

    expect(result.current.cartItems).toHaveLength(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('should calculate total correctly with multiple items', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart({ id: '1', name: 'A', price: 10 }, 2); // 20
      result.current.addToCart({ id: '2', name: 'B', price: 15 }, 3); // 45
    });

    expect(result.current.cartTotal).toBe(65);
  });
});

describe('ProductPage integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test Product', price: 25 }),
    });
  });

  it('should display product and handle add to cart', async () => {
    render(<ProductPage productId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    expect(screen.getByTestId('product-price')).toHaveTextContent('$25');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$0');

    await userEvent.click(screen.getByTestId('add-to-cart'));

    expect(screen.getByTestId('cart-total')).toHaveTextContent('$25');
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
  });
});
