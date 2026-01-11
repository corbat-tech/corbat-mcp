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

    default:
      return null;
  }
}
