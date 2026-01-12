<div align="center">

# 🔧 CORBAT

### Model Context Protocol Server

*Your coding standards, always at hand*

<br>

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

<br>

[Quick Start](#quick-start) · [Agent Mode](#agent-mode) · [Profiles](#available-profiles) · [How It Works](#how-it-works) · [Documentation](#standards-documentation)

</div>

---

## What is Corbat?

**Corbat MCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that provides your coding standards to AI assistants.

> Define your coding rules in YAML files, and any MCP-compatible AI (like Claude) will read and apply them.

### Why use it?

| Without Corbat | With Corbat |
|----------------|-------------|
| AI uses generic best practices | AI uses YOUR team's standards |
| Inconsistent code reviews | Consistent rules every time |
| Manual style enforcement | Automatic guideline application |

---

## Quick Start

```bash
# Clone & build
git clone https://github.com/victormartingil/corbat-mcp.git
cd corbat-mcp && npm install && npm run build
```

### Claude Code (CLI)

```bash
claude mcp add corbat node /absolute/path/to/corbat-mcp/dist/index.js

# Verify installation
claude mcp list
```

### Claude Desktop (App)

Edit `~/.config/Claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop after saving.

**Done!** Ask Claude: *"Review this code using corbat standards"*

---

## Usage Shortcut (Recommended)

To avoid writing "use corbat standards" every time, add this line to your **Claude User Preferences** (Settings > Profile > User Preferences):

```
When I write "@corbat" or "(corbat)" in my message, automatically consult the corbat MCP (workflow, architecture, naming, standards) before responding.
```

Now you can simply write:

```
"Create a payment service @corbat"
"Refactor this controller (corbat)"
"@corbat review this code"
```

Claude will automatically apply your coding standards without extra verbosity.

---

## Agent Mode

**NEW!** Corbat now includes **Agent Mode** — a fully autonomous development experience that injects all relevant context automatically.

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto Context Injection** | Get all standards, guardrails, and workflow in a single call |
| **Stack Auto-Detection** | Automatically detects your project (Java, Node, Python, etc.) |
| **Task Classification** | Classifies tasks (feature, bugfix, refactor) and applies specific guardrails |
| **Technical Decisions** | Get recommendations aligned with project standards |
| **Project Config** | Override defaults with `.corbat.json` per project |

### Agent Mode Tools

```
"Get full context for: Create a payment service"
```

| Tool | Description |
|------|-------------|
| `get_full_context` | **Primary tool** - returns everything in one call |
| `detect_project_stack` | Auto-detect technology stack |
| `get_guardrails` | Get mandatory rules by task type |
| `validate_against_standards` | Validate code before delivery |
| `make_technical_decision` | Get recommendations (database, cache, etc.) |
| `load_project_config` | Load project-specific `.corbat.json` |

### Agent Mode Prompts

```
"Use agent_mode prompt with task: Create a payment service"
```

| Prompt | Description |
|--------|-------------|
| `agent_mode` | Full autonomous mode with complete context |
| `quick_implement` | Lighter version with essential guardrails |

### Guardrails by Task Type

Corbat automatically applies specific guardrails based on task classification:

| Task Type | Key Guardrails |
|-----------|----------------|
| `feature` | TDD, SOLID, 80%+ coverage, naming conventions |
| `bugfix` | Reproduce with test first, minimal change |
| `refactor` | All tests must pass, no behavior changes |
| `test` | AAA pattern, one assertion per test |
| `security` | Validate inputs, parameterized queries, no hardcoded secrets |

### Project Configuration

Create a `.corbat.json` in your project root:

```json
{
  "profile": "nodejs",
  "autoInject": true,
  "rules": {
    "always": ["Use TypeScript strict mode", "Prefer composition over inheritance"],
    "onNewFile": ["Add license header"],
    "onTest": ["Use Arrange-Act-Assert pattern"]
  },
  "overrides": {
    "maxMethodLines": 25,
    "minimumTestCoverage": 90
  },
  "decisions": {
    "database": "PostgreSQL",
    "cache": "Redis",
    "messaging": "Kafka"
  }
}
```

---

## Available Profiles

| Profile | Stack | Description |
|---------|-------|-------------|
| `java-spring-backend` | Java 21 + Spring Boot 3.x | Enterprise backend with Hexagonal, DDD, CQRS |
| `nodejs` | Node.js + TypeScript | Backend APIs with Express/Fastify |
| `python` | Python 3.11+ + FastAPI | Async backend with type hints |
| `frontend` | React/Vue + TypeScript | Modern SPAs with component architecture |
| `minimal` | Any | Lightweight standards for MVPs |

**Usage in Claude:**
```
"Review this code using corbat with profile nodejs"
"Apply python standards from corbat"
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR ENVIRONMENT                         │
│                                                              │
│   profiles/          standards/                              │
│   ├── templates/     ├── architecture/                       │
│   │   └── *.yaml     ├── clean-code/                        │
│   └── custom/        └── testing/                           │
│         └── *.yaml         └── *.md                         │
│              │                  │                            │
│              └────────┬─────────┘                            │
│                       ▼                                      │
│              ┌────────────────┐                              │
│              │  CORBAT MCP    │◄─── stdio ───┐              │
│              │    SERVER      │              │              │
│              └───────┬────────┘              │              │
│                      │                        │              │
└──────────────────────┼────────────────────────┼──────────────┘
                       ▼                        │
              ┌────────────────┐               │
              │  CLAUDE CODE   │───────────────┘
              └───────┬────────┘
                      ▼
              ┌────────────────┐
              │   YOU: "Review │
              │   this code"   │
              └────────────────┘
```

### Exposed Capabilities

#### Original Tools (7)

| Type | Name | Description |
|------|------|-------------|
| **Tool** | `get_coding_standards` | Full standards for a profile |
| **Tool** | `list_profiles` | List available profiles |
| **Tool** | `get_architecture_guidelines` | Architecture rules only |
| **Tool** | `get_naming_conventions` | Naming rules only |
| **Tool** | `search_standards` | Search by topic |
| **Tool** | `health_check` | Server status and metrics |
| **Tool** | `get_development_workflow` | 6-phase workflow guide |

#### Agent Mode Tools (6)

| Type | Name | Description |
|------|------|-------------|
| **Tool** | `get_full_context` | Complete context in one call |
| **Tool** | `detect_project_stack` | Auto-detect technology stack |
| **Tool** | `get_guardrails` | Rules by task type |
| **Tool** | `validate_against_standards` | Code validation |
| **Tool** | `make_technical_decision` | Technical recommendations |
| **Tool** | `load_project_config` | Load .corbat.json |

#### Resources

| Type | Name | Description |
|------|------|-------------|
| **Resource** | `corbat://profiles/{id}` | Read profile as markdown |
| **Resource** | `corbat://standards/{cat}` | Read standards by category |

#### Prompts (7)

| Type | Name | Description |
|------|------|-------------|
| **Prompt** | `code_review` | Pre-built code review |
| **Prompt** | `refactor_suggestion` | Pre-built refactoring |
| **Prompt** | `architecture_check` | Pre-built arch validation |
| **Prompt** | `implement_feature` | Guided implementation |
| **Prompt** | `expert_review` | Multi-role expert review |
| **Prompt** | `agent_mode` | Full autonomous mode |
| **Prompt** | `quick_implement` | Quick implementation |

---

## Project Structure

```
corbat-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config.ts         # Configuration (Zod validated)
│   ├── profiles.ts       # Profile loading
│   ├── tools.ts          # MCP tools (13 total)
│   ├── resources.ts      # MCP resources
│   ├── prompts.ts        # MCP prompts (7 total)
│   ├── agent.ts          # Agent mode (guardrails, detection, decisions)
│   └── types.ts          # Zod schemas and types
│
├── profiles/
│   ├── templates/        # Official profiles (don't edit)
│   │   ├── java-spring-backend.yaml
│   │   ├── nodejs.yaml
│   │   ├── python.yaml
│   │   ├── frontend.yaml
│   │   ├── minimal.yaml
│   │   └── _template.yaml
│   └── custom/           # Your profiles go here
│
├── standards/            # Markdown documentation
│   ├── architecture/
│   ├── clean-code/
│   ├── spring-boot/
│   └── testing/
│
└── tests/
```

---

## Create Custom Profiles

```bash
# Copy the template
cp profiles/templates/_template.yaml profiles/custom/my-project.yaml

# Edit your standards
code profiles/custom/my-project.yaml

# Use it
"Apply corbat standards with profile my-project"
```

Example profile:

```yaml
name: "My Team Standards"
description: "Backend coding standards"

architecture:
  type: hexagonal
  enforceLayerDependencies: true

codeQuality:
  maxMethodLines: 20
  minimumTestCoverage: 80

naming:
  class: PascalCase
  method: camelCase
```

> Custom profiles in `profiles/custom/` override official templates with the same name.

---

## Standards Documentation

The `standards/` folder contains Markdown documentation included in AI context:

| Category | Files |
|----------|-------|
| `architecture/` | hexagonal.md, ddd.md |
| `clean-code/` | principles.md, naming.md |
| `spring-boot/` | best-practices.md |
| `testing/` | guidelines.md |

**Add your own:** Create any `.md` file in a subfolder — it's auto-discovered.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORBAT_PROFILES_DIR` | `./profiles` | Profiles directory |
| `CORBAT_STANDARDS_DIR` | `./standards` | Standards directory |
| `CORBAT_DEFAULT_PROFILE` | `java-spring-backend` | Default profile |

---

## Development

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run dev       # Watch mode
npm test          # Run tests
```

---

## Troubleshooting

<details>
<summary><b>Server not starting</b></summary>

```bash
node dist/index.js
# Should output nothing (waits for stdin)
```
</details>

<details>
<summary><b>Profile not found</b></summary>

1. Check profile exists in `profiles/templates/` or `profiles/custom/`
2. Verify filename matches (without `.yaml`)
3. Validate YAML syntax
</details>

<details>
<summary><b>Claude can't find the MCP</b></summary>

1. Use **absolute path** in settings
2. Verify `node` is in PATH
3. Restart Claude Code
</details>

---

## Contributing

1. Fork it
2. Create your branch (`git checkout -b feature/cool-thing`)
3. Commit (`git commit -m 'Add cool thing'`)
4. Push (`git push origin feature/cool-thing`)
5. Open a PR

---

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">

**Stop fighting about code style.**

**Define it once, use it everywhere.**

<br>

Made with TypeScript and the [Model Context Protocol](https://modelcontextprotocol.io/)

</div>
