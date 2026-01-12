<div align="center">

# CORBAT

### Your AI Coding Standards Assistant

*Define once, apply everywhere*

<br>

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

</div>

---

## What is Corbat?

Corbat is an MCP server that makes AI assistants follow YOUR coding standards automatically.

```
You: "Create a payment service @corbat"

AI: [Automatically applies your architecture, naming conventions,
     TDD workflow, DDD patterns, and code quality rules]
```

**No more repeating** "use hexagonal architecture", "follow TDD", "apply SOLID principles"...

---

## Quick Start (2 minutes)

### 1. Install

```bash
git clone https://github.com/victormartingil/corbat-mcp.git
cd corbat-mcp
npm install && npm run build
```

### 2. Connect to Claude

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

### 3. Use it

```
"Review this code using corbat"
"Create a user service @corbat"
```

**Done!** Claude now applies your coding standards automatically.

---

## Create Your Project Profile (Interactive)

Run the profile generator in your project directory:

```bash
cd /your/project
npx /path/to/corbat-mcp/dist/cli/init.js
```

Or if installed globally:
```bash
corbat-init
```

**What happens:**

```
╔═══════════════════════════════════════════════════════════╗
║   CORBAT PROFILE GENERATOR                                ║
╚═══════════════════════════════════════════════════════════╝

🔍 Scanning project...

✓ Detected configuration:

  Language:      Java
  Framework:     Spring Boot 3.4.1
  Build Tool:    Maven
  Java Version:  21
  Tests:         JUnit5
  Docker:        Yes

Use detected configuration as base? [Y/n]

━━━ Architecture ━━━
Architecture pattern:
  → 1) hexagonal (Ports & Adapters)
    2) clean (Clean Architecture)
    3) layered (Traditional N-Tier)

━━━ Domain-Driven Design ━━━
Enable DDD patterns? [Y/n]
Enforce ubiquitous language? [Y/n]

━━━ Code Quality Thresholds ━━━
Max lines per method [20]:
Min test coverage % [80]:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    PROFILE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:         spring-boot-project
Architecture: hexagonal
DDD:          Enabled
CQRS:         Enabled (logical)
Testing:      JUnit5 + AssertJ

Save this profile? [Y/n]

✓ Profile saved to: profiles/custom/spring-boot-project.yaml
✓ Created .corbat.json
```

**That's it!** Your project now has custom standards.

---

## Usage Shortcut

Add this to your **Claude User Preferences** (Settings > Profile):

```
When I write "@corbat" in my message, automatically use the corbat MCP
to apply coding standards, architecture guidelines, and development workflow.
```

Now just write:
```
"Create a payment service @corbat"
"Fix this bug @corbat"
"@corbat review this code"
```

---

## Agent Mode

Corbat includes an intelligent **Agent Mode** that automatically:

1. **Detects** your project stack (Java/Node/Python/etc.)
2. **Classifies** your task (feature, bugfix, refactor, etc.)
3. **Applies** specific guardrails for that task type
4. **Injects** all relevant standards in one call

### Using Agent Mode

```
"Use get_context for: Create a payment service"
```

Returns **everything** in one call:
- Task classification
- Guardrails (must do / must avoid)
- Architecture rules
- Naming conventions
- Workflow phases
- Relevant documentation

### Guardrails by Task Type

| Task | Key Rules |
|------|-----------|
| `feature` | TDD required, 80%+ coverage, SOLID principles |
| `bugfix` | Reproduce with test first, minimal change only |
| `refactor` | No behavior changes, tests must pass before/after |
| `test` | AAA pattern, one assertion per test |
| `security` | Validate inputs, parameterized queries |

---

## Project Configuration

Create `.corbat.json` in your project root:

```json
{
  "profile": "my-project",
  "autoInject": true,
  "rules": {
    "always": ["Use TypeScript strict mode"],
    "onNewFile": ["Add license header"],
    "onTest": ["Use AAA pattern"]
  },
  "decisions": {
    "database": "PostgreSQL",
    "cache": "Redis"
  }
}
```

This overrides defaults for your specific project.

---

## Available Profiles

