import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse } from 'yaml';
import { config } from './config.js';
import { DEFAULT_HEXAGONAL_LAYERS, type Profile, ProfileSchema, type StandardDocument } from './types.js';

/**
 * Cache TTL in milliseconds (1 minute).
 * Set to 0 to disable cache expiration.
 */
const CACHE_TTL_MS: number = 60_000;

/**
 * Cache for loaded profiles and standards.
 */
let profilesCache: Map<string, Profile> | null = null;
let profilesCacheTime: number | null = null;
let standardsCache: StandardDocument[] | null = null;
let standardsCacheTime: number | null = null;

/**
 * Check if cache is still valid.
 */
function isCacheValid(cacheTime: number | null): boolean {
  if (!cacheTime) return false;
  if (CACHE_TTL_MS === 0) return true; // TTL disabled
  return Date.now() - cacheTime < CACHE_TTL_MS;
}

/**
 * Invalidate all caches. Useful for testing or hot-reload scenarios.
 */
export function invalidateCache(): void {
  profilesCache = null;
  profilesCacheTime = null;
  standardsCache = null;
  standardsCacheTime = null;
}

/**
 * Load profiles from a specific directory.
 */
async function loadProfilesFromDir(dir: string, profiles: Map<string, Profile>): Promise<void> {
  try {
    const files = await readdir(dir);
    const yamlFiles = files.filter(
      (f) => (f.endsWith('.yaml') || f.endsWith('.yml')) && !f.startsWith('_')
    );

    for (const file of yamlFiles) {
      const filePath = join(dir, file);
      const fileStat = await stat(filePath);

      // Skip directories
      if (fileStat.isDirectory()) continue;

      const content = await readFile(filePath, 'utf-8');
      const rawData = parse(content);
      const profileId = basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml');

      const profile = ProfileSchema.parse(rawData);

      // Apply default hexagonal layers if not specified
      if (profile.architecture?.type === 'hexagonal' && !profile.architecture.layers) {
        profile.architecture.layers = DEFAULT_HEXAGONAL_LAYERS;
      }

      profiles.set(profileId, profile);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Load all profiles from YAML files.
 * Searches in both templates/ and custom/ directories.
 * Custom profiles override templates with the same name.
 */
export async function loadProfiles(): Promise<Map<string, Profile>> {
  if (profilesCache && isCacheValid(profilesCacheTime)) {
    return profilesCache;
  }

  profilesCache = new Map();

  // Load from templates first (official profiles)
  const templatesDir = join(config.profilesDir, 'templates');
  await loadProfilesFromDir(templatesDir, profilesCache);

  // Load from custom (user profiles - can override templates)
  const customDir = join(config.profilesDir, 'custom');
  await loadProfilesFromDir(customDir, profilesCache);

  // Fallback: also check root profiles dir for backwards compatibility
  await loadProfilesFromDir(config.profilesDir, profilesCache);

  profilesCacheTime = Date.now();
  return profilesCache;
}

/**
 * Get a specific profile by ID.
 */
export async function getProfile(profileId: string): Promise<Profile | null> {
  const profiles = await loadProfiles();
  return profiles.get(profileId) ?? null;
}

/**
 * Get all profiles as a list.
 */
export async function listProfiles(): Promise<Array<{ id: string; profile: Profile }>> {
  const profiles = await loadProfiles();
  return Array.from(profiles.entries()).map(([id, profile]) => ({ id, profile }));
}

/**
 * Load all standards from markdown files.
 */
export async function loadStandards(): Promise<StandardDocument[]> {
  if (standardsCache && isCacheValid(standardsCacheTime)) {
    return standardsCache;
  }

  standardsCache = [];

  try {
    await scanStandardsDirectory(config.standardsDir, '');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  standardsCacheTime = Date.now();
  return standardsCache;
}

async function scanStandardsDirectory(dir: string, category: string): Promise<void> {
  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      await scanStandardsDirectory(fullPath, entry);
    } else if (entry.endsWith('.md')) {
      const content = await readFile(fullPath, 'utf-8');
      const id = generateStandardId(fullPath);
      const name = extractStandardName(content, entry);

      standardsCache?.push({
        id,
        name,
        category: category || 'general',
        content,
      });
    }
  }
}

function generateStandardId(filePath: string): string {
  return filePath
    .replace(config.standardsDir, '')
    .replace(/^\//, '')
    .replace(/\.md$/, '')
    .replace(/\//g, '-')
    .toLowerCase();
}

function extractStandardName(content: string, filename: string): string {
  const headerMatch = content.match(/^#\s+(.+)$/m);
  if (headerMatch) return headerMatch[1];

  return basename(filename, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get standards by category.
 */
export async function getStandardsByCategory(category: string): Promise<StandardDocument[]> {
  const standards = await loadStandards();
  return standards.filter((s) => s.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get all available categories.
 */
export async function getCategories(): Promise<string[]> {
  const standards = await loadStandards();
  const categories = new Set(standards.map((s) => s.category));
  return Array.from(categories);
}

/**
 * Format a profile as markdown for LLM context.
 */
export function formatProfileAsMarkdown(_profileId: string, profile: Profile): string {
  const lines: string[] = [`# Coding Standards Profile: ${profile.name}`, ''];

  if (profile.description) {
    lines.push(profile.description, '');
  }

  // Architecture
  if (profile.architecture) {
    lines.push('## Architecture', '');
    lines.push(`**Pattern:** ${profile.architecture.type}`, '');
    lines.push(`**Enforce Layer Dependencies:** ${profile.architecture.enforceLayerDependencies}`, '');

    if (profile.architecture.layers) {
      lines.push('', '### Layers', '');
      for (const layer of profile.architecture.layers) {
        const deps = layer.allowedDependencies.length > 0 ? layer.allowedDependencies.join(', ') : 'none';
        lines.push(`#### ${layer.name}`);
        lines.push(layer.description);
        lines.push(`- Allowed dependencies: ${deps}`);
        if (layer.packages && layer.packages.length > 0) {
          lines.push(`- Packages: ${layer.packages.join(', ')}`);
        }
        lines.push('');
      }
    }

    if (profile.architecture.archUnit) {
      lines.push('### ArchUnit', '');
      lines.push(`- Enabled: ${profile.architecture.archUnit.enabled}`);
      lines.push(`- Recommended: ${profile.architecture.archUnit.recommended}`);
      if (profile.architecture.archUnit.rules) {
        lines.push('', '**Rules:**');
        for (const rule of profile.architecture.archUnit.rules) {
          lines.push(`- ${rule}`);
        }
      }
      lines.push('');
    }
  }

  // DDD
  if (profile.ddd?.enabled) {
    lines.push('## Domain-Driven Design', '');
    lines.push(`**Ubiquitous Language Enforced:** ${profile.ddd.ubiquitousLanguageEnforced}`, '');

    if (profile.ddd.patterns) {
      lines.push('### Enabled Patterns', '');
      for (const [pattern, enabled] of Object.entries(profile.ddd.patterns)) {
        if (enabled) lines.push(`- ${pattern}`);
      }
      lines.push('');
    }

    if (profile.ddd.valueObjectGuidelines) {
      lines.push('### Value Object Guidelines', '');
      lines.push(`- Use Records: ${profile.ddd.valueObjectGuidelines.useRecords}`);
      lines.push(`- Immutable: ${profile.ddd.valueObjectGuidelines.immutable}`);
      lines.push(`- Self-validating: ${profile.ddd.valueObjectGuidelines.selfValidating}`);
      if (profile.ddd.valueObjectGuidelines.examples) {
        lines.push('', '**Examples:**');
        for (const ex of profile.ddd.valueObjectGuidelines.examples) {
          lines.push(`- ${ex}`);
        }
      }
      lines.push('');
    }

    if (profile.ddd.aggregateGuidelines) {
      lines.push('### Aggregate Guidelines', '');
      lines.push(`- Single Entry Point: ${profile.ddd.aggregateGuidelines.singleEntryPoint}`);
      lines.push(`- Protect Invariants: ${profile.ddd.aggregateGuidelines.protectInvariants}`);
      lines.push(`- Small Aggregates: ${profile.ddd.aggregateGuidelines.smallAggregates}`);
      lines.push(`- Reference by Identity: ${profile.ddd.aggregateGuidelines.referenceByIdentity}`);
      lines.push('');
    }
  }

  // CQRS
  if (profile.cqrs?.enabled) {
    lines.push('## CQRS', '');
    lines.push(`**Separation:** ${profile.cqrs.separation}`, '');

    if (profile.cqrs.patterns?.commands) {
      lines.push('### Commands', '');
      lines.push(`- Suffix: ${profile.cqrs.patterns.commands.suffix}`);
      lines.push(`- Handler: ${profile.cqrs.patterns.commands.handler}`);
      if (profile.cqrs.patterns.commands.examples) {
        lines.push(`- Examples: ${profile.cqrs.patterns.commands.examples.join(', ')}`);
      }
      lines.push('');
    }

    if (profile.cqrs.patterns?.queries) {
      lines.push('### Queries', '');
      lines.push(`- Suffix: ${profile.cqrs.patterns.queries.suffix}`);
      lines.push(`- Handler: ${profile.cqrs.patterns.queries.handler}`);
      if (profile.cqrs.patterns.queries.examples) {
        lines.push(`- Examples: ${profile.cqrs.patterns.queries.examples.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Event-Driven
  if (profile.eventDriven?.enabled) {
    lines.push('## Event-Driven Architecture', '');
    lines.push(`**Approach:** ${profile.eventDriven.approach}`, '');

    if (profile.eventDriven.patterns?.domainEvents) {
      lines.push('### Domain Events', '');
      lines.push(`- Suffix: ${profile.eventDriven.patterns.domainEvents.suffix}`);
      lines.push(`- Past Tense: ${profile.eventDriven.patterns.domainEvents.pastTense}`);
      if (profile.eventDriven.patterns.domainEvents.examples) {
        lines.push(`- Examples: ${profile.eventDriven.patterns.domainEvents.examples.join(', ')}`);
      }
      lines.push('');
    }

    if (profile.eventDriven.patterns?.messaging) {
      lines.push('### Messaging', '');
      lines.push(`- Broker: ${profile.eventDriven.patterns.messaging.broker}`);
      if (profile.eventDriven.patterns.messaging.topicNaming) {
        lines.push(`- Topic Naming: ${profile.eventDriven.patterns.messaging.topicNaming}`);
      }
      if (profile.eventDriven.patterns.messaging.examples) {
        lines.push(`- Examples: ${profile.eventDriven.patterns.messaging.examples.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Code Quality
  if (profile.codeQuality) {
    const cq = profile.codeQuality;
    lines.push('## Code Quality Rules', '');
    lines.push(`- Max method lines: ${cq.maxMethodLines}`);
    lines.push(`- Max class lines: ${cq.maxClassLines}`);
    lines.push(`- Max file lines: ${cq.maxFileLines}`);
    lines.push(`- Max parameters: ${cq.maxMethodParameters}`);
    lines.push(`- Max cyclomatic complexity: ${cq.maxCyclomaticComplexity}`);
    lines.push(`- Require documentation: ${cq.requireDocumentation}`);
    lines.push(`- Require tests: ${cq.requireTests}`);
    lines.push(`- Minimum test coverage: ${cq.minimumTestCoverage}%`);
    if (cq.principles && cq.principles.length > 0) {
      lines.push('', '**Principles:**');
      for (const p of cq.principles) {
        lines.push(`- ${p}`);
      }
    }
    lines.push('');
  }

  // Naming Conventions
  if (profile.naming) {
    lines.push('## Naming Conventions', '');

    const naming = profile.naming as Record<string, unknown>;

    if (naming.general && typeof naming.general === 'object') {
      lines.push('### General', '');
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    if (naming.suffixes && typeof naming.suffixes === 'object') {
      lines.push('### Suffixes', '');
      for (const [key, value] of Object.entries(naming.suffixes as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    if (naming.testing && typeof naming.testing === 'object') {
      lines.push('### Testing Naming', '');
      for (const [key, value] of Object.entries(naming.testing as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    // Handle flat naming structure (backwards compatibility)
    const flatKeys = Object.keys(naming).filter((k) => !['general', 'suffixes', 'testing'].includes(k));
    if (flatKeys.length > 0) {
      for (const key of flatKeys) {
        if (typeof naming[key] === 'string') {
          lines.push(`- **${key}**: ${naming[key]}`);
        }
      }
      lines.push('');
    }
  }

  // Testing Configuration
  if (profile.testing) {
    lines.push('## Testing', '');
    lines.push(`- Framework: ${profile.testing.framework}`);
    lines.push(`- Assertions: ${profile.testing.assertionLibrary}`);
    lines.push(`- Mocking: ${profile.testing.mockingLibrary}`);

    if (profile.testing.types) {
      lines.push('', '### Test Types', '');
      if (profile.testing.types.unit) {
        lines.push(`- **Unit tests**: suffix \`*${profile.testing.types.unit.suffix}.java\``);
      }
      if (profile.testing.types.integration) {
        lines.push(
          `- **Integration tests**: suffix \`*${profile.testing.types.integration.suffix}.java\` (maven-failsafe)`
        );
      }
      if (profile.testing.types.e2e?.suffix) {
        lines.push(`- **E2E tests**: suffix \`*${profile.testing.types.e2e.suffix}.java\``);
      }
      if (profile.testing.types.architecture) {
        lines.push(
          `- **Architecture tests**: ${profile.testing.types.architecture.tool} (recommended: ${profile.testing.types.architecture.recommended})`
        );
      }
    }

    if (profile.testing.testcontainers?.enabled) {
      lines.push('', '### Testcontainers', '');
      lines.push('Enabled containers:');
      if (profile.testing.testcontainers.containers) {
        for (const c of profile.testing.testcontainers.containers) {
          lines.push(`- ${c}`);
        }
      }
    }
    lines.push('');
  }

  // HTTP Clients
  if (profile.httpClients) {
    lines.push('## HTTP Clients', '');

    if (profile.httpClients.simple) {
      lines.push(`### ${profile.httpClients.simple.tool} (Simple Cases)`, '');
      if (profile.httpClients.simple.description) {
        lines.push(profile.httpClients.simple.description, '');
      }
      if (profile.httpClients.simple.useWhen) {
        lines.push('**Use when:**');
        for (const use of profile.httpClients.simple.useWhen) {
          lines.push(`- ${use}`);
        }
        lines.push('');
      }
    }

    if (profile.httpClients.complex) {
      lines.push(`### ${profile.httpClients.complex.tool} (Complex Cases)`, '');
      if (profile.httpClients.complex.description) {
        lines.push(profile.httpClients.complex.description, '');
      }
      if (profile.httpClients.complex.useWhen) {
        lines.push('**Use when:**');
        for (const use of profile.httpClients.complex.useWhen) {
          lines.push(`- ${use}`);
        }
        lines.push('');
      }
    }
  }

  // Observability
  if (profile.observability?.enabled) {
    lines.push('## Observability', '');

    if (profile.observability.logging) {
      lines.push('### Logging', '');
      if (profile.observability.logging.framework) {
        lines.push(`- Framework: ${profile.observability.logging.framework}`);
      }
      if (profile.observability.logging.format) {
        lines.push(`- Format: ${profile.observability.logging.format}`);
      }
      if (profile.observability.logging.structuredLogging) {
        lines.push(`- Structured Logging: ${profile.observability.logging.structuredLogging}`);
      }
      if (profile.observability.logging.mdc) {
        lines.push(`- MDC fields: ${profile.observability.logging.mdc.join(', ')}`);
      }
      if (profile.observability.logging.avoid) {
        lines.push('', '**Avoid:**');
        for (const a of profile.observability.logging.avoid) {
          lines.push(`- ${a}`);
        }
      }
      lines.push('');
    }

    if (profile.observability.metrics) {
      lines.push('### Metrics', '');
      if (profile.observability.metrics.framework) {
        lines.push(`- Framework: ${profile.observability.metrics.framework}`);
      }
      if (profile.observability.metrics.registry) {
        lines.push(`- Registry: ${profile.observability.metrics.registry}`);
      }
      lines.push('');
    }

    if (profile.observability.tracing) {
      lines.push('### Tracing', '');
      if (profile.observability.tracing.framework) {
        lines.push(`- Framework: ${profile.observability.tracing.framework}`);
      }
      if (profile.observability.tracing.propagation) {
        lines.push(`- Propagation: ${profile.observability.tracing.propagation}`);
      }
      if (profile.observability.tracing.exporters) {
        lines.push(`- Exporters: ${profile.observability.tracing.exporters.join(', ')}`);
      }
      lines.push('');
    }

    if (profile.observability.healthChecks) {
      lines.push('### Health Checks', '');
      if (profile.observability.healthChecks.actuatorEndpoints) {
        lines.push('**Endpoints:**');
        for (const ep of profile.observability.healthChecks.actuatorEndpoints) {
          lines.push(`- ${ep}`);
        }
      }
      lines.push('');
    }
  }

  // API Documentation
  if (profile.apiDocumentation?.enabled) {
    lines.push('## API Documentation', '');
    lines.push(`- Tool: ${profile.apiDocumentation.tool}`);
    if (profile.apiDocumentation.version) {
      lines.push(`- Version: ${profile.apiDocumentation.version}`);
    }
    if (profile.apiDocumentation.requirements) {
      lines.push('', '**Requirements:**');
      for (const r of profile.apiDocumentation.requirements) {
        lines.push(`- ${r}`);
      }
    }
    if (profile.apiDocumentation.output) {
      lines.push('', '**Output:**');
      for (const o of profile.apiDocumentation.output) {
        lines.push(`- ${o}`);
      }
    }
    lines.push('');
  }

  // Security
  if (profile.security) {
    lines.push('## Security', '');
    if (profile.security.authentication) {
      lines.push(`- Authentication: ${profile.security.authentication.method || 'N/A'}`);
    }
    if (profile.security.authorization) {
      lines.push(
        `- Authorization: ${profile.security.authorization.method || 'N/A'} (${profile.security.authorization.framework || 'N/A'})`
      );
    }
    if (profile.security.practices) {
      lines.push('', '**Practices:**');
      for (const p of profile.security.practices) {
        lines.push(`- ${p}`);
      }
    }
    lines.push('');
  }

  // Error Handling
  if (profile.errorHandling) {
    lines.push('## Error Handling', '');
    lines.push(`- Format: ${profile.errorHandling.format}`);
    if (profile.errorHandling.globalHandler) {
      lines.push(`- Global Handler: ${profile.errorHandling.globalHandler}`);
    }
    if (profile.errorHandling.customExceptions) {
      if (profile.errorHandling.customExceptions.domain) {
        lines.push('', '**Domain Exceptions:**');
        for (const e of profile.errorHandling.customExceptions.domain) {
          lines.push(`- ${e}`);
        }
      }
      if (profile.errorHandling.customExceptions.application) {
        lines.push('', '**Application Exceptions:**');
        for (const e of profile.errorHandling.customExceptions.application) {
          lines.push(`- ${e}`);
        }
      }
    }
    lines.push('');
  }

  // Database
  if (profile.database) {
    lines.push('## Database', '');
    if (profile.database.migrations) {
      lines.push(`- Migrations: ${profile.database.migrations.tool}`);
      if (profile.database.migrations.naming) {
        lines.push(`- Naming: ${profile.database.migrations.naming}`);
      }
    }
    if (profile.database.auditing?.enabled) {
      lines.push(`- Auditing: enabled (fields: ${profile.database.auditing.fields?.join(', ') || 'N/A'})`);
    }
    if (profile.database.softDelete?.recommended) {
      lines.push(`- Soft Delete: recommended (field: ${profile.database.softDelete.field || 'deletedAt'})`);
    }
    lines.push('');
  }

  // Mapping
  if (profile.mapping) {
    lines.push('## Object Mapping', '');
    lines.push(`- Tool: ${profile.mapping.tool}`);
    if (profile.mapping.componentModel) {
      lines.push(`- Component Model: ${profile.mapping.componentModel}`);
    }
    if (profile.mapping.patterns) {
      lines.push('', '**Patterns:**');
      for (const p of profile.mapping.patterns) {
        lines.push(`- ${p}`);
      }
    }
    lines.push('');
  }

  // Technologies
  if (profile.technologies && profile.technologies.length > 0) {
    lines.push('## Technologies', '');
    for (const tech of profile.technologies) {
      lines.push(`### ${tech.name}${tech.version ? ` (${tech.version})` : ''}`);
      if (tech.tool) {
        lines.push(`Tool: ${tech.tool}`);
      }
      if (tech.specificRules && Object.keys(tech.specificRules).length > 0) {
        lines.push('**Rules:**');
        for (const [key, value] of Object.entries(tech.specificRules)) {
          lines.push(`- ${key}: ${value}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
