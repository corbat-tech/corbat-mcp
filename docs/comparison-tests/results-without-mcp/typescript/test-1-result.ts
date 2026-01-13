// Test TS-1: UserService with in-memory repository

interface User {
  id: string;
  name: string;
  email: string;
}

class UserRepository {
  private users: Map<string, User> = new Map();

  save(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findAll(): User[] {
    return Array.from(this.users.values());
  }

  clear(): void {
    this.users.clear();
  }
}

class UserService {
  constructor(private repository: UserRepository) {}

  createUser(name: string, email: string): User {
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    };
    return this.repository.save(user);
  }

  getUserById(id: string): User | undefined {
    return this.repository.findById(id);
  }

  listAllUsers(): User[] {
    return this.repository.findAll();
  }
}

// Tests
describe('UserService', () => {
  let userService: UserService;
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
    userService = new UserService(repository);
  });

  describe('createUser', () => {
    it('should create a user with name and email', () => {
      const user = userService.createUser('John Doe', 'john@example.com');

      expect(user.id).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should generate unique IDs for each user', () => {
      const user1 = userService.createUser('User 1', 'user1@example.com');
      const user2 = userService.createUser('User 2', 'user2@example.com');

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', () => {
      const created = userService.createUser('Jane Doe', 'jane@example.com');
      const found = userService.getUserById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined when user not found', () => {
      const found = userService.getUserById('non-existent-id');

      expect(found).toBeUndefined();
    });
  });

  describe('listAllUsers', () => {
    it('should return empty array when no users', () => {
      const users = userService.listAllUsers();

      expect(users).toEqual([]);
    });

    it('should return all created users', () => {
      const user1 = userService.createUser('User 1', 'user1@example.com');
      const user2 = userService.createUser('User 2', 'user2@example.com');

      const users = userService.listAllUsers();

      expect(users).toHaveLength(2);
      expect(users).toContainEqual(user1);
      expect(users).toContainEqual(user2);
    });
  });
});
