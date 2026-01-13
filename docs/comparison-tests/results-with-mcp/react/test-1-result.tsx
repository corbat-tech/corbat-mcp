/**
 * Test REACT-1: Create Component
 * Create a UserCard React component in TypeScript:
 * - User avatar, name, email, role
 * - Loading and error states
 * - Unit tests with React Testing Library
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ============================================================================
// Types
// ============================================================================

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatarUrl?: string;
}

type UserRole = 'admin' | 'editor' | 'viewer';

interface UserCardProps {
  readonly user?: User;
  readonly isLoading?: boolean;
  readonly error?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function getRoleDisplayName(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    admin: 'Administrator',
    editor: 'Editor',
    viewer: 'Viewer',
  };
  return roleMap[role];
}

function getRoleBadgeColor(role: UserRole): string {
  const colorMap: Record<UserRole, string> = {
    admin: '#dc2626',
    editor: '#2563eb',
    viewer: '#6b7280',
  };
  return colorMap[role];
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
  } as React.CSSProperties,

  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: '#374151',
    overflow: 'hidden',
    flexShrink: 0,
  } as React.CSSProperties,

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,

  content: {
    marginLeft: '16px',
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  name: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  email: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  roleBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#ffffff',
    marginTop: '8px',
  } as React.CSSProperties,

  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    animation: 'pulse 2s infinite',
  } as React.CSSProperties,

  errorCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    maxWidth: '400px',
  } as React.CSSProperties,

  errorIcon: {
    width: '24px',
    height: '24px',
    color: '#dc2626',
    marginRight: '12px',
  } as React.CSSProperties,

  errorText: {
    color: '#991b1b',
    fontSize: '14px',
    margin: 0,
  } as React.CSSProperties,
};

// ============================================================================
// Sub-Components
// ============================================================================

function Avatar({ user }: { user: User }): React.ReactElement {
  if (user.avatarUrl) {
    return (
      <div style={styles.avatar}>
        <img
          src={user.avatarUrl}
          alt={`${user.name}'s avatar`}
          style={styles.avatarImage}
          data-testid="user-avatar-image"
        />
      </div>
    );
  }

  return (
    <div style={styles.avatar} data-testid="user-avatar-initials" aria-label={`${user.name}'s avatar`}>
      {getInitials(user.name)}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }): React.ReactElement {
  return (
    <span
      style={{ ...styles.roleBadge, backgroundColor: getRoleBadgeColor(role) }}
      data-testid="user-role-badge"
    >
      {getRoleDisplayName(role)}
    </span>
  );
}

function LoadingSkeleton(): React.ReactElement {
  return (
    <div style={styles.card} data-testid="user-card-loading" aria-busy="true" aria-label="Loading user information">
      <div style={{ ...styles.avatar, ...styles.skeleton }} />
      <div style={styles.content}>
        <div style={{ ...styles.skeleton, width: '120px', height: '20px' }} />
        <div style={{ ...styles.skeleton, width: '180px', height: '16px', marginTop: '8px' }} />
        <div style={{ ...styles.skeleton, width: '80px', height: '20px', marginTop: '8px', borderRadius: '9999px' }} />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }): React.ReactElement {
  return (
    <div style={styles.errorCard} role="alert" data-testid="user-card-error">
      <svg
        style={styles.errorIcon}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p style={styles.errorText}>{message}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UserCard({ user, isLoading = false, error }: UserCardProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!user) {
    return <ErrorState message="No user data available" />;
  }

  return (
    <article style={styles.card} data-testid="user-card" aria-label={`User card for ${user.name}`}>
      <Avatar user={user} />
      <div style={styles.content}>
        <h2 style={styles.name} data-testid="user-name">{user.name}</h2>
        <p style={styles.email} data-testid="user-email">{user.email}</p>
        <RoleBadge role={user.role} />
      </div>
    </article>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('UserCard', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'admin',
  };

  describe('Default rendering', () => {
    it('should render user name', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    it('should render user email', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByTestId('user-email')).toHaveTextContent('john.doe@example.com');
    });

    it('should render user role badge', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Administrator');
    });

    it('should render initials when no avatar URL provided', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByTestId('user-avatar-initials')).toHaveTextContent('JD');
    });

    it('should render avatar image when URL provided', () => {
      const userWithAvatar = { ...mockUser, avatarUrl: 'https://example.com/avatar.jpg' };
      render(<UserCard user={userWithAvatar} />);
      expect(screen.getByTestId('user-avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });
  });

  describe('Role display', () => {
    it('should display Administrator for admin role', () => {
      render(<UserCard user={{ ...mockUser, role: 'admin' }} />);
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Administrator');
    });

    it('should display Editor for editor role', () => {
      render(<UserCard user={{ ...mockUser, role: 'editor' }} />);
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Editor');
    });

    it('should display Viewer for viewer role', () => {
      render(<UserCard user={{ ...mockUser, role: 'viewer' }} />);
      expect(screen.getByTestId('user-role-badge')).toHaveTextContent('Viewer');
    });
  });

  describe('Loading state', () => {
    it('should render loading skeleton when isLoading is true', () => {
      render(<UserCard isLoading />);
      expect(screen.getByTestId('user-card-loading')).toBeInTheDocument();
    });

    it('should have aria-busy attribute during loading', () => {
      render(<UserCard isLoading />);
      expect(screen.getByTestId('user-card-loading')).toHaveAttribute('aria-busy', 'true');
    });

    it('should not render user data while loading', () => {
      render(<UserCard user={mockUser} isLoading />);
      expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should render error message when error prop provided', () => {
      render(<UserCard error="Failed to load user" />);
      expect(screen.getByTestId('user-card-error')).toHaveTextContent('Failed to load user');
    });

    it('should have role="alert" for accessibility', () => {
      render(<UserCard error="Failed to load user" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show default error when no user data', () => {
      render(<UserCard />);
      expect(screen.getByTestId('user-card-error')).toHaveTextContent('No user data available');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible article label', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByLabelText('User card for John Doe')).toBeInTheDocument();
    });

    it('should have accessible avatar label', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByLabelText("John Doe's avatar")).toBeInTheDocument();
    });
  });

  describe('Initials generation', () => {
    it('should generate correct initials for two-word name', () => {
      render(<UserCard user={{ ...mockUser, name: 'Jane Smith' }} />);
      expect(screen.getByTestId('user-avatar-initials')).toHaveTextContent('JS');
    });

    it('should generate correct initials for single-word name', () => {
      render(<UserCard user={{ ...mockUser, name: 'Madonna' }} />);
      expect(screen.getByTestId('user-avatar-initials')).toHaveTextContent('M');
    });

    it('should limit initials to two characters for long names', () => {
      render(<UserCard user={{ ...mockUser, name: 'John Paul Smith Jr' }} />);
      expect(screen.getByTestId('user-avatar-initials')).toHaveTextContent('JP');
    });
  });
});
