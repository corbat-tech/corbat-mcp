import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type DetectedStack,
  type Guardrails,
  type ProjectConfig,
  ProjectConfigSchema,
  type TaskType,
} from './types.js';

/**
 * Default guardrails by task type.
 */
const DEFAULT_GUARDRAILS: Record<TaskType, Guardrails> = {
  feature: {
    taskType: 'feature',
    mandatory: [
      'Follow TDD: write tests before implementation',
      'Ensure 80%+ unit test coverage for new code',
      'Apply SOLID principles',
      'Follow project naming conventions',
      'Document public APIs',
      'Validate inputs at boundaries',
    ],
    recommended: [
      'Keep methods under 20 lines',
      'Keep classes under 200 lines',
      'Use dependency injection',
      'Apply single responsibility principle',
      'Write integration tests for critical paths',
    ],
    avoid: [
      'God classes or methods',
      'Hard-coded configuration',
      'Mixing business logic with infrastructure',
      'Circular dependencies',
      'Over-engineering for hypothetical futures',
    ],
  },
  bugfix: {
    taskType: 'bugfix',
    mandatory: [
      'First write a failing test that reproduces the bug',
      'Make the minimum change necessary to fix',
      'Verify fix does not break existing tests',
      'Document root cause in commit message',
    ],
    recommended: [
      'Add regression test if not already covered',
      'Consider if bug exists elsewhere (same pattern)',
      'Update documentation if behavior changed',
    ],
    avoid: [
      'Refactoring unrelated code',
      'Adding features while fixing bugs',
      'Changing APIs without necessity',
      'Fixing symptoms instead of root cause',
    ],
  },
  refactor: {
    taskType: 'refactor',
    mandatory: [
      'All existing tests must pass before AND after',
      'No behavior changes (only structure)',
      'Commit in small, reviewable increments',
      'Extract one concept at a time',
    ],
    recommended: [
      'Increase test coverage if below threshold',
      'Apply design patterns where appropriate',
      'Improve naming and readability',
      'Remove dead code',
    ],
    avoid: [
      'Changing behavior during refactor',
      'Big bang refactoring',
      'Refactoring without tests',
      'Premature abstraction',
    ],
  },
  test: {
    taskType: 'test',
    mandatory: [
      'Follow Arrange-Act-Assert pattern',
      'One logical assertion per test',
      'Test names describe behavior (should_X_when_Y)',
      'Tests must be independent and repeatable',
    ],
    recommended: [
      'Use test fixtures for complex setup',
      'Mock external dependencies',
      'Test edge cases and error conditions',
      'Use parameterized tests for variations',
    ],
    avoid: [
      'Testing implementation details',
      'Flaky tests',
      'Tests that depend on order',
      'Assertions without clear purpose',
    ],
  },
  documentation: {
    taskType: 'documentation',
    mandatory: [
      'Use clear, concise language',
      'Include code examples where applicable',
      'Keep documentation close to code',
      'Document the WHY, not just the WHAT',
    ],
    recommended: [
      'Use consistent formatting',
      'Include diagrams for complex flows',
      'Document assumptions and constraints',
      'Keep README updated',
    ],
    avoid: [
      'Outdated documentation',
      'Duplicating code in comments',
      'Over-documenting obvious code',
      'Documentation without context',
    ],
  },
  performance: {
    taskType: 'performance',
    mandatory: [
      'Measure before optimizing (baseline metrics)',
      'Profile to identify actual bottlenecks',
      'Document performance requirements',
      'Add performance tests/benchmarks',
    ],
    recommended: [
      'Consider caching strategies',
      'Optimize database queries',
      'Use async/non-blocking where appropriate',
      'Consider lazy loading',
    ],
    avoid: [
      'Premature optimization',
      'Optimizing without measurements',
      'Sacrificing readability without significant gain',
      'Micro-optimizations in non-critical paths',
    ],
  },
  security: {
    taskType: 'security',
    mandatory: [
      'Validate ALL user inputs',
      'Use parameterized queries (prevent SQL injection)',
      'Escape output (prevent XSS)',
      'Apply principle of least privilege',
      'Never log sensitive data',
    ],
    recommended: [
      'Use established security libraries',
      'Implement rate limiting',
      'Add security headers',
      'Use HTTPS everywhere',
      'Implement proper authentication/authorization',
    ],
    avoid: [
      'Rolling your own crypto',
      'Hardcoded secrets',
      'Trusting client-side validation alone',
      'Exposing stack traces to users',
      'Using deprecated crypto algorithms',
    ],
  },
  infrastructure: {
    taskType: 'infrastructure',
    mandatory: [
      'Infrastructure as Code (no manual changes)',
      'Version control all configurations',
      'Test in staging before production',
      'Document deployment procedures',
    ],
    recommended: [
      'Use immutable infrastructure',
      'Implement health checks',
      'Set up proper monitoring/alerting',
      'Plan for rollback',
    ],
    avoid: [
      'Manual server configuration',
      'Snowflake servers',
      'Deploying directly to production',
      'Ignoring resource limits',
    ],
  },
};

