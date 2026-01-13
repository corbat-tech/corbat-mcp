/**
 * Test TS-2: ProductService with CRUD Operations
 * Create a ProductService with full CRUD operations in TypeScript.
 * - Products have: id, name, price, stock
 * - Price must be positive (> 0)
 * - Stock cannot be negative (>= 0)
 * - Include validation errors and tests
 */

// ============================================================================
// Domain Types
// ============================================================================

interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface CreateProductInput {
  readonly name: string;
  readonly price: number;
  readonly stock: number;
}

interface UpdateProductInput {
  readonly name?: string;
  readonly price?: number;
  readonly stock?: number;
}

// ============================================================================
// Custom Errors
// ============================================================================

class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product with id '${productId}' not found`);
    this.name = 'ProductNotFoundError';
  }
}

class InvalidProductDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductDataError';
  }
}

class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Repository Interface (Port)
// ============================================================================

interface ProductRepository {
  save(product: Product): Product;
  findById(id: string): Product | undefined;
  findAll(): Product[];
  delete(id: string): boolean;
  exists(id: string): boolean;
}

// ============================================================================
// In-Memory Repository Implementation (Adapter)
// ============================================================================

class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product> = new Map();

  save(product: Product): Product {
    this.products.set(product.id, product);
    return product;
  }

  findById(id: string): Product | undefined {
    return this.products.get(id);
  }

  findAll(): Product[] {
    return Array.from(this.products.values());
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  exists(id: string): boolean {
    return this.products.has(id);
  }
}

// ============================================================================
// ID Generator Interface
// ============================================================================

interface IdGenerator {
  generate(): string;
}

class UuidGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}

// ============================================================================
// Validator
// ============================================================================

class ProductValidator {
  validateCreate(input: CreateProductInput): void {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (input.price === undefined || input.price === null) {
      errors.push('Price is required');
    } else if (input.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (input.stock === undefined || input.stock === null) {
      errors.push('Stock is required');
    } else if (input.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  validateUpdate(input: UpdateProductInput): void {
    const errors: string[] = [];

    if (input.name !== undefined && input.name.trim().length === 0) {
      errors.push('Name cannot be empty');
    }

    if (input.price !== undefined && input.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (input.stock !== undefined && input.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }
}

// ============================================================================
// Product Service
// ============================================================================

class ProductService {
  private readonly validator = new ProductValidator();

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  createProduct(input: CreateProductInput): Product {
    this.validator.validateCreate(input);

    const now = new Date();
    const product: Product = {
      id: this.idGenerator.generate(),
      name: input.name.trim(),
      price: input.price,
      stock: input.stock,
      createdAt: now,
      updatedAt: now,
    };

    return this.productRepository.save(product);
  }

  getProductById(id: string): Product {
    const product = this.productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  listAllProducts(): Product[] {
    return this.productRepository.findAll();
  }

  updateProduct(id: string, input: UpdateProductInput): Product {
    const existingProduct = this.getProductById(id);
    this.validator.validateUpdate(input);

    const updatedProduct: Product = {
      ...existingProduct,
      name: input.name !== undefined ? input.name.trim() : existingProduct.name,
      price: input.price !== undefined ? input.price : existingProduct.price,
      stock: input.stock !== undefined ? input.stock : existingProduct.stock,
      updatedAt: new Date(),
    };

    return this.productRepository.save(updatedProduct);
  }

  deleteProduct(id: string): void {
    if (!this.productRepository.exists(id)) {
      throw new ProductNotFoundError(id);
    }
    this.productRepository.delete(id);
  }
}

// ============================================================================
// Tests
// ============================================================================

class MockIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `product-${this.nextId++}`;
  }

  reset(): void {
    this.nextId = 1;
  }
}

function runTests(): void {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void): void {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: String(error) });
    }
  }

  function assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  function assertThrows(fn: () => void, errorType: new (...args: unknown[]) => Error): void {
    try {
      fn();
      throw new Error(`Expected ${errorType.name} to be thrown`);
    } catch (error) {
      if (!(error instanceof errorType)) {
        throw new Error(`Expected ${errorType.name}, got ${(error as Error).name}`);
      }
    }
  }

  function assertArrayContains<T>(arr: T[], predicate: (item: T) => boolean, message?: string): void {
    if (!arr.some(predicate)) {
      throw new Error(message || 'Array does not contain expected item');
    }
  }

  // CREATE Tests
  test('should create a product with valid data', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const product = service.createProduct({ name: 'Widget', price: 9.99, stock: 100 });

    assertEqual(product.id, 'product-1');
    assertEqual(product.name, 'Widget');
    assertEqual(product.price, 9.99);
    assertEqual(product.stock, 100);
  });

  test('should fail to create product with empty name', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.createProduct({ name: '', price: 10, stock: 5 }), ValidationError);
  });

  test('should fail to create product with zero price', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.createProduct({ name: 'Test', price: 0, stock: 5 }), ValidationError);
  });

  test('should fail to create product with negative price', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.createProduct({ name: 'Test', price: -10, stock: 5 }), ValidationError);
  });

  test('should fail to create product with negative stock', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.createProduct({ name: 'Test', price: 10, stock: -5 }), ValidationError);
  });

  test('should allow zero stock for new product', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const product = service.createProduct({ name: 'Out of Stock Item', price: 10, stock: 0 });
    assertEqual(product.stock, 0);
  });

  // READ Tests
  test('should get product by ID', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Gadget', price: 19.99, stock: 50 });
    const found = service.getProductById(created.id);

    assertEqual(found.id, created.id);
    assertEqual(found.name, 'Gadget');
  });

  test('should throw ProductNotFoundError when product does not exist', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.getProductById('non-existent'), ProductNotFoundError);
  });

  test('should list all products', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    service.createProduct({ name: 'Product 1', price: 10, stock: 10 });
    service.createProduct({ name: 'Product 2', price: 20, stock: 20 });
    service.createProduct({ name: 'Product 3', price: 30, stock: 30 });

    const products = service.listAllProducts();
    assertEqual(products.length, 3);
  });

  test('should return empty list when no products exist', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const products = service.listAllProducts();
    assertEqual(products.length, 0);
  });

  // UPDATE Tests
  test('should update product name', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Original', price: 10, stock: 10 });
    const updated = service.updateProduct(created.id, { name: 'Updated' });

    assertEqual(updated.name, 'Updated');
    assertEqual(updated.price, 10);
    assertEqual(updated.stock, 10);
  });

  test('should update product price', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Test', price: 10, stock: 10 });
    const updated = service.updateProduct(created.id, { price: 25.99 });

    assertEqual(updated.price, 25.99);
  });

  test('should update product stock', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Test', price: 10, stock: 10 });
    const updated = service.updateProduct(created.id, { stock: 50 });

    assertEqual(updated.stock, 50);
  });

  test('should update multiple fields at once', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Test', price: 10, stock: 10 });
    const updated = service.updateProduct(created.id, { name: 'New Name', price: 20, stock: 30 });

    assertEqual(updated.name, 'New Name');
    assertEqual(updated.price, 20);
    assertEqual(updated.stock, 30);
  });

  test('should fail to update with invalid price', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Test', price: 10, stock: 10 });
    assertThrows(() => service.updateProduct(created.id, { price: -5 }), ValidationError);
  });

  test('should fail to update with invalid stock', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'Test', price: 10, stock: 10 });
    assertThrows(() => service.updateProduct(created.id, { stock: -1 }), ValidationError);
  });

  test('should fail to update non-existent product', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.updateProduct('non-existent', { name: 'Test' }), ProductNotFoundError);
  });

  // DELETE Tests
  test('should delete existing product', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const created = service.createProduct({ name: 'To Delete', price: 10, stock: 10 });
    service.deleteProduct(created.id);

    assertThrows(() => service.getProductById(created.id), ProductNotFoundError);
  });

  test('should fail to delete non-existent product', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    assertThrows(() => service.deleteProduct('non-existent'), ProductNotFoundError);
  });

  test('should maintain other products after deletion', () => {
    const repository = new InMemoryProductRepository();
    const idGenerator = new MockIdGenerator();
    const service = new ProductService(repository, idGenerator);

    const product1 = service.createProduct({ name: 'Product 1', price: 10, stock: 10 });
    const product2 = service.createProduct({ name: 'Product 2', price: 20, stock: 20 });
    const product3 = service.createProduct({ name: 'Product 3', price: 30, stock: 30 });

    service.deleteProduct(product2.id);

    const remaining = service.listAllProducts();
    assertEqual(remaining.length, 2);
    assertArrayContains(remaining, p => p.id === product1.id);
    assertArrayContains(remaining, p => p.id === product3.id);
  });

  // Print results
  console.log('\n=== Test Results ===\n');
  let passed = 0;
  let failed = 0;
  for (const result of results) {
    if (result.passed) {
      console.log(`✓ ${result.name}`);
      passed++;
    } else {
      console.log(`✗ ${result.name}`);
      console.log(`  Error: ${result.error}`);
      failed++;
    }
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
}

runTests();
