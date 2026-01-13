// Test REACT-3: Bugfix - Infinite re-renders

import React, { useState, useEffect, useCallback } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Original buggy code:
// function UserList({ fetchUsers }) {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//
//   useEffect(() => {
//     const loadUsers = async () => {
//       setLoading(true);
//       const data = await fetchUsers();
//       setUsers(data);
//       setLoading(false);
//     };
//     loadUsers();
//   }, [fetchUsers, users]); // BUG: 'users' in deps causes infinite loop
//
//   if (loading) return <div>Loading...</div>;
//   return <ul>{users.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
// }

// Bug explanation:
// - 'users' is in the dependency array of useEffect
// - When fetchUsers() completes, setUsers(data) updates 'users'
// - This change triggers useEffect again because 'users' changed
// - This creates an infinite loop: fetch -> setUsers -> effect runs -> fetch -> ...

interface User {
  id: string;
  name: string;
}

interface UserListProps {
  fetchUsers: () => Promise<User[]>;
}

// Fixed component
const UserList: React.FC<UserListProps> = ({ fetchUsers }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setLoading(false);
    };
    loadUsers();
  }, [fetchUsers]); // FIX: Removed 'users' from dependency array

  if (loading) return <div>Loading...</div>;

  return (
    <ul data-testid="user-list">
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};

// Alternative fix using useCallback for stable fetchUsers reference
const UserListWithCallback: React.FC<{ loadUsers: () => Promise<User[]> }> = ({
  loadUsers,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const stableFetchUsers = useCallback(loadUsers, [loadUsers]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await stableFetchUsers();
        if (!cancelled) {
          setUsers(data);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [stableFetchUsers]);

  if (loading) return <div>Loading...</div>;

  return (
    <ul data-testid="user-list">
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};

export { UserList, UserListWithCallback };

// Tests
describe('UserList - Bug Fix', () => {
  const mockUsers: User[] = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];

  describe('infinite render bug proof', () => {
    it('should only call fetchUsers once (bug would cause multiple calls)', async () => {
      const fetchUsers = jest.fn().mockResolvedValue(mockUsers);

      render(<UserList fetchUsers={fetchUsers} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-list')).toBeInTheDocument();
      });

      // Wait a bit to ensure no additional calls happen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The fix is proven: fetchUsers should only be called once
      // The buggy version would call it infinitely
      expect(fetchUsers).toHaveBeenCalledTimes(1);
    });

    it('should stop at finite render count (bug would exceed limit)', async () => {
      let renderCount = 0;
      const fetchUsers = jest.fn().mockImplementation(() => {
        renderCount++;
        return Promise.resolve(mockUsers);
      });

      render(<UserList fetchUsers={fetchUsers} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-list')).toBeInTheDocument();
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // With the bug, React would hit max update depth error
      // or renderCount would be very high
      expect(renderCount).toBe(1);
    });
  });

  describe('normal functionality', () => {
    it('should show loading state initially', () => {
      const fetchUsers = jest.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<UserList fetchUsers={fetchUsers} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render users after loading', async () => {
      const fetchUsers = jest.fn().mockResolvedValue(mockUsers);

      render(<UserList fetchUsers={fetchUsers} />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it('should handle empty user list', async () => {
      const fetchUsers = jest.fn().mockResolvedValue([]);

      render(<UserList fetchUsers={fetchUsers} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-list')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-list').children.length).toBe(0);
    });
  });

  describe('UserListWithCallback', () => {
    it('should handle cleanup on unmount', async () => {
      const fetchUsers = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockUsers), 100);
          })
      );

      const { unmount } = render(<UserListWithCallback loadUsers={fetchUsers} />);

      // Unmount before fetch completes
      unmount();

      // Wait for the timeout to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      // No error should occur (component properly cancelled)
      expect(fetchUsers).toHaveBeenCalled();
    });

    it('should update when loadUsers changes', async () => {
      const fetchUsers1 = jest.fn().mockResolvedValue([{ id: '1', name: 'First' }]);
      const fetchUsers2 = jest.fn().mockResolvedValue([{ id: '2', name: 'Second' }]);

      const { rerender } = render(<UserListWithCallback loadUsers={fetchUsers1} />);

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
      });

      rerender(<UserListWithCallback loadUsers={fetchUsers2} />);

      await waitFor(() => {
        expect(screen.getByText('Second')).toBeInTheDocument();
      });
    });
  });
});
