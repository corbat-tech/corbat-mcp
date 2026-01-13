// Test REACT-5: Multi-Step Checkout Wizard

import React, { useReducer, useRef, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Types
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShippingInfo {
  name: string;
  address: string;
  city: string;
  zipCode: string;
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

interface CheckoutState {
  step: number;
  cart: CartItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
  errors: Record<string, string>;
  isSubmitting: boolean;
  submitError: string | null;
  orderConfirmation: string | null;
}

type CheckoutAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_FIELD'; field: string; value: string; section: 'shipping' | 'payment' }
  | { type: 'VALIDATE'; section: string }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; orderId: string }
  | { type: 'SUBMIT_ERROR'; error: string };

const STEPS = ['Cart Review', 'Shipping Info', 'Payment', 'Confirmation'];

// Validation
const validateShipping = (shipping: ShippingInfo): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!shipping.name || shipping.name.length < 2) errors.name = 'Name is required';
  if (!shipping.address) errors.address = 'Address is required';
  if (!shipping.city) errors.city = 'City is required';
  if (!shipping.zipCode || !/^\d{5}$/.test(shipping.zipCode)) {
    errors.zipCode = 'Valid 5-digit zip code required';
  }
  return errors;
};

const validatePayment = (payment: PaymentInfo): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!payment.cardNumber || !/^\d{16}$/.test(payment.cardNumber)) {
    errors.cardNumber = 'Valid 16-digit card number required';
  }
  if (!payment.expiryDate || !/^\d{2}\/\d{2}$/.test(payment.expiryDate)) {
    errors.expiryDate = 'Expiry date must be MM/YY format';
  }
  if (!payment.cvv || !/^\d{3}$/.test(payment.cvv)) {
    errors.cvv = 'Valid 3-digit CVV required';
  }
  return errors;
};

// Reducer
const initialState: CheckoutState = {
  step: 0,
  cart: [],
  shipping: { name: '', address: '', city: '', zipCode: '' },
  payment: { cardNumber: '', expiryDate: '', cvv: '' },
  errors: {},
  isSubmitting: false,
  submitError: null,
  orderConfirmation: null,
};

const checkoutReducer = (state: CheckoutState, action: CheckoutAction): CheckoutState => {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, STEPS.length - 1), errors: {} };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 0), errors: {} };
    case 'SET_FIELD':
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          [action.field]: action.value,
        },
        errors: { ...state.errors, [action.field]: '' },
      };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.error } };
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} };
    case 'SUBMIT':
      return { ...state, isSubmitting: true, submitError: null };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        orderConfirmation: action.orderId,
        step: STEPS.length - 1,
      };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.error };
    default:
      return state;
  }
};

// Component
interface CheckoutWizardProps {
  initialCart: CartItem[];
  onSubmit: (data: { shipping: ShippingInfo; payment: PaymentInfo; cart: CartItem[] }) => Promise<string>;
  paymentTimeout?: number;
}

