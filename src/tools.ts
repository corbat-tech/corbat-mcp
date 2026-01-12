import { z } from 'zod';
import { config } from './config.js';
import { formatProfileAsMarkdown, getProfile, listProfiles, loadStandards } from './profiles.js';
import {
  classifyTaskType,
  detectProjectStack,
  formatGuardrailsAsMarkdown,
  getGuardrails,
  getProjectRules,
  getTechnicalDecision,
  loadProjectConfig,
  TECHNICAL_DECISIONS,
} from './agent.js';
import type { TaskType } from './types.js';

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
  {
    name: 'health_check',
    description:
      'Check the health status of corbat-mcp server. Returns information about loaded profiles, standards, cache status, and version.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_development_workflow',
    description:
      'Get the structured LLM development workflow guide. This workflow defines how to implement features following: Clarify → Plan → Build (TDD) → Verify → Review → Refine. Use this when starting to implement any feature or fix.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  // ============================================================================
  // AGENT MODE TOOLS - Intelligent context injection and decision support
  // ============================================================================
  {
    name: 'get_full_context',
    description:
      'Get COMPLETE context for a task in a single call. This is the PRIMARY tool for agent mode - it returns everything needed: guardrails, profile standards, architecture, naming conventions, workflow, and relevant documentation. Use this BEFORE starting any implementation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_description: {
          type: 'string',
          description: 'Description of the task to implement (e.g., "Create a payment service", "Fix login bug")',
        },
        project_dir: {
          type: 'string',
          description: 'Project directory path to detect stack and load .corbat.json (optional)',
        },
        profile: {
          type: 'string',
          description: `Override profile ID. If not provided, will be auto-detected or default to "${config.defaultProfile}"`,
        },
      },
      required: ['task_description'],
    },
  },
  {
    name: 'detect_project_stack',
    description:
      'Auto-detect the technology stack of a project by analyzing files (package.json, pom.xml, etc.). Returns suggested profile, language, framework, and confidence level.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_dir: {
          type: 'string',
          description: 'Path to the project directory to analyze',
        },
      },
      required: ['project_dir'],
    },
  },
  {
    name: 'get_guardrails',
    description:
      'Get mandatory rules, recommendations, and things to avoid for a specific task type. Guardrails ensure quality and consistency.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor', 'test', 'documentation', 'performance', 'security', 'infrastructure'],
          description: 'Type of task to get guardrails for',
        },
        project_dir: {
          type: 'string',
          description: 'Project directory to load custom guardrails from .corbat.json (optional)',
        },
      },
      required: ['task_type'],
    },
  },
  {
    name: 'validate_against_standards',
    description:
      'Validate code or implementation plan against the coding standards. Returns compliance score, issues found, and suggestions for improvement.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The code or implementation description to validate',
        },
        profile: {
          type: 'string',
          description: `Profile ID to validate against. Defaults to "${config.defaultProfile}"`,
        },
        task_type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor', 'test', 'documentation', 'performance', 'security', 'infrastructure'],
          description: 'Type of task for context-aware validation',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'make_technical_decision',
    description:
      'Get a recommendation for a technical decision (database, cache, messaging, authentication, testing strategy, etc.). Returns options with pros/cons and a recommendation aligned with project standards.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['database', 'cache', 'messaging', 'authentication', 'testing'],
          description: 'Category of technical decision',
        },
        context: {
          type: 'string',
          description: 'Context about the requirement (e.g., "Need to store user sessions for 100k concurrent users")',
        },
        project_dir: {
          type: 'string',
          description: 'Project directory to check for predefined decisions in .corbat.json (optional)',
        },
      },
      required: ['category', 'context'],
    },
  },
  {
    name: 'load_project_config',
    description:
      'Load project-specific configuration from .corbat.json. Returns profile override, custom rules, technical decisions, and guardrails defined for the project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_dir: {
          type: 'string',
          description: 'Path to project directory containing .corbat.json',
        },
      },
      required: ['project_dir'],
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

const FullContextInputSchema = z.object({
  task_description: z.string(),
  project_dir: z.string().optional(),
  profile: z.string().optional(),
});

const DetectStackInputSchema = z.object({
  project_dir: z.string(),
});

