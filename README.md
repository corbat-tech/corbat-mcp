<div align="center">

# CORBAT - Coding Standards MCP

### Stop repeating yourself. Start coding.

**Your architecture rules, TDD workflow, and SOLID principles — injected automatically into every AI response.**

[![npm version](https://img.shields.io/npm/v/@corbat-tech/coding-standards-mcp.svg)](https://www.npmjs.com/package/@corbat-tech/coding-standards-mcp)
[![CI](https://github.com/corbat-tech/coding-standards-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/corbat-tech/coding-standards-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io/)

</div>

<p align="center">
  <img src="assets/demo.gif" alt="CORBAT Demo" width="800">
</p>

---

## The Problem

Every time you ask AI to write code, you repeat the same instructions:

```
"Create a payment service. Use hexagonal architecture. Follow TDD.
 Apply SOLID. Use our naming conventions. Ensure 80% coverage..."
```

**This is tedious, error-prone, and inconsistent.**

## The Solution

Define your standards once. Corbat MCP injects them automatically.

```
You: "Create a payment service"

Corbat: ✓ Detected Java/Spring project
        ✓ Applied hexagonal architecture
        ✓ Enforced TDD workflow
        ✓ Injected SOLID principles
        ✓ Set 80%+ coverage requirement
```

**One prompt. Full compliance.**

---

## Why Corbat MCP vs Alternatives?

| Feature | Corbat MCP | Linters (ESLint, etc.) | Manual prompts |
|---------|:------:|:----------------------:|:--------------:|
| Enforces **before** code is written | ✅ | ❌ | ❌ |
| Architecture patterns (hexagonal, DDD) | ✅ | ❌ | ⚠️ |
| TDD workflow enforcement | ✅ | ❌ | ⚠️ |
| Task-specific guardrails | ✅ | ❌ | ❌ |
| Auto-detects your stack | ✅ | ❌ | ❌ |
| Zero repetition | ✅ | ✅ | ❌ |

**Linters catch errors after the fact. Corbat MCP prevents them.**

---

## Quick Start

**Step 1** — Connect to Claude:

<table>
<tr>
<td><b>Claude Code</b></td>
<td>

```bash
claude mcp add corbat -- npx -y @corbat-tech/coding-standards-mcp
```

</td>
</tr>
<tr>
<td><b>Claude Desktop</b></td>
<td>

Edit `~/.config/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "corbat": {
      "command": "npx",
      "args": ["-y", "@corbat-tech/coding-standards-mcp"]
    }
  }
}
```

</td>
</tr>
</table>

**Step 2** — Use it:
```
"Create a user service"
```

Corbat MCP auto-detects your stack and applies all standards. **That's it.**

---

## What You Get

When you ask Claude to create code, Corbat MCP injects this context automatically:

```markdown
# Task: Create payment service

## Detected
- Stack: Java 21 · Spring Boot 3 · Maven
- Task type: FEATURE
- Profile: java-spring-backend

## Guardrails

### MUST
✓ Write tests BEFORE implementation (TDD)
✓ Use hexagonal architecture (domain/application/infrastructure)
✓ Apply SOLID principles
✓ Ensure 80%+ test coverage
✓ Validate all inputs
✓ Document public APIs

### AVOID
✗ God classes (>200 lines) or god methods (>20 lines)
✗ Hard-coded configuration values
✗ Mixing business logic with infrastructure
✗ Circular dependencies between layers

## Workflow
1. CLARIFY  → Confirm requirements
2. PLAN     → Create task checklist
3. BUILD    → TDD cycle: Red → Green → Refactor
4. VERIFY   → Tests pass, linter clean
5. REVIEW   → Self-check against standards

## Naming Conventions
- Classes: PascalCase (PaymentService)
- Methods: camelCase (processPayment)
- Constants: SCREAMING_SNAKE_CASE
- Packages: lowercase (com.example.payment)
```

**Claude now generates code that follows ALL your standards.**

---

## Task-Specific Guardrails

Corbat MCP adapts its rules based on what you're doing:

<table>
<tr>
<th>Task</th>
<th>MUST</th>
<th>AVOID</th>
</tr>
<tr>
<td><b>Feature</b></td>
<td>TDD, 80%+ coverage, SOLID, hexagonal</td>
<td>God classes, coupled layers</td>
</tr>
<tr>
<td><b>Bugfix</b></td>
<td>Failing test first, minimal changes</td>
<td>Refactoring, adding features</td>
</tr>
<tr>
<td><b>Refactor</b></td>
<td>Tests pass before AND after, incremental</td>
<td>Behavior changes, big bang</td>
</tr>
<tr>
<td><b>Test</b></td>
<td>AAA pattern, one assertion, descriptive names</td>
<td>Implementation details, flaky tests</td>
</tr>
</table>

---

## Compatibility

| Client | Status |
|--------|:------:|
| Claude Code (CLI) | ✅ Tested |
| Claude Desktop | ✅ Tested |
| Cursor | ⚠️ Experimental |
| Windsurf | ⚠️ Experimental |
| Other MCP clients | ✅ Standard protocol |

---

## Built-in Profiles

| Profile | Best for | Architecture |
|---------|----------|--------------|
| `java-spring-backend` | Enterprise Java | Hexagonal + DDD |
| `nodejs` | Node.js/TypeScript APIs | Clean Architecture |
| `python` | Python/FastAPI | Clean Architecture |
| `react` | React applications | Feature-based |
| `angular` | Angular 19+ applications | Feature-based + Signals |
| `vue` | Vue 3.5+ applications | Feature-based + Composition |
| `minimal` | MVPs, prototypes | Basic standards |

**Auto-detection**: Corbat MCP reads `pom.xml`, `package.json`, `requirements.txt`, etc. to select the right profile.

---

## Customize (Optional)

### Option A: Interactive generator
```bash
npx corbat-init
```

### Option B: Manual config

Create `.corbat.json` in your project root:

```json
{
  "profile": "nodejs",
  "rules": {
    "always": [
      "Use TypeScript strict mode",
      "Prefer functional programming"
    ],
    "never": [
      "Use any type"
    ]
  }
}
```

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `get_context` | **Primary** — Returns all standards for your task |
| `validate` | Check code against standards |
| `search` | Search standards documentation |
| `profiles` | List available profiles |
| `health` | Server status check |

## Available Prompts

| Prompt | Purpose |
|--------|---------|
| `implement` | Guided implementation with TDD workflow |
| `review` | Expert code review (architecture, SOLID, security) |

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your Prompt    │────▶│   Corbat MCP    │────▶│  Claude + Rules │
│                 │     │                 │     │                 │
│ "Create user    │     │ 1. Detect stack │     │ Generates code  │
│  service"       │     │ 2. Classify task│     │ following ALL   │
│                 │     │ 3. Load profile │     │ your standards  │
│                 │     │ 4. Inject rules │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Included Documentation

Corbat MCP comes with 15 standards documents you can search:

- **Architecture**: Hexagonal, DDD, Clean Architecture
- **Code Quality**: SOLID, Clean Code, Naming Conventions
- **Testing**: TDD, Unit/Integration/E2E guidelines
- **DevOps**: Docker, Kubernetes, CI/CD
- **Observability**: Logging, Metrics, Tracing

Use `search` tool: *"search kafka"* → Returns event-driven architecture guidelines.

---

## Troubleshooting

<details>
<summary><b>Claude can't find corbat</b></summary>

1. Verify npm/npx is in PATH: `which npx`
2. Test manually: `npx @corbat-tech/coding-standards-mcp`
3. Restart Claude completely
4. Check Claude's MCP logs

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
2. Verify profile exists in `profiles/templates/`
3. Try explicit: *"Use corbat get_context for: your task"*

</details>

<details>
<summary><b>Permission errors (macOS/Linux)</b></summary>

```bash
# Clear npx cache and retry
npx clear-npx-cache
npx @corbat-tech/coding-standards-mcp
```

</details>

---

## Project Quality

| Metric | Value |
|--------|-------|
| Test coverage | 80%+ |
| Tests passing | 78 |
| TypeScript | Strict mode |
| Linting | Biome |
| Architecture validation | dependency-cruiser |

---

## Benchmark Results

We tested Claude generating code **with and without** Corbat MCP across 4 scenarios: service creation, CRUD features, bugfixes, and refactoring.

| Metric | Without MCP | With MCP | Improvement |
|--------|:-----------:|:--------:|:-----------:|
| **Quality Score** | 63/100 | 93/100 | **+48%** |
| **Code Smells** | 13 | 0 | **-100%** |
| **SOLID Compliance** | 50% | 89% | **+78%** |
| **Test Assertions** | 24 | 52 | **+117%** |
| **Cyclomatic Complexity** | 3.2 avg | 2.1 avg | **-34%** |
| **Execution Time** | 48s | 40s | **-17%** |

**Key finding**: Code with Corbat MCP passes SonarQube quality gates. Code without MCP fails.

📊 [View Full Benchmark Report](docs/comparison-tests/RESULTS-REPORT.md)

---

## Links

- [Full Documentation](docs/full-documentation.md)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Report Issues](https://github.com/corbat-tech/coding-standards-mcp/issues)

---

<div align="center">

**Define once. Apply everywhere. Ship faster.**

[Get Started](#quick-start) · [Documentation](docs/full-documentation.md) · [Report Bug](https://github.com/corbat-tech/coding-standards-mcp/issues)

</div>
