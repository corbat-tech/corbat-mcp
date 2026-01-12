import { classifyTaskType, detectProjectStack, getGuardrails, getProjectRules, loadProjectConfig } from './agent.js';
import { config } from './config.js';
import { getProfile } from './profiles.js';

/**
 * SIMPLIFIED PROMPT DEFINITIONS (2 prompts instead of 7)
 *
 * Design principles:
 * - One prompt for implementation
 * - One prompt for review
 * - Both are comprehensive but concise
 */
export const prompts = [
  {
    name: 'implement',
    description:
      'Guide implementation with coding standards, guardrails, and structured workflow. Use for any feature, fix, or task.',
    arguments: [
      {
        name: 'task',
        description: 'What to implement (e.g., "Create payment service", "Fix login bug")',
        required: true,
      },
      {
        name: 'project_dir',
        description: 'Project directory for auto-detection (optional)',
        required: false,
      },
    ],
  },
  {
    name: 'review',
    description: 'Review code against coding standards. Finds issues, suggests improvements, gives compliance score.',
    arguments: [
      {
        name: 'code',
        description: 'The code to review',
        required: true,
      },
      {
        name: 'role',
        description: 'Expert role: architect, backend, security, performance (optional)',
        required: false,
      },
    ],
  },
];

/**
 * Handle prompt requests.
 */
export async function handleGetPrompt(
  name: string,
  args: Record<string, string> | undefined
): Promise<{
  messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
} | null> {
  switch (name) {
    case 'implement':
      return handleImplementPrompt(args);
    case 'review':
      return handleReviewPrompt(args);
    default:
      return null;
  }
}

/**
 * Implementation prompt - comprehensive but concise.
 */
async function handleImplementPrompt(args: Record<string, string> | undefined): Promise<{
  messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
} | null> {
  const task = args?.task;
  if (!task) return null;

  const projectDir = args?.project_dir;

  // Classify task
  const taskType = classifyTaskType(task);

  // Auto-detect if project dir provided
  let detectedStack = null;
  let projectConfig = null;

  if (projectDir) {
    detectedStack = await detectProjectStack(projectDir);
    projectConfig = await loadProjectConfig(projectDir);
  }

  // Get profile
  const profileId = projectConfig?.profile || detectedStack?.suggestedProfile || config.defaultProfile;
  const profile = await getProfile(profileId);
  if (!profile) return null;

  // Get guardrails
  const guardrails = getGuardrails(taskType, projectConfig);
  const projectRules = getProjectRules(taskType, projectConfig);

  // Build prompt
  const lines: string[] = [
    '# CORBAT IMPLEMENTATION GUIDE',
    '',
    '---',
    '',
    '## Task',
    '',
    `**${task}**`,
    '',
    `Type: ${taskType.toUpperCase()} | Profile: ${profileId}`,
  ];

  // Stack info
  if (detectedStack) {
    const stack = [detectedStack.language, detectedStack.framework, detectedStack.buildTool]
      .filter(Boolean)
      .join(' · ');
    lines.push(`Stack: ${stack}`);
  }
  lines.push('');

  // Guardrails (critical)
  lines.push('---', '', '## Guardrails', '');
  lines.push('**MUST:**');
  for (const rule of guardrails.mandatory) {
    lines.push(`- ${rule}`);
  }
  lines.push('');
  lines.push('**AVOID:**');
  for (const rule of guardrails.avoid) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  // Project rules
  if (projectRules.length > 0) {
    lines.push('**PROJECT RULES:**');
    for (const rule of projectRules) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  // Code quality
  if (profile.codeQuality) {
    lines.push('---', '', '## Code Quality', '');
    lines.push(`- Max method: ${profile.codeQuality.maxMethodLines} lines`);
    lines.push(`- Max class: ${profile.codeQuality.maxClassLines} lines`);
    lines.push(`- Coverage: ${profile.codeQuality.minimumTestCoverage}%+`);
    lines.push('');
  }

  // Architecture
  if (profile.architecture) {
    lines.push('---', '', '## Architecture', '');
    lines.push(`Pattern: **${profile.architecture.type}**`);
    if (profile.architecture.layers) {
      lines.push('');
      lines.push('Layers:');
      for (const layer of profile.architecture.layers) {
        const deps =
          layer.allowedDependencies.length > 0 ? `→ ${layer.allowedDependencies.join(', ')}` : '(no dependencies)';
        lines.push(`- **${layer.name}** ${deps}`);
      }
    }
    lines.push('');
  }

  // Naming conventions (concise)
  if (profile.naming) {
    lines.push('---', '', '## Naming', '');
    const naming = profile.naming as Record<string, unknown>;
    if (naming.general && typeof naming.general === 'object') {
      for (const [key, value] of Object.entries(naming.general as Record<string, string>)) {
        lines.push(`- ${key}: ${value}`);
      }
    }
    if (naming.suffixes && typeof naming.suffixes === 'object') {
      lines.push('');
      for (const [key, value] of Object.entries(naming.suffixes as Record<string, string>)) {
        lines.push(`- ${key}: \`${value}\``);
      }
    }
    lines.push('');
  }

  // Workflow
  lines.push('---', '', '## Workflow', '');
  lines.push(`
Follow these phases:

### 1. CLARIFY
- Analyze requirements
- ASK if anything is unclear
- Confirm understanding

### 2. PLAN
Create task checklist:
\`\`\`
[ ] Task 1
    [ ] Write test
    [ ] Implement
[ ] Task 2
    ...
\`\`\`

### 3. BUILD (TDD)
For each task:
1. RED - Write failing test
2. GREEN - Minimum code to pass
3. REFACTOR - Clean up

### 4. VERIFY
- [ ] Code compiles
- [ ] Tests pass
- [ ] Linter clean

### 5. REVIEW
Self-review as expert:
- CRITICAL issues (must fix)
- RECOMMENDED improvements
- Score 1-10
`);

  lines.push('---', '', '**BEGIN with Phase 1 (CLARIFY).** Ask questions if unclear, otherwise proceed to PLAN.');

  return {
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: lines.join('\n') },
      },
    ],
  };
}

