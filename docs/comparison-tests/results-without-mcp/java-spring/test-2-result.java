// Test JAVA-2: REST API for Products with Spring Boot

// === Entity ===
package com.example.product;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {
    @Id
    private String id;

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal price;

    @NotNull(message = "Stock is required")
    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    public Product() {
        this.id = UUID.randomUUID().toString();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
}

// === Repository ===
package com.example.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
}

// === DTO ===
package com.example.product;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    BigDecimal price,

    @NotNull(message = "Stock is required")
    @Min(value = 0, message = "Stock cannot be negative")
    Integer stock
) {}

// === Exception ===
package com.example.product;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(String id) {
        super("Product not found with id: " + id);
    }
}

// === Service ===
package com.example.product;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProductService {
    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> findAll() {
        return productRepository.findAll();
    }

    public Product findById(String id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    public Product create(ProductRequest request) {
        Product product = new Product();
        product.setName(request.name());
        product.setPrice(request.price());
        product.setStock(request.stock());
        return productRepository.save(product);
    }

    public Product update(String id, ProductRequest request) {
        Product product = findById(id);
        product.setName(request.name());
        product.setPrice(request.price());
        product.setStock(request.stock());
        return productRepository.save(product);
    }

    public void delete(String id) {
        Product product = findById(id);
        productRepository.delete(product);
    }
}

// === Controller ===
package com.example.product;

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
    public List<Product> listAll() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    public Product getById(@PathVariable String id) {
        return productService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public Product update(@PathVariable String id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        productService.delete(id);
    }
}

// === Tests ===
package com.example.product;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(productRepository);
    }

    @Test
    void findAll_ShouldReturnAllProducts() {
        Product p1 = createProduct("Product 1", "10.00", 5);
        Product p2 = createProduct("Product 2", "20.00", 10);
        when(productRepository.findAll()).thenReturn(Arrays.asList(p1, p2));

        List<Product> result = productService.findAll();

        assertEquals(2, result.size());
    }

    @Test
    void findById_WhenExists_ShouldReturnProduct() {
        Product product = createProduct("Test", "10.00", 5);
        when(productRepository.findById("test-id")).thenReturn(Optional.of(product));

        Product result = productService.findById("test-id");

        assertEquals("Test", result.getName());
    }

    @Test
    void findById_WhenNotExists_ShouldThrowException() {
        when(productRepository.findById("invalid")).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.findById("invalid"));
    }

    @Test
    void create_ShouldSaveAndReturnProduct() {
        ProductRequest request = new ProductRequest("New Product", new BigDecimal("25.00"), 15);
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        Product result = productService.create(request);

        assertEquals("New Product", result.getName());
        assertEquals(new BigDecimal("25.00"), result.getPrice());
        assertEquals(15, result.getStock());
    }

    @Test
    void update_WhenExists_ShouldUpdateAndReturn() {
        Product existing = createProduct("Old Name", "10.00", 5);
        when(productRepository.findById("test-id")).thenReturn(Optional.of(existing));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductRequest request = new ProductRequest("New Name", new BigDecimal("15.00"), 10);
        Product result = productService.update("test-id", request);

        assertEquals("New Name", result.getName());
        assertEquals(new BigDecimal("15.00"), result.getPrice());
    }

    @Test
    void delete_WhenExists_ShouldDelete() {
        Product product = createProduct("ToDelete", "10.00", 5);
        when(productRepository.findById("test-id")).thenReturn(Optional.of(product));

        productService.delete("test-id");

        verify(productRepository).delete(product);
    }

    @Test
    void delete_WhenNotExists_ShouldThrowException() {
        when(productRepository.findById("invalid")).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> productService.delete("invalid"));
    }

    private Product createProduct(String name, String price, int stock) {
        Product product = new Product();
        product.setName(name);
        product.setPrice(new BigDecimal(price));
        product.setStock(stock);
        return product;
    }
}

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    @Mock
    private ProductService productService;

    private ProductController controller;

    @BeforeEach
    void setUp() {
        controller = new ProductController(productService);
    }

    @Test
    void listAll_ShouldReturnProducts() {
        Product p1 = new Product();
        p1.setName("Product 1");
        when(productService.findAll()).thenReturn(List.of(p1));

        List<Product> result = controller.listAll();

        assertEquals(1, result.size());
    }

    @Test
    void getById_ShouldReturnProduct() {
        Product product = new Product();
        product.setName("Test");
        when(productService.findById("id")).thenReturn(product);

        Product result = controller.getById("id");

        assertEquals("Test", result.getName());
    }

    @Test
    void create_ShouldReturnCreatedProduct() {
        ProductRequest request = new ProductRequest("New", new BigDecimal("10"), 5);
        Product product = new Product();
        product.setName("New");
        when(productService.create(request)).thenReturn(product);

        Product result = controller.create(request);

        assertEquals("New", result.getName());
    }
}
