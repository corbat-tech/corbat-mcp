import { z } from 'zod';

/**
 * Architecture layer schema.
 */
export const LayerSchema = z.object({
  name: z.string(),
  description: z.string(),
  allowedDependencies: z.array(z.string()).default([]),
  packages: z.array(z.string()).optional(),
});

/**
 * ArchUnit configuration schema.
 */
export const ArchUnitSchema = z.object({
  enabled: z.boolean().default(true),
  recommended: z.boolean().default(true),
  rules: z.array(z.string()).optional(),
});

/**
 * Architecture configuration schema.
 */
export const ArchitectureSchema = z.object({
  type: z.enum(['hexagonal', 'clean', 'onion', 'layered', 'microservices', 'modular-monolith']).default('hexagonal'),
  enforceLayerDependencies: z.boolean().default(true),
  layers: z.array(LayerSchema).optional(),
  archUnit: ArchUnitSchema.optional(),
});

/**
 * DDD patterns schema.
 */
export const DddPatternsSchema = z.object({
  aggregates: z.boolean().default(true),
  entities: z.boolean().default(true),
  valueObjects: z.boolean().default(true),
  domainEvents: z.boolean().default(true),
  repositories: z.boolean().default(true),
  domainServices: z.boolean().default(true),
  factories: z.boolean().default(false),
  specifications: z.boolean().default(false),
});

export const DddSchema = z.object({
  enabled: z.boolean().default(true),
  ubiquitousLanguageEnforced: z.boolean().default(true),
  patterns: DddPatternsSchema.optional(),
  valueObjectGuidelines: z.object({
    useRecords: z.boolean().default(true),
    immutable: z.boolean().default(true),
    selfValidating: z.boolean().default(true),
    examples: z.array(z.string()).optional(),
  }).optional(),
  aggregateGuidelines: z.object({
    singleEntryPoint: z.boolean().default(true),
    protectInvariants: z.boolean().default(true),
    smallAggregates: z.boolean().default(true),
    referenceByIdentity: z.boolean().default(true),
  }).optional(),
});

/**
 * CQRS configuration schema.
 */
