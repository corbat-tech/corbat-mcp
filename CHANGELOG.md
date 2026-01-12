# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `search_standards` tool for querying documentation by topic (kafka, docker, testing, etc.)
- Enhanced Zod schemas for CQRS, Event-Driven, ArchUnit, HttpClients, Observability
- New profiles for different tech stacks:
  - `minimal.yaml` - Lightweight standards for MVPs and small projects
  - `nodejs.yaml` - Node.js/TypeScript backend standards
  - `python.yaml` - Python/FastAPI backend standards
  - `react.yaml` - React + TypeScript standards
- GitHub Actions CI workflow with multi-node testing
- Test coverage thresholds (80% lines, 70% branches)
- Troubleshooting section in README
- Integration tests for handlers and resources
- Cache TTL for profile hot-reloading

### Changed
- Improved markdown output with detailed sections for architecture, DDD, CQRS
- Enhanced naming conventions output with nested structure support
- Better error messages for profile/resource not found

## [1.0.0] - 2024-01-10

### Added
- Initial release of Corbat MCP
- MCP server implementation with STDIO transport
- 4 core tools:
  - `get_coding_standards` - Get complete standards for a profile
  - `list_profiles` - List available profiles
  - `get_architecture_guidelines` - Get architecture rules
  - `get_naming_conventions` - Get naming conventions
- MCP resources:
  - `corbat://profiles` - List all profiles
  - `corbat://profiles/{id}` - Get specific profile
  - `corbat://standards` - Get all standards
  - `corbat://standards/{category}` - Get standards by category
- MCP prompts:
  - `code_review` - Review code against standards
  - `refactor_suggestion` - Suggest refactoring based on standards
  - `architecture_check` - Validate architecture compliance
- `default.yaml` profile with enterprise Java/Spring Boot standards:
  - Hexagonal Architecture
  - Domain-Driven Design (DDD)
  - CQRS patterns
  - Event-Driven Architecture
  - Code quality rules
  - Testing guidelines (JUnit5, Testcontainers, ArchUnit)
  - Observability (logging, metrics, tracing)
- Standards documentation:
  - `architecture/hexagonal.md`
  - `architecture/ddd.md`
  - `clean-code/principles.md`
  - `clean-code/naming.md`
  - `testing/guidelines.md`
  - `spring-boot/best-practices.md`
  - `event-driven/domain-events.md`
  - `observability/guidelines.md`
  - `containerization/dockerfile.md`
  - `kubernetes/deployment.md`
  - `cicd/github-actions.md`
  - `database/selection-guide.md`
  - `project-setup/initialization-checklist.md`
- Zod schema validation for all profile configurations
- Profile caching for performance
- Environment variable configuration

### Technical
- TypeScript with strict mode
- ESM modules
- Vitest for testing
- @modelcontextprotocol/sdk v1.x

---

## How to Update This Changelog

When making changes:

1. Add entries under `[Unreleased]`
2. Use these categories:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for any bug fixes
   - `Security` for vulnerability fixes

3. When releasing, rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`
