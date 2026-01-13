/**
 * Test REACT-2: Form Validation
 * Create a ContactForm React component:
 * - Name (required, min 2 chars)
 * - Email (required, valid format)
 * - Message (required, min 10 chars)
 * - Submit with loading/success/error states
 * - Include validation tests
 */

import React, { useState, useCallback, useMemo } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================================
// Types
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

interface FieldError {
  field: keyof ContactFormData;
  message: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
}

interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

// ============================================================================
// Validation Logic
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Name is required';
  }
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters';
  }
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  return null;
}

function validateMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Message is required';
  }
  if (trimmed.length < 10) {
    return 'Message must be at least 10 characters';
  }
  return null;
}

function validateForm(data: ContactFormData): ValidationResult {
  const errors: FieldError[] = [];

  const nameError = validateName(data.name);
  if (nameError) {
    errors.push({ field: 'name', message: nameError });
  }

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }

  const messageError = validateMessage(data.message);
  if (messageError) {
    errors.push({ field: 'message', message: messageError });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  form: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  formGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  inputError: {
    borderColor: '#dc2626',
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  errorText: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  } as React.CSSProperties,

  button: {
    width: '100%',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  buttonDisabled: {
    backgroundColor: '#93c5fd',
    cursor: 'not-allowed',
  } as React.CSSProperties,

  successMessage: {
    padding: '16px',
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '6px',
    color: '#166534',
    textAlign: 'center',
  } as React.CSSProperties,

  errorMessage: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
};

// ============================================================================
// Custom Hook for Form State
// ============================================================================

function useContactForm(onSubmit: (data: ContactFormData) => Promise<void>) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
  });

  const [touched, setTouched] = useState<Record<keyof ContactFormData, boolean>>({
    name: false,
    email: false,
    message: false,
  });

  const [status, setStatus] = useState<FormStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validation = useMemo(() => validateForm(formData), [formData]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<keyof ContactFormData, string>> = {};
    validation.errors.forEach(err => {
      errors[err.field] = err.message;
    });
    return errors;
  }, [validation]);

  const handleChange = useCallback((field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleBlur = useCallback((field: keyof ContactFormData) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ name: true, email: true, message: true });

    if (!validation.isValid) {
      return;
    }

    setStatus('submitting');
    setSubmitError(null);

    try {
      await onSubmit(formData);
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTouched({ name: false, email: false, message: false });
    } catch (error) {
      setStatus('error');
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    }
  }, [formData, validation.isValid, onSubmit]);

  const getFieldError = useCallback((field: keyof ContactFormData) => {
    return touched[field] ? fieldErrors[field] : undefined;
  }, [touched, fieldErrors]);

  return {
    formData,
    status,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
    isSubmitDisabled: status === 'submitting',
  };
}

// ============================================================================
// Component
// ============================================================================

