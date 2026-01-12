<div align="center">

# CORBAT

**AI coding standards that apply themselves**

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

</div>

---

## Why Corbat?

**The problem:** Every time you ask AI to write code, you repeat the same instructions:
> "Use hexagonal architecture", "Follow TDD", "Apply SOLID", "Use our naming conventions"...

**The solution:** Define your standards once. Corbat injects them automatically.

| Without Corbat | With Corbat |
|----------------|-------------|
| "Create a payment service. Use hexagonal architecture, follow TDD, apply SOLID principles, use camelCase for methods, PascalCase for classes, ensure 80% coverage..." | "Create a payment service @corbat" |

---

## What is Corbat?

An MCP server that makes AI assistants follow your coding standards **automatically**.

```
You: "Create a payment service @corbat"

AI: [Auto-detects Java/Spring, applies hexagonal architecture, TDD workflow,
     SOLID principles, your naming conventions, 80%+ coverage requirement...]
```

**No more repeating** "use hexagonal", "follow TDD", "apply SOLID"...

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/victormartingil/corbat-mcp.git
cd corbat-mcp && npm install && npm run build
```

### 2. Connect to Claude

**Claude Code:**
```bash
claude mcp add corbat node /path/to/corbat-mcp/dist/index.js
```

**Claude Desktop:** Edit `~/.config/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "corbat": {
      "command": "node",
      "args": ["/path/to/corbat-mcp/dist/index.js"]
    }
  }
}
```

### 3. Use it

```
"Create a user service @corbat"
```

**Done!** Corbat auto-detects your stack and applies standards.

---

## Compatibility

| Client | Status | Notes |
|--------|--------|-------|
| Claude Code (CLI) | Tested | Full support |
| Claude Desktop | Tested | Full support |
| Cursor | Experimental | MCP support required |
| Windsurf | Experimental | MCP support required |
| Other MCP clients | Should work | Standard MCP protocol |

---

## Real-World Examples

### Creating a new feature
```
You: "Create a payment service with Stripe integration @corbat"

Corbat injects:
  Stack: Java 21 + Spring Boot (auto-detected)
  Task: FEATURE

  MUST:
  - Write tests BEFORE implementation (TDD)
  - Use hexagonal architecture (port + adapter for Stripe)
  - Apply SOLID principles
  - Ensure 80%+ test coverage

  AVOID:
  - Coupling domain logic to Stripe SDK
  - God classes or methods > 20 lines
```

### Fixing a bug
```
You: "Fix the null pointer in OrderService.calculateTotal @corbat"

Corbat injects:
  Task: BUGFIX

  MUST:
  - Write a failing test that reproduces the bug FIRST
  - Make minimal changes to fix
  - Verify no regression in existing tests

  AVOID:
  - Refactoring unrelated code
  - Adding features while fixing
```

### Refactoring code
```
You: "Refactor UserRepository to use the new database layer @corbat"

Corbat injects:
  Task: REFACTOR

  MUST:
  - Ensure ALL tests pass BEFORE starting
  - Make incremental changes
  - Tests must pass AFTER each change
  - No behavior modifications

  AVOID:
  - Changing public interfaces without updating callers
  - Mixing refactor with new features
```

### Code review
```
You: "Review this pull request @corbat"

Corbat triggers expert review:
  - Architecture compliance check
  - SOLID principles validation
  - Test coverage analysis
  - Security review (OWASP top 10)
  - Naming conventions check
```

---

## Tools

| Tool | Description |
|------|-------------|
| `get_context` | **Primary** - Get all standards for a task |
| `validate` | Check code against standards |
| `search` | Search documentation |
| `profiles` | List available profiles |
| `health` | Server status |

## Prompts

| Prompt | Description |
|--------|-------------|
| `implement` | Guided implementation with workflow |
| `review` | Expert code review |

---

## How it works

When you mention `@corbat`:

1. **Detects** your project stack (Java, Node, Python...)
2. **Classifies** your task (feature, bugfix, refactor...)
3. **Applies** guardrails for that task type
4. **Injects** architecture, naming, and workflow

### Example output from `get_context`

```
# Context for: Create payment service

**Stack:** Java · Spring Boot · Maven
**Task type:** FEATURE
**Profile:** java-spring-backend

## Guardrails
**MUST:**
- Follow TDD: write tests before implementation
- Ensure 80%+ unit test coverage
- Apply SOLID principles

**AVOID:**
- God classes or methods
- Mixing business logic with infrastructure

## Workflow
1. CLARIFY  → Ask if unclear
2. PLAN     → Task checklist
3. BUILD    → TDD: Test → Code → Refactor
4. VERIFY   → Tests pass, linter clean
5. REVIEW   → Self-check as expert
```

---

## Configure (optional)

For custom standards, run in your project:

```bash
npx /path/to/corbat-mcp/dist/cli/init.js
```

Or create `.corbat.json` manually:

```json
{
  "profile": "nodejs",
  "rules": {
    "always": ["Use TypeScript strict mode"]
  }
}
```

---

## Profiles

| Profile | Stack |
|---------|-------|
| `java-spring-backend` | Java 21, Spring Boot (default) |
| `nodejs` | Node.js, TypeScript |
| `python` | Python, FastAPI |
| `frontend` | React, Vue, Angular |
| `minimal` | Basic standards |

---

## Troubleshooting

<details>
<summary><b>Claude can't find corbat</b></summary>

1. Use **absolute path** in config (not relative)
2. Verify the path exists: `ls /your/path/to/corbat-mcp/dist/index.js`
3. Ensure `node` is in PATH: `which node`
4. Restart Claude completely (quit and reopen)
5. Check Claude's MCP logs for errors
</details>

<details>
<summary><b>Profile not found</b></summary>

1. Check file exists in `profiles/templates/` or `profiles/custom/`
2. Filename must end in `.yaml` (not `.yml`)
3. Profile ID = filename without extension (e.g., `nodejs.yaml` → `nodejs`)
4. Run `node dist/index.js` and use `profiles` tool to list available
</details>

<details>
<summary><b>Standards not being applied</b></summary>

1. Ensure you mention `@corbat` in your message
2. Check if `.corbat.json` exists in your project root
3. Verify the profile specified in `.corbat.json` exists
4. Try explicitly: "Use corbat get_context for: your task here"
</details>

<details>
<summary><b>Wrong stack detected</b></summary>

1. Corbat auto-detects based on `package.json`, `pom.xml`, `requirements.txt`, etc.
2. Override by creating `.corbat.json` with explicit profile:
   ```json
   { "profile": "nodejs" }
   ```
3. Or specify in your prompt: "...using profile nodejs @corbat"
</details>

<details>
<summary><b>Permission errors on macOS/Linux</b></summary>

```bash
# Ensure the script is executable
chmod +x /path/to/corbat-mcp/dist/index.js

# If using nvm, ensure node path is absolute
which node  # Use this path in config
```
</details>

---

## Links

- [Full Documentation](docs/full-documentation.md)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Report Issues](https://github.com/victormartingil/corbat-mcp/issues)

---

<div align="center">

**Define once, apply everywhere.**

</div>
