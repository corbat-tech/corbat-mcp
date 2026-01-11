# Database Selection Guide

## Overview

This guide helps choose the right database technology based on your application requirements.

## Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SELECTION FLOWCHART                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Need ACID transactions?                                                     │
│  ├─ YES: Need complex queries/joins?                                        │
│  │       ├─ YES: → PostgreSQL (default choice)                              │
│  │       └─ NO:  High write throughput?                                     │
│  │               ├─ YES: → PostgreSQL with partitioning                     │
│  │               └─ NO:  → PostgreSQL                                       │
│  │                                                                           │
│  └─ NO: What's the data model?                                              │
│         ├─ Key-Value:    → Redis                                            │
│         ├─ Document:     → MongoDB                                          │
│         ├─ Time Series:  → TimescaleDB or InfluxDB                          │
│         ├─ Graph:        → Neo4j                                            │
│         ├─ Search:       → Elasticsearch                                    │
│         └─ Wide Column:  → Cassandra                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Comparison

| Database | Best For | Not Good For | Scalability |
|----------|----------|--------------|-------------|
| **PostgreSQL** | OLTP, complex queries, JSON, full-text search | Extreme write scale | Vertical + Read replicas |
| **MySQL** | Web apps, read-heavy workloads | Complex queries | Vertical + Read replicas |
| **MongoDB** | Document storage, rapid prototyping | Complex transactions | Horizontal (sharding) |
| **Redis** | Caching, sessions, real-time data | Large data sets | Cluster mode |
| **Elasticsearch** | Full-text search, log analytics | Primary data store | Horizontal |
| **Cassandra** | High write throughput, time series | Complex queries | Horizontal |
| **DynamoDB** | Serverless, key-value | Complex queries, joins | Managed horizontal |

## PostgreSQL (Recommended Default)

PostgreSQL is the recommended default for most Spring Boot applications.

### Why PostgreSQL?

- **ACID compliant**: Full transaction support
- **Rich SQL support**: CTEs, window functions, complex joins
- **JSON support**: JSONB for document-like storage
- **Full-text search**: Built-in, no separate engine needed
- **Extensions**: PostGIS, pg_trgm, pgvector, etc.
- **Mature ecosystem**: Excellent Spring Data JPA support
- **Free and open source**: No licensing costs

### Spring Data JPA Configuration

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/orderdb
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    open-in-view: false
```

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

### Docker Compose

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: orderdb
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ports:
    - "5432:5432"
  volumes:
    - postgres-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5
```

## MongoDB (Document Store)

Use when you need:
- Flexible schema
- Document-oriented data model
- Rapid prototyping
- Horizontal scaling

### Spring Data MongoDB Configuration

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/orderdb
      auto-index-creation: true
```

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

### Repository Example

```java
@Document(collection = "orders")
public class Order {
    @Id
    private String id;
    private String customerId;
    private List<OrderLine> lines;
    private Instant createdAt;
}

public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByCustomerId(String customerId);

    @Query("{ 'lines.productId': ?0 }")
    List<Order> findByProductId(String productId);
}
```

## Redis (Cache & Sessions)

Use for:
- Caching frequently accessed data
- Session storage
- Rate limiting
- Leaderboards
- Pub/Sub messaging

### Spring Data Redis Configuration

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD:}
  cache:
    type: redis
    redis:
      time-to-live: 3600000
```

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

### Caching Example

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Cacheable(value = "products", key = "#id")
    public Product findById(String id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product save(Product product) {
        return productRepository.save(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    public void clearCache() {
        // Clears all products from cache
    }
}
```

## Elasticsearch (Search)

Use for:
- Full-text search
- Log analytics
- Complex search queries
- Autocomplete

### Spring Data Elasticsearch Configuration

```yaml
spring:
  elasticsearch:
    uris: http://localhost:9200
    username: ${ELASTIC_USERNAME:}
    password: ${ELASTIC_PASSWORD:}
```

### Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

### Search Example

```java
@Document(indexName = "products")
public class ProductDocument {
    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Double)
    private BigDecimal price;
}

public interface ProductSearchRepository extends ElasticsearchRepository<ProductDocument, String> {

    List<ProductDocument> findByNameContaining(String name);

    @Query("{\"bool\": {\"must\": [{\"match\": {\"name\": \"?0\"}}]}}")
    List<ProductDocument> searchByName(String name);
}
```

## Database Migrations with Flyway

### Configuration

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    validate-on-migrate: true
```

### Migration File Naming

```
db/migration/
├── V1__create_orders_table.sql
├── V2__add_customer_id_index.sql
├── V3__create_order_lines_table.sql
└── V4__add_status_column.sql
```

### Migration Example

```sql
-- V1__create_orders_table.sql
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

## Multi-Database Strategy

For complex applications, combine databases:

```
┌─────────────────────────────────────────────────────────────────┐
│                       MULTI-DATABASE ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ PostgreSQL  │    │    Redis    │    │Elasticsearch│          │
│  │             │    │             │    │             │          │
│  │ Primary     │    │   Cache     │    │   Search    │          │
│  │ Data Store  │    │   Sessions  │    │   Index     │          │
│  │             │    │   Rate Limit│    │             │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼───────┐                            │
│                    │ Spring Boot   │                            │
│                    │ Application   │                            │
│                    └───────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration for Multiple Data Sources

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.read-replica")
    public DataSource readReplicaDataSource() {
        return DataSourceBuilder.create().build();
    }
}
```

## Performance Considerations

### Connection Pooling (HikariCP)

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10        # Recommended: 2 * CPU cores + disk spindles
      minimum-idle: 5
      connection-timeout: 30000    # 30 seconds
      idle-timeout: 600000         # 10 minutes
      max-lifetime: 1800000        # 30 minutes
      leak-detection-threshold: 60000
```

### Indexing Strategy

```sql
-- Create indexes for frequent query patterns
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_created_at_desc ON orders(created_at DESC);

-- Partial index for active orders
CREATE INDEX idx_active_orders ON orders(customer_id)
WHERE status IN ('PENDING', 'CONFIRMED');

-- GIN index for JSONB columns
CREATE INDEX idx_order_metadata ON orders USING GIN(metadata);
```

## Testing with Testcontainers

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

## Best Practices

1. **Start with PostgreSQL**: It handles most use cases well
2. **Add Redis for caching**: When you need to reduce database load
3. **Add Elasticsearch**: When you need advanced search capabilities
4. **Use connection pooling**: HikariCP is the default and recommended
5. **Always use migrations**: Flyway or Liquibase
6. **Index strategically**: Based on query patterns, not guessing
7. **Monitor performance**: Use pg_stat_statements, slow query logs
8. **Plan for scaling**: Read replicas, partitioning, or sharding
9. **Test with real databases**: Use Testcontainers in integration tests
10. **Secure connections**: Use SSL/TLS in production
