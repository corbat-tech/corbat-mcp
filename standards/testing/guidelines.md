# Testing Guidelines

## Overview

Testing is essential for maintainable software. These guidelines cover unit tests, integration tests, architecture tests, and testing best practices for Java/Spring Boot applications.

## Test Pyramid

```
        /\
       /  \      E2E Tests (few)
      /----\
     /      \    Integration Tests (some)
    /--------\
   /          \  Unit Tests (many)
  --------------
```

- **Unit Tests**: 70% - Fast, isolated, test single units
- **Integration Tests**: 20% - Test component interactions
- **E2E Tests**: 10% - Test full user flows

## Test Types and Naming Conventions

| Type | Suffix | Plugin | Phase | Example |
|------|--------|--------|-------|---------|
| Unit | `*Test.java` | maven-surefire | test | `OrderServiceTest.java` |
| Integration | `*IT.java` | maven-failsafe | integration-test | `OrderRepositoryIT.java` |
| E2E | `*E2ETest.java` | maven-failsafe | integration-test | `OrderFlowE2ETest.java` |
| Architecture | `*ArchTest.java` | maven-surefire | test | `HexagonalArchTest.java` |

### Maven Configuration for IT Tests

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <version>${maven-failsafe-plugin.version}</version>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <includes>
            <include>**/*IT.java</include>
            <include>**/*E2ETest.java</include>
        </includes>
    </configuration>
</plugin>
```

## Unit Testing

### Structure: Arrange-Act-Assert (AAA)

```java
@Test
void should_CalculateTotal_When_OrderHasMultipleLines() {
    // Arrange
    Order order = Order.create(OrderId.generate(), customerId);
    order.addLine(productId1, 2, Money.of(10, "USD"));
    order.addLine(productId2, 1, Money.of(25, "USD"));

    // Act
    Money total = order.calculateTotal();

    // Assert
    assertThat(total).isEqualTo(Money.of(45, "USD"));
}
```

### Test Method Naming Convention

Pattern: `should_ExpectedBehavior_When_Condition`

```java
@Test
void should_ThrowException_When_OrderIsEmpty() { }

@Test
void should_ApplyDiscount_When_CustomerIsPremium() { }

@Test
void should_ReturnEmptyList_When_NoOrdersExist() { }

@Test
void should_CreateOrder_When_AllFieldsAreValid() { }
```

### Use AssertJ for Assertions

```java
// Bad - JUnit assertions
assertEquals(expected, actual);
assertTrue(list.isEmpty());

// Good - AssertJ
assertThat(actual).isEqualTo(expected);
assertThat(list).isEmpty();
assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
assertThat(orders)
    .hasSize(3)
    .extracting(Order::getStatus)
    .containsOnly(OrderStatus.PENDING);
```

### Testing Domain Objects

```java
class MoneyTest {

    @Test
    void should_CreateMoney_When_AmountIsPositive() {
        Money money = Money.of(100, "USD");

        assertThat(money.getAmount()).isEqualByComparingTo(new BigDecimal("100"));
        assertThat(money.getCurrency()).isEqualTo(Currency.getInstance("USD"));
    }

    @Test
    void should_ThrowException_When_AmountIsNegative() {
        assertThatThrownBy(() -> Money.of(-100, "USD"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("negative");
    }

    @Test
    void should_AddMoney_When_CurrenciesMatch() {
        Money a = Money.of(100, "USD");
        Money b = Money.of(50, "USD");

        Money result = a.add(b);

        assertThat(result).isEqualTo(Money.of(150, "USD"));
    }
}
```

### Mocking with Mockito

```java
@ExtendWith(MockitoExtension.class)
class PlaceOrderUseCaseTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private EventPublisher eventPublisher;

    @InjectMocks
    private PlaceOrderUseCase useCase;

    @Test
    void should_SaveOrder_When_CommandIsValid() {
        // Arrange
        PlaceOrderCommand command = new PlaceOrderCommand(customerId, lines);

        // Act
        OrderId result = useCase.execute(command);

        // Assert
        verify(orderRepository).save(any(Order.class));
        verify(eventPublisher).publish(any(OrderPlaced.class));
        assertThat(result).isNotNull();
    }

    @Test
    void should_ThrowException_When_CustomerNotFound() {
        // Arrange
        when(customerRepository.findById(any())).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> useCase.execute(command))
            .isInstanceOf(CustomerNotFoundException.class);

        verify(orderRepository, never()).save(any());
    }
}
```

## Integration Testing

### Naming Convention: Use `*IT.java` Suffix

Integration tests must end with `IT` for maven-failsafe automatic detection:

```java
// File: OrderRepositoryIT.java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {
    // ...
}

