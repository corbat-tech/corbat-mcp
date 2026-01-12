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
    const yamlFiles = files.filter((f) => (f.endsWith('.yaml') || f.endsWith('.yml')) && !f.startsWith('_'));

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

// ============================================================================
// MARKDOWN FORMATTING HELPERS
// ============================================================================

function formatArchitectureSection(profile: Profile): string[] {
  if (!profile.architecture) return [];

  const lines: string[] = [
    '## Architecture',
    '',
    `**Pattern:** ${profile.architecture.type}`,
    '',
    `**Enforce Layer Dependencies:** ${profile.architecture.enforceLayerDependencies}`,
    '',
  ];

  if (profile.architecture.layers) {
    lines.push('### Layers', '');
    for (const layer of profile.architecture.layers) {
      const deps = layer.allowedDependencies.length > 0 ? layer.allowedDependencies.join(', ') : 'none';
      lines.push(`#### ${layer.name}`, layer.description, `- Allowed dependencies: ${deps}`);
      if (layer.packages?.length) {
        lines.push(`- Packages: ${layer.packages.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (profile.architecture.archUnit) {
    lines.push(
      '### ArchUnit',
      '',
      `- Enabled: ${profile.architecture.archUnit.enabled}`,
      `- Recommended: ${profile.architecture.archUnit.recommended}`
    );
    if (profile.architecture.archUnit.rules) {
      lines.push('', '**Rules:**', ...profile.architecture.archUnit.rules.map((r) => `- ${r}`));
    }
    lines.push('');
  }

  return lines;
}

function formatDddSection(profile: Profile): string[] {
  if (!profile.ddd?.enabled) return [];

  const lines: string[] = [
    '## Domain-Driven Design',
    '',
    `**Ubiquitous Language Enforced:** ${profile.ddd.ubiquitousLanguageEnforced}`,
    '',
  ];

  if (profile.ddd.patterns) {
    lines.push('### Enabled Patterns', '');
    for (const [pattern, enabled] of Object.entries(profile.ddd.patterns)) {
      if (enabled) lines.push(`- ${pattern}`);
    }
    lines.push('');
  }

  if (profile.ddd.valueObjectGuidelines) {
    const vo = profile.ddd.valueObjectGuidelines;
    lines.push(
      '### Value Object Guidelines',
      '',
      `- Use Records: ${vo.useRecords}`,
      `- Immutable: ${vo.immutable}`,
      `- Self-validating: ${vo.selfValidating}`
    );
    if (vo.examples) {
      lines.push('', '**Examples:**', ...vo.examples.map((ex) => `- ${ex}`));
    }
    lines.push('');
  }

  if (profile.ddd.aggregateGuidelines) {
    const ag = profile.ddd.aggregateGuidelines;
    lines.push(
      '### Aggregate Guidelines',
      '',
      `- Single Entry Point: ${ag.singleEntryPoint}`,
      `- Protect Invariants: ${ag.protectInvariants}`,
      `- Small Aggregates: ${ag.smallAggregates}`,
      `- Reference by Identity: ${ag.referenceByIdentity}`,
      ''
    );
  }

  return lines;
}

function formatCqrsSection(profile: Profile): string[] {
  if (!profile.cqrs?.enabled) return [];

  const lines: string[] = ['## CQRS', '', `**Separation:** ${profile.cqrs.separation}`, ''];

  if (profile.cqrs.patterns?.commands) {
    const cmd = profile.cqrs.patterns.commands;
    lines.push('### Commands', '', `- Suffix: ${cmd.suffix}`, `- Handler: ${cmd.handler}`);
    if (cmd.examples) lines.push(`- Examples: ${cmd.examples.join(', ')}`);
    lines.push('');
  }

  if (profile.cqrs.patterns?.queries) {
    const qry = profile.cqrs.patterns.queries;
    lines.push('### Queries', '', `- Suffix: ${qry.suffix}`, `- Handler: ${qry.handler}`);
    if (qry.examples) lines.push(`- Examples: ${qry.examples.join(', ')}`);
    lines.push('');
  }

  return lines;
}

function formatEventDrivenSection(profile: Profile): string[] {
  if (!profile.eventDriven?.enabled) return [];

  const lines: string[] = ['## Event-Driven Architecture', '', `**Approach:** ${profile.eventDriven.approach}`, ''];

  if (profile.eventDriven.patterns?.domainEvents) {
    const de = profile.eventDriven.patterns.domainEvents;
    lines.push('### Domain Events', '', `- Suffix: ${de.suffix}`, `- Past Tense: ${de.pastTense}`);
    if (de.examples) lines.push(`- Examples: ${de.examples.join(', ')}`);
    lines.push('');
  }

  if (profile.eventDriven.patterns?.messaging) {
    const msg = profile.eventDriven.patterns.messaging;
    lines.push('### Messaging', '', `- Broker: ${msg.broker}`);
    if (msg.topicNaming) lines.push(`- Topic Naming: ${msg.topicNaming}`);
    if (msg.examples) lines.push(`- Examples: ${msg.examples.join(', ')}`);
    lines.push('');
  }

  return lines;
}

function formatCodeQualitySection(profile: Profile): string[] {
  if (!profile.codeQuality) return [];

  const cq = profile.codeQuality;
  const lines: string[] = [
    '## Code Quality Rules',
    '',
    `- Max method lines: ${cq.maxMethodLines}`,
    `- Max class lines: ${cq.maxClassLines}`,
    `- Max file lines: ${cq.maxFileLines}`,
    `- Max parameters: ${cq.maxMethodParameters}`,
    `- Max cyclomatic complexity: ${cq.maxCyclomaticComplexity}`,
    `- Require documentation: ${cq.requireDocumentation}`,
    `- Require tests: ${cq.requireTests}`,
    `- Minimum test coverage: ${cq.minimumTestCoverage}%`,
  ];

  if (cq.principles?.length) {
    lines.push('', '**Principles:**', ...cq.principles.map((p) => `- ${p}`));
  }
  lines.push('');

  return lines;
}

function formatNamingSection(profile: Profile): string[] {
  if (!profile.naming) return [];

  const lines: string[] = ['## Naming Conventions', ''];
  const naming = profile.naming as Record<string, unknown>;

  const formatSubsection = (title: string, obj: Record<string, string>) => {
    lines.push(`### ${title}`, '');
    for (const [key, value] of Object.entries(obj)) {
      lines.push(`- **${key}**: ${value}`);
    }
    lines.push('');
  };

  if (naming.general && typeof naming.general === 'object') {
    formatSubsection('General', naming.general as Record<string, string>);
  }
  if (naming.suffixes && typeof naming.suffixes === 'object') {
    formatSubsection('Suffixes', naming.suffixes as Record<string, string>);
  }
  if (naming.testing && typeof naming.testing === 'object') {
    formatSubsection('Testing Naming', naming.testing as Record<string, string>);
  }

  // Handle flat naming structure (backwards compatibility)
  const flatKeys = Object.keys(naming).filter((k) => !['general', 'suffixes', 'testing'].includes(k));
  for (const key of flatKeys) {
    if (typeof naming[key] === 'string') {
      lines.push(`- **${key}**: ${naming[key]}`);
    }
  }
  if (flatKeys.length > 0) lines.push('');

  return lines;
}

function formatTestingSection(profile: Profile): string[] {
  if (!profile.testing) return [];

  const lines: string[] = [
    '## Testing',
    '',
    `- Framework: ${profile.testing.framework}`,
    `- Assertions: ${profile.testing.assertionLibrary}`,
    `- Mocking: ${profile.testing.mockingLibrary}`,
  ];

  if (profile.testing.types) {
    lines.push('', '### Test Types', '');
    const types = profile.testing.types;
    if (types.unit) lines.push(`- **Unit tests**: suffix \`*${types.unit.suffix}.java\``);
    if (types.integration)
      lines.push(`- **Integration tests**: suffix \`*${types.integration.suffix}.java\` (maven-failsafe)`);
    if (types.e2e?.suffix) lines.push(`- **E2E tests**: suffix \`*${types.e2e.suffix}.java\``);
    if (types.architecture)
      lines.push(
        `- **Architecture tests**: ${types.architecture.tool} (recommended: ${types.architecture.recommended})`
      );
  }

  if (profile.testing.testcontainers?.enabled) {
    lines.push('', '### Testcontainers', '', 'Enabled containers:');
    if (profile.testing.testcontainers.containers) {
      lines.push(...profile.testing.testcontainers.containers.map((c) => `- ${c}`));
    }
  }
  lines.push('');

  return lines;
}

function formatHttpClientsSection(profile: Profile): string[] {
  if (!profile.httpClients) return [];

  const lines: string[] = ['## HTTP Clients', ''];

  const formatClient = (client: { tool?: string; description?: string; useWhen?: string[] }, label: string) => {
    if (!client) return;
    lines.push(`### ${client.tool} (${label})`, '');
    if (client.description) lines.push(client.description, '');
    if (client.useWhen) {
      lines.push('**Use when:**', ...client.useWhen.map((use) => `- ${use}`), '');
    }
  };

  if (profile.httpClients.simple) formatClient(profile.httpClients.simple, 'Simple Cases');
  if (profile.httpClients.complex) formatClient(profile.httpClients.complex, 'Complex Cases');

  return lines;
}

function formatObservabilitySection(profile: Profile): string[] {
  if (!profile.observability?.enabled) return [];

  const lines: string[] = ['## Observability', ''];

  if (profile.observability.logging) {
    const log = profile.observability.logging;
    lines.push('### Logging', '');
    if (log.framework) lines.push(`- Framework: ${log.framework}`);
    if (log.format) lines.push(`- Format: ${log.format}`);
    if (log.structuredLogging) lines.push(`- Structured Logging: ${log.structuredLogging}`);
    if (log.mdc) lines.push(`- MDC fields: ${log.mdc.join(', ')}`);
    if (log.avoid) {
      lines.push('', '**Avoid:**', ...log.avoid.map((a) => `- ${a}`));
    }
    lines.push('');
  }

  if (profile.observability.metrics) {
    lines.push('### Metrics', '');
    if (profile.observability.metrics.framework) lines.push(`- Framework: ${profile.observability.metrics.framework}`);
    if (profile.observability.metrics.registry) lines.push(`- Registry: ${profile.observability.metrics.registry}`);
    lines.push('');
  }

  if (profile.observability.tracing) {
    const tr = profile.observability.tracing;
    lines.push('### Tracing', '');
    if (tr.framework) lines.push(`- Framework: ${tr.framework}`);
    if (tr.propagation) lines.push(`- Propagation: ${tr.propagation}`);
    if (tr.exporters) lines.push(`- Exporters: ${tr.exporters.join(', ')}`);
    lines.push('');
  }

  if (profile.observability.healthChecks?.actuatorEndpoints) {
    lines.push(
      '### Health Checks',
      '',
      '**Endpoints:**',
      ...profile.observability.healthChecks.actuatorEndpoints.map((ep) => `- ${ep}`),
      ''
    );
  }

  return lines;
}

function formatRemainingProfileSections(profile: Profile): string[] {
  const lines: string[] = [];

  // API Documentation
  if (profile.apiDocumentation?.enabled) {
    lines.push('## API Documentation', '', `- Tool: ${profile.apiDocumentation.tool}`);
    if (profile.apiDocumentation.version) lines.push(`- Version: ${profile.apiDocumentation.version}`);
    if (profile.apiDocumentation.requirements) {
      lines.push('', '**Requirements:**', ...profile.apiDocumentation.requirements.map((r) => `- ${r}`));
    }
    if (profile.apiDocumentation.output) {
      lines.push('', '**Output:**', ...profile.apiDocumentation.output.map((o) => `- ${o}`));
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
      lines.push('', '**Practices:**', ...profile.security.practices.map((p) => `- ${p}`));
    }
    lines.push('');
  }

  // Error Handling
  if (profile.errorHandling) {
    lines.push('## Error Handling', '', `- Format: ${profile.errorHandling.format}`);
    if (profile.errorHandling.globalHandler) lines.push(`- Global Handler: ${profile.errorHandling.globalHandler}`);
    if (profile.errorHandling.customExceptions?.domain) {
      lines.push('', '**Domain Exceptions:**', ...profile.errorHandling.customExceptions.domain.map((e) => `- ${e}`));
    }
    if (profile.errorHandling.customExceptions?.application) {
      lines.push(
        '',
        '**Application Exceptions:**',
        ...profile.errorHandling.customExceptions.application.map((e) => `- ${e}`)
      );
    }
    lines.push('');
  }

  // Database
  if (profile.database) {
    lines.push('## Database', '');
    if (profile.database.migrations) {
      lines.push(`- Migrations: ${profile.database.migrations.tool}`);
      if (profile.database.migrations.naming) lines.push(`- Naming: ${profile.database.migrations.naming}`);
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
    lines.push('## Object Mapping', '', `- Tool: ${profile.mapping.tool}`);
    if (profile.mapping.componentModel) lines.push(`- Component Model: ${profile.mapping.componentModel}`);
    if (profile.mapping.patterns) {
      lines.push('', '**Patterns:**', ...profile.mapping.patterns.map((p) => `- ${p}`));
    }
    lines.push('');
  }

  // Technologies
  if (profile.technologies?.length) {
    lines.push('## Technologies', '');
    for (const tech of profile.technologies) {
      lines.push(`### ${tech.name}${tech.version ? ` (${tech.version})` : ''}`);
      if (tech.tool) lines.push(`Tool: ${tech.tool}`);
      if (tech.specificRules && Object.keys(tech.specificRules).length > 0) {
        lines.push('**Rules:**');
        for (const [key, value] of Object.entries(tech.specificRules)) {
          lines.push(`- ${key}: ${value}`);
        }
      }
      lines.push('');
    }
  }

  return lines;
}

/**
 * Format a profile as markdown for LLM context.
 */
export function formatProfileAsMarkdown(_profileId: string, profile: Profile): string {
  const lines: string[] = [`# Coding Standards Profile: ${profile.name}`, ''];

  if (profile.description) {
    lines.push(profile.description, '');
  }

  lines.push(
    ...formatArchitectureSection(profile),
    ...formatDddSection(profile),
    ...formatCqrsSection(profile),
    ...formatEventDrivenSection(profile),
    ...formatCodeQualitySection(profile),
    ...formatNamingSection(profile),
    ...formatTestingSection(profile),
    ...formatHttpClientsSection(profile),
    ...formatObservabilitySection(profile),
    ...formatRemainingProfileSections(profile)
  );

  return lines.join('\n');
}