/**
 * Stack detection patterns.
 */
interface StackPattern {
  files: string[];
  language: string;
  framework?: string;
  buildTool?: string;
  testFramework?: string;
  profile: string;
  confidence: 'high' | 'medium' | 'low';
}

const STACK_PATTERNS: StackPattern[] = [
  // Java Spring
  {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    language: 'Java',
    framework: 'Spring Boot',
    buildTool: 'Maven/Gradle',
    testFramework: 'JUnit5',
    profile: 'java-spring-backend',
    confidence: 'high',
  },
  // Node.js/TypeScript
  {
    files: ['package.json', 'tsconfig.json'],
    language: 'TypeScript',
    framework: 'Node.js',
    buildTool: 'npm/pnpm',
    testFramework: 'Vitest/Jest',
    profile: 'nodejs',
    confidence: 'high',
  },
  // Python
  {
    files: ['pyproject.toml', 'requirements.txt', 'setup.py'],
    language: 'Python',
    framework: 'FastAPI/Django',
    buildTool: 'pip/poetry',
    testFramework: 'pytest',
    profile: 'python',
    confidence: 'high',
  },
  // Frontend React/Vue
  {
    files: ['package.json', 'vite.config.ts', 'vite.config.js'],
    language: 'TypeScript',
    framework: 'React/Vue',
    buildTool: 'Vite',
    testFramework: 'Vitest',
    profile: 'frontend',
    confidence: 'medium',
  },
  // Generic JavaScript
  {
    files: ['package.json'],
    language: 'JavaScript',
    buildTool: 'npm',
    profile: 'nodejs',
    confidence: 'low',
  },
];

/**
 * Load project configuration from .corbat.json
 */
export async function loadProjectConfig(projectDir: string): Promise<ProjectConfig | null> {
  const configPath = join(projectDir, '.corbat.json');

  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    const rawConfig = JSON.parse(content);
    return ProjectConfigSchema.parse(rawConfig);
  } catch {
    return null;
  }
}

/**
 * Detect project stack from file system.
 */
export async function detectProjectStack(projectDir: string): Promise<DetectedStack | null> {
  const detectedFiles: string[] = [];

  for (const pattern of STACK_PATTERNS) {
    for (const file of pattern.files) {
      const filePath = join(projectDir, file);
      try {
        await access(filePath);
        detectedFiles.push(file);
      } catch {
        // File doesn't exist, continue
      }
    }

    if (detectedFiles.length > 0) {
      // Additional detection for more specific frameworks
      let framework = pattern.framework;
      let testFramework = pattern.testFramework;

      // Check for specific framework indicators
      if (detectedFiles.includes('package.json')) {
        try {
          const packageJson = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

          if (deps.react) framework = 'React';
          else if (deps.vue) framework = 'Vue';
          else if (deps.angular) framework = 'Angular';
          else if (deps.express) framework = 'Express';
          else if (deps.fastify) framework = 'Fastify';
          else if (deps.nestjs || deps['@nestjs/core']) framework = 'NestJS';

          if (deps.vitest) testFramework = 'Vitest';
          else if (deps.jest) testFramework = 'Jest';
          else if (deps.mocha) testFramework = 'Mocha';
        } catch {
          // Unable to parse package.json
        }
      }

      // Check for Spring Boot specific indicators
      if (detectedFiles.includes('pom.xml')) {
        try {
          const pomContent = await readFile(join(projectDir, 'pom.xml'), 'utf-8');
          if (pomContent.includes('spring-boot')) {
            framework = 'Spring Boot';
          }
        } catch {
          // Unable to read pom.xml
        }
      }

      return {
        language: pattern.language,
        framework,
        buildTool: pattern.buildTool,
        testFramework,
        suggestedProfile: pattern.profile,
        confidence: pattern.confidence,
        detectedFiles,
      };
    }
  }

  return null;
}