// File: OrderControllerIT.java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerIT {
    // ...
}
```

### Spring Boot Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void should_CreateOrder_When_RequestIsValid() throws Exception {
        String requestBody = """
            {
                "customerId": "cust-123",
                "lines": [
                    {"productId": "prod-1", "quantity": 2}
                ]
            }
            """;

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.status").value("PENDING"));
    }
}
```

### Testcontainers for Database Tests

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void should_PersistAndRetrieveOrder() {
        Order order = createTestOrder();

        orderRepository.save(order);
        Optional<Order> found = orderRepository.findById(order.getId());

        assertThat(found)
            .isPresent()
            .get()
            .satisfies(o -> {
                assertThat(o.getId()).isEqualTo(order.getId());
                assertThat(o.getStatus()).isEqualTo(order.getStatus());
            });
    }
}
```

### Kafka Integration Tests

```java
@SpringBootTest
@Testcontainers
@EmbeddedKafka(partitions = 1, topics = {"orders.order.created"})
class OrderEventPublisherIT {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    );

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    @Test
    void should_PublishEvent_When_OrderIsCreated() {
        // Test Kafka integration
    }
}
```

## Architecture Testing with ArchUnit

ArchUnit tests verify architectural constraints are respected.

### Setup

```xml
<dependency>
    <groupId>com.tngtech.archunit</groupId>
    <artifactId>archunit-junit5</artifactId>
    <version>${archunit.version}</version>
    <scope>test</scope>
</dependency>
```

### Hexagonal Architecture Tests

```java
@AnalyzeClasses(packages = "com.example.myapp")
class HexagonalArchTest {

    @ArchTest
    static final ArchRule domain_should_not_depend_on_infrastructure =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..infrastructure..");

    @ArchTest
    static final ArchRule domain_should_not_depend_on_application =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..application..");

    @ArchTest
    static final ArchRule application_should_not_depend_on_infrastructure =
        noClasses()
            .that().resideInAPackage("..application..")
            .should().dependOnClassesThat()
            .resideInAPackage("..infrastructure..");

    @ArchTest
    static final ArchRule domain_should_not_use_spring_annotations =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("org.springframework..");
}
```

### Naming Convention Tests

```java
@AnalyzeClasses(packages = "com.example.myapp")
class NamingConventionArchTest {

    @ArchTest
    static final ArchRule controllers_should_be_suffixed =
        classes()
            .that().resideInAPackage("..adapter.in.rest..")
            .and().areAnnotatedWith(RestController.class)
            .should().haveSimpleNameEndingWith("Controller");

    @ArchTest
    static final ArchRule use_cases_should_be_suffixed =
        classes()
            .that().resideInAPackage("..application.usecase..")
            .should().haveSimpleNameEndingWith("UseCase");

    @ArchTest
    static final ArchRule repositories_should_be_suffixed =
        classes()
            .that().implement(Repository.class)
            .should().haveSimpleNameEndingWith("Repository");
}
```

### Layer Definition Tests

```java
@AnalyzeClasses(packages = "com.example.myapp")
class LayeredArchitectureTest {