export const CqrsSchema = z.object({
  enabled: z.boolean().default(true),
  separation: z.enum(['logical', 'physical']).default('logical'),
  patterns: z.object({
    commands: z.object({
      suffix: z.string().default('Command'),
      handler: z.string().default('CommandHandler'),
      examples: z.array(z.string()).optional(),
    }).optional(),
    queries: z.object({
      suffix: z.string().default('Query'),
      handler: z.string().default('QueryHandler'),
      examples: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

/**
 * Event-driven configuration schema.
 */
export const EventDrivenSchema = z.object({
  enabled: z.boolean().default(true),
  approach: z.enum(['domain-events', 'event-sourcing']).default('domain-events'),
  patterns: z.object({
    domainEvents: z.object({
      suffix: z.string().default('Event'),
      pastTense: z.boolean().default(true),
      examples: z.array(z.string()).optional(),
    }).optional(),
    eventPublishing: z.object({
      interface: z.string().default('DomainEventPublisher'),
      async: z.boolean().default(true),
    }).optional(),
    messaging: z.object({
      broker: z.enum(['kafka', 'rabbitmq', 'sqs']).default('kafka'),
      topicNaming: z.string().optional(),
      examples: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

/**
 * Code quality rules schema.
 */
export const CodeQualitySchema = z.object({
  maxMethodLines: z.number().default(20),
  maxClassLines: z.number().default(200),
  maxFileLines: z.number().default(400),
  maxMethodParameters: z.number().default(4),
  maxCyclomaticComplexity: z.number().default(10),
  requireDocumentation: z.boolean().default(true),
  requireTests: z.boolean().default(true),
  minimumTestCoverage: z.number().min(0).max(100).default(80),
  principles: z.array(z.string()).optional(),
});

/**
 * Naming conventions schema - supports nested structure.
 */
export const NamingSchema = z.object({
  general: z.record(z.string()).optional(),
  suffixes: z.record(z.string()).optional(),
  testing: z.record(z.string()).optional(),
}).passthrough().optional();

/**
 * Testing configuration schema.
 */
export const TestingConfigSchema = z.object({
  framework: z.string().default('JUnit5'),
  assertionLibrary: z.string().default('AssertJ'),
  mockingLibrary: z.string().default('Mockito'),
  types: z.object({
    unit: z.object({
      suffix: z.string().default('Test'),
      location: z.string().optional(),
      coverage: z.number().optional(),
      fastExecution: z.boolean().optional(),
      mavenPhase: z.string().optional(),
    }).optional(),
    integration: z.object({
      suffix: z.string().default('IT'),
      location: z.string().optional(),
      mavenPlugin: z.string().optional(),
      mavenPhase: z.string().optional(),
      useTestcontainers: z.boolean().optional(),
    }).optional(),
    e2e: z.object({
      suffix: z.string().optional(),
      location: z.string().optional(),
    }).optional(),
    architecture: z.object({
      tool: z.string().default('ArchUnit'),
      recommended: z.boolean().default(true),
      location: z.string().optional(),
    }).optional(),
  }).optional(),
  patterns: z.record(z.boolean()).optional(),
  testcontainers: z.object({
    enabled: z.boolean().default(true),
    containers: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * HTTP Clients configuration schema.
 */
export const HttpClientsSchema = z.object({
  simple: z.object({
    tool: z.string().default('HttpInterface'),
    description: z.string().optional(),
    useWhen: z.array(z.string()).optional(),
    example: z.string().optional(),
  }).optional(),
  complex: z.object({
    tool: z.string().default('RestClient'),
    description: z.string().optional(),
    useWhen: z.array(z.string()).optional(),
    example: z.string().optional(),
  }).optional(),
});

/**
 * Observability configuration schema.
 */
export const ObservabilitySchema = z.object({
  enabled: z.boolean().default(true),
  logging: z.object({
    framework: z.string().optional(),
    format: z.string().optional(),
    structuredLogging: z.boolean().optional(),
    correlationId: z.boolean().optional(),
    mdc: z.array(z.string()).optional(),
    levels: z.record(z.string()).optional(),
    avoid: z.array(z.string()).optional(),
  }).optional(),
  metrics: z.object({
    framework: z.string().optional(),
    registry: z.string().optional(),
    customMetrics: z.array(z.object({
      type: z.string(),
      examples: z.array(z.string()).optional(),
    })).optional(),
    naming: z.string().optional(),
  }).optional(),
  tracing: z.object({
    framework: z.string().optional(),
    propagation: z.string().optional(),
    samplingRate: z.number().optional(),
    exporters: z.array(z.string()).optional(),
    spanAttributes: z.array(z.string()).optional(),
  }).optional(),
  healthChecks: z.object({
    actuatorEndpoints: z.array(z.string()).optional(),
    customHealthIndicators: z.boolean().optional(),
    examples: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * API Documentation configuration schema.
 */
export const ApiDocumentationSchema = z.object({
  enabled: z.boolean().default(true),
  tool: z.string().default('SpringDoc OpenAPI'),
  version: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
  output: z.array(z.string()).optional(),
});

/**
 * Security configuration schema.
 */
export const SecuritySchema = z.object({
  authentication: z.object({
    method: z.string().optional(),
    storage: z.string().optional(),
  }).optional(),
  authorization: z.object({
    framework: z.string().optional(),
    method: z.string().optional(),
  }).optional(),
  practices: z.array(z.string()).optional(),
});

/**
 * Error handling configuration schema.
 */
export const ErrorHandlingSchema = z.object({
  format: z.string().default('RFC 7807 Problem Details'),
  globalHandler: z.string().optional(),
  structure: z.array(z.string()).optional(),
  customExceptions: z.object({
    domain: z.array(z.string()).optional(),
    application: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Database configuration schema.
 */
export const DatabaseSchema = z.object({
  migrations: z.object({
    tool: z.string().default('Flyway'),
    location: z.string().optional(),
    naming: z.string().optional(),
  }).optional(),
  auditing: z.object({
    enabled: z.boolean().default(true),
    fields: z.array(z.string()).optional(),
  }).optional(),
  mapping: z.object({
    tool: z.string().optional(),
    nullHandling: z.string().optional(),
  }).optional(),
  softDelete: z.object({
    recommended: z.boolean().optional(),
    field: z.string().optional(),
  }).optional(),
});

/**
 * Object mapping configuration schema.
 */
export const MappingSchema = z.object({
  tool: z.string().default('MapStruct'),
  componentModel: z.string().optional(),
  nullValueHandling: z.string().optional(),
  patterns: z.array(z.string()).optional(),
  example: z.string().optional(),
});

/**
 * Technology configuration schema.
 */
export const TechnologySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  tool: z.string().optional(),
  specificRules: z.record(z.unknown()).optional(),
});

/**
 * Complete profile schema.
 */
export const ProfileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  architecture: ArchitectureSchema.optional(),
  ddd: DddSchema.optional(),
  cqrs: CqrsSchema.optional(),
  eventDriven: EventDrivenSchema.optional(),
  codeQuality: CodeQualitySchema.optional(),
  naming: NamingSchema,
  testing: TestingConfigSchema.optional(),
  httpClients: HttpClientsSchema.optional(),
  observability: ObservabilitySchema.optional(),
  apiDocumentation: ApiDocumentationSchema.optional(),
  security: SecuritySchema.optional(),
  errorHandling: ErrorHandlingSchema.optional(),
  database: DatabaseSchema.optional(),
  mapping: MappingSchema.optional(),
  technologies: z.array(TechnologySchema).optional(),
});

export type Layer = z.infer<typeof LayerSchema>;
export type ArchUnit = z.infer<typeof ArchUnitSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type DddPatterns = z.infer<typeof DddPatternsSchema>;
export type Ddd = z.infer<typeof DddSchema>;
export type Cqrs = z.infer<typeof CqrsSchema>;
export type EventDriven = z.infer<typeof EventDrivenSchema>;
export type CodeQuality = z.infer<typeof CodeQualitySchema>;
export type Naming = z.infer<typeof NamingSchema>;
export type TestingConfig = z.infer<typeof TestingConfigSchema>;
export type HttpClients = z.infer<typeof HttpClientsSchema>;
export type Observability = z.infer<typeof ObservabilitySchema>;
export type ApiDocumentation = z.infer<typeof ApiDocumentationSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type ErrorHandling = z.infer<typeof ErrorHandlingSchema>;
export type Database = z.infer<typeof DatabaseSchema>;
export type Mapping = z.infer<typeof MappingSchema>;
export type Technology = z.infer<typeof TechnologySchema>;
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Standard document interface.
 */
export interface StandardDocument {
  id: string;
  name: string;
  category: string;
  content: string;
}

/**
 * Default architecture layers for hexagonal.
 */
export const DEFAULT_HEXAGONAL_LAYERS: Layer[] = [
  {
    name: 'domain',
    description: 'Core business logic, entities, and value objects. NO external dependencies.',
    allowedDependencies: [],
  },
  {
    name: 'application',
    description: 'Use cases and application services. Depends only on domain.',
    allowedDependencies: ['domain'],
  },
  {
    name: 'infrastructure',
    description: 'External adapters, frameworks, and drivers. Implements domain interfaces.',
    allowedDependencies: ['domain', 'application'],
  },
];
