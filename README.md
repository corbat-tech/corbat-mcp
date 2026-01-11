# Corbat MCP

<div align="center">

```
  ____  ___  ____  ____    _  _____   __  __  ____  ____
 / ___|/ _ \|  _ \| __ )  / \|_   _| |  \/  |/ ___||  _ \
| |   | | | | |_) |  _ \ / _ \ | |   | |\/| | |    | |_) |
| |___| |_| |  _ <| |_) / ___ \| |   | |  | | |___ |  __/
 \____|\___/|_| \_\____/_/   \_\_|   |_|  |_|\____||_|
```

**Your coding standards, always at hand.**

[![CI](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/victormartingil/corbat-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## What is this?

**Corbat MCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that provides your coding standards to AI assistants. It ensures consistent, high-quality code by making your team's guidelines available as context.

**In simple terms:** You define your coding rules in YAML files, and any MCP-compatible AI (like Claude) can read and apply them.

### Key Features

- **Multi-Stack Support** - Ready-to-use profiles for Java/Spring, Node.js, Python, and Frontend
- **Searchable Standards** - Find specific topics (kafka, testing, docker) instantly
- **Extensible** - Add your own profiles and documentation easily
- **Zero Config** - Works out of the box with sensible defaults

---

## Quick Start (TL;DR)

```bash
# 1. Clone & build
git clone https://github.com/victormartingil/corbat-mcp.git
cd corbat-mcp && npm install && npm run build

# 2. Add to Claude Code settings (~/.config/claude-code/settings.json)
{
  "mcpServers": {
    "corbat": {
      "command": "node",
      "args": ["/absolute/path/to/corbat-mcp/dist/index.js"]
    }
  }
}

# 3. Use it!
# In Claude: "Review this code using corbat standards"
```

**That's it.** Claude now has access to your coding standards.

---

## Available Profiles

Choose the profile that matches your tech stack:

| Profile | Stack | Best For |
|---------|-------|----------|
| `java-spring-backend` | Java + Spring Boot | Enterprise backend with Hexagonal, DDD, CQRS |
| `nodejs` | Node.js + TypeScript | Backend APIs with Express/Fastify, Prisma |
| `python` | Python + FastAPI | Backend with SQLAlchemy, async, type hints |
| `frontend` | React/Vue + TypeScript | SPAs with component architecture, state management |
| `minimal` | Any | MVPs, prototypes, small projects |

**Usage:**
```bash
# In Claude
"Review this code using corbat with profile nodejs"
"Apply python standards from corbat"
```

---

## How It Works

### The Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR ENVIRONMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   profiles/  │         │  standards/  │                     │
│  │  templates/  │         │              │                     │
│  │  custom/     │         │ *.md files   │                     │
│  │              │         │              │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         └──────────┬─────────────┘                              │
│                    ▼                                            │
│         ┌──────────────────┐                                    │
│         │   CORBAT MCP     │                                    │
│         │     SERVER       │◄──── stdio transport ────┐        │
│         └────────┬─────────┘                          │        │
│                  │                                     │        │
│         Exposes: │                                     │        │
│         • Tools  │                                     │        │
│         • Resources                                    │        │
│         • Prompts                                      │        │
│                  │                                     │        │
└──────────────────┼─────────────────────────────────────┼────────┘
                   │                                     │
                   ▼                                     │
         ┌──────────────────┐                           │
         │   CLAUDE CODE    │───────────────────────────┘
         │   (MCP Client)   │
         └──────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │   YOU: "Review   │
         │   this code..."  │
         └──────────────────┘
```

### Step by Step

1. **You start Claude Code** → It reads your MCP settings and spawns `corbat-mcp`
2. **Claude discovers capabilities** → The server tells Claude what tools/resources are available
3. **You ask Claude something** → "Review this code using my standards"
4. **Claude calls the MCP tool** → `get_coding_standards` with profile="java-spring-backend"
5. **Corbat returns context** → Your architecture rules, naming conventions, quality thresholds...
6. **Claude applies them** → Reviews your code against YOUR standards, not generic ones

### What Gets Exposed

| Type | Name | What It Does |
|------|------|--------------|
| **Tool** | `get_coding_standards` | Returns full standards for a profile |
| **Tool** | `list_profiles` | Lists available profiles |
| **Tool** | `get_architecture_guidelines` | Returns architecture rules only |
| **Tool** | `get_naming_conventions` | Returns naming rules only |
| **Tool** | `search_standards` | Search docs for specific topics |
| **Resource** | `corbat://profiles/{id}` | Read a profile as markdown |
| **Resource** | `corbat://standards/{category}` | Read standards by category |
| **Prompt** | `code_review` | Pre-built prompt for code review |
| **Prompt** | `refactor_suggestion` | Pre-built prompt for refactoring |
| **Prompt** | `architecture_check` | Pre-built prompt for arch validation |

---

## Project Structure

```
corbat-mcp/
├── src/
│   ├── index.ts      # MCP server entry point
│   ├── config.ts     # Configuration with Zod validation
│   ├── types.ts      # TypeScript types & schemas
│   ├── profiles.ts   # Profile & standards loading
│   ├── tools.ts      # MCP tools implementation
│   ├── resources.ts  # MCP resources implementation
│   └── prompts.ts    # MCP prompts implementation
├── profiles/
│   ├── templates/                # Official profiles (don't edit)
│   │   ├── java-spring-backend.yaml  # Java/Spring Boot enterprise
│   │   ├── nodejs.yaml               # Node.js/TypeScript
│   │   ├── python.yaml               # Python/FastAPI
│   │   ├── frontend.yaml             # React/Vue frontend
│   │   ├── minimal.yaml              # Lightweight for MVPs
│   │   └── _template.yaml            # Base for custom profiles
│   └── custom/                   # Your custom profiles
├── standards/
│   ├── architecture/
│   │   ├── hexagonal.md
│   │   └── ddd.md
│   ├── clean-code/
│   │   ├── principles.md
│   │   └── naming.md
│   ├── spring-boot/
│   │   └── best-practices.md
│   └── testing/
│       └── guidelines.md
├── tests/
├── package.json
└── tsconfig.json
```

---

## Profiles

Profiles are YAML files that define your coding standards:

```yaml
# profiles/custom/my-project.yaml
name: "My Team Standards"
description: "Backend coding standards"

architecture:
  type: hexagonal
  enforceLayerDependencies: true

ddd:
  enabled: true
  patterns:
    aggregates: true
    valueObjects: true
    domainEvents: true

codeQuality:
  maxMethodLines: 20
  maxClassLines: 200
  minimumTestCoverage: 80

naming:
  class: PascalCase
  method: camelCase
  constant: SCREAMING_SNAKE_CASE
```

### Create Your Own

1. Copy the template: `cp profiles/templates/_template.yaml profiles/custom/my-project.yaml`
2. Edit with your standards
3. Use it: `"Apply corbat standards with profile my-project"`

Custom profiles in `profiles/custom/` can override official templates.

---

## Standards Documentation

The `standards/` folder contains Markdown files that get included in the context:

- `architecture/hexagonal.md` - Hexagonal architecture guide
- `architecture/ddd.md` - Domain-Driven Design patterns
- `clean-code/principles.md` - Clean Code principles
- `clean-code/naming.md` - Naming conventions
- `spring-boot/best-practices.md` - Spring Boot guidelines
- `testing/guidelines.md` - Testing best practices

**Add your own:** Create any `.md` file in a subfolder, it will be auto-discovered.

---

## Usage Examples

### With Claude Code

```bash
# Review code
"Review this Java class using corbat standards"

# Get specific guidelines
"What are the naming conventions in corbat?"

# Check architecture
"Does this code follow hexagonal architecture according to corbat?"
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORBAT_PROFILES_DIR` | `./profiles` | Profiles directory |
| `CORBAT_STANDARDS_DIR` | `./standards` | Standards directory |
| `CORBAT_DEFAULT_PROFILE` | `java-spring-backend` | Default profile ID |

---

## Development

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run dev       # Run with hot reload
npm test          # Run tests
```

---

## Technical Details

### MCP Protocol

This server implements the [Model Context Protocol](https://modelcontextprotocol.io/), using:

- **Transport:** STDIO (stdin/stdout for communication)
- **SDK:** `@modelcontextprotocol/sdk` v1.x
- **Validation:** Zod schemas for all inputs

### Why STDIO?

For local MCP servers (like this one), STDIO is the recommended transport:
- No network configuration needed
- Claude Code spawns the process directly
- Simple and reliable

### Logging

**Important:** This server logs to `stderr` only. In STDIO transport, `stdout` is reserved for protocol messages.

---

## Troubleshooting

### Server not starting

```bash
# Check if it runs directly
node dist/index.js

# Should output nothing (waits for stdin)
# If you see errors, fix them first
```

### "Unknown tool" errors

Make sure you built the project:
```bash
npm run build
```

### Profile not found

1. Check the profile exists in `profiles/templates/` or `profiles/custom/`
2. Verify the filename matches (without `.yaml` extension)
3. Check YAML syntax is valid

### Standards not showing

1. Verify markdown files exist in `standards/` directory
2. Check file permissions
3. Ensure files have `.md` extension

### Claude can't find the MCP

1. Verify the path in settings is absolute
2. Check `node` is in your PATH
3. Restart Claude Code after changing settings

### Debug mode

Set environment variable for verbose logging:
```bash
DEBUG=corbat:* node dist/index.js
```

### Common configuration issues

**WRONG** - relative path:
```json
{
  "args": ["./corbat-mcp/dist/index.js"]
}
```

**CORRECT** - absolute path:
```json
{
  "args": ["/Users/yourname/corbat-mcp/dist/index.js"]
}
```

---

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/cool-thing`)
3. Commit your changes (`git commit -m 'Add cool thing'`)
4. Push (`git push origin feature/cool-thing`)
5. Open a Pull Request

---

## License

MIT - see [LICENSE](LICENSE)

---

<div align="center">

**Stop fighting about code style. Define it once, use it everywhere.**

</div>