export function ContactForm({ onSubmit }: ContactFormProps): React.ReactElement {
  const {
    formData,
    status,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
    isSubmitDisabled,
  } = useContactForm(onSubmit);

  if (status === 'success') {
    return (
      <div style={styles.successMessage as React.CSSProperties} data-testid="success-message" role="alert">
        <p>Thank you for your message! We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  const nameError = getFieldError('name');
  const emailError = getFieldError('email');
  const messageError = getFieldError('message');

  return (
    <form style={styles.form} onSubmit={handleSubmit} noValidate data-testid="contact-form">
      {status === 'error' && submitError && (
        <div style={styles.errorMessage as React.CSSProperties} role="alert" data-testid="submit-error">
          {submitError}
        </div>
      )}

      <div style={styles.formGroup}>
        <label htmlFor="name" style={styles.label}>
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          style={{ ...styles.input, ...(nameError ? styles.inputError : {}) }}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'name-error' : undefined}
          data-testid="name-input"
        />
        {nameError && (
          <p id="name-error" style={styles.errorText} data-testid="name-error">
            {nameError}
          </p>
        )}
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="email" style={styles.label}>
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          style={{ ...styles.input, ...(emailError ? styles.inputError : {}) }}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
          data-testid="email-input"
        />
        {emailError && (
          <p id="email-error" style={styles.errorText} data-testid="email-error">
            {emailError}
          </p>
        )}
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="message" style={styles.label}>
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={handleChange('message')}
          onBlur={handleBlur('message')}
          style={{ ...styles.textarea, ...(messageError ? styles.inputError : {}) } as React.CSSProperties}
          aria-invalid={!!messageError}
          aria-describedby={messageError ? 'message-error' : undefined}
          data-testid="message-input"
        />
        {messageError && (
          <p id="message-error" style={styles.errorText} data-testid="message-error">
            {messageError}
          </p>
        )}
      </div>

      <button
        type="submit"
        style={{ ...styles.button, ...(isSubmitDisabled ? styles.buttonDisabled : {}) }}
        disabled={isSubmitDisabled}
        data-testid="submit-button"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('ContactForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should have proper labels for accessibility', () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });
  });

  describe('Name validation', () => {
    it('should show error when name is empty on blur', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByTestId('name-input');
      fireEvent.blur(nameInput);

      expect(await screen.findByTestId('name-error')).toHaveTextContent('Name is required');
    });

    it('should show error when name is less than 2 characters', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByTestId('name-input');
      await userEvent.type(nameInput, 'A');
      fireEvent.blur(nameInput);

      expect(await screen.findByTestId('name-error')).toHaveTextContent('at least 2 characters');
    });

    it('should not show error for valid name', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByTestId('name-input');
      await userEvent.type(nameInput, 'John');
      fireEvent.blur(nameInput);

      expect(screen.queryByTestId('name-error')).not.toBeInTheDocument();
    });
  });

  describe('Email validation', () => {
    it('should show error when email is empty on blur', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.blur(emailInput);

      expect(await screen.findByTestId('email-error')).toHaveTextContent('Email is required');
    });

    it('should show error for invalid email format', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByTestId('email-input');
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      expect(await screen.findByTestId('email-error')).toHaveTextContent('valid email');
    });

    it('should not show error for valid email', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByTestId('email-input');
      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.blur(emailInput);

      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
    });
  });

  describe('Message validation', () => {
    it('should show error when message is empty on blur', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const messageInput = screen.getByTestId('message-input');
      fireEvent.blur(messageInput);

      expect(await screen.findByTestId('message-error')).toHaveTextContent('Message is required');
    });

    it('should show error when message is less than 10 characters', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const messageInput = screen.getByTestId('message-input');
      await userEvent.type(messageInput, 'Short');
      fireEvent.blur(messageInput);

      expect(await screen.findByTestId('message-error')).toHaveTextContent('at least 10 characters');
    });

    it('should not show error for valid message', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      const messageInput = screen.getByTestId('message-input');
      await userEvent.type(messageInput, 'This is a valid message that is long enough');
      fireEvent.blur(messageInput);

      expect(screen.queryByTestId('message-error')).not.toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'This is my message',
        });
      });
    });

    it('should not call onSubmit when form is invalid', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('submit-button'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show all validation errors on submit attempt', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('submit-button'));

      expect(await screen.findByTestId('name-error')).toBeInTheDocument();
      expect(await screen.findByTestId('email-error')).toBeInTheDocument();
      expect(await screen.findByTestId('message-error')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading text while submitting', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...');
    });

    it('should disable submit button while submitting', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });
  });

  describe('Success state', () => {
    it('should show success message after successful submission', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(await screen.findByTestId('success-message')).toBeInTheDocument();
    });

    it('should hide form after successful submission', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('contact-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error state', () => {
    it('should show error message when submission fails', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(await screen.findByTestId('submit-error')).toHaveTextContent('Network error');
    });

    it('should keep form visible after submission error', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByTestId('name-input'), 'John Doe');
      await userEvent.type(screen.getByTestId('email-input'), 'john@example.com');
      await userEvent.type(screen.getByTestId('message-input'), 'This is my message');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('contact-form')).toBeInTheDocument();
      });
    });
  });
});