/**
 * Review prompt - expert code review.
 */
async function handleReviewPrompt(args: Record<string, string> | undefined): Promise<{
  messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
} | null> {
  const code = args?.code;
  if (!code) return null;

  const role = args?.role || 'senior developer';
  const profileId = config.defaultProfile;
  const profile = await getProfile(profileId);
  if (!profile) return null;

  // Role descriptions
  const roleDescriptions: Record<string, string> = {
    architect: 'Software Architect (15+ years) - focus on design, patterns, scalability',
    backend: 'Senior Backend Developer (15+ years) - focus on APIs, performance, clean code',
    security: 'Security Engineer (15+ years) - focus on vulnerabilities, OWASP, secure coding',
    performance: 'Performance Engineer (15+ years) - focus on optimization, profiling, bottlenecks',
    frontend: 'Senior Frontend Developer (15+ years) - focus on components, state, UX',
  };

  const roleDesc = roleDescriptions[role.toLowerCase()] || `Senior ${role} Expert (15+ years)`;

  const lines: string[] = [
    '# EXPERT CODE REVIEW',
    '',
    `**Role:** ${roleDesc}`,
    '',
    'You are reviewing this code FROM SCRATCH with no prior knowledge.',
    '',
    '---',
    '',
    '## Code',
    '',
    '```',
    code,
    '```',
    '',
    '---',
    '',
    '## Standards to Apply',
    '',
  ];

  // Code quality
  if (profile.codeQuality) {
    lines.push('**Thresholds:**');
    lines.push(`- Method: max ${profile.codeQuality.maxMethodLines} lines`);
    lines.push(`- Class: max ${profile.codeQuality.maxClassLines} lines`);
    lines.push(`- Parameters: max ${profile.codeQuality.maxMethodParameters}`);
    lines.push(`- Coverage: ${profile.codeQuality.minimumTestCoverage}%+`);
    lines.push('');
  }

  // Architecture
  if (profile.architecture) {
    lines.push(`**Architecture:** ${profile.architecture.type}`);
    lines.push('');
  }

  // Naming
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

  lines.push('---', '', '## Your Review', '');
  lines.push(`
### 1. CRITICAL ISSUES (must fix)
- Bugs, security vulnerabilities
- Architecture violations
- Performance problems
- Data integrity risks

### 2. WARNINGS (should fix)
- Style violations
- Missing best practices
- Readability issues
- Missing tests

### 3. SUGGESTIONS (nice to have)
- Refactoring opportunities
- Alternative patterns
- Future improvements

### 4. SCORE
- Rating: X/10
- Summary: [key concerns and strengths]

Be thorough and specific. Reference line numbers when possible.
`);

  return {
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: lines.join('\n') },
      },
    ],
  };
}
