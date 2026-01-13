// Test REACT-2: ContactForm with Validation

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Types
interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface ContactFormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

// Validation
const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.name || data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.message || data.message.length < 10) {
    errors.message = 'Message must be at least 10 characters';
  }

  return errors;
};

// Component
const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [submitError, setSubmitError] = useState<string>('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('loading');

    try {
      await onSubmit(formData);
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('error');
      setSubmitError(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    }
  };

  if (status === 'success') {
    return (
      <div data-testid="success-message" className="contact-form__success">
        Thank you! Your message has been sent.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form" data-testid="contact-form">
      <div className="contact-form__field">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="contact-form__error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="contact-form__field">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" className="contact-form__error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="contact-form__field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message && (
          <span id="message-error" className="contact-form__error" role="alert">
            {errors.message}
          </span>
        )}
      </div>

      {status === 'error' && (
        <div className="contact-form__submit-error" role="alert">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        data-testid="submit-button"
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
};

export default ContactForm;

// Tests
describe('ContactForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  describe('validation', () => {
    it('should show error when name is empty', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when name is too short', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Name'), 'A');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when email is empty', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('should show error when email is invalid', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show error when message is too short', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Message'), 'Short');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Message must be at least 10 characters')).toBeInTheDocument();
    });

    it('should clear error when user starts typing', async () => {
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTestId('submit-button'));
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText('Name'), 'John');
      expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Message'), 'This is a test message.');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test message.',
      });
    });

    it('should show loading state while submitting', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(() => {}));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Message'), 'This is a test message.');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should show success message after successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Message'), 'This is a test message.');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      render(<ContactForm onSubmit={mockOnSubmit} />);

      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Message'), 'This is a test message.');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
