import { type Profile, ProfileSchema } from '../../src/types.js';

/**
 * Builder for creating test Profile instances.
 * Uses a fluent API for easy test data construction.
 *
 * @example
 * ```typescript
 * const profile = new ProfileBuilder()
 *   .withName('Test Profile')
 *   .withArchitecture('hexagonal')
 *   .withDdd(true)
 *   .build();
 * ```
 */
export class ProfileBuilder {
  private data: Record<string, unknown> = {
    name: 'Test Profile',
    description: 'A test profile for unit testing',
  };

  /**
   * Set the profile name.
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Set the profile description.
   */
  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  /**
   * Configure architecture settings.
   */
  withArchitecture(
    type: 'hexagonal' | 'clean' | 'layered' | 'onion',
    options: {
      enforceLayerDependencies?: boolean;
      layers?: Array<{
        name: string;
        description: string;
        allowedDependencies: string[];
        packages?: string[];
      }>;
    } = {}
  ): this {
    this.data.architecture = {
      type,
      enforceLayerDependencies: options.enforceLayerDependencies ?? true,
      layers: options.layers,
    };
    return this;
  }

  /**
   * Configure DDD settings.
   */
  withDdd(
    enabled: boolean,
    options: {
      ubiquitousLanguageEnforced?: boolean;
      patterns?: {
        aggregates?: boolean;
        valueObjects?: boolean;
        domainEvents?: boolean;
        repositories?: boolean;
        factories?: boolean;
        domainServices?: boolean;
      };
    } = {}
  ): this {
    this.data.ddd = {
      enabled,
      ubiquitousLanguageEnforced: options.ubiquitousLanguageEnforced ?? true,
      patterns: options.patterns ?? {
        aggregates: true,
        valueObjects: true,
        domainEvents: true,
        repositories: true,
      },
    };
    return this;
  }

  /**
   * Configure CQRS settings.
   */
  withCqrs(enabled: boolean, separation: 'logical' | 'physical' = 'logical'): this {
    this.data.cqrs = {
      enabled,
      separation,
      patterns: {
        commands: {
          suffix: 'Command',
          handler: 'CommandHandler',
          examples: ['CreateUserCommand', 'UpdateOrderCommand'],
        },
        queries: {
          suffix: 'Query',
          handler: 'QueryHandler',
          examples: ['GetUserQuery', 'ListOrdersQuery'],
        },
      },
    };
    return this;
  }

  /**
   * Configure code quality settings.
   */
  withCodeQuality(
    options: {
      maxMethodLines?: number;
      maxClassLines?: number;
      maxFileLines?: number;
      maxMethodParameters?: number;
      maxCyclomaticComplexity?: number;
      minimumTestCoverage?: number;
    } = {}
  ): this {
    this.data.codeQuality = {
      maxMethodLines: options.maxMethodLines ?? 20,
      maxClassLines: options.maxClassLines ?? 300,
      maxFileLines: options.maxFileLines ?? 500,
      maxMethodParameters: options.maxMethodParameters ?? 4,
      maxCyclomaticComplexity: options.maxCyclomaticComplexity ?? 10,
      requireDocumentation: true,
      requireTests: true,
      minimumTestCoverage: options.minimumTestCoverage ?? 80,
      principles: ['SOLID', 'DRY', 'KISS', 'YAGNI'],
    };
    return this;
  }

  /**
   * Configure testing settings.
   */
  withTesting(framework = 'JUnit5'): this {
    this.data.testing = {
      framework,
      assertionLibrary: 'AssertJ',
      mockingLibrary: 'Mockito',
      types: {
        unit: { suffix: 'Test' },
        integration: { suffix: 'IT' },
        architecture: { tool: 'ArchUnit', recommended: true },
      },
      testcontainers: {
        enabled: true,
        containers: ['PostgreSQL', 'Kafka', 'Redis'],
      },
    };
    return this;
  }

  /**
   * Configure observability settings.
   */
  withObservability(enabled = true): this {
    this.data.observability = {
      enabled,
      logging: {
        framework: 'SLF4J',
        format: 'JSON',
        structuredLogging: true,
        mdc: ['correlationId', 'userId', 'requestId'],
      },
      metrics: {
        framework: 'Micrometer',
        registry: 'Prometheus',
      },
      tracing: {
        framework: 'OpenTelemetry',
        propagation: 'W3C',
        exporters: ['Jaeger', 'OTLP'],
      },
    };
    return this;
  }

  /**
   * Build the Profile instance with validation.
   */
  build(): Profile {
    return ProfileSchema.parse(this.data);
  }

  /**
   * Build the Profile without validation (for testing error scenarios).
   */
  buildRaw(): Record<string, unknown> {
    return { ...this.data };
  }
}

/**
 * Pre-built profile fixtures for common test scenarios.
 */
export const ProfileFixtures = {
  /**
   * Minimal valid profile.
   */
  minimal(): Profile {
    return new ProfileBuilder().build();
  },

  /**
   * Full-featured profile with all options enabled.
   */
  fullFeatured(): Profile {
    return new ProfileBuilder()
      .withName('Full Featured Profile')
      .withDescription('A complete profile with all features enabled')
      .withArchitecture('hexagonal', {
        enforceLayerDependencies: true,
        layers: [
          {
            name: 'domain',
            description: 'Core business logic',
            allowedDependencies: [],
            packages: ['*.domain'],
          },
          {
            name: 'application',
            description: 'Application services',
            allowedDependencies: ['domain'],
            packages: ['*.application'],
          },
          {
            name: 'infrastructure',
            description: 'External adapters',
            allowedDependencies: ['domain', 'application'],
            packages: ['*.infrastructure'],
          },
        ],
      })
      .withDdd(true, {
        ubiquitousLanguageEnforced: true,
        patterns: {
          aggregates: true,
          valueObjects: true,
          domainEvents: true,
          repositories: true,
          factories: true,
          domainServices: true,
        },
      })
      .withCqrs(true, 'logical')
      .withCodeQuality({
        maxMethodLines: 20,
        maxClassLines: 300,
        minimumTestCoverage: 80,
      })
      .withTesting('JUnit5')
      .withObservability(true)
      .build();
  },

  /**
   * React-focused profile.
   */
  react(): Profile {
    return new ProfileBuilder()
      .withName('React Profile')
      .withDescription('Standards for React applications')
      .withArchitecture('clean')
      .withCodeQuality({
        maxMethodLines: 30,
        maxClassLines: 200,
        minimumTestCoverage: 70,
      })
      .build();
  },

  /**
   * Microservices profile.
   */
  microservices(): Profile {
    return new ProfileBuilder()
      .withName('Microservices Profile')
      .withDescription('Standards for microservices architecture')
      .withArchitecture('hexagonal')
      .withDdd(true)
      .withCqrs(true, 'physical')
      .withObservability(true)
      .build();
  },
};
