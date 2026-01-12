#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const c = colors;

interface ProjectInfo {
  language: string;
  framework?: string;
  buildTool?: string;
  javaVersion?: string;
  springVersion?: string;
  nodeVersion?: string;
  pythonVersion?: string;
  testFramework?: string;
  hasDocker?: boolean;
  hasKubernetes?: boolean;
  hasCICD?: boolean;
}

interface ProfileConfig {
  name: string;
  description: string;
  architecture: {
    type: string;
    enforceLayerDependencies: boolean;
  };
  ddd: {
    enabled: boolean;
    ubiquitousLanguageEnforced: boolean;
  };
  cqrs: {
    enabled: boolean;
    separation: string;
  };
  eventDriven: {
    enabled: boolean;
    approach: string;
  };
  codeQuality: {
    maxMethodLines: number;
    maxClassLines: number;
    maxFileLines: number;
    maxMethodParameters: number;
    minimumTestCoverage: number;
  };
  testing: {
    framework: string;
    assertionLibrary: string;
    mockingLibrary: string;
  };
  technologies: Array<{ name: string; version?: string }>;
}

class CorbatInit {
  private rl: ReturnType<typeof createInterface>;
  private projectDir: string;
  private detectedInfo: ProjectInfo = { language: 'unknown' };

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.projectDir = process.cwd();
  }

  private print(text: string): void {
    console.log(text);
  }

  private async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async select(prompt: string, options: string[], defaultIndex = 0): Promise<string> {
    this.print(`\n${c.cyan}${prompt}${c.reset}`);
    options.forEach((opt, i) => {
      const marker = i === defaultIndex ? `${c.green}→${c.reset}` : ' ';
      const highlight = i === defaultIndex ? c.bright : c.dim;
      this.print(`  ${marker} ${highlight}${i + 1}) ${opt}${c.reset}`);
    });

    const answer = await this.question(`\n${c.yellow}Enter number [${defaultIndex + 1}]: ${c.reset}`);
    const index = answer ? parseInt(answer, 10) - 1 : defaultIndex;

    if (index >= 0 && index < options.length) {
      return options[index];
    }
    return options[defaultIndex];
  }

  private async confirm(prompt: string, defaultYes = true): Promise<boolean> {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await this.question(`${c.cyan}${prompt}${c.reset} ${c.dim}${hint}${c.reset} `);

    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
  }

  private async input(prompt: string, defaultValue?: string): Promise<string> {
    const hint = defaultValue ? ` ${c.dim}[${defaultValue}]${c.reset}` : '';
    const answer = await this.question(`${c.cyan}${prompt}${c.reset}${hint}: `);
    return answer || defaultValue || '';
  }

  private async detectProject(): Promise<void> {
    this.print(`\n${c.blue}🔍 Scanning project...${c.reset}\n`);

    // Check for Java/Maven/Gradle
    try {
      await access(join(this.projectDir, 'pom.xml'));
      this.detectedInfo.language = 'Java';
      this.detectedInfo.buildTool = 'Maven';

      const pomContent = await readFile(join(this.projectDir, 'pom.xml'), 'utf-8');

      // Detect Java version
      const javaMatch = pomContent.match(/<java\.version>(\d+)<\/java\.version>/);
      if (javaMatch) this.detectedInfo.javaVersion = javaMatch[1];

      // Detect Spring Boot version
      const springMatch = pomContent.match(/<version>(\d+\.\d+\.\d+)<\/version>[\s\S]*?spring-boot/i);
      const springParentMatch = pomContent.match(/spring-boot-starter-parent[\s\S]*?<version>(\d+\.\d+\.\d+)/);
      if (springParentMatch) {
        this.detectedInfo.framework = 'Spring Boot';
        this.detectedInfo.springVersion = springParentMatch[1];
      } else if (springMatch) {
        this.detectedInfo.framework = 'Spring Boot';
        this.detectedInfo.springVersion = springMatch[1];
      }

      this.detectedInfo.testFramework = 'JUnit5';
    } catch {
      // Not Maven
    }

    try {
      await access(join(this.projectDir, 'build.gradle'));
      this.detectedInfo.language = 'Java';
      this.detectedInfo.buildTool = 'Gradle';

      const gradleContent = await readFile(join(this.projectDir, 'build.gradle'), 'utf-8');

      const javaMatch = gradleContent.match(/sourceCompatibility\s*=\s*['"]?(\d+)/);
      if (javaMatch) this.detectedInfo.javaVersion = javaMatch[1];

      if (gradleContent.includes('spring-boot')) {
        this.detectedInfo.framework = 'Spring Boot';
        const springMatch = gradleContent.match(/springBootVersion\s*=\s*['"](\d+\.\d+\.\d+)/);
        if (springMatch) this.detectedInfo.springVersion = springMatch[1];
      }

      this.detectedInfo.testFramework = 'JUnit5';
    } catch {
      // Not Gradle
    }

    // Check for Node.js/TypeScript
    try {
      await access(join(this.projectDir, 'package.json'));
      const pkgContent = await readFile(join(this.projectDir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);

      if (this.detectedInfo.language === 'unknown') {
        this.detectedInfo.language = pkg.devDependencies?.typescript ? 'TypeScript' : 'JavaScript';
        this.detectedInfo.buildTool = 'npm';
      }

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.react) this.detectedInfo.framework = 'React';
      else if (deps.vue) this.detectedInfo.framework = 'Vue';
      else if (deps['@nestjs/core']) this.detectedInfo.framework = 'NestJS';
      else if (deps.express) this.detectedInfo.framework = 'Express';
      else if (deps.fastify) this.detectedInfo.framework = 'Fastify';

      if (deps.vitest) this.detectedInfo.testFramework = 'Vitest';
      else if (deps.jest) this.detectedInfo.testFramework = 'Jest';
      else if (deps.mocha) this.detectedInfo.testFramework = 'Mocha';

      if (pkg.engines?.node) {
        this.detectedInfo.nodeVersion = pkg.engines.node.replace(/[^\d.]/g, '');
      }
    } catch {
      // Not Node.js
    }

    // Check for Python
    try {
      await access(join(this.projectDir, 'pyproject.toml'));
      this.detectedInfo.language = 'Python';
      this.detectedInfo.buildTool = 'Poetry';

      const pyContent = await readFile(join(this.projectDir, 'pyproject.toml'), 'utf-8');

      if (pyContent.includes('fastapi')) this.detectedInfo.framework = 'FastAPI';
      else if (pyContent.includes('django')) this.detectedInfo.framework = 'Django';
      else if (pyContent.includes('flask')) this.detectedInfo.framework = 'Flask';

      const pythonMatch = pyContent.match(/python\s*=\s*["'][\^~]?(\d+\.\d+)/);
      if (pythonMatch) this.detectedInfo.pythonVersion = pythonMatch[1];

      this.detectedInfo.testFramework = 'pytest';
    } catch {
      // Not Python with pyproject.toml
    }

    try {
      await access(join(this.projectDir, 'requirements.txt'));
      if (this.detectedInfo.language === 'unknown') {
        this.detectedInfo.language = 'Python';
        this.detectedInfo.buildTool = 'pip';
        this.detectedInfo.testFramework = 'pytest';
      }
    } catch {
      // No requirements.txt
    }

    // Check for Docker/K8s
    try {
      await access(join(this.projectDir, 'Dockerfile'));
      this.detectedInfo.hasDocker = true;
    } catch {
      this.detectedInfo.hasDocker = false;
    }

    try {
      const files = await readdir(this.projectDir);
      this.detectedInfo.hasKubernetes = files.some(
        (f) => f.includes('k8s') || f.includes('kubernetes') || f.endsWith('.yaml')
      );
    } catch {
      this.detectedInfo.hasKubernetes = false;
    }

    // Check for CI/CD
    try {
      await access(join(this.projectDir, '.github/workflows'));
      this.detectedInfo.hasCICD = true;
    } catch {
      try {
        await access(join(this.projectDir, '.gitlab-ci.yml'));
        this.detectedInfo.hasCICD = true;
      } catch {
        this.detectedInfo.hasCICD = false;
      }
    }
  }

  private printDetectedInfo(): void {
    const info = this.detectedInfo;

    this.print(`${c.green}✓ Detected configuration:${c.reset}\n`);
    this.print(`  ${c.bright}Language:${c.reset}      ${info.language}`);

    if (info.framework) {
      this.print(`  ${c.bright}Framework:${c.reset}     ${info.framework}${info.springVersion ? ` ${info.springVersion}` : ''}`);
    }

    if (info.buildTool) {
      this.print(`  ${c.bright}Build Tool:${c.reset}    ${info.buildTool}`);
    }

    if (info.javaVersion) {
      this.print(`  ${c.bright}Java Version:${c.reset}  ${info.javaVersion}`);
    }

    if (info.nodeVersion) {
      this.print(`  ${c.bright}Node Version:${c.reset}  ${info.nodeVersion}`);
    }

    if (info.pythonVersion) {
      this.print(`  ${c.bright}Python:${c.reset}        ${info.pythonVersion}`);
    }

    if (info.testFramework) {
      this.print(`  ${c.bright}Tests:${c.reset}         ${info.testFramework}`);
    }

    if (info.hasDocker) {
      this.print(`  ${c.bright}Docker:${c.reset}        Yes`);
    }

    if (info.hasCICD) {
      this.print(`  ${c.bright}CI/CD:${c.reset}         Yes`);
    }

    this.print('');
  }

  private async runWizard(): Promise<ProfileConfig> {
    const info = this.detectedInfo;

    // Profile name
    const defaultName = info.framework
      ? `${info.framework.toLowerCase().replace(/\s+/g, '-')}-project`
      : `${info.language.toLowerCase()}-project`;

    const name = await this.input('Profile name', defaultName);
    const description = await this.input('Description', `${info.framework || info.language} project standards`);

    // Architecture
    this.print(`\n${c.magenta}━━━ Architecture ━━━${c.reset}`);

    const archType = await this.select('Architecture pattern:', [
      'hexagonal (Ports & Adapters)',
      'clean (Clean Architecture)',
      'layered (Traditional N-Tier)',
      'modular-monolith',
      'microservices',
    ], 0);

    const enforceLayerDeps = await this.confirm('Enforce layer dependencies?', true);

    // DDD
    this.print(`\n${c.magenta}━━━ Domain-Driven Design ━━━${c.reset}`);

    const dddEnabled = await this.confirm('Enable DDD patterns?', true);
    const ubiquitousLanguage = dddEnabled ? await this.confirm('Enforce ubiquitous language?', true) : false;

    // CQRS
    this.print(`\n${c.magenta}━━━ CQRS ━━━${c.reset}`);

    const cqrsEnabled = await this.confirm('Enable CQRS?', info.framework === 'Spring Boot');
    const cqrsSeparation = cqrsEnabled
      ? await this.select('CQRS separation:', ['logical', 'physical'], 0)
      : 'logical';

    // Event-Driven
    this.print(`\n${c.magenta}━━━ Event-Driven Architecture ━━━${c.reset}`);

    const eventDrivenEnabled = await this.confirm('Enable event-driven patterns?', info.framework === 'Spring Boot');
    const eventApproach = eventDrivenEnabled
      ? await this.select('Event approach:', ['domain-events', 'event-sourcing'], 0)
      : 'domain-events';

    // Code Quality
    this.print(`\n${c.magenta}━━━ Code Quality Thresholds ━━━${c.reset}`);

    const maxMethodLinesStr = await this.input('Max lines per method', '20');
    const maxClassLinesStr = await this.input('Max lines per class', '200');
    const maxFileLinesStr = await this.input('Max lines per file', '400');
    const maxParamsStr = await this.input('Max method parameters', '4');
    const minCoverageStr = await this.input('Minimum test coverage %', '80');

    // Testing
    this.print(`\n${c.magenta}━━━ Testing ━━━${c.reset}`);

    let testFramework = info.testFramework || 'JUnit5';
    let assertionLib = 'AssertJ';
    let mockingLib = 'Mockito';

    if (info.language === 'Java') {
      testFramework = await this.select('Test framework:', ['JUnit5', 'JUnit4', 'TestNG'], 0);
      assertionLib = await this.select('Assertion library:', ['AssertJ', 'Hamcrest', 'JUnit assertions'], 0);
      mockingLib = await this.select('Mocking library:', ['Mockito', 'EasyMock', 'JMockit'], 0);
    } else if (info.language === 'TypeScript' || info.language === 'JavaScript') {
      testFramework = await this.select('Test framework:', ['Vitest', 'Jest', 'Mocha'], info.testFramework === 'Vitest' ? 0 : 1);
      assertionLib = testFramework === 'Vitest' ? 'Vitest' : 'Jest';
      mockingLib = testFramework === 'Vitest' ? 'Vitest' : 'Jest';
    } else if (info.language === 'Python') {
      testFramework = await this.select('Test framework:', ['pytest', 'unittest'], 0);
      assertionLib = 'pytest';
      mockingLib = 'pytest-mock';
    }

    // Technologies
    const technologies: Array<{ name: string; version?: string }> = [];

    if (info.language === 'Java' && info.javaVersion) {
      technologies.push({ name: 'Java', version: info.javaVersion });
    }

    if (info.framework) {
      technologies.push({
        name: info.framework,
        version: info.springVersion || undefined,
      });
    }

    if (info.buildTool) {
      technologies.push({ name: info.buildTool });
    }

    return {
      name,
      description,
      architecture: {
        type: archType.split(' ')[0],
        enforceLayerDependencies: enforceLayerDeps,
      },
      ddd: {
        enabled: dddEnabled,
        ubiquitousLanguageEnforced: ubiquitousLanguage,
      },
      cqrs: {
        enabled: cqrsEnabled,
        separation: cqrsSeparation,
      },
      eventDriven: {
        enabled: eventDrivenEnabled,
        approach: eventApproach,
      },
      codeQuality: {
        maxMethodLines: parseInt(maxMethodLinesStr, 10) || 20,
        maxClassLines: parseInt(maxClassLinesStr, 10) || 200,
        maxFileLines: parseInt(maxFileLinesStr, 10) || 400,
        maxMethodParameters: parseInt(maxParamsStr, 10) || 4,
        minimumTestCoverage: parseInt(minCoverageStr, 10) || 80,
      },
      testing: {
        framework: testFramework,
        assertionLibrary: assertionLib,
        mockingLibrary: mockingLib,
      },
      technologies,
    };
  }

  private buildYamlProfile(config: ProfileConfig): string {
    const profile: Record<string, unknown> = {
      name: config.name,
      description: config.description,

      architecture: {
        type: config.architecture.type,
        enforceLayerDependencies: config.architecture.enforceLayerDependencies,
        layers: this.getDefaultLayers(config.architecture.type),
      },

      ddd: config.ddd.enabled
        ? {
            enabled: true,
            ubiquitousLanguageEnforced: config.ddd.ubiquitousLanguageEnforced,
            patterns: {
              aggregates: true,
              entities: true,
              valueObjects: true,
              domainEvents: config.eventDriven.enabled,
              repositories: true,
              domainServices: true,
            },
          }
        : { enabled: false },

      cqrs: config.cqrs.enabled
        ? {
            enabled: true,
            separation: config.cqrs.separation,
            patterns: {
              commands: { suffix: 'Command', handler: 'CommandHandler' },
              queries: { suffix: 'Query', handler: 'QueryHandler' },
            },
          }
        : { enabled: false },

      eventDriven: config.eventDriven.enabled
        ? {
            enabled: true,
            approach: config.eventDriven.approach,
            patterns: {
              domainEvents: { suffix: 'Event', pastTense: true },
            },
          }
        : { enabled: false },

      codeQuality: {
        maxMethodLines: config.codeQuality.maxMethodLines,
        maxClassLines: config.codeQuality.maxClassLines,
        maxFileLines: config.codeQuality.maxFileLines,
        maxMethodParameters: config.codeQuality.maxMethodParameters,
        maxCyclomaticComplexity: 10,
        requireDocumentation: true,
        requireTests: true,
        minimumTestCoverage: config.codeQuality.minimumTestCoverage,
        principles: ['SOLID', 'DRY', 'KISS', 'YAGNI'],
      },

      naming: this.getNamingConventions(this.detectedInfo.language),

      testing: {
        framework: config.testing.framework,
        assertionLibrary: config.testing.assertionLibrary,
        mockingLibrary: config.testing.mockingLibrary,
        types: {
          unit: { suffix: 'Test', coverage: config.codeQuality.minimumTestCoverage },
          integration: { suffix: 'IT' },
          architecture: { tool: 'ArchUnit', recommended: true },
        },
      },

      technologies: config.technologies,
    };

    return stringify(profile, { lineWidth: 120 });
  }

  private getDefaultLayers(archType: string): Array<{ name: string; description: string; allowedDependencies: string[] }> {
    if (archType === 'hexagonal') {
      return [
        { name: 'domain', description: 'Core business logic. NO external dependencies.', allowedDependencies: [] },
        { name: 'application', description: 'Use cases and ports. Depends only on domain.', allowedDependencies: ['domain'] },
        { name: 'infrastructure', description: 'Adapters and frameworks.', allowedDependencies: ['domain', 'application'] },
      ];
    }

    if (archType === 'clean') {
      return [
        { name: 'entities', description: 'Enterprise business rules.', allowedDependencies: [] },
        { name: 'usecases', description: 'Application business rules.', allowedDependencies: ['entities'] },
        { name: 'adapters', description: 'Interface adapters.', allowedDependencies: ['entities', 'usecases'] },
        { name: 'frameworks', description: 'Frameworks and drivers.', allowedDependencies: ['entities', 'usecases', 'adapters'] },
      ];
    }

    if (archType === 'layered') {
      return [
        { name: 'presentation', description: 'UI layer.', allowedDependencies: ['business'] },
        { name: 'business', description: 'Business logic.', allowedDependencies: ['data'] },
        { name: 'data', description: 'Data access.', allowedDependencies: [] },
      ];
    }

    return [];
  }

  private getNamingConventions(language: string): Record<string, unknown> {
    if (language === 'Java') {
      return {
        general: {
          class: 'PascalCase',
          interface: 'PascalCase',
          method: 'camelCase',
          variable: 'camelCase',
          constant: 'SCREAMING_SNAKE_CASE',
          package: 'lowercase.dot.separated',
        },
        suffixes: {
          repository: 'Repository',
          service: 'Service',
          controller: 'Controller',
          entity: 'Entity (or none)',
        },
        testing: {
          unitTest: '*Test',
          integrationTest: '*IT',
          testMethod: 'should_ExpectedBehavior_When_Condition',
        },
      };
    }

    if (language === 'TypeScript' || language === 'JavaScript') {
      return {
        general: {
          class: 'PascalCase',
          interface: 'PascalCase (no I prefix)',
          function: 'camelCase',
          variable: 'camelCase',
          constant: 'SCREAMING_SNAKE_CASE',
          file: 'kebab-case',
        },
        suffixes: {
          repository: '.repository',
          service: '.service',
          controller: '.controller',
          types: '.types',
        },
        testing: {
          testFile: '*.test.ts or *.spec.ts',
          testMethod: 'should ... when ...',
        },
      };
    }

    if (language === 'Python') {
      return {
        general: {
          class: 'PascalCase',
          function: 'snake_case',
          variable: 'snake_case',
          constant: 'SCREAMING_SNAKE_CASE',
          module: 'snake_case',
        },
        suffixes: {
          repository: '_repository',
          service: '_service',
          controller: '_controller',
        },
        testing: {
          testFile: 'test_*.py',
          testMethod: 'test_should_*',
        },
      };
    }

    return {
      general: {
        class: 'PascalCase',
        method: 'camelCase',
        variable: 'camelCase',
        constant: 'SCREAMING_SNAKE_CASE',
      },
    };
  }

  private printSummary(config: ProfileConfig): void {
    this.print(`\n${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    this.print(`${c.green}                    PROFILE SUMMARY${c.reset}`);
    this.print(`${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);

    this.print(`${c.bright}Name:${c.reset}         ${config.name}`);
    this.print(`${c.bright}Description:${c.reset}  ${config.description}`);
    this.print('');
    this.print(`${c.bright}Architecture:${c.reset} ${config.architecture.type}`);
    this.print(`${c.bright}DDD:${c.reset}          ${config.ddd.enabled ? 'Enabled' : 'Disabled'}`);
    this.print(`${c.bright}CQRS:${c.reset}         ${config.cqrs.enabled ? `Enabled (${config.cqrs.separation})` : 'Disabled'}`);
    this.print(`${c.bright}Event-Driven:${c.reset} ${config.eventDriven.enabled ? `Enabled (${config.eventDriven.approach})` : 'Disabled'}`);
    this.print('');
    this.print(`${c.bright}Code Quality:${c.reset}`);
    this.print(`  - Max method lines: ${config.codeQuality.maxMethodLines}`);
    this.print(`  - Max class lines: ${config.codeQuality.maxClassLines}`);
    this.print(`  - Min test coverage: ${config.codeQuality.minimumTestCoverage}%`);
    this.print('');
    this.print(`${c.bright}Testing:${c.reset}      ${config.testing.framework} + ${config.testing.assertionLibrary}`);

    this.print(`\n${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  }

  async run(): Promise<void> {
    this.print(`
${c.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${c.bright}🔧 CORBAT PROFILE GENERATOR${c.reset}${c.cyan}                            ║
║                                                           ║
║   Create a custom coding standards profile for your       ║
║   project in seconds.                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${c.reset}
`);

    // Detect project
    await this.detectProject();

    if (this.detectedInfo.language !== 'unknown') {
      this.printDetectedInfo();

      const useDetected = await this.confirm('Use detected configuration as base?', true);
      if (!useDetected) {
        this.detectedInfo = { language: 'unknown' };
      }
    } else {
      this.print(`${c.yellow}⚠ Could not auto-detect project type.${c.reset}`);
      this.print(`${c.dim}  Starting from scratch...${c.reset}\n`);

      const lang = await this.select('Select your primary language:', [
        'Java',
        'TypeScript',
        'JavaScript',
        'Python',
        'Other',
      ], 0);

      this.detectedInfo.language = lang;
    }

    // Run wizard
    const config = await this.runWizard();

    // Show summary
    this.printSummary(config);

    // Confirm and save
    const shouldSave = await this.confirm('Save this profile?', true);

    if (shouldSave) {
      const filename = `${config.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;

      const saveLocation = await this.select('Where to save?', [
        `profiles/custom/${filename} (corbat-mcp)`,
        `.corbat/${filename} (project local)`,
        `Custom path...`,
      ], 0);

      let savePath: string;

      if (saveLocation.includes('profiles/custom')) {
        // Save to corbat-mcp profiles
        const corbatRoot = join(__dirname, '..', '..');
        savePath = join(corbatRoot, 'profiles', 'custom', filename);
      } else if (saveLocation.includes('.corbat')) {
        // Save to project local
        const corbatDir = join(this.projectDir, '.corbat');
        try {
          await access(corbatDir);
        } catch {
          const { mkdir } = await import('node:fs/promises');
          await mkdir(corbatDir, { recursive: true });
        }
        savePath = join(corbatDir, filename);
      } else {
        // Custom path
        const customPath = await this.input('Enter full path');
        savePath = customPath;
      }

      const yamlContent = this.buildYamlProfile(config);
      await writeFile(savePath, yamlContent, 'utf-8');

      this.print(`\n${c.green}✓ Profile saved to: ${savePath}${c.reset}`);

      // Also create .corbat.json if desired
      const createCorbatJson = await this.confirm('\nCreate .corbat.json in project root?', true);

      if (createCorbatJson) {
        const corbatJson = {
          profile: config.name.toLowerCase().replace(/\s+/g, '-'),
          autoInject: true,
          rules: {
            always: config.ddd.enabled
              ? ['Follow DDD patterns', 'Use ubiquitous language']
              : ['Follow clean code principles'],
          },
          decisions: {},
        };

        await writeFile(
          join(this.projectDir, '.corbat.json'),
          JSON.stringify(corbatJson, null, 2),
          'utf-8'
        );

        this.print(`${c.green}✓ Created .corbat.json${c.reset}`);
      }

      this.print(`
${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}                      🎉 All done!${c.reset}

${c.cyan}Next steps:${c.reset}

  1. Use your profile:
     ${c.dim}"Review this code using corbat with profile ${config.name.toLowerCase().replace(/\s+/g, '-')}"${c.reset}

  2. Or with @corbat shortcut:
     ${c.dim}"Create a service @corbat"${c.reset}

${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);
    } else {
      this.print(`\n${c.yellow}Profile not saved.${c.reset}`);
    }

    this.rl.close();
  }
}

// Run if executed directly
const init = new CorbatInit();
init.run().catch((error) => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
