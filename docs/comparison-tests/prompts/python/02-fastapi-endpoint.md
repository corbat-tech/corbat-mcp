# Python Test 2: FastAPI Endpoint

## Prompt

```
Create a FastAPI REST API for managing Products.

Endpoints:
- GET /products - list all products
- GET /products/{id} - get product by ID
- POST /products - create product
- PUT /products/{id} - update product
- DELETE /products/{id} - delete product

Products have: id, name, price (must be > 0), stock (must be >= 0).
Include Pydantic models for validation.
Include tests with pytest and TestClient.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Pydantic | Request/Response models with validation |
| HTTP status | Proper status codes (201, 404, 422) |
| Dependency injection | FastAPI Depends() |
| Exception handling | HTTPException with details |
| Testing | TestClient, async tests |
| Documentation | Docstrings, OpenAPI schema |

## Output File

- Without MCP: `results-without-mcp/python/test-2-result.py`
- With MCP: `results-with-mcp/python/test-2-result.py`