const GuardrailsInputSchema = z.object({
  task_type: z.enum(['feature', 'bugfix', 'refactor', 'test', 'documentation', 'performance', 'security', 'infrastructure']),
  project_dir: z.string().optional(),
});

const ValidateInputSchema = z.object({
  code: z.string(),
  profile: z.string().optional(),
  task_type: z.enum(['feature', 'bugfix', 'refactor', 'test', 'documentation', 'performance', 'security', 'infrastructure']).optional(),
});

const TechnicalDecisionInputSchema = z.object({
  category: z.enum(['database', 'cache', 'messaging', 'authentication', 'testing']),
  context: z.string(),
  project_dir: z.string().optional(),
});

const ProjectConfigInputSchema = z.object({
  project_dir: z.string(),
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

    case 'health_check':
      return handleHealthCheck();

    case 'get_development_workflow':
      return handleGetDevelopmentWorkflow();

    // Agent mode tools
    case 'get_full_context':
      return handleGetFullContext(args);

    case 'detect_project_stack':
      return handleDetectProjectStack(args);

    case 'get_guardrails':
      return handleGetGuardrails(args);

    case 'validate_against_standards':
      return handleValidateAgainstStandards(args);

    case 'make_technical_decision':
      return handleMakeTechnicalDecision(args);

    case 'load_project_config':
      return handleLoadProjectConfig(args);

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
  const standardsMarkdown = standards.map((s) => `## ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

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
        const deps = layer.allowedDependencies.length > 0 ? layer.allowedDependencies.join(', ') : 'none';
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
    const flatKeys = Object.keys(naming).filter((k) => !['general', 'suffixes', 'testing'].includes(k));
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

async function handleHealthCheck(): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const startTime = Date.now();

  try {
    const profiles = await listProfiles();
    const standards = await loadStandards();
    const loadTimeMs = Date.now() - startTime;

    const healthInfo = {
      status: 'healthy',
      version: config.serverVersion,
      serverName: config.serverName,
      timestamp: new Date().toISOString(),
      profiles: {
        count: profiles.length,
        ids: profiles.map((p) => p.id),
      },
      standards: {
        count: standards.length,
        categories: [...new Set(standards.map((s) => s.category))],
      },
      configuration: {
        profilesDir: config.profilesDir,
        standardsDir: config.standardsDir,
        defaultProfile: config.defaultProfile,
      },
      performance: {
        loadTimeMs,
      },
    };

    const lines: string[] = [
      '# Corbat MCP Health Check',
      '',
      `**Status:** ${healthInfo.status}`,
      `**Version:** ${healthInfo.version}`,
      `**Timestamp:** ${healthInfo.timestamp}`,
      '',
      '## Profiles',
      `- Count: ${healthInfo.profiles.count}`,
      `- Available: ${healthInfo.profiles.ids.join(', ')}`,
      '',
      '## Standards',
      `- Documents: ${healthInfo.standards.count}`,
      `- Categories: ${healthInfo.standards.categories.join(', ')}`,
      '',
      '## Configuration',
      `- Profiles Directory: ${healthInfo.configuration.profilesDir}`,
      `- Standards Directory: ${healthInfo.configuration.standardsDir}`,
      `- Default Profile: ${healthInfo.configuration.defaultProfile}`,
      '',
      '## Performance',
      `- Load Time: ${healthInfo.performance.loadTimeMs}ms`,
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `# Corbat MCP Health Check\n\n**Status:** unhealthy\n**Error:** ${errorMessage}`,
        },
      ],
    };
  }
}

