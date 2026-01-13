/**
 * Test JAVA-2: REST Endpoint
 * Create a REST API for Products in Spring Boot:
 * - GET /api/products - list all
 * - GET /api/products/{id} - get by ID
 * - POST /api/products - create
 * - PUT /api/products/{id} - update
 * - DELETE /api/products/{id} - delete
 *
 * Products: id, name, price (>0), stock (>=0). Include validation and tests.
 */

// ============================================================================
// Domain Entity
// ============================================================================

package com.example.products.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Product() {
        // JPA requires default constructor
    }

    public Product(String name, BigDecimal price, Integer stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
    public Integer getStock() { return stock; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setName(String name) {
        this.name = name;
        this.updatedAt = Instant.now();
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
        this.updatedAt = Instant.now();
    }

    public void setStock(Integer stock) {
        this.stock = stock;
        this.updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Product product = (Product) o;
        return Objects.equals(id, product.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

// ============================================================================
// Repository
// ============================================================================

package com.example.products.repository;

import com.example.products.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
}

// ============================================================================
// Custom Exceptions
// ============================================================================

package com.example.products.exception;

public class ProductNotFoundException extends RuntimeException {

    private final String productId;

    public ProductNotFoundException(String productId) {
        super("Product with id '" + productId + "' not found");
        this.productId = productId;
    }

    public String getProductId() {
        return productId;
    }
}

package com.example.products.exception;

import java.util.List;

public class ValidationException extends RuntimeException {

    private final List<String> errors;

    public ValidationException(List<String> errors) {
        super("Validation failed: " + String.join(", ", errors));
        this.errors = errors;
    }

    public List<String> getErrors() {
        return errors;
    }
}

// ============================================================================
// DTOs
// ============================================================================

package com.example.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateProductRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    BigDecimal price,

    @NotNull(message = "Stock is required")
    @Min(value = 0, message = "Stock cannot be negative")
    Integer stock
) {}

package com.example.products.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record UpdateProductRequest(
    String name,

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    BigDecimal price,

    @Min(value = 0, message = "Stock cannot be negative")
    Integer stock
) {}

package com.example.products.dto;

import com.example.products.domain.Product;
import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
    String id,
    String name,
    BigDecimal price,
    Integer stock,
    Instant createdAt,
    Instant updatedAt
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
            product.getId(),
            product.getName(),
            product.getPrice(),
            product.getStock(),
            product.getCreatedAt(),
            product.getUpdatedAt()
        );
    }
}

// ============================================================================
// Service Interface
// ============================================================================

package com.example.products.service;

import com.example.products.dto.*;
import java.util.List;

public interface ProductService {
    ProductResponse createProduct(CreateProductRequest request);
    ProductResponse getProductById(String id);
    List<ProductResponse> listAllProducts();
    ProductResponse updateProduct(String id, UpdateProductRequest request);
    void deleteProduct(String id);
}

// ============================================================================
// Service Implementation
// ============================================================================

package com.example.products.service;

