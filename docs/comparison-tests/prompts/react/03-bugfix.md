# React Test 3: Bugfix (Infinite Re-render)

## Prompt

```
Fix this bug: The component causes infinite re-renders.

function UserList({ fetchUsers }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setLoading(false);
    };
    loadUsers();
  }, [fetchUsers, users]);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

Write tests that prove the bug exists and is fixed.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Root cause | Identifies `users` in dependency array |
| Fix | Removes unnecessary dependency |
| useCallback | Memoizes fetchUsers if needed |
| Testing | Verifies no infinite loop, proper loading states |
| Explanation | Documents why the bug occurred |
| Best practices | Proper useEffect patterns |

## Output File

- Without MCP: `results-without-mcp/react/test-3-result.tsx`
- With MCP: `results-with-mcp/react/test-3-result.tsx`
