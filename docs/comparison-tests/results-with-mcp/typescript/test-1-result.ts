/**
 * Test TS-1: UserService
 * Create a UserService in TypeScript that can:
 * - Create users with name and email
 * - Get users by ID
 * - List all users
 * Use an in-memory repository. Include tests.
 */

// ============================================================================
// Domain Types
// ============================================================================

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

interface CreateUserInput {
  readonly name: string;
  readonly email: string;
}

// ============================================================================
// Custom Errors
// ============================================================================

class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with id '${userId}' not found`);
    this.name = 'UserNotFoundError';
  }
}

class InvalidUserDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserDataError';
  }
}

class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`User with email '${email}' already exists`);
    this.name = 'DuplicateEmailError';
  }
}

// ============================================================================
// Repository Interface (Port)
// ============================================================================

interface UserRepository {
  save(user: User): User;
  findById(id: string): User | undefined;
  findByEmail(email: string): User | undefined;
  findAll(): User[];
}

// ============================================================================
// In-Memory Repository Implementation (Adapter)
// ============================================================================

class InMemoryUserRepository implements UserRepository {
  private readonly users: Map<string, User> = new Map();

  save(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  findAll(): User[] {
    return Array.from(this.users.values());
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
// User Service
// ============================================================================

class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  createUser(input: CreateUserInput): User {
    this.validateInput(input);
    this.ensureEmailNotTaken(input.email);

    const user: User = {
      id: this.idGenerator.generate(),
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      createdAt: new Date(),
    };

    return this.userRepository.save(user);
  }

  getUserById(id: string): User {
    const user = this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  listAllUsers(): User[] {
    return this.userRepository.findAll();
  }

  private validateInput(input: CreateUserInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new InvalidUserDataError('Name is required');
    }
    if (!input.email || input.email.trim().length === 0) {
      throw new InvalidUserDataError('Email is required');
    }
    if (!this.isValidEmail(input.email)) {
      throw new InvalidUserDataError('Invalid email format');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private ensureEmailNotTaken(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new DuplicateEmailError(normalizedEmail);
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

class MockIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `user-${this.nextId++}`;
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

  // Test: Create user successfully
  test('should create a user with valid data', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    const user = service.createUser({ name: 'John Doe', email: 'john@example.com' });

    assertEqual(user.id, 'user-1');
    assertEqual(user.name, 'John Doe');
    assertEqual(user.email, 'john@example.com');
  });

  // Test: Get user by ID
  test('should get user by ID', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    const created = service.createUser({ name: 'Jane Doe', email: 'jane@example.com' });
    const found = service.getUserById(created.id);

    assertEqual(found.id, created.id);
    assertEqual(found.name, 'Jane Doe');
  });

  // Test: User not found throws error
  test('should throw UserNotFoundError when user does not exist', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    assertThrows(() => service.getUserById('non-existent'), UserNotFoundError);
  });

  // Test: List all users
  test('should list all users', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    service.createUser({ name: 'User 1', email: 'user1@example.com' });
    service.createUser({ name: 'User 2', email: 'user2@example.com' });
    service.createUser({ name: 'User 3', email: 'user3@example.com' });

    const users = service.listAllUsers();
    assertEqual(users.length, 3);
  });

  // Test: Empty list when no users
  test('should return empty list when no users exist', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    const users = service.listAllUsers();
    assertEqual(users.length, 0);
  });

  // Test: Invalid name throws error
  test('should throw InvalidUserDataError for empty name', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    assertThrows(() => service.createUser({ name: '', email: 'test@example.com' }), InvalidUserDataError);
  });

  // Test: Invalid email throws error
  test('should throw InvalidUserDataError for invalid email', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    assertThrows(() => service.createUser({ name: 'Test', email: 'invalid-email' }), InvalidUserDataError);
  });

  // Test: Duplicate email throws error
  test('should throw DuplicateEmailError for duplicate email', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    service.createUser({ name: 'User 1', email: 'duplicate@example.com' });
    assertThrows(() => service.createUser({ name: 'User 2', email: 'duplicate@example.com' }), DuplicateEmailError);
  });

  // Test: Email is normalized to lowercase
  test('should normalize email to lowercase', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    const user = service.createUser({ name: 'Test', email: 'TEST@EXAMPLE.COM' });
    assertEqual(user.email, 'test@example.com');
  });

  // Test: Name and email are trimmed
  test('should trim name and email whitespace', () => {
    const repository = new InMemoryUserRepository();
    const idGenerator = new MockIdGenerator();
    const service = new UserService(repository, idGenerator);

    const user = service.createUser({ name: '  John Doe  ', email: '  john@example.com  ' });
    assertEqual(user.name, 'John Doe');
    assertEqual(user.email, 'john@example.com');
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