| Profile | Stack | Use Case |
|---------|-------|----------|
| `java-spring-backend` | Java 21 + Spring Boot | Enterprise APIs |
| `nodejs` | Node.js + TypeScript | Backend services |
| `python` | Python + FastAPI | Async APIs |
| `frontend` | React/Vue + TypeScript | Web apps |
| `minimal` | Any | Quick prototypes |

**Use a specific profile:**
```
"Apply corbat standards with profile nodejs"
```

---

## All Tools & Prompts

### Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_context` | **Primary** - Get all standards for a task | `task` (required), `project_dir` (optional) |
| `validate` | Check code against standards | `code` (required), `task_type` (optional: feature/bugfix/refactor/test) |
| `search` | Search standards documentation | `query` (required) |
| `profiles` | List all available profiles | none |
| `health` | Server status and diagnostics | none |

### Prompts (2)

| Prompt | Description |
|--------|-------------|
| `implement` | Guided implementation with full workflow and guardrails |
| `review` | Expert code review against standards |

### Tool Details

#### `get_context` (Primary Tool)

Returns everything needed for a task in one call:
- Auto-detected project stack (Java, Node, Python, etc.)
- Task classification (feature, bugfix, refactor, test, etc.)
- Guardrails (MUST do / MUST avoid)
- Architecture guidelines
- Naming conventions
- Development workflow

```
Example: get_context({ task: "Create a payment service" })
```

#### `validate`

Validates code against your coding standards:
- Architecture compliance
- SOLID principles
- Naming conventions
- Test patterns (if task_type is "test")
- Returns compliance score (0-100) and issues

```
Example: validate({ code: "public class UserService {...}", task_type: "feature" })
```

#### `search`

Searches the standards documentation:
- Architecture patterns (hexagonal, clean, DDD)
- Testing guidelines
- Technology-specific docs (Kafka, Docker, Kubernetes)

```
Example: search({ query: "hexagonal architecture" })
```

---

## Create Custom Profiles

### Option 1: Interactive (Recommended)

```bash
cd /your/project
npx /path/to/corbat-mcp/dist/cli/init.js
```

### Option 2: Manual

```bash
cp profiles/templates/_template.yaml profiles/custom/my-project.yaml
# Edit the file
```

### Profile Structure

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

technologies:
  - name: Java
    version: "21"
  - name: Spring Boot
    version: "3.4"
```

---

## Development Workflow

Corbat enforces a 6-phase workflow:

```
1. CLARIFY   → Ask questions if unclear
2. PLAN      → Create task checklist
3. BUILD     → TDD: Test → Code → Refactor
4. VERIFY    → Tests pass, linter clean
5. REVIEW    → Self-review as expert
6. REFINE    → Fix issues (up to 3 cycles)
```

---

## Project Structure

```
corbat-mcp/
├── src/
│   ├── index.ts        # MCP server
│   ├── tools.ts        # 5 tools
│   ├── prompts.ts      # 2 prompts
│   ├── agent.ts        # Agent mode logic
│   ├── profiles.ts     # Profile loading
│   └── cli/
│       └── init.ts     # Interactive profile generator
├── profiles/
│   ├── templates/      # Official profiles
│   └── custom/         # Your profiles
└── standards/          # Markdown documentation
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORBAT_PROFILES_DIR` | `./profiles` | Profiles location |
| `CORBAT_STANDARDS_DIR` | `./standards` | Standards location |
| `CORBAT_DEFAULT_PROFILE` | `java-spring-backend` | Default profile |

---

## Troubleshooting

<details>
<summary><b>Claude can't find corbat</b></summary>

1. Use **absolute path** in config
2. Ensure `node` is in PATH
3. Restart Claude

</details>

<details>
<summary><b>Profile not found</b></summary>

1. Check file exists in `profiles/custom/` or `profiles/templates/`
2. File must end in `.yaml`
3. Filename = profile ID (without extension)

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

## Contributing

1. Fork it
2. Create branch (`git checkout -b feature/x`)
3. Commit (`git commit -m 'Add x'`)
4. Push (`git push origin feature/x`)
5. Open PR

---

## License

[MIT](LICENSE)

---

<div align="center">

**Stop repeating coding standards.**

**Define once, apply everywhere.**

<br>

[Model Context Protocol](https://modelcontextprotocol.io/) · [Report Issues](https://github.com/victormartingil/corbat-mcp/issues)

</div>
