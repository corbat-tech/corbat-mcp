import { config } from './config.js';
import { formatProfileAsMarkdown, getProfile, loadStandards } from './profiles.js';

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

    default:
      return null;
  }
}
