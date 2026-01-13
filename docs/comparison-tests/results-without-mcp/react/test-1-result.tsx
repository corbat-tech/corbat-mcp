// Test REACT-1: UserCard Component

import React from 'react';
import { render, screen } from '@testing-library/react';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface UserCardProps {
  user?: User;
  loading?: boolean;
  error?: string;
}

// Component
const UserCard: React.FC<UserCardProps> = ({ user, loading, error }) => {
  if (loading) {
    return (
      <div className="user-card user-card--loading" data-testid="user-card-loading">
        <div className="user-card__skeleton-avatar" />
        <div className="user-card__skeleton-text" />
        <div className="user-card__skeleton-text" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-card user-card--error" data-testid="user-card-error">
        <span className="user-card__error-message">{error}</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-card" data-testid="user-card">
      <img
        className="user-card__avatar"
        src={user.avatarUrl || '/default-avatar.png'}
        alt={`${user.name}'s avatar`}
      />
      <div className="user-card__info">
        <h3 className="user-card__name">{user.name}</h3>
        <p className="user-card__email">{user.email}</p>
        <span className="user-card__role">{user.role}</span>
      </div>
    </div>
  );
};

export default UserCard;

// Tests
describe('UserCard', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  describe('loading state', () => {
    it('should render loading skeleton when loading is true', () => {
      render(<UserCard loading={true} />);

      expect(screen.getByTestId('user-card-loading')).toBeInTheDocument();
    });

    it('should not render user info when loading', () => {
      render(<UserCard loading={true} user={mockUser} />);

      expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should render error message when error is provided', () => {
      const errorMessage = 'Failed to load user';
      render(<UserCard error={errorMessage} />);

      expect(screen.getByTestId('user-card-error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not render user info when there is an error', () => {
      render(<UserCard error="Error" user={mockUser} />);

      expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should render user information', () => {
      render(<UserCard user={mockUser} />);

      expect(screen.getByTestId('user-card')).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockUser.role)).toBeInTheDocument();
    });

    it('should render user avatar with correct src', () => {
      render(<UserCard user={mockUser} />);

      const avatar = screen.getByAltText(`${mockUser.name}'s avatar`);
      expect(avatar).toHaveAttribute('src', mockUser.avatarUrl);
    });

    it('should render default avatar when avatarUrl is not provided', () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: undefined };
      render(<UserCard user={userWithoutAvatar} />);

      const avatar = screen.getByAltText(`${mockUser.name}'s avatar`);
      expect(avatar).toHaveAttribute('src', '/default-avatar.png');
    });
  });

  describe('empty state', () => {
    it('should render nothing when no user and not loading or error', () => {
      const { container } = render(<UserCard />);

      expect(container.firstChild).toBeNull();
    });
  });
});