async function handleGetDevelopmentWorkflow(): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const workflow = `# LLM Development Workflow

## Overview
This workflow defines the structured process for implementing features, fixes, or any development task.

**Phases:** Clarify → Plan → Build (TDD) → Verify → Review → Refine

---

## PHASE 1: CLARIFICACIÓN (Ask)

**Before writing any code, you MUST:**

1. Analyze the request for:
   - Explicit functional requirements
   - Implicit or assumed requirements
   - Ambiguities or contradictions
   - Missing technical context

2. **ASK if you detect:**
   - Missing functional context
   - Contradictory requirements
   - Multiple possible interpretations
   - Unclear acceptance criteria

3. Confirm understanding by reformulating requirements

---

## PHASE 2: PLANIFICACIÓN (Plan)

1. **List requirements and constraints**
2. **Evaluate 2-3 alternatives** (when applicable):
   - Describe each approach
   - List pros/cons
   - Recommend best option with justification

3. **Create task checklist:**
\`\`\`
[ ] 1. Task A - Description
    [ ] 1.1 Write tests
    [ ] 1.2 Implement
[ ] 2. Task B - Description
    [ ] 2.1 Write tests
    [ ] 2.2 Implement
\`\`\`

4. **Define acceptance criteria**

---

## PHASE 3: IMPLEMENTACIÓN (Build with TDD)

**For EACH task, follow TDD strictly:**

\`\`\`
┌─────────────────────────────────────────┐
│  1. RED: Write failing test first       │
│     - Test describes expected behavior  │
│     - Run test, confirm it fails        │
├─────────────────────────────────────────┤
│  2. GREEN: Implement minimum to pass    │
│     - Only necessary code               │
│     - Run test, confirm it passes       │
├─────────────────────────────────────────┤
│  3. REFACTOR: Clean up                  │
│     - Apply project patterns            │
│     - Tests still pass                  │
└─────────────────────────────────────────┘
\`\`\`

**Test coverage:**
- Unit tests: 80%+ coverage
- Integration tests: Critical flows
- Architecture tests: When applicable

---

## PHASE 4: VERIFICACIÓN (Verify)

**Checklist:**
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linter passes
- [ ] Application starts correctly
- [ ] No regressions

**If something fails:** Fix → Re-verify → Don't proceed until green

---

## PHASE 5: REVISIÓN EXPERTA (Review)

1. **Clear mental context** - Forget implementation process
2. **Adopt expert role** based on work type:
   - Architecture → Software Architect
   - Backend → Senior Backend Developer
   - Frontend → Senior Frontend Developer
   - Security → Security Engineer
   - Performance → Performance Engineer
   - Database → DBA
   - DevOps → DevOps Engineer

3. **Review from scratch, looking for:**

   **CRITICAL (must fix):**
   - Bugs, security vulnerabilities
   - Architecture violations
   - Severe performance issues

   **RECOMMENDED (should fix):**
   - Readability improvements
   - Minor optimizations
   - Missing best practices

   **SUGGESTIONS (nice to have):**
   - Optional refactorings
   - Future improvements

---

## PHASE 6: REFINAMIENTO (Refine)

**Apply improvements in up to 3 cycles:**

- **Cycle 1:** Fix ALL critical issues
- **Cycle 2:** Apply recommended improvements
- **Cycle 3:** Final polish

**Completion criteria:**
- [ ] All CRITICAL issues resolved
- [ ] 80%+ RECOMMENDED issues resolved
- [ ] All tests pass
- [ ] Code compiles without warnings
- [ ] Application works correctly

---

## Quick Reference

\`\`\`
Developer Request
       │
       ▼
┌──────────────┐
│ 1. CLARIFY   │◄── Questions? Ask!
└──────────────┘
       │
       ▼
┌──────────────┐
│ 2. PLAN      │◄── Task checklist
└──────────────┘
       │
       ▼
┌──────────────┐
│ 3. BUILD     │◄── TDD: Test → Code → Refactor
└──────────────┘
       │
       ▼
┌──────────────┐
│ 4. VERIFY    │◄── All green?
└──────────────┘
       │
       ▼
┌──────────────┐
│ 5. REVIEW    │◄── Expert perspective
└──────────────┘
       │
       ▼
┌──────────────┐
│ 6. REFINE    │◄── Up to 3 cycles
└──────────────┘
       │
       ▼
    ✅ Done
\`\`\``;

  return { content: [{ type: 'text', text: workflow }] };
}

// ============================================================================
// AGENT MODE HANDLERS
// ============================================================================

