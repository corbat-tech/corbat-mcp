import { z } from 'zod';
import {
  getProfile,
  listProfiles,
  loadStandards,
  formatProfileAsMarkdown,
} from './profiles.js';
import { config } from './config.js';

/**
 * Tool definitions for MCP.
 */
export const tools = [
  {
    name: 'get_coding_standards',
    description:
      'Get the complete coding standards and best practices for a specific profile. Returns architecture guidelines, DDD patterns, code quality rules, and naming conventions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile: {
          type: 'string',
          description: `Profile ID (e.g., "default", "custom1"). Defaults to "${config.defaultProfile}".`,
        },
      },
    },
  },
  {
    name: 'list_profiles',
    description: 'List all available coding standards profiles with their descriptions.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_architecture_guidelines',
    description:
      'Get architecture-specific guidelines including layer definitions, dependencies, DDD patterns, CQRS, and event-driven architecture.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile: {
          type: 'string',
          description: `Profile ID. Defaults to "${config.defaultProfile}".`,
        },
      },
    },
  },
  {
    name: 'get_naming_conventions',
    description: 'Get naming conventions for classes, methods, variables, constants, test classes, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile: {
          type: 'string',
          description: `Profile ID. Defaults to "${config.defaultProfile}".`,
        },
      },
    },
  },
  {
    name: 'search_standards',
    description:
      'Search the standards documentation for specific topics. Use this to find information about specific technologies, patterns, or practices (e.g., "kafka", "testing", "docker", "kubernetes", "observability").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "kafka", "dockerfile", "integration test", "observability")',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Input schemas for validation.
 */
const ProfileInputSchema = z.object({
  profile: z.string().optional(),
});

const SearchInputSchema = z.object({
  query: z.string(),
});

/**
 * Handle tool calls.
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  switch (name) {
    case 'get_coding_standards':
      return handleGetCodingStandards(args);

    case 'list_profiles':
      return handleListProfiles();

    case 'get_architecture_guidelines':
      return handleGetArchitectureGuidelines(args);

    case 'get_naming_conventions':
      return handleGetNamingConventions(args);

    case 'search_standards':
      return handleSearchStandards(args);

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

async function handleGetCodingStandards(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { profile: profileId = config.defaultProfile } = ProfileInputSchema.parse(args);
  const profile = await getProfile(profileId);

  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  const standards = await loadStandards();
  const profileMarkdown = formatProfileAsMarkdown(profileId, profile);
  const standardsMarkdown = standards
    .map((s) => `## ${s.name}\n\n${s.content}`)
    .join('\n\n---\n\n');

  const fullContext = `${profileMarkdown}\n\n---\n\n# Standards Documentation\n\n${standardsMarkdown}`;

  return { content: [{ type: 'text', text: fullContext }] };
}

async function handleListProfiles(): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const profiles = await listProfiles();

  if (profiles.length === 0) {
    return {
      content: [{ type: 'text', text: 'No profiles found.' }],
    };
  }

  const list = profiles
    .map(({ id, profile }) => `- **${id}**: ${profile.name} - ${profile.description || 'No description'}`)
    .join('\n');

  return {
    content: [{ type: 'text', text: `# Available Profiles\n\n${list}` }],
  };
}

async function handleGetArchitectureGuidelines(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { profile: profileId = config.defaultProfile } = ProfileInputSchema.parse(args);
  const profile = await getProfile(profileId);

  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  const lines: string[] = ['# Architecture Guidelines', ''];

  if (profile.architecture) {
    lines.push(`## Pattern: ${profile.architecture.type}`, '');
    lines.push(`**Enforce Layer Dependencies:** ${profile.architecture.enforceLayerDependencies}`, '');

    if (profile.architecture.layers) {
      lines.push('', '## Layers', '');
      for (const layer of profile.architecture.layers) {
        lines.push(`### ${layer.name}`);
        lines.push(layer.description);
        lines.push('');
        const deps = layer.allowedDependencies.length > 0
          ? layer.allowedDependencies.join(', ')
          : 'none';
        lines.push(`**Allowed dependencies:** ${deps}`);
        if (layer.packages && layer.packages.length > 0) {
          lines.push(`**Packages:** ${layer.packages.join(', ')}`);
        }
        lines.push('');
      }
    }

    if (profile.architecture.archUnit) {
      lines.push('## ArchUnit', '');
      lines.push(`- Enabled: ${profile.architecture.archUnit.enabled}`);
      lines.push(`- Recommended: ${profile.architecture.archUnit.recommended}`);
      if (profile.architecture.archUnit.rules && profile.architecture.archUnit.rules.length > 0) {
        lines.push('', '**Validation Rules:**');
        for (const rule of profile.architecture.archUnit.rules) {
          lines.push(`- ${rule}`);
        }
      }
      lines.push('');
    }
  }

  if (profile.ddd?.enabled) {
    lines.push('## DDD Patterns', '');
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
        lines.push('- Examples: ' + profile.cqrs.patterns.commands.examples.join(', '));
      }
      lines.push('');
    }

    if (profile.cqrs.patterns?.queries) {
      lines.push('### Queries', '');
      lines.push(`- Suffix: ${profile.cqrs.patterns.queries.suffix}`);
      lines.push(`- Handler: ${profile.cqrs.patterns.queries.handler}`);
      if (profile.cqrs.patterns.queries.examples) {
        lines.push('- Examples: ' + profile.cqrs.patterns.queries.examples.join(', '));
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
        lines.push('- Examples: ' + profile.eventDriven.patterns.domainEvents.examples.join(', '));
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
        lines.push('- Examples: ' + profile.eventDriven.patterns.messaging.examples.join(', '));
      }
      lines.push('');
    }
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

async function handleGetNamingConventions(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { profile: profileId = config.defaultProfile } = ProfileInputSchema.parse(args);
  const profile = await getProfile(profileId);

  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  const lines: string[] = ['# Naming Conventions', ''];

  if (profile.naming && Object.keys(profile.naming).length > 0) {
    const naming = profile.naming as Record<string, unknown>;

    // Handle new nested structure
    if (naming.general && typeof naming.general === 'object') {
      lines.push('## General Naming', '');
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    if (naming.suffixes && typeof naming.suffixes === 'object') {
      lines.push('## Class Suffixes', '');
      for (const [key, value] of Object.entries(naming.suffixes as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    if (naming.testing && typeof naming.testing === 'object') {
      lines.push('## Testing Naming', '');
      for (const [key, value] of Object.entries(naming.testing as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    // Handle flat naming structure (backwards compatibility)
    const flatKeys = Object.keys(naming).filter(k => !['general', 'suffixes', 'testing'].includes(k));
    if (flatKeys.length > 0) {
      lines.push('## Other Conventions', '');
      for (const key of flatKeys) {
        if (typeof naming[key] === 'string') {
          lines.push(`- **${key}**: ${naming[key]}`);
        }
      }
      lines.push('');
    }
  } else {
    lines.push('Using default conventions:', '');
    lines.push('');
    lines.push('## General Naming', '');
    lines.push('- **class**: PascalCase');
    lines.push('- **interface**: PascalCase');
    lines.push('- **method**: camelCase');
    lines.push('- **variable**: camelCase');
    lines.push('- **constant**: SCREAMING_SNAKE_CASE');
    lines.push('- **package**: lowercase.dot.separated');
    lines.push('- **enum**: PascalCase');
    lines.push('- **enumValue**: SCREAMING_SNAKE_CASE');
    lines.push('');
    lines.push('## Testing Naming', '');
    lines.push('- **unitTest**: Test suffix (*Test.java)');
    lines.push('- **integrationTest**: IT suffix (*IT.java)');
    lines.push('- **testMethod**: should_ExpectedBehavior_When_Condition');
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

async function handleSearchStandards(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { query } = SearchInputSchema.parse(args);
  const standards = await loadStandards();

  if (!query.trim()) {
    return {
      content: [{ type: 'text', text: 'Please provide a search query.' }],
      isError: true,
    };
  }

  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; category: string; matches: string[] }> = [];

  for (const standard of standards) {
    const contentLower = standard.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      // Extract relevant sections containing the query
      const lines = standard.content.split('\n');
      const matches: string[] = [];
      let currentSection = '';
      let sectionContent: string[] = [];

      for (const line of lines) {
        if (line.startsWith('#')) {
          // Save previous section if it had matches
          if (sectionContent.some((l) => l.toLowerCase().includes(queryLower))) {
            matches.push(`${currentSection}\n${sectionContent.join('\n')}`);
          }
          currentSection = line;
          sectionContent = [];
        } else {
          sectionContent.push(line);
        }
      }

      // Check last section
      if (sectionContent.some((l) => l.toLowerCase().includes(queryLower))) {
        matches.push(`${currentSection}\n${sectionContent.join('\n')}`);
      }

      if (matches.length > 0) {
        results.push({
          name: standard.name,
          category: standard.category,
          matches: matches.slice(0, 3), // Limit to 3 matches per document
        });
      }
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No results found for "${query}". Try searching for: testing, kafka, docker, kubernetes, observability, logging, metrics, tracing, archunit, flyway, etc.`,
        },
      ],
    };
  }

  const output: string[] = [`# Search Results for "${query}"`, ''];

  for (const result of results) {
    output.push(`## ${result.name} (${result.category})`, '');
    for (const match of result.matches) {
      output.push(match.trim(), '');
    }
    output.push('---', '');
  }

  return { content: [{ type: 'text', text: output.join('\n') }] };
}