/**
 * Get guardrails for a specific task type.
 */
export function getGuardrails(taskType: TaskType, projectConfig?: ProjectConfig | null): Guardrails {
  // Start with defaults
  const guardrails = { ...DEFAULT_GUARDRAILS[taskType] };

  // Override with project-specific guardrails if available
  if (projectConfig?.guardrails?.[taskType]) {
    const projectGuardrails = projectConfig.guardrails[taskType];
    guardrails.mandatory = [...guardrails.mandatory, ...projectGuardrails.mandatory];
    guardrails.recommended = [...guardrails.recommended, ...projectGuardrails.recommended];
    guardrails.avoid = [...guardrails.avoid, ...projectGuardrails.avoid];
  }

  return guardrails;
}

/**
 * Get project rules (always rules + task-specific rules).
 */
export function getProjectRules(taskType: TaskType, projectConfig?: ProjectConfig | null): string[] {
  if (!projectConfig?.rules) return [];

  const rules: string[] = [...(projectConfig.rules.always || [])];

  switch (taskType) {
    case 'feature':
      rules.push(...(projectConfig.rules.onNewFile || []));
      break;
    case 'test':
      rules.push(...(projectConfig.rules.onTest || []));
      break;
    case 'refactor':
      rules.push(...(projectConfig.rules.onRefactor || []));
      break;
  }

  return rules;
}

/**
 * Classify task type from description.
 */
export function classifyTaskType(description: string): TaskType {
  const desc = description.toLowerCase();

  // Bug/fix patterns
  if (
    desc.includes('fix') ||
    desc.includes('bug') ||
    desc.includes('error') ||
    desc.includes('issue') ||
    desc.includes('problem') ||
    desc.includes('broken')
  ) {
    return 'bugfix';
  }

  // Refactor patterns
  if (
    desc.includes('refactor') ||
    desc.includes('cleanup') ||
    desc.includes('clean up') ||
    desc.includes('reorganize') ||
    desc.includes('restructure') ||
    desc.includes('improve structure')
  ) {
    return 'refactor';
  }

  // Test patterns
  if (
    desc.includes('test') ||
    desc.includes('spec') ||
    desc.includes('coverage') ||
    desc.includes('unit test') ||
    desc.includes('integration test')
  ) {
    return 'test';
  }

  // Documentation patterns
  if (
    desc.includes('document') ||
    desc.includes('readme') ||
    desc.includes('comment') ||
    desc.includes('jsdoc') ||
    desc.includes('javadoc')
  ) {
    return 'documentation';
  }

  // Performance patterns
  if (
    desc.includes('performance') ||
    desc.includes('optimize') ||
    desc.includes('speed') ||
    desc.includes('slow') ||
    desc.includes('memory') ||
    desc.includes('cache')
  ) {
    return 'performance';
  }

  // Security patterns
  if (
    desc.includes('security') ||
    desc.includes('auth') ||
    desc.includes('permission') ||
    desc.includes('vulnerability') ||
    desc.includes('secure') ||
    desc.includes('encrypt')
  ) {
    return 'security';
  }

  // Infrastructure patterns
  if (
    desc.includes('deploy') ||
    desc.includes('docker') ||
    desc.includes('kubernetes') ||
    desc.includes('ci/cd') ||
    desc.includes('pipeline') ||
    desc.includes('infrastructure')
  ) {
    return 'infrastructure';
  }

  // Default to feature
  return 'feature';
}

