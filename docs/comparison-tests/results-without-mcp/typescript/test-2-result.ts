// Test TS-2: ProductService with full CRUD operations

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product with id ${id} not found`);
    this.name = 'ProductNotFoundError';
  }
}

class ProductRepository {
  private products: Map<string, Product> = new Map();

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

  clear(): void {
    this.products.clear();
  }
}

class ProductService {
  constructor(private repository: ProductRepository) {}

  createProduct(name: string, price: number, stock: number): Product {
    this.validatePrice(price);
    this.validateStock(stock);

    const product: Product = {
      id: crypto.randomUUID(),
      name,
      price,
      stock,
    };
    return this.repository.save(product);
  }

  getProductById(id: string): Product {
    const product = this.repository.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  listAllProducts(): Product[] {
    return this.repository.findAll();
  }

  updateProduct(id: string, updates: Partial<Omit<Product, 'id'>>): Product {
    const product = this.getProductById(id);

    if (updates.price !== undefined) {
      this.validatePrice(updates.price);
    }
    if (updates.stock !== undefined) {
      this.validateStock(updates.stock);
    }

    const updatedProduct: Product = {
      ...product,
      ...updates,
    };
    return this.repository.save(updatedProduct);
  }

  deleteProduct(id: string): void {
    const exists = this.repository.findById(id);
    if (!exists) {
      throw new ProductNotFoundError(id);
    }
    this.repository.delete(id);
  }

  private validatePrice(price: number): void {
    if (price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }
  }

  private validateStock(stock: number): void {
    if (stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }
  }
}

// Tests
describe('ProductService', () => {
  let productService: ProductService;
  let repository: ProductRepository;

  beforeEach(() => {
    repository = new ProductRepository();
    productService = new ProductService(repository);
  });

  describe('createProduct', () => {
    it('should create a product with valid data', () => {
      const product = productService.createProduct('Laptop', 999.99, 10);

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Laptop');
      expect(product.price).toBe(999.99);
      expect(product.stock).toBe(10);
    });

    it('should throw ValidationError when price is 0', () => {
      expect(() => productService.createProduct('Test', 0, 10)).toThrow(ValidationError);
    });

    it('should throw ValidationError when price is negative', () => {
      expect(() => productService.createProduct('Test', -10, 10)).toThrow(ValidationError);
    });

    it('should throw ValidationError when stock is negative', () => {
      expect(() => productService.createProduct('Test', 10, -5)).toThrow(ValidationError);
    });

    it('should allow stock of 0', () => {
      const product = productService.createProduct('Out of Stock', 10, 0);
      expect(product.stock).toBe(0);
    });
  });

  describe('getProductById', () => {
    it('should return product when found', () => {
      const created = productService.createProduct('Phone', 499.99, 20);
      const found = productService.getProductById(created.id);

      expect(found).toEqual(created);
    });

    it('should throw ProductNotFoundError when not found', () => {
      expect(() => productService.getProductById('invalid-id')).toThrow(ProductNotFoundError);
    });
  });

  describe('listAllProducts', () => {
    it('should return empty array when no products', () => {
      expect(productService.listAllProducts()).toEqual([]);
    });

    it('should return all products', () => {
      const p1 = productService.createProduct('Product 1', 10, 5);
      const p2 = productService.createProduct('Product 2', 20, 10);

      const products = productService.listAllProducts();

      expect(products).toHaveLength(2);
      expect(products).toContainEqual(p1);
      expect(products).toContainEqual(p2);
    });
  });

  describe('updateProduct', () => {
    it('should update product name', () => {
      const product = productService.createProduct('Old Name', 10, 5);
      const updated = productService.updateProduct(product.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.price).toBe(10);
    });

    it('should update multiple fields', () => {
      const product = productService.createProduct('Test', 10, 5);
      const updated = productService.updateProduct(product.id, { price: 20, stock: 15 });

      expect(updated.price).toBe(20);
      expect(updated.stock).toBe(15);
    });

    it('should throw ValidationError when updating to invalid price', () => {
      const product = productService.createProduct('Test', 10, 5);
      expect(() => productService.updateProduct(product.id, { price: -5 })).toThrow(ValidationError);
    });

    it('should throw ProductNotFoundError when product does not exist', () => {
      expect(() => productService.updateProduct('invalid-id', { name: 'Test' })).toThrow(ProductNotFoundError);
    });
  });

  describe('deleteProduct', () => {
    it('should delete existing product', () => {
      const product = productService.createProduct('ToDelete', 10, 5);
      productService.deleteProduct(product.id);

      expect(() => productService.getProductById(product.id)).toThrow(ProductNotFoundError);
    });

    it('should throw ProductNotFoundError when deleting non-existent product', () => {
      expect(() => productService.deleteProduct('invalid-id')).toThrow(ProductNotFoundError);
    });
  });
});
