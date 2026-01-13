# Java Spring Test 1: Create a Service

## Prompt

```
Create a UserService in Java Spring Boot that can:
- Create users with name and email
- Get users by ID
- List all users

Use Spring Data JPA with an in-memory H2 database. Include unit tests with JUnit 5 and Mockito.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Architecture | Controller → Service → Repository layers |
| Interfaces | Service interface + implementation |
| DTOs | Request/Response DTOs, not exposing entities |
| Validation | @Valid, @NotBlank, @Email annotations |
| Error handling | @ControllerAdvice, custom exceptions |
| Testing | @MockBean, @WebMvcTest or @SpringBootTest |
| SOLID | Interface segregation, dependency injection |

## Output File

- Without MCP: `results-without-mcp/java-spring/test-1-result.java`
- With MCP: `results-with-mcp/java-spring/test-1-result.java`
