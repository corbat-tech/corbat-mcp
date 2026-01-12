import { z } from 'zod';
import { classifyTaskType, detectProjectStack, getGuardrails, getProjectRules, loadProjectConfig } from './agent.js';
import { config } from './config.js';
import { getProfile, listProfiles, loadStandards } from './profiles.js';

/**
 * SIMPLIFIED TOOL DEFINITIONS (5 tools instead of 13)
 *
 * Design principles:
 * - One primary tool (get_context) that does everything
 * - Supporting tools for specific use cases
 * - Names are short and intuitive
 */
export const tools = [
  // PRIMARY TOOL - Everything in one call
  {
    name: 'get_context',
    description:
      'Get COMPLETE coding standards context for a task. Returns everything needed: detected stack, guardrails, architecture, naming, and workflow. This is the PRIMARY tool - use it BEFORE any implementation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task: {
          type: 'string',
          description: 'What you\'re implementing (e.g., "Create payment service", "Fix login bug")',
        },
        project_dir: {
          type: 'string',
          description: 'Project directory for auto-detection (optional)',
        },
      },
      required: ['task'],
    },
  },

  // VALIDATE - Check code against standards
  {
    name: 'validate',
    description: 'Validate code against coding standards. Returns issues, suggestions, and compliance score.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The code to validate',
        },
        task_type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor', 'test'],
          description: 'Type of task for context-aware validation (optional)',
        },
      },
      required: ['code'],
    },
  },

  // SEARCH - Find specific topics in documentation
  {
    name: 'search',
    description: 'Search standards documentation for specific topics (e.g., "kafka", "testing", "docker").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['query'],
    },
  },

  // PROFILES - List available profiles
  {
    name: 'profiles',
    description: 'List all available coding standards profiles.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  // HEALTH - Server status
  {
    name: 'health',
    description: 'Check server status and loaded configuration.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

/**
 * Input schemas for validation.
 */
const GetContextSchema = z.object({
  task: z.string(),
  project_dir: z.string().optional(),
});

const ValidateSchema = z.object({
  code: z.string(),
  task_type: z.enum(['feature', 'bugfix', 'refactor', 'test']).optional(),
});

const SearchSchema = z.object({
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
    case 'get_context':
      return handleGetContext(args);
    case 'validate':
      return handleValidate(args);
    case 'search':
      return handleSearch(args);
    case 'profiles':
      return handleProfiles();
    case 'health':
      return handleHealth();
    default:
      return {
        content: [
          { type: 'text', text: `Unknown tool: ${name}. Available: get_context, validate, search, profiles, health` },
        ],
        isError: true,
      };
  }
}

/**
 * PRIMARY TOOL: Get complete context for a task.
 */
async function handleGetContext(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { task, project_dir } = GetContextSchema.parse(args);

  // Classify task type
  const taskType = classifyTaskType(task);

  // Auto-detect project stack if directory provided
  let detectedStack = null;
  let projectConfig = null;

  if (project_dir) {
    detectedStack = await detectProjectStack(project_dir);
    projectConfig = await loadProjectConfig(project_dir);
  }

  // Determine profile (priority: project config > detected > default)
  const profileId = projectConfig?.profile || detectedStack?.suggestedProfile || config.defaultProfile;
  const profile = await getProfile(profileId);

  if (!profile) {
    return {
      content: [
        {
          type: 'text',
          text: `Profile "${profileId}" not found.\n\nAvailable profiles:\n${(await listProfiles()).map((p) => `- ${p.id}`).join('\n')}\n\nRun \`corbat-init\` in your project to create a custom profile.`,
        },
      ],
      isError: true,
    };
  }

  // Get guardrails and rules
  const guardrails = getGuardrails(taskType, projectConfig);
  const projectRules = getProjectRules(taskType, projectConfig);

  // Build concise, scannable output
  const lines: string[] = ['# Context for: ' + task, '', '---', ''];

  // Stack Detection (concise)
  if (detectedStack) {
    const stackParts = [detectedStack.language];
    if (detectedStack.framework) stackParts.push(detectedStack.framework);
    if (detectedStack.buildTool) stackParts.push(detectedStack.buildTool);
    lines.push(`**Stack:** ${stackParts.join(' · ')}`);
  }
  lines.push(`**Task type:** ${taskType.toUpperCase()}`);
  lines.push(`**Profile:** ${profileId}`);
  lines.push('');

  // Guardrails (essential, concise)
  lines.push('---', '', '## Guardrails', '');
  lines.push('**MUST:**');
  for (const rule of guardrails.mandatory.slice(0, 5)) {
    lines.push(`- ${rule}`);
  }
  lines.push('');
  lines.push('**AVOID:**');
  for (const rule of guardrails.avoid.slice(0, 4)) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  // Project-specific rules (if any)
  if (projectRules.length > 0) {
    lines.push('**PROJECT RULES:**');
    for (const rule of projectRules) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Quick Reference (most important settings)
  lines.push('---', '', '## Quick Reference', '');

  if (profile.codeQuality) {
    lines.push(`- Max method lines: ${profile.codeQuality.maxMethodLines}`);
    lines.push(`- Max class lines: ${profile.codeQuality.maxClassLines}`);
    lines.push(`- Min test coverage: ${profile.codeQuality.minimumTestCoverage}%`);
  }

  if (profile.architecture) {
    lines.push(`- Architecture: ${profile.architecture.type}`);
  }

  if (profile.ddd?.enabled) {
    lines.push('- DDD: Enabled');
  }

  if (profile.testing) {
    lines.push(`- Testing: ${profile.testing.framework || 'standard'}`);
  }
  lines.push('');

  // Naming conventions (concise)
  if (profile.naming) {
    lines.push('---', '', '## Naming', '');
    const naming = profile.naming as Record<string, unknown>;
    if (naming.general && typeof naming.general === 'object') {
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- **${key}:** ${value}`);
      }
    }
    if (naming.suffixes && typeof naming.suffixes === 'object') {
      lines.push('');
      lines.push('**Suffixes:**');
      for (const [key, value] of Object.entries(naming.suffixes as Record<string, string>)) {
        lines.push(`- ${key}: \`${value}\``);
      }
    }
    lines.push('');
  }

  // Workflow reminder (brief)
  lines.push('---', '', '## Workflow', '');
  lines.push('```');
  lines.push('1. CLARIFY  → Ask if unclear');
  lines.push('2. PLAN     → Task checklist');
  lines.push('3. BUILD    → TDD: Test → Code → Refactor');
  lines.push('4. VERIFY   → Tests pass, linter clean');
  lines.push('5. REVIEW   → Self-check as expert');
  lines.push('```');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/**
 * Validate code against standards.
 */
async function handleValidate(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { code, task_type } = ValidateSchema.parse(args);

  const profileId = config.defaultProfile;
  const profile = await getProfile(profileId);

  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  const guardrails = task_type ? getGuardrails(task_type, null) : null;

  const lines: string[] = [
    '# Code Validation',
    '',
    '## Code',
    '```',
    code.slice(0, 2000) + (code.length > 2000 ? '\n...(truncated)' : ''),
    '```',
    '',
    '---',
    '',
    '## Validation Criteria',
    '',
  ];

  // Code quality thresholds
  if (profile.codeQuality) {
    lines.push('**Thresholds:**');
    lines.push(`- Max method lines: ${profile.codeQuality.maxMethodLines}`);
    lines.push(`- Max class lines: ${profile.codeQuality.maxClassLines}`);
    lines.push(`- Max parameters: ${profile.codeQuality.maxMethodParameters}`);
    lines.push(`- Min coverage: ${profile.codeQuality.minimumTestCoverage}%`);
    lines.push('');
  }

  // Guardrails if task type specified
  if (guardrails) {
    lines.push(`**${task_type?.toUpperCase()} Guardrails:**`);
    lines.push('');
    lines.push('Must:');
    for (const rule of guardrails.mandatory.slice(0, 4)) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
    lines.push('Avoid:');
    for (const rule of guardrails.avoid.slice(0, 3)) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Naming conventions
  if (profile.naming) {
    lines.push('**Naming:**');
    const naming = profile.naming as Record<string, unknown>;
    if (naming.general && typeof naming.general === 'object') {
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- ${key}: ${value}`);
      }
    }
    lines.push('');
  }

  lines.push('---', '');
  lines.push('## Review Checklist', '');
  lines.push('Analyze the code and report:', '');
  lines.push('1. **CRITICAL** - Must fix (bugs, security, violations)');
  lines.push('2. **WARNINGS** - Should fix (style, best practices)');
  lines.push('3. **Score** - Compliance 0-100 with justification');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/**
 * Search standards documentation.
 */
async function handleSearch(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { query } = SearchSchema.parse(args);

  if (!query.trim()) {
    return {
      content: [{ type: 'text', text: 'Please provide a search query.' }],
      isError: true,
    };
  }

  const standards = await loadStandards();
  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; category: string; excerpt: string }> = [];

  for (const standard of standards) {
    const contentLower = standard.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      // Find the relevant section
      const lines = standard.content.split('\n');
      let excerpt = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          // Get context around match
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 5);
          excerpt = lines.slice(start, end).join('\n');
          break;
        }
      }

      results.push({
        name: standard.name,
        category: standard.category,
        excerpt: excerpt.slice(0, 500),
      });
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No results for "${query}".\n\nTry: testing, kafka, docker, kubernetes, logging, metrics, archunit, flyway`,
        },
      ],
    };
  }

  const output: string[] = [`# Results for "${query}"`, ''];

  for (const result of results.slice(0, 5)) {
    output.push(`## ${result.name}`, '');
    output.push(result.excerpt, '');
    output.push('---', '');
  }

  return { content: [{ type: 'text', text: output.join('\n') }] };
}

/**
 * List available profiles.
 */
async function handleProfiles(): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const profiles = await listProfiles();

  if (profiles.length === 0) {
    return {
      content: [{ type: 'text', text: 'No profiles found. Run `corbat-init` to create one.' }],
    };
  }

  const lines = ['# Available Profiles', ''];

  for (const { id, profile } of profiles) {
    const isDefault = id === config.defaultProfile ? ' (default)' : '';
    lines.push(`**${id}**${isDefault}`);
    lines.push(`${profile.description || 'No description'}`);
    lines.push('');
  }

  lines.push('---', '');
  lines.push('Use with: `get_context` tool or specify profile in `.corbat.json`');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/**
 * Health check.
 */
async function handleHealth(): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const startTime = Date.now();

  try {
    const profiles = await listProfiles();
    const standards = await loadStandards();
    const loadTimeMs = Date.now() - startTime;

    const lines = [
      '# Corbat Health',
      '',
      `**Status:** OK`,
      `**Version:** ${config.serverVersion}`,
      `**Load time:** ${loadTimeMs}ms`,
      '',
      `**Profiles:** ${profiles.length} (${profiles.map((p) => p.id).join(', ')})`,
      `**Standards:** ${standards.length} documents`,
      `**Default profile:** ${config.defaultProfile}`,
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `# Corbat Health\n\n**Status:** ERROR\n**Error:** ${errorMessage}` }],
    };
  }
}