const CheckoutWizard: React.FC<CheckoutWizardProps> = ({
  initialCart,
  onSubmit,
  paymentTimeout = 10000,
}) => {
  const [state, dispatch] = useReducer(checkoutReducer, {
    ...initialState,
    cart: initialCart,
  });

  const stepRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Announce step changes for accessibility
  useEffect(() => {
    const announcement = `Step ${state.step + 1} of ${STEPS.length}: ${STEPS[state.step]}`;
    const liveRegion = document.getElementById('checkout-announcer');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
    stepRef.current?.focus();
  }, [state.step]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const validateCurrentStep = (): boolean => {
    let errors: Record<string, string> = {};

    if (state.step === 1) {
      errors = validateShipping(state.shipping);
    } else if (state.step === 2) {
      errors = validatePayment(state.payment);
    }

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, error]) => {
        dispatch({ type: 'SET_ERROR', field, error });
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    dispatch({ type: 'SUBMIT' });

    // Set timeout for payment
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('Payment timeout - please retry'));
      }, paymentTimeout);
    });

    try {
      const orderId = await Promise.race([
        onSubmit({ shipping: state.shipping, payment: state.payment, cart: state.cart }),
        timeoutPromise,
      ]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      dispatch({ type: 'SUBMIT_SUCCESS', orderId });
    } catch (error) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      dispatch({
        type: 'SUBMIT_ERROR',
        error: error instanceof Error ? error.message : 'Payment failed',
      });
    }
  };

  const handleRetry = () => {
    handleSubmit();
  };

  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="checkout-wizard" data-testid="checkout-wizard">
      {/* Accessibility announcer */}
      <div id="checkout-announcer" aria-live="polite" className="sr-only" />

      {/* Progress indicator */}
      <nav aria-label="Checkout progress">
        <ol className="checkout-steps">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={index === state.step ? 'active' : index < state.step ? 'completed' : ''}
              aria-current={index === state.step ? 'step' : undefined}
            >
              {step}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <div ref={stepRef} tabIndex={-1} className="step-content">
        {/* Step 0: Cart Review */}
        {state.step === 0 && (
          <section aria-labelledby="cart-heading">
            <h2 id="cart-heading">Cart Review</h2>
            <ul data-testid="cart-items">
              {state.cart.map((item) => (
                <li key={item.id}>
                  {item.name} x {item.quantity} - ${item.price * item.quantity}
                </li>
              ))}
            </ul>
            <p data-testid="cart-total">Total: ${cartTotal}</p>
          </section>
        )}

        {/* Step 1: Shipping */}
        {state.step === 1 && (
          <section aria-labelledby="shipping-heading">
            <h2 id="shipping-heading">Shipping Information</h2>
            <div>
              <label htmlFor="shipping-name">Name</label>
              <input
                id="shipping-name"
                type="text"
                value={state.shipping.name}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value, section: 'shipping' })
                }
                aria-invalid={!!state.errors.name}
              />
              {state.errors.name && <span role="alert">{state.errors.name}</span>}
            </div>
            <div>
              <label htmlFor="shipping-address">Address</label>
              <input
                id="shipping-address"
                type="text"
                value={state.shipping.address}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'address', value: e.target.value, section: 'shipping' })
                }
                aria-invalid={!!state.errors.address}
              />
              {state.errors.address && <span role="alert">{state.errors.address}</span>}
            </div>
            <div>
              <label htmlFor="shipping-city">City</label>
              <input
                id="shipping-city"
                type="text"
                value={state.shipping.city}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'city', value: e.target.value, section: 'shipping' })
                }
                aria-invalid={!!state.errors.city}
              />
              {state.errors.city && <span role="alert">{state.errors.city}</span>}
            </div>
            <div>
              <label htmlFor="shipping-zip">Zip Code</label>
              <input
                id="shipping-zip"
                type="text"
                value={state.shipping.zipCode}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'zipCode', value: e.target.value, section: 'shipping' })
                }
                aria-invalid={!!state.errors.zipCode}
              />
              {state.errors.zipCode && <span role="alert">{state.errors.zipCode}</span>}
            </div>
          </section>
        )}

        {/* Step 2: Payment */}
        {state.step === 2 && (
          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading">Payment Information</h2>
            <div>
              <label htmlFor="card-number">Card Number</label>
              <input
                id="card-number"
                type="text"
                value={state.payment.cardNumber}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'cardNumber', value: e.target.value, section: 'payment' })
                }
                aria-invalid={!!state.errors.cardNumber}
              />
              {state.errors.cardNumber && <span role="alert">{state.errors.cardNumber}</span>}
            </div>
            <div>
              <label htmlFor="expiry-date">Expiry Date</label>
              <input
                id="expiry-date"
                type="text"
                placeholder="MM/YY"
                value={state.payment.expiryDate}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'expiryDate', value: e.target.value, section: 'payment' })
                }
                aria-invalid={!!state.errors.expiryDate}
              />
              {state.errors.expiryDate && <span role="alert">{state.errors.expiryDate}</span>}
            </div>
            <div>
              <label htmlFor="cvv">CVV</label>
              <input
                id="cvv"
                type="text"
                value={state.payment.cvv}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', field: 'cvv', value: e.target.value, section: 'payment' })
                }
                aria-invalid={!!state.errors.cvv}
              />
              {state.errors.cvv && <span role="alert">{state.errors.cvv}</span>}
            </div>

            {state.submitError && (
              <div role="alert" data-testid="submit-error">
                {state.submitError}
                <button onClick={handleRetry} data-testid="retry-button">
                  Retry Payment
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Confirmation */}
        {state.step === 3 && state.orderConfirmation && (
          <section aria-labelledby="confirmation-heading">
            <h2 id="confirmation-heading">Order Confirmed!</h2>
            <p data-testid="order-id">Order ID: {state.orderConfirmation}</p>
            <p>Thank you for your purchase!</p>
          </section>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="checkout-nav">
        {state.step > 0 && state.step < 3 && (
          <button onClick={handleBack} data-testid="back-button">
            Back
          </button>
        )}
        {state.step < 2 && (
          <button onClick={handleNext} data-testid="next-button">
            Next
          </button>
        )}
        {state.step === 2 && (
          <button
            onClick={handleSubmit}
            disabled={state.isSubmitting}
            data-testid="submit-button"
          >
            {state.isSubmitting ? 'Processing...' : 'Place Order'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckoutWizard;

// Tests
describe('CheckoutWizard', () => {
  const mockCart: CartItem[] = [
    { id: '1', name: 'Product A', price: 25, quantity: 2 },
    { id: '2', name: 'Product B', price: 15, quantity: 1 },
  ];

  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  describe('full checkout flow', () => {
    it('should complete full checkout successfully', async () => {
      mockOnSubmit.mockResolvedValue('ORDER-123');

      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      // Step 0: Cart Review
      expect(screen.getByText('Cart Review')).toBeInTheDocument();
      expect(screen.getByTestId('cart-total')).toHaveTextContent('$65');
      await userEvent.click(screen.getByTestId('next-button'));

      // Step 1: Shipping
      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Address'), '123 Main St');
      await userEvent.type(screen.getByLabelText('City'), 'Boston');
      await userEvent.type(screen.getByLabelText('Zip Code'), '02101');
      await userEvent.click(screen.getByTestId('next-button'));

      // Step 2: Payment
      await userEvent.type(screen.getByLabelText('Card Number'), '1234567890123456');
      await userEvent.type(screen.getByLabelText('Expiry Date'), '12/25');
      await userEvent.type(screen.getByLabelText('CVV'), '123');
      await userEvent.click(screen.getByTestId('submit-button'));

      // Step 3: Confirmation
      await waitFor(() => {
        expect(screen.getByTestId('order-id')).toHaveTextContent('ORDER-123');
      });
    });
  });

  describe('validation errors', () => {
    it('should show shipping validation errors', async () => {
      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('next-button')); // To shipping
      await userEvent.click(screen.getByTestId('next-button')); // Try to advance

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Address is required')).toBeInTheDocument();
    });

    it('should show payment validation errors', async () => {
      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      // Complete shipping
      await userEvent.click(screen.getByTestId('next-button'));
      await userEvent.type(screen.getByLabelText('Name'), 'John');
      await userEvent.type(screen.getByLabelText('Address'), '123 St');
      await userEvent.type(screen.getByLabelText('City'), 'Boston');
      await userEvent.type(screen.getByLabelText('Zip Code'), '02101');
      await userEvent.click(screen.getByTestId('next-button'));

      // Try to submit without payment
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Valid 16-digit card number required')).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    it('should preserve data when going back', async () => {
      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('next-button'));
      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Address'), '123 Main St');
      await userEvent.type(screen.getByLabelText('City'), 'Boston');
      await userEvent.type(screen.getByLabelText('Zip Code'), '02101');
      await userEvent.click(screen.getByTestId('next-button'));

      // Go back
      await userEvent.click(screen.getByTestId('back-button'));

      // Data should be preserved
      expect(screen.getByLabelText('Name')).toHaveValue('John Doe');
    });
  });

  describe('payment failure and retry', () => {
    it('should show error and allow retry on payment failure', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Card declined'));
      mockOnSubmit.mockResolvedValueOnce('ORDER-456');

      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      // Navigate to payment
      await userEvent.click(screen.getByTestId('next-button'));
      await userEvent.type(screen.getByLabelText('Name'), 'John');
      await userEvent.type(screen.getByLabelText('Address'), '123 St');
      await userEvent.type(screen.getByLabelText('City'), 'Boston');
      await userEvent.type(screen.getByLabelText('Zip Code'), '02101');
      await userEvent.click(screen.getByTestId('next-button'));

      await userEvent.type(screen.getByLabelText('Card Number'), '1234567890123456');
      await userEvent.type(screen.getByLabelText('Expiry Date'), '12/25');
      await userEvent.type(screen.getByLabelText('CVV'), '123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toHaveTextContent('Card declined');
      });

      // Retry
      await userEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('order-id')).toBeInTheDocument();
      });
    });
  });

  describe('timeout handling', () => {
    it('should show timeout error after specified duration', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <CheckoutWizard
          initialCart={mockCart}
          onSubmit={mockOnSubmit}
          paymentTimeout={100}
        />
      );

      // Navigate to payment
      await userEvent.click(screen.getByTestId('next-button'));
      await userEvent.type(screen.getByLabelText('Name'), 'John');
      await userEvent.type(screen.getByLabelText('Address'), '123 St');
      await userEvent.type(screen.getByLabelText('City'), 'Boston');
      await userEvent.type(screen.getByLabelText('Zip Code'), '02101');
      await userEvent.click(screen.getByTestId('next-button'));

      await userEvent.type(screen.getByLabelText('Card Number'), '1234567890123456');
      await userEvent.type(screen.getByLabelText('Expiry Date'), '12/25');
      await userEvent.type(screen.getByLabelText('CVV'), '123');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(
        () => {
          expect(screen.getByTestId('submit-error')).toHaveTextContent('timeout');
        },
        { timeout: 200 }
      );
    });
  });

  describe('keyboard navigation', () => {
    it('should support keyboard interaction', async () => {
      render(<CheckoutWizard initialCart={mockCart} onSubmit={mockOnSubmit} />);

      const nextButton = screen.getByTestId('next-button');
      nextButton.focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });
  });
});