import com.example.products.domain.Product;
import com.example.products.dto.*;
import com.example.products.exception.ProductNotFoundException;
import com.example.products.exception.ValidationException;
import com.example.products.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        validateCreateRequest(request);

        Product product = new Product(
            request.name().trim(),
            request.price(),
            request.stock()
        );

        Product savedProduct = productRepository.save(product);
        return ProductResponse.from(savedProduct);
    }

    @Override
    public ProductResponse getProductById(String id) {
        Product product = findProductOrThrow(id);
        return ProductResponse.from(product);
    }

    @Override
    public List<ProductResponse> listAllProducts() {
        return productRepository.findAll()
            .stream()
            .map(ProductResponse::from)
            .toList();
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(String id, UpdateProductRequest request) {
        Product product = findProductOrThrow(id);
        validateUpdateRequest(request);

        if (request.name() != null && !request.name().trim().isEmpty()) {
            product.setName(request.name().trim());
        }
        if (request.price() != null) {
            product.setPrice(request.price());
        }
        if (request.stock() != null) {
            product.setStock(request.stock());
        }

        Product updatedProduct = productRepository.save(product);
        return ProductResponse.from(updatedProduct);
    }

    @Override
    @Transactional
    public void deleteProduct(String id) {
        if (!productRepository.existsById(id)) {
            throw new ProductNotFoundException(id);
        }
        productRepository.deleteById(id);
    }

    private Product findProductOrThrow(String id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    private void validateCreateRequest(CreateProductRequest request) {
        List<String> errors = new ArrayList<>();

        if (request.name() == null || request.name().trim().isEmpty()) {
            errors.add("Name is required");
        }
        if (request.price() == null || request.price().doubleValue() <= 0) {
            errors.add("Price must be greater than 0");
        }
        if (request.stock() == null || request.stock() < 0) {
            errors.add("Stock cannot be negative");
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    private void validateUpdateRequest(UpdateProductRequest request) {
        List<String> errors = new ArrayList<>();

        if (request.name() != null && request.name().trim().isEmpty()) {
            errors.add("Name cannot be empty");
        }
        if (request.price() != null && request.price().doubleValue() <= 0) {
            errors.add("Price must be greater than 0");
        }
        if (request.stock() != null && request.stock() < 0) {
            errors.add("Stock cannot be negative");
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}

// ============================================================================
// REST Controller
// ============================================================================

package com.example.products.controller;

import com.example.products.dto.*;
import com.example.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> listAllProducts() {
        List<ProductResponse> products = productService.listAllProducts();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable String id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductResponse product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable String id,
            @Valid @RequestBody UpdateProductRequest request) {
        ProductResponse product = productService.updateProduct(id, request);
        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}

// ============================================================================
// Exception Handler
// ============================================================================

package com.example.products.controller;

import com.example.products.exception.ProductNotFoundException;
import com.example.products.exception.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleProductNotFound(ProductNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(ValidationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("errors", ex.getErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("errors", errors));
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

package com.example.products.service;

import com.example.products.domain.Product;
import com.example.products.dto.*;
import com.example.products.exception.ProductNotFoundException;
import com.example.products.exception.ValidationException;
import com.example.products.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    private ProductServiceImpl productService;

    @BeforeEach
    void setUp() {
        productService = new ProductServiceImpl(productRepository);
    }

    @Nested
    @DisplayName("createProduct")
    class CreateProductTests {

        @Test
        @DisplayName("should create product with valid data")
        void shouldCreateProductWithValidData() {
            CreateProductRequest request = new CreateProductRequest("Widget", new BigDecimal("9.99"), 100);
            when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

            ProductResponse response = productService.createProduct(request);

            assertThat(response.name()).isEqualTo("Widget");
            assertThat(response.price()).isEqualByComparingTo(new BigDecimal("9.99"));
            assertThat(response.stock()).isEqualTo(100);
        }

        @Test
        @DisplayName("should fail with empty name")
        void shouldFailWithEmptyName() {
            CreateProductRequest request = new CreateProductRequest("", new BigDecimal("10"), 5);

            assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("should fail with zero price")
        void shouldFailWithZeroPrice() {
            CreateProductRequest request = new CreateProductRequest("Test", BigDecimal.ZERO, 5);

            assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("should fail with negative price")
        void shouldFailWithNegativePrice() {
            CreateProductRequest request = new CreateProductRequest("Test", new BigDecimal("-10"), 5);

            assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("should fail with negative stock")
        void shouldFailWithNegativeStock() {
            CreateProductRequest request = new CreateProductRequest("Test", new BigDecimal("10"), -5);

            assertThatThrownBy(() -> productService.createProduct(request))
                .isInstanceOf(ValidationException.class);
        }

        @Test
        @DisplayName("should allow zero stock")
        void shouldAllowZeroStock() {
            CreateProductRequest request = new CreateProductRequest("Test", new BigDecimal("10"), 0);
            when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

            ProductResponse response = productService.createProduct(request);

            assertThat(response.stock()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("getProductById")
    class GetProductByIdTests {

        @Test
        @DisplayName("should return product when found")
        void shouldReturnProductWhenFound() {
            Product product = new Product("Gadget", new BigDecimal("19.99"), 50);
            when(productRepository.findById("prod-123")).thenReturn(Optional.of(product));

            ProductResponse response = productService.getProductById("prod-123");

            assertThat(response.name()).isEqualTo("Gadget");
        }

        @Test
        @DisplayName("should throw when product not found")
        void shouldThrowWhenNotFound() {
            when(productRepository.findById("non-existent")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> productService.getProductById("non-existent"))
                .isInstanceOf(ProductNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("listAllProducts")
    class ListAllProductsTests {

        @Test
        @DisplayName("should return all products")
        void shouldReturnAllProducts() {
            List<Product> products = List.of(
                new Product("Product 1", new BigDecimal("10"), 10),
                new Product("Product 2", new BigDecimal("20"), 20)
            );
            when(productRepository.findAll()).thenReturn(products);

            List<ProductResponse> response = productService.listAllProducts();

            assertThat(response).hasSize(2);
        }
    }

    @Nested
    @DisplayName("updateProduct")
    class UpdateProductTests {

        @Test
        @DisplayName("should update product name")
        void shouldUpdateProductName() {
            Product product = new Product("Original", new BigDecimal("10"), 10);
            when(productRepository.findById("prod-123")).thenReturn(Optional.of(product));
            when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateProductRequest request = new UpdateProductRequest("Updated", null, null);
            ProductResponse response = productService.updateProduct("prod-123", request);

            assertThat(response.name()).isEqualTo("Updated");
        }

        @Test
        @DisplayName("should fail with invalid price on update")
        void shouldFailWithInvalidPriceOnUpdate() {
            Product product = new Product("Test", new BigDecimal("10"), 10);
            when(productRepository.findById("prod-123")).thenReturn(Optional.of(product));

            UpdateProductRequest request = new UpdateProductRequest(null, new BigDecimal("-5"), null);

            assertThatThrownBy(() -> productService.updateProduct("prod-123", request))
                .isInstanceOf(ValidationException.class);
        }
    }

    @Nested
    @DisplayName("deleteProduct")
    class DeleteProductTests {

        @Test
        @DisplayName("should delete existing product")
        void shouldDeleteExistingProduct() {
            when(productRepository.existsById("prod-123")).thenReturn(true);

            productService.deleteProduct("prod-123");

            verify(productRepository).deleteById("prod-123");
        }

        @Test
        @DisplayName("should throw when deleting non-existent product")
        void shouldThrowWhenDeletingNonExistent() {
            when(productRepository.existsById("non-existent")).thenReturn(false);

            assertThatThrownBy(() -> productService.deleteProduct("non-existent"))
                .isInstanceOf(ProductNotFoundException.class);
        }
    }
}

// ============================================================================
// Controller Integration Tests
// ============================================================================

package com.example.products.controller;

import com.example.products.dto.*;
import com.example.products.exception.ProductNotFoundException;
import com.example.products.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    @Test
    @DisplayName("GET /api/products should return all products")
    void shouldListAllProducts() throws Exception {
        Instant now = Instant.now();
        List<ProductResponse> products = List.of(
            new ProductResponse("1", "Widget", new BigDecimal("9.99"), 100, now, now),
            new ProductResponse("2", "Gadget", new BigDecimal("19.99"), 50, now, now)
        );
        when(productService.listAllProducts()).thenReturn(products);

        mockMvc.perform(get("/api/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].name").value("Widget"));
    }

    @Test
    @DisplayName("GET /api/products/{id} should return product")
    void shouldGetProductById() throws Exception {
        Instant now = Instant.now();
        ProductResponse product = new ProductResponse("1", "Widget", new BigDecimal("9.99"), 100, now, now);
        when(productService.getProductById("1")).thenReturn(product);

        mockMvc.perform(get("/api/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Widget"));
    }

    @Test
    @DisplayName("GET /api/products/{id} should return 404 when not found")
    void shouldReturn404WhenNotFound() throws Exception {
        when(productService.getProductById("999")).thenThrow(new ProductNotFoundException("999"));

        mockMvc.perform(get("/api/products/999"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/products should create product")
    void shouldCreateProduct() throws Exception {
        Instant now = Instant.now();
        CreateProductRequest request = new CreateProductRequest("Widget", new BigDecimal("9.99"), 100);
        ProductResponse response = new ProductResponse("1", "Widget", new BigDecimal("9.99"), 100, now, now);
        when(productService.createProduct(any())).thenReturn(response);

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Widget"));
    }

    @Test
    @DisplayName("PUT /api/products/{id} should update product")
    void shouldUpdateProduct() throws Exception {
        Instant now = Instant.now();
        UpdateProductRequest request = new UpdateProductRequest("Updated", null, null);
        ProductResponse response = new ProductResponse("1", "Updated", new BigDecimal("9.99"), 100, now, now);
        when(productService.updateProduct(eq("1"), any())).thenReturn(response);

        mockMvc.perform(put("/api/products/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test
    @DisplayName("DELETE /api/products/{id} should delete product")
    void shouldDeleteProduct() throws Exception {
        mockMvc.perform(delete("/api/products/1"))
            .andExpect(status().isNoContent());
    }
}