/**
 * Technical decision templates by category.
 */
export const TECHNICAL_DECISIONS: Record<
  string,
  {
    options: Array<{
      name: string;
      description: string;
      pros: string[];
      cons: string[];
      useWhen: string[];
    }>;
    defaultRecommendation: string;
  }
> = {
  database: {
    options: [
      {
        name: 'PostgreSQL',
        description: 'Advanced open-source relational database',
        pros: ['ACID compliant', 'Rich feature set', 'Excellent JSON support', 'Strong community'],
        cons: ['More complex setup', 'Higher resource usage'],
        useWhen: ['Complex queries needed', 'Data integrity critical', 'JSON flexibility needed'],
      },
      {
        name: 'MySQL',
        description: 'Popular open-source relational database',
        pros: ['Simple to use', 'Wide adoption', 'Good performance for reads'],
        cons: ['Less advanced features', 'Replication complexity'],
        useWhen: ['Simple CRUD operations', 'Read-heavy workloads', 'Team familiarity'],
      },
      {
        name: 'MongoDB',
        description: 'Document-oriented NoSQL database',
        pros: ['Flexible schema', 'Horizontal scaling', 'Developer friendly'],
        cons: ['No ACID by default', 'Memory intensive', 'Complex aggregations'],
        useWhen: ['Schema evolution expected', 'Document-oriented data', 'Rapid prototyping'],
      },
    ],
    defaultRecommendation: 'PostgreSQL',
  },
  cache: {
    options: [
      {
        name: 'Redis',
        description: 'In-memory data structure store',
        pros: ['Very fast', 'Rich data structures', 'Pub/sub support', 'Persistence options'],
        cons: ['Memory bound', 'Single-threaded'],
        useWhen: ['High-performance caching', 'Session storage', 'Real-time features'],
      },
      {
        name: 'In-memory (local)',
        description: 'Application-level caching',
        pros: ['No external dependency', 'Fastest access', 'Simple setup'],
        cons: ['Not shared across instances', 'Limited by heap size', 'Lost on restart'],
        useWhen: ['Single instance deployment', 'Small cache size', 'Local reference data'],
      },
      {
        name: 'Memcached',
        description: 'Distributed memory caching',
        pros: ['Simple', 'Multi-threaded', 'Predictable performance'],
        cons: ['Limited data types', 'No persistence', 'No pub/sub'],
        useWhen: ['Simple key-value caching', 'Multiple servers', 'Volatile data only'],
      },
    ],
    defaultRecommendation: 'Redis',
  },
  messaging: {
    options: [
      {
        name: 'Apache Kafka',
        description: 'Distributed streaming platform',
        pros: ['High throughput', 'Durable', 'Replay capability', 'Strong ordering'],
        cons: ['Complex setup', 'Higher latency', 'Operational overhead'],
        useWhen: ['Event sourcing', 'High volume', 'Data pipeline', 'Audit requirements'],
      },
      {
        name: 'RabbitMQ',
        description: 'Message broker with routing',
        pros: ['Flexible routing', 'Lower latency', 'Easier setup', 'Good for RPC'],
        cons: ['Lower throughput', 'Less durable by default'],
        useWhen: ['Complex routing', 'Request-reply patterns', 'Lower volume'],
      },
      {
        name: 'AWS SQS',
        description: 'Managed message queue service',
        pros: ['Fully managed', 'Highly available', 'Pay per use', 'Simple'],
        cons: ['AWS lock-in', 'Limited features', 'Higher latency'],
        useWhen: ['AWS infrastructure', 'Simple queuing', 'Minimal ops'],
      },
    ],
    defaultRecommendation: 'Apache Kafka',
  },
  authentication: {
    options: [
      {
        name: 'JWT (JSON Web Tokens)',
        description: 'Stateless token-based authentication',
        pros: ['Stateless', 'Scalable', 'Cross-domain support', 'Self-contained'],
        cons: ['Cannot revoke easily', 'Token size', 'Key management'],
        useWhen: ['Microservices', 'API authentication', 'Cross-domain auth'],
      },
      {
        name: 'Session-based',
        description: 'Server-side session storage',
        pros: ['Easy revocation', 'Simple implementation', 'Smaller payload'],
        cons: ['Server state', 'Scaling challenges', 'CSRF concerns'],
        useWhen: ['Monolithic apps', 'Web applications', 'High security needs'],
      },
      {
        name: 'OAuth 2.0 / OIDC',
        description: 'Delegated authorization protocol',
        pros: ['Standard protocol', 'Third-party auth', 'Fine-grained scopes'],
        cons: ['Complex implementation', 'Multiple flows'],
        useWhen: ['Third-party integration', 'SSO requirements', 'API access delegation'],
      },
    ],
    defaultRecommendation: 'JWT (JSON Web Tokens)',
  },
  testing: {
    options: [
      {
        name: 'Unit + Integration + E2E',
        description: 'Full testing pyramid',
        pros: ['Comprehensive coverage', 'Fast feedback', 'Confidence in changes'],
        cons: ['Time investment', 'Maintenance overhead'],
        useWhen: ['Production systems', 'Team projects', 'Critical business logic'],
      },
      {
        name: 'Unit + Integration only',
        description: 'Focus on unit and integration tests',
        pros: ['Good balance', 'Faster execution', 'Less flaky'],
        cons: ['May miss UI issues', 'Less end-to-end confidence'],
        useWhen: ['API services', 'Libraries', 'Time constraints'],
      },
      {
        name: 'TDD (Test-Driven Development)',
        description: 'Write tests before implementation',
        pros: ['Better design', 'High coverage', 'Living documentation'],
        cons: ['Learning curve', 'Initial slowdown'],
        useWhen: ['Complex business logic', 'Quality-critical code', 'New features'],
      },
    ],
    defaultRecommendation: 'Unit + Integration + E2E',
  },
};

