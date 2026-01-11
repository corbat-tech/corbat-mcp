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
      'Get architecture-specific guidelines including layer definitions, dependencies, and DDD patterns.',
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
    description: 'Get naming conventions for classes, methods, variables, constants, etc.',
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
];

/**
 * Input schemas for validation.
 */
const ProfileInputSchema = z.object({
  profile: z.string().optional(),
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

    if (profile.architecture.layers) {
      lines.push('## Layers', '');
      for (const layer of profile.architecture.layers) {
        lines.push(`### ${layer.name}`);
        lines.push(layer.description);
        lines.push('');
        const deps = layer.allowedDependencies.length > 0
          ? layer.allowedDependencies.join(', ')
          : 'none';
        lines.push(`**Allowed dependencies:** ${deps}`, '');
      }
    }
  }

  if (profile.ddd?.enabled) {
    lines.push('## DDD Patterns', '');
    if (profile.ddd.patterns) {
      for (const [pattern, enabled] of Object.entries(profile.ddd.patterns)) {
        if (enabled) lines.push(`- ${pattern}`);
      }
    }
    lines.push('');
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
    for (const [context, pattern] of Object.entries(profile.naming)) {
      lines.push(`- **${context}**: ${pattern}`);
    }
  } else {
    lines.push('Using default conventions:', '');
    lines.push('- **class**: PascalCase');
    lines.push('- **interface**: PascalCase');
    lines.push('- **method**: camelCase');
    lines.push('- **variable**: camelCase');
    lines.push('- **constant**: SCREAMING_SNAKE_CASE');
    lines.push('- **package**: lowercase.dot.separated');
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}
