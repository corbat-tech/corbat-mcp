import { z } from 'zod';
import { config } from './config.js';
import { formatProfileAsMarkdown, getProfile, listProfiles, loadStandards } from './profiles.js';

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

    case 'health_check':
      return handleHealthCheck();

    case 'get_development_workflow':
      return handleGetDevelopmentWorkflow();

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
