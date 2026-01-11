import { z } from 'zod';

/**
 * Architecture layer schema.
 */
export const LayerSchema = z.object({
  name: z.string(),
  description: z.string(),
  allowedDependencies: z.array(z.string()).default([]),
});

/**
 * Architecture configuration schema.
 */
export const ArchitectureSchema = z.object({
  type: z.enum(['hexagonal', 'clean', 'onion', 'layered', 'microservices', 'modular-monolith']).default('hexagonal'),
  enforceLayerDependencies: z.boolean().default(true),
  layers: z.array(LayerSchema).optional(),
});

/**
 * DDD patterns schema.
 */
export const DddSchema = z.object({
  enabled: z.boolean().default(true),
  ubiquitousLanguageEnforced: z.boolean().default(true),
  patterns: z.object({
    aggregates: z.boolean().default(true),
    entities: z.boolean().default(true),
    valueObjects: z.boolean().default(true),
    domainEvents: z.boolean().default(true),
    repositories: z.boolean().default(true),
    domainServices: z.boolean().default(true),
    factories: z.boolean().default(false),
    specifications: z.boolean().default(false),
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
});

/**
 * Naming conventions schema.
 */
export const NamingSchema = z.record(z.string()).optional();

/**
 * Technology configuration schema.
 */
export const TechnologySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
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
  codeQuality: CodeQualitySchema.optional(),
  naming: NamingSchema,
  technologies: z.array(TechnologySchema).optional(),
});

export type Layer = z.infer<typeof LayerSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type Ddd = z.infer<typeof DddSchema>;
export type CodeQuality = z.infer<typeof CodeQualitySchema>;
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