async function handleGetFullContext(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { task_description, project_dir, profile: profileOverride } = FullContextInputSchema.parse(args);

  // Classify task type
  const taskType = classifyTaskType(task_description);

  // Try to detect project stack if directory provided
  let detectedStack = null;
  let projectConfig = null;

  if (project_dir) {
    detectedStack = await detectProjectStack(project_dir);
    projectConfig = await loadProjectConfig(project_dir);
  }

  // Determine profile to use (priority: override > project config > detected > default)
  const profileId =
    profileOverride || projectConfig?.profile || detectedStack?.suggestedProfile || config.defaultProfile;

  const profile = await getProfile(profileId);
  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  // Get guardrails for this task type
  const guardrails = getGuardrails(taskType, projectConfig);

  // Get project-specific rules
  const projectRules = getProjectRules(taskType, projectConfig);

  // Load standards
  const standards = await loadStandards();

  // Build comprehensive context
  const lines: string[] = [
    '# CORBAT AGENT CONTEXT',
    '',
    '> This context was auto-generated by corbat-mcp agent mode.',
    '> Apply ALL guidelines below to your implementation.',
    '',
    '---',
    '',
    `## Task Analysis`,
    '',
    `**Task:** ${task_description}`,
    `**Classified as:** ${taskType.toUpperCase()}`,
    `**Profile:** ${profileId}`,
    '',
  ];

  // Add detected stack info if available
  if (detectedStack) {
    lines.push('## Detected Project Stack', '');
    lines.push(`- **Language:** ${detectedStack.language}`);
    if (detectedStack.framework) lines.push(`- **Framework:** ${detectedStack.framework}`);
    if (detectedStack.buildTool) lines.push(`- **Build Tool:** ${detectedStack.buildTool}`);
    if (detectedStack.testFramework) lines.push(`- **Test Framework:** ${detectedStack.testFramework}`);
    lines.push(`- **Confidence:** ${detectedStack.confidence}`);
    lines.push('');
  }

  // Add guardrails
  lines.push('---', '');
  lines.push(formatGuardrailsAsMarkdown(guardrails));
  lines.push('');

  // Add project-specific rules if any
  if (projectRules.length > 0) {
    lines.push('---', '', '## Project-Specific Rules', '');
    for (const rule of projectRules) {
      lines.push(`- 📌 ${rule}`);
    }
    lines.push('');
  }

  // Add profile configuration
  lines.push('---', '');
  lines.push(formatProfileAsMarkdown(profileId, profile));

  // Add relevant standards based on task type and detected stack
  const relevantCategories = getRelevantCategories(taskType, detectedStack?.language);
  const relevantStandards = standards.filter((s) =>
    relevantCategories.some((cat) => s.category.toLowerCase().includes(cat.toLowerCase()))
  );

  if (relevantStandards.length > 0) {
    lines.push('---', '', '## Relevant Standards Documentation', '');
    for (const standard of relevantStandards.slice(0, 5)) {
      lines.push(`### ${standard.name}`, '');
      // Truncate long content
      const content = standard.content.length > 2000 ? standard.content.slice(0, 2000) + '\n\n...(truncated)' : standard.content;
      lines.push(content, '');
    }
  }

  // Add workflow reminder
  lines.push('---', '', '## Development Workflow Reminder', '');
  lines.push('Follow the phases: **Clarify → Plan → Build (TDD) → Verify → Review → Refine**');
  lines.push('');
  lines.push('1. ❓ **CLARIFY** - Ask if requirements are unclear');
  lines.push('2. 📋 **PLAN** - Create task checklist before coding');
  lines.push('3. 🔨 **BUILD** - Use TDD: Test → Code → Refactor');
  lines.push('4. ✅ **VERIFY** - Ensure all tests pass');
  lines.push('5. 🔍 **REVIEW** - Self-review as expert');
  lines.push('6. 🔄 **REFINE** - Fix issues in up to 3 cycles');
  lines.push('');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/**
 * Get relevant documentation categories based on task type and language.
 */
function getRelevantCategories(taskType: TaskType, language?: string): string[] {
  const categories: string[] = ['clean-code'];

  switch (taskType) {
    case 'feature':
      categories.push('architecture', 'testing');
      break;
    case 'bugfix':
      categories.push('testing');
      break;
    case 'refactor':
      categories.push('architecture', 'clean-code');
      break;
    case 'test':
      categories.push('testing');
      break;
    case 'performance':
      categories.push('observability');
      break;
    case 'security':
      categories.push('security');
      break;
    case 'infrastructure':
      categories.push('containerization', 'kubernetes', 'cicd');
      break;
  }

  // Add language-specific categories
  if (language?.toLowerCase().includes('java')) {
    categories.push('spring-boot');
  }

  return [...new Set(categories)];
}

async function handleDetectProjectStack(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { project_dir } = DetectStackInputSchema.parse(args);

  const stack = await detectProjectStack(project_dir);

  if (!stack) {
    return {
      content: [
        {
          type: 'text',
          text: `# Project Stack Detection\n\n**Status:** Unable to detect project stack\n\nNo recognizable configuration files found (package.json, pom.xml, pyproject.toml, etc.).\n\n**Suggestion:** Use the default profile or specify one manually.`,
        },
      ],
    };
  }

  const lines: string[] = [
    '# Project Stack Detection',
    '',
    `**Confidence:** ${stack.confidence.toUpperCase()}`,
    '',
    '## Detected Stack',
    '',
    `| Property | Value |`,
    `|----------|-------|`,
    `| Language | ${stack.language} |`,
    `| Framework | ${stack.framework || 'N/A'} |`,
    `| Build Tool | ${stack.buildTool || 'N/A'} |`,
    `| Test Framework | ${stack.testFramework || 'N/A'} |`,
    '',
    '## Recommendation',
    '',
    `**Suggested Profile:** \`${stack.suggestedProfile}\``,
    '',
    '## Detected Files',
    '',
  ];

  for (const file of stack.detectedFiles) {
    lines.push(`- ${file}`);
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

async function handleGetGuardrails(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { task_type, project_dir } = GuardrailsInputSchema.parse(args);

  let projectConfig = null;
  if (project_dir) {
    projectConfig = await loadProjectConfig(project_dir);
  }

  const guardrails = getGuardrails(task_type as TaskType, projectConfig);

  return { content: [{ type: 'text', text: formatGuardrailsAsMarkdown(guardrails) }] };
}

async function handleValidateAgainstStandards(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { code, profile: profileId = config.defaultProfile, task_type } = ValidateInputSchema.parse(args);

  const profile = await getProfile(profileId);
  if (!profile) {
    return {
      content: [{ type: 'text', text: `Profile not found: ${profileId}` }],
      isError: true,
    };
  }

  // Get guardrails if task type specified
  const guardrails = task_type ? getGuardrails(task_type as TaskType, null) : null;

  // Build validation prompt
  const lines: string[] = [
    '# Code Validation Against Standards',
    '',
    '## Code Provided',
    '',
    '```',
    code,
    '```',
    '',
    '## Validation Criteria',
    '',
    `**Profile:** ${profileId}`,
    '',
  ];

  // Add code quality rules
  if (profile.codeQuality) {
    lines.push('### Code Quality Thresholds', '');
    lines.push(`- Max method lines: ${profile.codeQuality.maxMethodLines}`);
    lines.push(`- Max class lines: ${profile.codeQuality.maxClassLines}`);
    lines.push(`- Max parameters: ${profile.codeQuality.maxMethodParameters}`);
    lines.push(`- Min test coverage: ${profile.codeQuality.minimumTestCoverage}%`);
    lines.push('');
  }

  // Add guardrails if available
  if (guardrails) {
    lines.push(`### Guardrails for ${task_type?.toUpperCase()} task`, '');
    lines.push('**Must follow:**');
    for (const rule of guardrails.mandatory.slice(0, 5)) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
    lines.push('**Should avoid:**');
    for (const rule of guardrails.avoid.slice(0, 5)) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Add naming conventions
  if (profile.naming) {
    lines.push('### Naming Conventions', '');
    const naming = profile.naming as Record<string, unknown>;
    if (naming.general && typeof naming.general === 'object') {
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- **${key}**: ${value}`);
      }
    }
    lines.push('');
  }

  lines.push('---', '');
  lines.push('## Validation Instructions', '');
  lines.push('Review the code above against the criteria and identify:', '');
  lines.push('1. **CRITICAL issues** - Must be fixed (bugs, security, architecture violations)');
  lines.push('2. **WARNINGS** - Should be fixed (style, best practices)');
  lines.push('3. **SUGGESTIONS** - Nice to have improvements');
  lines.push('');
  lines.push('Provide a compliance score from 0-100 with justification.');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

async function handleMakeTechnicalDecision(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { category, context, project_dir } = TechnicalDecisionInputSchema.parse(args);

  let projectConfig = null;
  if (project_dir) {
    projectConfig = await loadProjectConfig(project_dir);
  }

  const decision = getTechnicalDecision(category, context, projectConfig);

  if (!decision) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown decision category: ${category}. Available categories: ${Object.keys(TECHNICAL_DECISIONS).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const lines: string[] = [
    `# Technical Decision: ${category.toUpperCase()}`,
    '',
    `## Context`,
    '',
    context,
    '',
    '---',
    '',
    '## Options',
    '',
  ];

  for (const option of decision.options) {
    const isRecommended = option.name === decision.recommendation;
    lines.push(`### ${option.name}${isRecommended ? ' ⭐ RECOMMENDED' : ''}`, '');
    lines.push(option.description, '');
    lines.push('**Pros:**');
    for (const pro of option.pros) {
      lines.push(`- ✅ ${pro}`);
    }
    lines.push('');
    lines.push('**Cons:**');
    for (const con of option.cons) {
      lines.push(`- ❌ ${con}`);
    }
    lines.push('');
    lines.push('**Use when:**');
    for (const use of option.useWhen) {
      lines.push(`- ${use}`);
    }
    lines.push('');
  }

  lines.push('---', '', '## Recommendation', '');
  lines.push(`**${decision.recommendation}**`, '');
  lines.push(decision.reasoning);

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

async function handleLoadProjectConfig(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { project_dir } = ProjectConfigInputSchema.parse(args);

  const projectConfig = await loadProjectConfig(project_dir);

  if (!projectConfig) {
    const exampleConfig = {
      profile: 'nodejs',
      autoInject: true,
      rules: {
        always: ['Use TypeScript strict mode', 'Prefer composition over inheritance'],
        onNewFile: ['Add license header', 'Export types first'],
        onTest: ['Use Arrange-Act-Assert pattern', 'One assertion per test'],
        onRefactor: ['Ensure all tests pass before and after'],
      },
      overrides: {
        maxMethodLines: 25,
        minimumTestCoverage: 90,
      },
      decisions: {
        database: 'PostgreSQL',
        cache: 'Redis',
        messaging: 'Kafka',
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Project Configuration

**Status:** No .corbat.json found in ${project_dir}

## How to Create a Project Configuration

Create a \`.corbat.json\` file in your project root:

\`\`\`json
${JSON.stringify(exampleConfig, null, 2)}
\`\`\`

### Configuration Options

| Option | Description |
|--------|-------------|
| \`profile\` | Override default profile |
| \`autoInject\` | Enable auto context injection |
| \`rules.always\` | Rules applied to all tasks |
| \`rules.onNewFile\` | Rules for new file creation |
| \`rules.onTest\` | Rules for test-related tasks |
| \`rules.onRefactor\` | Rules for refactoring tasks |
| \`overrides\` | Override code quality thresholds |
| \`decisions\` | Pre-made technical decisions |`,
        },
      ],
    };
  }

  const lines: string[] = ['# Project Configuration', '', `**Source:** ${project_dir}/.corbat.json`, ''];

  if (projectConfig.profile) {
    lines.push(`## Profile Override`, '', `Using profile: \`${projectConfig.profile}\``, '');
  }

  lines.push(`## Auto Inject`, '', `Enabled: ${projectConfig.autoInject}`, '');

  if (projectConfig.rules) {
    lines.push('## Custom Rules', '');

    if (projectConfig.rules.always?.length) {
      lines.push('### Always Apply', '');
      for (const rule of projectConfig.rules.always) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    if (projectConfig.rules.onNewFile?.length) {
      lines.push('### On New File', '');
      for (const rule of projectConfig.rules.onNewFile) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    if (projectConfig.rules.onTest?.length) {
      lines.push('### On Test Tasks', '');
      for (const rule of projectConfig.rules.onTest) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    if (projectConfig.rules.onRefactor?.length) {
      lines.push('### On Refactor Tasks', '');
      for (const rule of projectConfig.rules.onRefactor) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }
  }

  if (projectConfig.overrides) {
    lines.push('## Code Quality Overrides', '');
    for (const [key, value] of Object.entries(projectConfig.overrides)) {
      if (value !== undefined) {
        lines.push(`- **${key}:** ${value}`);
      }
    }
    lines.push('');
  }

  if (projectConfig.decisions) {
    lines.push('## Technical Decisions', '');
    for (const [category, decision] of Object.entries(projectConfig.decisions)) {
      lines.push(`- **${category}:** ${decision}`);
    }
    lines.push('');
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}
