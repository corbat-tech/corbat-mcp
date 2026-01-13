/**
 * Test REACT-4: Refactor to Hooks
 * Refactor to custom hooks (useProduct, useCart).
 *
 * Original code had issues:
 * - Too many useState calls in one component
 * - Mixed concerns (product fetching + cart management)
 * - Duplicate logic that could be extracted
 * - No separation of data fetching from presentation
 */

import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================================
// Types
// ============================================================================

interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly description?: string;
  readonly imageUrl?: string;
}

interface CartItem {
  readonly product: Product;
  readonly quantity: number;
}

interface UseProductResult {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseCartResult {
  items: CartItem[];
  total: number;
  itemCount: number;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

// ============================================================================
// Custom Hook: useProduct
// ============================================================================

export function useProduct(productId: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('Product ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}`);

      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Product not found' : 'Failed to fetch product');
      }

      const data = await response.json();
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    isLoading,
    error,
    refetch: fetchProduct,
  };
}

// ============================================================================
// Custom Hook: useCart with useReducer
// ============================================================================

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' };

interface CartState {
  items: CartItem[];
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item => item.product.id === action.product.id
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + action.quantity,
        };
        return { items: newItems };
      }

      return {
        items: [...state.items, { product: action.product, quantity: action.quantity }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(item => item.product.id !== action.productId),
      };

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return {
          items: state.items.filter(item => item.product.id !== action.productId),
        };
      }

      return {
        items: state.items.map(item =>
          item.product.id === action.productId
            ? { ...item, quantity: action.quantity }
            : item
        ),
      };
    }

    case 'CLEAR':
      return { items: [] };

    default:
      return state;
  }
}

export function useCart(): UseCartResult {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const total = useMemo(() => {
    return state.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }, [state.items]);

  const itemCount = useMemo(() => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  }, [state.items]);

  const addToCart = useCallback((product: Product, quantity: number) => {
    dispatch({ type: 'ADD_ITEM', product, quantity });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', productId });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return {
    items: state.items,
    total,
    itemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px',
  } as React.CSSProperties,

  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px',
  } as React.CSSProperties,

  productName: {
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 8px 0',
  } as React.CSSProperties,

  productPrice: {
    fontSize: '20px',
    color: '#2563eb',
    fontWeight: 600,
  } as React.CSSProperties,

  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 0',
  } as React.CSSProperties,

  quantityInput: {
    width: '60px',
    padding: '8px',
    textAlign: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  } as React.CSSProperties,

  addButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
  } as React.CSSProperties,

  cartSummary: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
  } as React.CSSProperties,

  loading: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280',
  } as React.CSSProperties,

  error: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
  } as React.CSSProperties,
};

// ============================================================================
// Refactored Component
// ============================================================================

interface ProductPageProps {
  productId: string;
}

export function ProductPage({ productId }: ProductPageProps): React.ReactElement {
  const { product, isLoading, error } = useProduct(productId);
  const { items, total, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setQuantity(1);
    }
  };

  if (isLoading) {
    return <div style={styles.loading as React.CSSProperties} data-testid="loading">Loading...</div>;
  }

  if (error) {
    return <div style={styles.error as React.CSSProperties} data-testid="error" role="alert">Error: {error}</div>;
  }

  if (!product) {
    return <div style={styles.error as React.CSSProperties} data-testid="not-found">Product not found</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.productCard} data-testid="product-card">
        <h1 style={styles.productName} data-testid="product-name">{product.name}</h1>
        <p style={styles.productPrice} data-testid="product-price">${product.price.toFixed(2)}</p>

        <div style={styles.quantityControl}>
          <label htmlFor="quantity">Quantity:</label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={handleQuantityChange}
            style={styles.quantityInput as React.CSSProperties}
            data-testid="quantity-input"
          />
        </div>

        <button
          onClick={handleAddToCart}
          style={styles.addButton}
          data-testid="add-to-cart-button"
        >
          Add to Cart
        </button>
      </div>

      <div style={styles.cartSummary} data-testid="cart-summary">
        <h2>Cart Summary</h2>
        <p data-testid="cart-items-count">Items: {items.length}</p>
        <p data-testid="cart-total">Total: ${total.toFixed(2)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useProduct hook', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Test Product',
    price: 29.99,
  };

  it('should fetch product on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    const TestComponent = () => {
      const { product, isLoading } = useProduct('prod-1');
      if (isLoading) return <div data-testid="loading">Loading</div>;
      return <div data-testid="product">{product?.name}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('product')).toHaveTextContent('Test Product');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/products/prod-1');
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const TestComponent = () => {
      const { error, isLoading } = useProduct('prod-1');
      if (isLoading) return <div data-testid="loading">Loading</div>;
      if (error) return <div data-testid="error">{error}</div>;
      return null;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch product');
    });
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const TestComponent = () => {
      const { error, isLoading } = useProduct('prod-1');
      if (isLoading) return <div data-testid="loading">Loading</div>;
      if (error) return <div data-testid="error">{error}</div>;
      return null;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Product not found');
    });
  });

  it('should refetch when productId changes', async () => {
    const product1 = { ...mockProduct, id: 'prod-1', name: 'Product 1' };
    const product2 = { ...mockProduct, id: 'prod-2', name: 'Product 2' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(product1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(product2) });

    const TestComponent = ({ productId }: { productId: string }) => {
      const { product, isLoading } = useProduct(productId);
      if (isLoading) return <div data-testid="loading">Loading</div>;
      return <div data-testid="product">{product?.name}</div>;
    };

    const { rerender } = render(<TestComponent productId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('product')).toHaveTextContent('Product 1');
    });

    rerender(<TestComponent productId="prod-2" />);

    await waitFor(() => {
      expect(screen.getByTestId('product')).toHaveTextContent('Product 2');
    });
  });
});

