# Java Spring Test 2: REST Endpoint

## Prompt

```
Create a REST API endpoint for managing Products in Spring Boot.

Requirements:
- GET /api/products - list all products
- GET /api/products/{id} - get product by ID
- POST /api/products - create product
- PUT /api/products/{id} - update product
- DELETE /api/products/{id} - delete product

Products have: id, name, price (must be > 0), stock (must be >= 0).
Include validation and proper HTTP status codes.
Include integration tests.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| REST conventions | Proper HTTP methods and status codes |
| DTOs | CreateProductRequest, ProductResponse |
| Validation | Bean validation with custom messages |
| Exception handling | @ExceptionHandler, proper error responses |
| Testing | @WebMvcTest with MockMvc |
| Documentation | OpenAPI/Swagger annotations (optional) |

## Output File

- Without MCP: `results-without-mcp/java-spring/test-2-result.java`
- With MCP: `results-with-mcp/java-spring/test-2-result.java`
