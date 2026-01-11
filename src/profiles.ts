import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { parse } from 'yaml';
import { config } from './config.js';
import {
  Profile,
  ProfileSchema,
  StandardDocument,
  DEFAULT_HEXAGONAL_LAYERS,
} from './types.js';

/**
 * Cache for loaded profiles and standards.
 */
let profilesCache: Map<string, Profile> | null = null;
let standardsCache: StandardDocument[] | null = null;

/**
 * Load all profiles from YAML files.
 */
export async function loadProfiles(): Promise<Map<string, Profile>> {
  if (profilesCache) return profilesCache;

  profilesCache = new Map();

  try {
    const files = await readdir(config.profilesDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      const filePath = join(config.profilesDir, file);
      const content = await readFile(filePath, 'utf-8');
      const rawData = parse(content);
      const profileId = basename(file, file.endsWith('.yaml') ? '.yaml' : '.yml');

      const profile = ProfileSchema.parse(rawData);

      // Apply default hexagonal layers if not specified
      if (profile.architecture?.type === 'hexagonal' && !profile.architecture.layers) {
        profile.architecture.layers = DEFAULT_HEXAGONAL_LAYERS;
      }

      profilesCache.set(profileId, profile);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

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
  if (standardsCache) return standardsCache;

  standardsCache = [];

  try {
    await scanStandardsDirectory(config.standardsDir, '');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

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

      standardsCache!.push({
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
export function formatProfileAsMarkdown(profileId: string, profile: Profile): string {
  const lines: string[] = [
    `# Coding Standards Profile: ${profile.name}`,
    '',
  ];

  if (profile.description) {
    lines.push(profile.description, '');
  }

  // Architecture
  if (profile.architecture) {
    lines.push('## Architecture', '');
    lines.push(`**Pattern:** ${profile.architecture.type}`, '');

    if (profile.architecture.layers) {
      lines.push('### Layers', '');
      for (const layer of profile.architecture.layers) {
        const deps = layer.allowedDependencies.length > 0
          ? layer.allowedDependencies.join(', ')
          : 'none';
        lines.push(`- **${layer.name}**: ${layer.description}`);
        lines.push(`  - Allowed dependencies: ${deps}`);
      }
      lines.push('');
    }
  }

  // DDD
  if (profile.ddd?.enabled) {
    lines.push('## Domain-Driven Design', '');
    lines.push('Enabled patterns:');
    if (profile.ddd.patterns) {
      for (const [pattern, enabled] of Object.entries(profile.ddd.patterns)) {
        if (enabled) lines.push(`- ${pattern}`);
      }
    }
    lines.push('');
  }

  // Code Quality
  if (profile.codeQuality) {
    const cq = profile.codeQuality;
    lines.push('## Code Quality Rules', '');
    lines.push(`- Max method lines: ${cq.maxMethodLines}`);
    lines.push(`- Max class lines: ${cq.maxClassLines}`);
    lines.push(`- Max parameters: ${cq.maxMethodParameters}`);
    lines.push(`- Max cyclomatic complexity: ${cq.maxCyclomaticComplexity}`);
    lines.push(`- Require documentation: ${cq.requireDocumentation}`);
    lines.push(`- Require tests: ${cq.requireTests}`);
    lines.push(`- Minimum test coverage: ${cq.minimumTestCoverage}%`);
    lines.push('');
  }

  // Naming
  if (profile.naming && Object.keys(profile.naming).length > 0) {
    lines.push('## Naming Conventions', '');
    for (const [context, pattern] of Object.entries(profile.naming)) {
      lines.push(`- **${context}**: ${pattern}`);
    }
    lines.push('');
  }

  // Technologies
  if (profile.technologies && profile.technologies.length > 0) {
    lines.push('## Technologies', '');
    for (const tech of profile.technologies) {
      lines.push(`- **${tech.name}**${tech.version ? ` (${tech.version})` : ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
