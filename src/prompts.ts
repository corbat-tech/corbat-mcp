import { config } from './config.js';
import { formatProfileAsMarkdown, getProfile, loadStandards } from './profiles.js';
import {
  classifyTaskType,
  detectProjectStack,
  formatGuardrailsAsMarkdown,
  getGuardrails,
  getProjectRules,
  loadProjectConfig,
} from './agent.js';

/**
 * Prompt definitions for MCP.
 */
export const prompts = [
  {
    name: 'code_review',
    description:
      'Review code applying the coding standards from a profile. Provides detailed feedback on compliance, issues, and suggestions.',
    arguments: [
      {
        name: 'profile',
        description: 'Profile ID to use for standards (optional, defaults to "default")',
        required: false,
      },
      {
        name: 'code',
        description: 'The code to review',
        required: true,
      },
    ],
  },
  {
    name: 'refactor_suggestion',
    description:
      'Suggest refactoring based on coding standards and best practices. Returns improved code with explanations.',
    arguments: [
      {
        name: 'profile',
        description: 'Profile ID to use for standards (optional)',
        required: false,
      },
      {
        name: 'code',
        description: 'The code to refactor',
        required: true,
      },
    ],
  },
  {
    name: 'architecture_check',
    description: 'Check if code follows the architecture guidelines (layer dependencies, DDD patterns, structure).',
    arguments: [
      {
        name: 'profile',
        description: 'Profile ID to use for standards (optional)',
        required: false,
      },
      {
        name: 'description',
        description: 'Description of the code structure or the code itself',
        required: true,
      },
    ],
  },
  {
    name: 'implement_feature',
    description:
      'Guide for implementing a feature following the structured LLM development workflow: Clarify → Plan → Build (TDD) → Verify → Review → Refine.',
    arguments: [
      {
        name: 'profile',
        description: 'Profile ID to use for standards (optional)',
        required: false,
      },
      {
        name: 'feature',
        description: 'Description of the feature to implement',
        required: true,
      },
      {
        name: 'context',
        description: 'Additional context about the project, tech stack, or constraints (optional)',
        required: false,
      },
    ],
  },
  {
    name: 'expert_review',
    description:
      'Perform an expert review of code adopting a specific role (Architect, Backend Dev, Security Engineer, etc.) following the structured review process.',
    arguments: [
      {
        name: 'role',
        description:
          'Expert role to adopt: "architect", "backend", "frontend", "security", "performance", "dba", "devops"',
        required: true,
      },
      {
        name: 'code',
        description: 'The code or implementation to review',
        required: true,
      },
      {
        name: 'profile',
        description: 'Profile ID to use for standards (optional)',
        required: false,
      },
    ],
  },
  // ============================================================================
  // AGENT MODE PROMPTS
  // ============================================================================
  {
    name: 'agent_mode',
    description:
      'AGENT MODE: Comprehensive prompt that auto-injects ALL relevant context (guardrails, standards, architecture, workflow) for any task. Use this for a fully autonomous development experience.',
    arguments: [
      {
        name: 'task',
        description: 'The task to implement (e.g., "Create a payment service", "Fix the login bug")',
        required: true,
      },
      {
        name: 'project_dir',
        description: 'Project directory path for auto-detection and .corbat.json loading (optional)',
        required: false,
      },
      {
        name: 'profile',
        description: 'Override profile ID (optional, will be auto-detected if not provided)',
        required: false,
      },
    ],
  },
  {
    name: 'quick_implement',
    description:
      'Quick implementation mode with essential guardrails. Less verbose than agent_mode but still ensures quality. Good for smaller tasks.',
    arguments: [
      {
        name: 'task',
        description: 'The task to implement',
        required: true,
      },
      {
        name: 'profile',
        description: 'Profile ID to use (optional)',
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
  const profileId = args?.profile || config.defaultProfile;
  const profile = await getProfile(profileId);

  if (!profile) return null;

  const standards = await loadStandards();
  const profileMarkdown = formatProfileAsMarkdown(profileId, profile);
  const standardsMarkdown = standards.map((s) => `## ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

  const context = `${profileMarkdown}\n\n---\n\n# Standards Documentation\n\n${standardsMarkdown}`;

  switch (name) {
    case 'code_review': {
      const code = args?.code;
      if (!code) return null;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a senior code reviewer. Review the following code applying these coding standards:

${context}

---

## Code to Review:

\`\`\`
${code}
\`\`\`

Provide:
1. **Standards Compliance Assessment** - How well does the code follow the standards?
2. **Specific Issues Found** - List each issue with line references if possible
3. **Suggested Improvements** - Concrete changes to improve the code
4. **Overall Quality Score** - Rate from 1-10 with justification`,
            },
          },
        ],
      };
    }

    case 'refactor_suggestion': {
      const code = args?.code;
      if (!code) return null;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a senior software architect. Suggest refactoring for the following code based on these standards:

${context}

---

## Code to Refactor:

\`\`\`
${code}
\`\`\`

Provide:
1. **Current Issues** - What problems exist in the current code?
2. **Refactored Code** - The improved version applying the standards
3. **Changes Explained** - Why each change was made and which standard it addresses`,
            },
          },
        ],
      };
    }

    case 'architecture_check': {
      const description = args?.description;
      if (!description) return null;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a software architect expert in hexagonal architecture and DDD. Analyze the following code/structure against these architecture guidelines:

${context}

---

## Code/Structure to Analyze:

${description}

---

Provide:
1. **Architecture Compliance** - Does it follow the specified architecture pattern?
2. **Layer Dependency Violations** - Are there any forbidden dependencies between layers?
3. **DDD Pattern Assessment** - Are domain patterns used correctly?
4. **Recommendations** - Specific changes to improve architecture compliance`,
            },
          },
        ],
      };
    }

    case 'implement_feature': {
      const feature = args?.feature;
      if (!feature) return null;
      const additionalContext = args?.context || '';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a senior software engineer implementing a feature. Follow this STRUCTURED WORKFLOW strictly:

# Coding Standards & Best Practices
${context}

---

# DEVELOPMENT WORKFLOW

You MUST follow these phases in order:

## PHASE 1: CLARIFICACIÓN
Before writing any code, analyze the request and ASK if you detect:
- Ambiguous requirements
- Missing functional context
- Contradictory requirements
- Unclear acceptance criteria

If everything is clear, explicitly state your understanding of the requirements.

## PHASE 2: PLANIFICACIÓN
Create a detailed implementation plan:
1. List all requirements and constraints
2. Evaluate 2-3 alternative approaches (if applicable)
3. Create a task checklist with this format:
   [ ] Task 1 - Description
       [ ] 1.1 Write tests
       [ ] 1.2 Implement
   [ ] Task 2 - Description
   ...

## PHASE 3: IMPLEMENTACIÓN (TDD)
For EACH task, follow TDD strictly:
1. RED: Write a failing test first
2. GREEN: Write minimum code to pass
3. REFACTOR: Clean up while keeping tests green

Include:
- Unit tests (80%+ coverage)
- Integration tests (for critical flows)
- Architecture tests (if applicable)

## PHASE 4: VERIFICACIÓN
Ensure:
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linter passes
- [ ] Application starts correctly

## PHASE 5: REVISIÓN EXPERTA
Adopt the role of a Senior Expert (Architect/Backend Dev/etc.) and review:
1. CRITICAL issues (must fix)
2. RECOMMENDED improvements (should fix)
3. SUGGESTIONS (nice to have)

## PHASE 6: REFINAMIENTO
Apply improvements in up to 3 cycles:
- Cycle 1: Fix all CRITICAL issues
- Cycle 2: Apply RECOMMENDED improvements
- Cycle 3: Final polish

---

# FEATURE TO IMPLEMENT:
${feature}

${additionalContext ? `# ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

---

BEGIN with Phase 1 (Clarificación). If you have questions, ask them now. If requirements are clear, proceed to Phase 2.`,
            },
          },
        ],
      };
    }

    case 'expert_review': {
      const role = args?.role;
      const code = args?.code;
      if (!role || !code) return null;

      const roleDescriptions: Record<string, string> = {
        architect:
          'Software Architect with 15+ years of experience in distributed systems, hexagonal architecture, and DDD',
        backend:
          'Senior Backend Developer with 15+ years of experience in API design, performance optimization, and clean code',
        frontend:
          'Senior Frontend Developer with 15+ years of experience in UI/UX, component design, and state management',
        security:
          'Security Engineer with 15+ years of experience in application security, OWASP, and secure coding practices',
        performance: 'Performance Engineer with 15+ years of experience in optimization, profiling, and scalability',
        dba: 'Database Administrator with 15+ years of experience in query optimization, data modeling, and database design',
        devops: 'DevOps Engineer with 15+ years of experience in CI/CD, infrastructure as code, and cloud architecture',
      };

      const roleDesc = roleDescriptions[role.toLowerCase()] || `Senior ${role} Expert with 15+ years of experience`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# EXPERT REVIEW

You are a ${roleDesc}.

You are reviewing this code FROM SCRATCH, with NO knowledge of how it was implemented. Your goal is to find issues that the original developer might have missed.

## Coding Standards to Apply:
${context}

---

## Code to Review:
\`\`\`
${code}
\`\`\`

---

## Your Review Must Include:

### 1. CRITICAL ISSUES (Must be fixed)
Issues that could cause:
- Bugs or incorrect behavior
- Security vulnerabilities
- Architecture violations
- Severe performance problems
- Data loss or corruption

For each critical issue:
- Location (file/line if possible)
- Problem description
- Recommended fix

### 2. RECOMMENDED IMPROVEMENTS (Should be fixed)
- Code readability improvements
- Minor performance optimizations
- Missing best practices
- Documentation gaps
- Additional tests needed

### 3. SUGGESTIONS (Nice to have)
- Optional refactorings
- Alternative patterns to consider
- Future improvements

### 4. OVERALL ASSESSMENT
- Quality score (1-10)
- Summary of main concerns
- What was done well

Be thorough, critical, and specific. Do not assume the code is correct just because it exists.`,
            },
          },
        ],
      };
    }

    // ============================================================================
    // AGENT MODE PROMPTS
    // ============================================================================

    case 'agent_mode': {
      const task = args?.task;
      if (!task) return null;

      const projectDir = args?.project_dir;
      const profileOverride = args?.profile;

      // Classify task type
      const taskType = classifyTaskType(task);

      // Try to detect project stack and load config
      let detectedStack = null;
      let projectConfig = null;

      if (projectDir) {
        detectedStack = await detectProjectStack(projectDir);
        projectConfig = await loadProjectConfig(projectDir);
      }

      // Determine profile
      const finalProfileId =
        profileOverride || projectConfig?.profile || detectedStack?.suggestedProfile || profileId;

      const finalProfile = await getProfile(finalProfileId);
      if (!finalProfile) return null;

      // Get guardrails and rules
      const guardrails = getGuardrails(taskType, projectConfig);
      const projectRules = getProjectRules(taskType, projectConfig);

      // Build comprehensive agent context
      const agentContext: string[] = [
        '# CORBAT AGENT MODE',
        '',
        '> You are operating in AGENT MODE with full coding standards context.',
        '> Follow ALL guidelines below strictly. This ensures consistent, high-quality code.',
        '',
        '---',
        '',
        '## TASK ANALYSIS',
        '',
        `**Task:** ${task}`,
        `**Classified as:** ${taskType.toUpperCase()}`,
        `**Active Profile:** ${finalProfileId}`,
        '',
      ];

      // Add detected stack
      if (detectedStack) {
        agentContext.push('## DETECTED PROJECT STACK', '');
        agentContext.push(`| Property | Value |`);
        agentContext.push(`|----------|-------|`);
        agentContext.push(`| Language | ${detectedStack.language} |`);
        agentContext.push(`| Framework | ${detectedStack.framework || 'N/A'} |`);
        agentContext.push(`| Build Tool | ${detectedStack.buildTool || 'N/A'} |`);
        agentContext.push(`| Test Framework | ${detectedStack.testFramework || 'N/A'} |`);
        agentContext.push('');
      }

      // Add guardrails - CRITICAL
      agentContext.push('---', '');
      agentContext.push('## GUARDRAILS (Non-negotiable)', '');
      agentContext.push(formatGuardrailsAsMarkdown(guardrails));
      agentContext.push('');

      // Add project-specific rules
      if (projectRules.length > 0) {
        agentContext.push('---', '', '## PROJECT-SPECIFIC RULES', '');
        for (const rule of projectRules) {
          agentContext.push(`- 📌 ${rule}`);
        }
        agentContext.push('');
      }

      // Add full profile
      agentContext.push('---', '');
      agentContext.push(formatProfileAsMarkdown(finalProfileId, finalProfile));

      // Add selected standards
      agentContext.push('---', '', '## RELEVANT STANDARDS', '');
      for (const standard of standards.slice(0, 3)) {
        agentContext.push(`### ${standard.name}`, '');
        const truncated = standard.content.length > 1500
          ? standard.content.slice(0, 1500) + '\n\n...(see full doc with search_standards)'
          : standard.content;
        agentContext.push(truncated, '');
      }

      // Add workflow
      agentContext.push('---', '', '## MANDATORY WORKFLOW', '');
      agentContext.push(`
You MUST follow this workflow:

### PHASE 1: CLARIFY
- Analyze the task for ambiguities
- ASK questions if requirements are unclear
- Confirm understanding before proceeding

### PHASE 2: PLAN
- List all requirements
- Create task checklist:
  \`\`\`
  [ ] 1. Task - Description
      [ ] 1.1 Write tests
      [ ] 1.2 Implement
  \`\`\`

### PHASE 3: BUILD (TDD)
For EACH task:
1. 🔴 RED: Write failing test first
2. 🟢 GREEN: Implement minimum to pass
3. 🔵 REFACTOR: Clean up, tests stay green

### PHASE 4: VERIFY
- [ ] Code compiles
- [ ] All tests pass
- [ ] Linter passes
- [ ] No regressions

### PHASE 5: SELF-REVIEW
Adopt expert role and find:
- CRITICAL issues (must fix)
- RECOMMENDED improvements
- SUGGESTIONS

### PHASE 6: REFINE
Fix issues in up to 3 cycles until quality criteria met.
`);

      agentContext.push('---', '', '## BEGIN IMPLEMENTATION', '');
      agentContext.push(`Start with Phase 1 (CLARIFY). If requirements are clear, proceed to Phase 2 (PLAN).`);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: agentContext.join('\n'),
            },
          },
        ],
      };
    }

    case 'quick_implement': {
      const task = args?.task;
      if (!task) return null;

      const taskType = classifyTaskType(task);
      const guardrails = getGuardrails(taskType, null);

      const quickContext = `# QUICK IMPLEMENTATION MODE

## Task
${task}

## Task Type: ${taskType.toUpperCase()}

## Essential Guardrails

### MUST DO:
${guardrails.mandatory.slice(0, 4).map((r) => `- ✅ ${r}`).join('\n')}

### MUST AVOID:
${guardrails.avoid.slice(0, 4).map((r) => `- ❌ ${r}`).join('\n')}

## Profile Standards
${context}

---

## Quick Workflow

1. **Understand** - Clarify if needed
2. **Plan** - Brief task list
3. **Implement** - With tests (TDD preferred)
4. **Verify** - Tests pass, linter clean
5. **Review** - Quick self-check

Begin implementation. Ask questions if requirements are unclear.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: quickContext,
            },
          },
        ],
      };
    }

    default:
      return null;
  }
}