describe('useCart hook', () => {
  const mockProduct1: Product = { id: 'prod-1', name: 'Product 1', price: 10 };
  const mockProduct2: Product = { id: 'prod-2', name: 'Product 2', price: 20 };

  const TestComponent = () => {
    const { items, total, itemCount, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

    return (
      <div>
        <div data-testid="item-count">{itemCount}</div>
        <div data-testid="total">{total}</div>
        <div data-testid="items-length">{items.length}</div>
        <ul data-testid="cart-items">
          {items.map(item => (
            <li key={item.product.id} data-testid={`item-${item.product.id}`}>
              {item.product.name} x {item.quantity}
            </li>
          ))}
        </ul>
        <button onClick={() => addToCart(mockProduct1, 1)} data-testid="add-product1">Add Product 1</button>
        <button onClick={() => addToCart(mockProduct2, 2)} data-testid="add-product2">Add Product 2</button>
        <button onClick={() => removeFromCart('prod-1')} data-testid="remove-product1">Remove Product 1</button>
        <button onClick={() => updateQuantity('prod-1', 5)} data-testid="update-quantity">Update Quantity</button>
        <button onClick={() => clearCart()} data-testid="clear-cart">Clear Cart</button>
      </div>
    );
  };

  it('should start with empty cart', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('item-count')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
  });

  it('should add items to cart', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1'));

    expect(screen.getByTestId('item-count')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('10');
    expect(screen.getByTestId('item-prod-1')).toHaveTextContent('Product 1 x 1');
  });

  it('should increase quantity when adding same product', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1'));
    await userEvent.click(screen.getByTestId('add-product1'));

    expect(screen.getByTestId('item-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total')).toHaveTextContent('20');
    expect(screen.getByTestId('item-prod-1')).toHaveTextContent('Product 1 x 2');
  });

  it('should calculate total correctly for multiple items', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1')); // 1 x $10 = $10
    await userEvent.click(screen.getByTestId('add-product2')); // 2 x $20 = $40

    expect(screen.getByTestId('total')).toHaveTextContent('50');
    expect(screen.getByTestId('item-count')).toHaveTextContent('3');
  });

  it('should remove items from cart', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1'));
    await userEvent.click(screen.getByTestId('remove-product1'));

    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
  });

  it('should update quantity', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1'));
    await userEvent.click(screen.getByTestId('update-quantity'));

    expect(screen.getByTestId('item-prod-1')).toHaveTextContent('Product 1 x 5');
    expect(screen.getByTestId('total')).toHaveTextContent('50');
  });

  it('should remove item when quantity updated to 0', async () => {
    const TestZeroQuantity = () => {
      const { items, updateQuantity, addToCart } = useCart();
      return (
        <div>
          <div data-testid="items-length">{items.length}</div>
          <button onClick={() => addToCart(mockProduct1, 1)} data-testid="add">Add</button>
          <button onClick={() => updateQuantity('prod-1', 0)} data-testid="set-zero">Set Zero</button>
        </div>
      );
    };

    render(<TestZeroQuantity />);

    await userEvent.click(screen.getByTestId('add'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('1');

    await userEvent.click(screen.getByTestId('set-zero'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
  });

  it('should clear entire cart', async () => {
    render(<TestComponent />);

    await userEvent.click(screen.getByTestId('add-product1'));
    await userEvent.click(screen.getByTestId('add-product2'));
    await userEvent.click(screen.getByTestId('clear-cart'));

    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });
});

describe('ProductPage component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Test Product',
    price: 29.99,
  };

  it('should render product details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    render(<ProductPage productId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toHaveTextContent('Test Product');
    });

    expect(screen.getByTestId('product-price')).toHaveTextContent('$29.99');
  });

  it('should add product to cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    render(<ProductPage productId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('product-card')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('add-to-cart-button'));

    expect(screen.getByTestId('cart-total')).toHaveTextContent('$29.99');
  });

  it('should use custom quantity when adding to cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    render(<ProductPage productId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('product-card')).toBeInTheDocument();
    });

    const input = screen.getByTestId('quantity-input');
    await userEvent.clear(input);
    await userEvent.type(input, '3');
    await userEvent.click(screen.getByTestId('add-to-cart-button'));

    // 3 x $29.99 = $89.97
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$89.97');
  });
});
