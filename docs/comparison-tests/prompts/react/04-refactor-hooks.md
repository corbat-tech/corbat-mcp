# React Test 4: Refactor to Custom Hooks

## Prompt

```
Refactor this component to use custom hooks for better reusability:

function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [productId]);

  useEffect(() => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setCartTotal(total);
  }, [cartItems]);

  const addToCart = () => {
    setCartItems([...cartItems, { ...product, quantity }]);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
      <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
      <button onClick={addToCart}>Add to Cart</button>
      <p>Cart Total: ${cartTotal}</p>
    </div>
  );
}

Extract: useProduct, useCart custom hooks. Include tests.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Custom hooks | useProduct(id), useCart() extracted |
| Types | Hook return types, generic fetch hook |
| Separation | Data fetching vs UI logic |
| Reusability | Hooks usable in other components |
| Testing | Hooks tested with @testing-library/react-hooks |
| Error handling | Proper error states in hooks |

## Output File

- Without MCP: `results-without-mcp/react/test-4-result.tsx`
- With MCP: `results-with-mcp/react/test-4-result.tsx`
