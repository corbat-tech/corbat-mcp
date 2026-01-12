<div align="center">

# CORBAT

**AI coding standards that apply themselves**

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

</div>

---

## What is Corbat?

An MCP server that makes AI assistants follow your coding standards **automatically**.

```
You: "Create a payment service @corbat"

AI: [Auto-applies architecture, TDD, naming conventions, guardrails...]
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
<summary>Claude can't find corbat</summary>

- Use **absolute path** in config
- Ensure `node` is in PATH
- Restart Claude
</details>

<details>
<summary>Profile not found</summary>

- Check `profiles/templates/` or `profiles/custom/`
- Filename = profile ID (without .yaml)
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
