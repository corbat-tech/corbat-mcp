/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ===========================================
    // Circular Dependencies
    // ===========================================
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: {
        circular: true,
      },
    },

    // ===========================================
    // Architecture Rules
    // ===========================================
    {
      name: 'config-no-tools',
      severity: 'error',
      comment: 'config.ts should not depend on tools.ts (inverted dependency)',
      from: {
        path: '^src/config\\.ts$',
      },
      to: {
        path: '^src/tools\\.ts$',
      },
    },
    {
      name: 'config-no-profiles',
      severity: 'error',
      comment: 'config.ts should not depend on profiles.ts',
      from: {
        path: '^src/config\\.ts$',
      },
      to: {
        path: '^src/profiles\\.ts$',
      },
    },
    {
      name: 'config-no-resources',
      severity: 'error',
      comment: 'config.ts should not depend on resources.ts',
      from: {
        path: '^src/config\\.ts$',
      },
      to: {
        path: '^src/resources\\.ts$',
      },
    },
    {
      name: 'types-no-runtime',
      severity: 'error',
      comment: 'types.ts should only contain type definitions, no runtime imports from other modules',
      from: {
        path: '^src/types\\.ts$',
      },
      to: {
        path: '^src/(config|profiles|tools|resources|prompts|index)\\.ts$',
      },
    },
    {
      name: 'utils-no-business-logic',
      severity: 'error',
      comment: 'Utility modules should not depend on business logic',
      from: {
        path: '^src/utils/',
      },
      to: {
        path: '^src/(profiles|tools|resources|prompts|index)\\.ts$',
      },
    },

    // ===========================================
    // Dependency Hygiene
    // ===========================================
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment: 'Avoid using deprecated Node.js core modules',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: '^(punycode|domain|constants|sys|_linklist|_stream_wrap)$',
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Do not import modules that cannot be resolved',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Modules should be imported somewhere (except entry points)',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dotfiles
          '\\.d\\.ts$', // TypeScript declaration files
          '(^|/)tsconfig\\.json$',
          '(^|/)vitest\\.config\\.[cm]?ts$',
          '^src/index\\.ts$', // Entry point
        ],
      },
      to: {},
    },
    {
      name: 'no-dev-deps-in-prod',
      severity: 'error',
      comment: 'Production code should not import devDependencies',
      from: {
        path: '^src/',
        pathNot: '\\.test\\.ts$',
      },
      to: {
        dependencyTypes: ['npm-dev'],
      },
    },

    // ===========================================
    // Test Rules
    // ===========================================
    {
      name: 'tests-not-to-src-index',
      severity: 'warn',
      comment: 'Tests should import specific modules, not the main index',
      from: {
        path: '^tests/',
      },
      to: {
        path: '^src/index\\.ts$',
      },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['es6', 'cjs'],
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: {
            splines: 'ortho',
          },
          modules: [
            {
              criteria: { source: '^src/config' },
              attributes: { fillcolor: '#ffcccc' },
            },
            {
              criteria: { source: '^src/types' },
              attributes: { fillcolor: '#ccffcc' },
            },
            {
              criteria: { source: '^src/profiles' },
              attributes: { fillcolor: '#ccccff' },
            },
            {
              criteria: { source: '^src/tools' },
              attributes: { fillcolor: '#ffffcc' },
            },
            {
              criteria: { source: '^src/utils' },
              attributes: { fillcolor: '#ffccff' },
            },
          ],
        },
      },
      archi: {
        collapsePattern:
          '^(node_modules|packages|src|lib|app|test|spec)(/[^/]+)+',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