    @ArchTest
    static final ArchRule layer_dependencies_are_respected =
        layeredArchitecture()
            .consideringAllDependencies()
            .layer("Domain").definedBy("..domain..")
            .layer("Application").definedBy("..application..")
            .layer("Infrastructure").definedBy("..infrastructure..")

            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Infrastructure")
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Infrastructure")
            .whereLayer("Infrastructure").mayNotBeAccessedByAnyLayer();
}
```

## Test Data

### Use Test Fixtures / Builders

```java
public class OrderFixtures {

    public static Order aDefaultOrder() {
        return Order.create(
            OrderId.of("order-123"),
            CustomerId.of("customer-456")
        );
    }

    public static Order anOrderWithLines(int lineCount) {
        Order order = aDefaultOrder();
        for (int i = 0; i < lineCount; i++) {
            order.addLine(ProductId.of("prod-" + i), 1, Money.of(10, "USD"));
        }
        return order;
    }
}
```

### Use Builder Pattern for Test Data

```java
public class OrderTestBuilder {
    private OrderId id = OrderId.generate();
    private CustomerId customerId = CustomerId.of("default-customer");
    private List<OrderLine> lines = new ArrayList<>();

    public OrderTestBuilder withId(String id) {
        this.id = OrderId.of(id);
        return this;
    }

    public OrderTestBuilder withLine(String productId, int qty, int price) {
        lines.add(new OrderLine(ProductId.of(productId), qty, Money.of(price, "USD")));
        return this;
    }

    public Order build() {
        Order order = Order.create(id, customerId);
        lines.forEach(line -> order.addLine(line.productId(), line.quantity(), line.price()));
        return order;
    }
}

// Usage
Order order = new OrderTestBuilder()
    .withId("order-123")
    .withLine("prod-1", 2, 100)
    .withLine("prod-2", 1, 50)
    .build();
```

### Object Mother Pattern

```java
public class OrderMother {

    public static Order pendingOrder() {
        return Order.create(OrderId.generate(), CustomerId.of("customer-1"));
    }

    public static Order confirmedOrder() {
        Order order = pendingOrder();
        order.confirm();
        return order;
    }

    public static Order shippedOrder() {
        Order order = confirmedOrder();
        order.ship(TrackingNumber.of("TRACK-123"));
        return order;
    }
}
```

## Slice Tests (Spring Boot)

### Web Layer Tests

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlaceOrderUseCase placeOrderUseCase;

    @MockBean
    private GetOrderUseCase getOrderUseCase;

    @Test
    void should_Return201_When_OrderCreated() throws Exception {
        when(placeOrderUseCase.execute(any()))
            .thenReturn(OrderId.of("order-123"));

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerId\": \"cust-1\"}"))
            .andExpect(status().isCreated());
    }
}
```

### Repository Layer Tests

```java
@DataJpaTest
class OrderJpaRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderJpaRepository repository;

    @Test
    void should_FindOrdersByCustomer() {
        // Arrange
        OrderEntity order = new OrderEntity();
        order.setCustomerId("cust-123");
        entityManager.persist(order);

        // Act
        List<OrderEntity> found = repository.findByCustomerId("cust-123");

        // Assert
        assertThat(found).hasSize(1);
    }
}
```

## Best Practices

1. **Test behavior, not implementation**: Focus on what, not how
2. **One assertion concept per test**: Keep tests focused
3. **Tests should be independent**: No shared state between tests
4. **Tests should be fast**: Unit tests < 100ms, integration < 5s
5. **Tests should be deterministic**: Same result every time
6. **Use meaningful test names**: They serve as documentation
7. **Don't test private methods**: Test through public API
8. **Mock external dependencies**: Database, APIs, file system
9. **Cover edge cases**: Null, empty, boundary values
10. **Maintain test code quality**: Same standards as production code
11. **Use `*IT.java` suffix for integration tests**: Maven Failsafe detects them automatically
12. **Use ArchUnit for architecture validation**: Enforce layer dependencies