/**
 * Get a technical decision recommendation.
 */
export function getTechnicalDecision(
  category: string,
  context: string,
  projectConfig?: ProjectConfig | null
): {
  options: Array<{
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    useWhen: string[];
  }>;
  recommendation: string;
  reasoning: string;
} | null {
  const decision = TECHNICAL_DECISIONS[category];
  if (!decision) return null;

  // Check if project has a predefined decision
  const predefinedDecision = projectConfig?.decisions?.[category];
  if (predefinedDecision) {
    const option = decision.options.find(
      (o) => o.name.toLowerCase() === predefinedDecision.toLowerCase()
    );
    if (option) {
      return {
        options: decision.options,
        recommendation: option.name,
        reasoning: `Project configuration specifies ${option.name} for ${category}. This aligns with the team's architectural decisions.`,
      };
    }
  }

  return {
    options: decision.options,
    recommendation: decision.defaultRecommendation,
    reasoning: `${decision.defaultRecommendation} is recommended as the default choice for ${category} based on industry best practices and versatility.`,
  };
}

/**
 * Format guardrails as markdown.
 */
export function formatGuardrailsAsMarkdown(guardrails: Guardrails): string {
  const lines: string[] = [
    `# Guardrails for ${guardrails.taskType.toUpperCase()} task`,
    '',
    '## MANDATORY (must follow)',
    '',
  ];

  for (const rule of guardrails.mandatory) {
    lines.push(`- ✅ ${rule}`);
  }

  lines.push('', '## RECOMMENDED (should follow)', '');

  for (const rule of guardrails.recommended) {
    lines.push(`- 💡 ${rule}`);
  }

  lines.push('', '## AVOID (do not do)', '');

  for (const rule of guardrails.avoid) {
    lines.push(`- ❌ ${rule}`);
  }

  return lines.join('\n');
}
