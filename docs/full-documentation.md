<div align="center">

# CORBAT

### Complete Documentation

*Stop repeating yourself. Start coding.*

<br>

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen.svg)](https://github.com/victormartingil/corbat-mcp)
[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen.svg)](https://github.com/victormartingil/corbat-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io/)

</div>

---

## Table of Contents

- [What is Corbat?](#what-is-corbat)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Tools Reference](#tools-reference)
- [Prompts Reference](#prompts-reference)
- [Profiles](#profiles)
- [Configuration](#configuration)
- [Task-Specific Guardrails](#task-specific-guardrails)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## What is Corbat?

Corbat is an MCP server that **automatically injects your coding standards** into AI responses.

### The Problem

Every time you ask AI to write code, you repeat yourself:

```
"Create a payment service. Use hexagonal architecture. Follow TDD.
 Apply SOLID. Use our naming conventions. Ensure 80% coverage..."
```

### The Solution

Define standards once. Corbat applies them automatically.

```
You: "Create a payment service"

Corbat automatically injects:
  ✓ Hexagonal architecture
  ✓ TDD workflow
  ✓ SOLID principles
  ✓ Your naming conventions
  ✓ 80%+ coverage requirement
```

**Result**: Claude generates code that follows ALL your standards.

---

## Quick Start

### Step 1: Install

```bash
git clone https://github.com/victormartingil/corbat-mcp.git
cd corbat-mcp
npm install && npm run build
```

### Step 2: Connect to Claude

**Claude Code (CLI):**
```bash
claude mcp add corbat node /absolute/path/to/corbat-mcp/dist/index.js
```

**Claude Desktop:**

Edit `~/.config/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "corbat": {
      "command": "node",
      "args": ["/absolute/path/to/corbat-mcp/dist/index.js"]
    }
  }
}
```

### Step 3: Use It

```
"Create a user service"
```

Corbat auto-detects your stack and applies standards. **Done.**

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your Prompt    │────▶│     Corbat      │────▶│  Claude + Rules │
│                 │     │                 │     │                 │
│ "Create user    │     │ 1. Detect stack │     │ Generates code  │
│  service"       │     │ 2. Classify task│     │ following ALL   │
│                 │     │ 3. Load profile │     │ your standards  │
│                 │     │ 4. Inject rules │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Auto-Detection

Corbat reads your project files to detect:

| File | Detection |
|------|-----------|
| `pom.xml` | Java + Maven |
| `build.gradle` | Java + Gradle |
| `package.json` | Node.js |
| `requirements.txt` | Python |
| `Gemfile` | Ruby |

### Task Classification

Corbat analyzes your prompt to classify the task:

| Keywords | Classification |
|----------|----------------|
| "create", "add", "implement" | FEATURE |
| "fix", "bug", "error" | BUGFIX |
| "refactor", "clean", "improve" | REFACTOR |
| "test", "spec", "coverage" | TEST |

Each classification triggers **specific guardrails**.

---

## Tools Reference

### `get_context` (Primary Tool)

Returns **everything** needed for a task in one call.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task` | string | Yes | What you want to implement |
| `project_dir` | string | No | Path for auto-detection |

**Returns:**
- Detected stack (language, framework, build tool)
- Task classification
- Active profile
- Guardrails (MUST / AVOID)
- Architecture rules
- Naming conventions
- Development workflow

**Example:**
```
get_context({ task: "Create a payment service" })
```

---

### `validate`

Checks code against your standards.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | Code to validate |
| `task_type` | string | No | feature, bugfix, refactor, test |

**Returns:**
- Compliance score (0-100)
- Issues found
- Recommendations

**Example:**
```
validate({
  code: "public class PaymentService { ... }",
  task_type: "feature"
})
```

---

### `search`

Searches the standards documentation.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search term |

**Example:**
```
search({ query: "hexagonal architecture" })
search({ query: "kafka" })
search({ query: "testing patterns" })
```

**Available Topics:**
- Architecture: hexagonal, clean, DDD, CQRS
- Testing: TDD, unit, integration, E2E
- DevOps: Docker, Kubernetes, CI/CD
- Observability: logging, metrics, tracing

---

### `profiles`

Lists all available profiles.

**Parameters:** None

**Returns:** List of profiles with descriptions.

---

### `health`

Server diagnostics.

**Parameters:** None

**Returns:**
- Server status
- Loaded profiles count
- Standards documents count
- Cache status

---

## Prompts Reference

### `implement`

Guided implementation with full workflow.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task` | string | Yes | What to implement |
| `project_dir` | string | No | Path for auto-detection |

**Workflow injected:**
1. CLARIFY - Confirm requirements
2. PLAN - Create task checklist
3. BUILD - TDD: Red → Green → Refactor
4. VERIFY - Tests pass, linter clean
5. REVIEW - Self-check against standards

---

### `review`

Expert code review.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | Code to review |
| `role` | string | No | architect, backend, security, performance, frontend |

**Review output:**
- CRITICAL ISSUES (must fix)
- WARNINGS (should fix)
- SUGGESTIONS (nice to have)
- SCORE (1-10)

---

## Profiles

### Built-in Profiles

| Profile | Stack | Architecture |
|---------|-------|--------------|
| `java-spring-backend` | Java 21 + Spring Boot | Hexagonal + DDD |
| `nodejs` | Node.js + TypeScript | Clean Architecture |
| `python` | Python + FastAPI | Clean Architecture |
| `react` | React 18+ + TypeScript | Component-based |
| `minimal` | Any | Basic standards |

### Using a Profile

**Automatic:** Corbat detects based on project files.

**Explicit in prompt:**
```
"Create a service using profile nodejs"
```

**Explicit in config:**
```json
{ "profile": "nodejs" }
```

### Creating Custom Profiles

#### Option 1: Interactive Generator (Recommended)

```bash
cd /your/project
npx /path/to/corbat-mcp/dist/cli/init.js
```

**What happens:**

```
╔═══════════════════════════════════════════════════════════╗
║   CORBAT PROFILE GENERATOR                                ║
╚═══════════════════════════════════════════════════════════╝

Scanning project...

✓ Detected configuration:

  Language:      Java
  Framework:     Spring Boot 3.4.1
  Build Tool:    Maven
  Java Version:  21

Use detected configuration? [Y/n]

━━━ Architecture ━━━
  → 1) hexagonal
    2) clean
    3) layered

━━━ Code Quality ━━━
Max lines per method [20]:
Min test coverage % [80]:

✓ Profile saved to: profiles/custom/my-project.yaml
✓ Created .corbat.json
```

#### Option 2: Manual

```bash
cp profiles/templates/_template.yaml profiles/custom/my-project.yaml
```

Edit the file:

```yaml
name: "My Project Standards"
description: "Backend API standards"

architecture:
  type: hexagonal
  enforceLayerDependencies: true

ddd:
  enabled: true
  ubiquitousLanguageEnforced: true

cqrs:
  enabled: true
  separation: logical

codeQuality:
  maxMethodLines: 20
  maxClassLines: 200
  minimumTestCoverage: 80

naming:
  general:
    class: PascalCase
    method: camelCase
    variable: camelCase
    constant: SCREAMING_SNAKE_CASE

testing:
  framework: JUnit5
  assertionLibrary: AssertJ
```

---

## Configuration

### Project Configuration (`.corbat.json`)

Create in your project root:

```json
{
  "profile": "my-project",
  "rules": {
    "always": [
      "Use TypeScript strict mode",
      "Prefer functional programming"
    ],
    "never": [
      "Use any type",
      "Skip error handling"
    ],
    "onNewFile": [
      "Add license header"
    ],
    "onTest": [
      "Use AAA pattern"
    ]
  },
  "decisions": {
    "database": "PostgreSQL",
    "cache": "Redis",
    "messaging": "Kafka"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `profile` | string | Profile to use |
| `rules.always` | string[] | Always apply |
| `rules.never` | string[] | Never do |
| `rules.onNewFile` | string[] | When creating files |
| `rules.onTest` | string[] | When writing tests |
| `decisions` | object | Technology decisions |

---

## Task-Specific Guardrails

### FEATURE

**MUST:**
- Write tests BEFORE implementation (TDD)
- Ensure 80%+ test coverage
- Apply SOLID principles
- Follow naming conventions
- Document public APIs
- Validate all inputs

**AVOID:**
- God classes (>200 lines)
- God methods (>20 lines)
- Hard-coded configuration
- Mixing business logic with infrastructure
- Circular dependencies

---

### BUGFIX

**MUST:**
- Write a failing test that reproduces the bug FIRST
- Make minimal changes to fix
- Verify no regression in existing tests
- Document root cause

**AVOID:**
- Refactoring unrelated code
- Adding features while fixing
- Changing APIs unnecessarily

---

### REFACTOR

**MUST:**
- All tests pass BEFORE starting
- Make incremental changes
- Tests must pass AFTER each change
- No behavior modifications

**AVOID:**
- Behavior changes
- Big bang refactoring
- Refactoring without tests

---

### TEST

**MUST:**
- Arrange-Act-Assert pattern
- One logical assertion per test
- Descriptive names: `should_X_when_Y`
- Independent and repeatable tests

**AVOID:**
- Testing implementation details
- Flaky tests
- Order-dependent tests
- Mocking everything

---

## Development Workflow

Corbat enforces this workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. CLARIFY    Ask questions if anything is unclear             │
│       ↓                                                         │
│  2. PLAN       Create task checklist                            │
│       ↓        [ ] Task 1                                       │
│                    [ ] Write test                               │
│                    [ ] Implement                                │
│                [ ] Task 2                                       │
│       ↓                                                         │
│  3. BUILD      TDD cycle for each task:                         │
│       ↓        RED → GREEN → REFACTOR                           │
│                                                                 │
│  4. VERIFY     ✓ Tests pass                                     │
│       ↓        ✓ Linter clean                                   │
│                ✓ Build succeeds                                 │
│                                                                 │
│  5. REVIEW     Self-review against standards                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
corbat-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── tools.ts          # 5 tools definitions
│   ├── prompts.ts        # 2 prompts definitions
│   ├── agent.ts          # Auto-detection & guardrails
│   ├── profiles.ts       # Profile loading & caching
│   ├── types.ts          # Zod schemas & types
│   ├── config.ts         # Environment configuration
│   ├── resources.ts      # MCP resources
│   └── cli/
│       └── init.ts       # Interactive profile generator
│
├── profiles/
│   ├── templates/        # Built-in profiles
│   │   ├── java-spring-backend.yaml
│   │   ├── nodejs.yaml
│   │   ├── python.yaml
│   │   ├── react.yaml
│   │   ├── minimal.yaml
│   │   └── _template.yaml
│   └── custom/           # Your custom profiles
│
├── standards/            # Searchable documentation (15 files)
│   ├── architecture/
│   ├── clean-code/
│   ├── testing/
│   ├── spring-boot/
│   ├── event-driven/
│   ├── observability/
│   ├── containerization/
│   ├── kubernetes/
│   ├── cicd/
│   └── ...
│
├── tests/                # 78 tests, 80%+ coverage
├── docs/
└── examples/
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORBAT_PROFILES_DIR` | `./profiles` | Profiles directory |
| `CORBAT_STANDARDS_DIR` | `./standards` | Standards directory |
| `CORBAT_DEFAULT_PROFILE` | `java-spring-backend` | Default profile |
| `CORBAT_CACHE_TTL_MS` | `60000` | Cache TTL in ms |
| `CORBAT_LOG_LEVEL` | `info` | debug, info, warn, error |
| `CORBAT_VERBOSE_ERRORS` | `false` | Show detailed errors |
| `NODE_ENV` | `development` | Environment mode |

---

## Troubleshooting

<details>
<summary><b>Claude can't find corbat</b></summary>

1. Use **absolute path** in config (not relative)
2. Verify: `ls /your/path/to/corbat-mcp/dist/index.js`
3. Check `node` is in PATH: `which node`
4. Restart Claude completely
5. Check Claude's MCP logs

</details>

<details>
<summary><b>Profile not found</b></summary>

1. Check file exists in `profiles/custom/` or `profiles/templates/`
2. File must end in `.yaml` (not `.yml`)
3. Filename = profile ID (e.g., `nodejs.yaml` → `nodejs`)
4. Run `profiles` tool to list available

</details>

<details>
<summary><b>Wrong stack detected</b></summary>

Override with `.corbat.json`:
```json
{ "profile": "nodejs" }
```

Or specify in prompt: *"...using profile nodejs"*

</details>

<details>
<summary><b>Standards not being applied</b></summary>

1. Check if `.corbat.json` exists in project root
2. Verify profile exists
3. Try explicit: *"Use corbat get_context for: your task"*

</details>

<details>
<summary><b>Permission errors (macOS/Linux)</b></summary>

```bash
chmod +x /path/to/corbat-mcp/dist/index.js
which node  # Use this absolute path in config
```

</details>

<details>
<summary><b>init command not found</b></summary>

```bash
# Run directly
node /path/to/corbat-mcp/dist/cli/init.js

# Or build first
cd /path/to/corbat-mcp
npm run build
npm run init
```

</details>

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Test coverage | 80%+ |
| Tests passing | 78 |
| TypeScript | Strict mode |
| Linting | Biome |
| Architecture validation | dependency-cruiser |

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing`
5. Open Pull Request

---

## License

[MIT](../LICENSE)

---

<div align="center">

**Define once. Apply everywhere. Ship faster.**

<br>

[Back to README](../README.md) · [Model Context Protocol](https://modelcontextprotocol.io/) · [Report Issues](https://github.com/victormartingil/corbat-mcp/issues)

</div>
