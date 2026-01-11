# Documentation Standards

## Principles

1. **Document everything you create** - All code, features, and changes must be documented
2. **Keep it concise** - Professional, to the point, complete but not extensive
3. **No redundancy** - Avoid copying code unnecessarily; reference it instead
4. **Always up-to-date** - Update docs when code changes

## README Style Guide

Follow the modern GitHub README pattern used by successful repositories:

### Header Structure

```markdown
<div align="center">

# 🔧 Project Name

### Short Description

*Tagline or value proposition*

<br>

[![Badge1](url)](link) [![Badge2](url)](link)

<br>

[Section 1](#section-1) · [Section 2](#section-2) · [Section 3](#section-3)

</div>
```

### Section Guidelines

| Section | Purpose | Style |
|---------|---------|-------|
| **What is this?** | Brief explanation | 2-3 sentences max |
| **Quick Start** | Get running fast | Minimal steps, copy-paste ready |
| **Features** | Key capabilities | Bullet points or table |
| **Installation** | Setup instructions | Code blocks with comments |
| **Usage** | How to use | Examples with context |
| **Configuration** | Options available | Table format preferred |
| **API/Reference** | Technical details | Tables, concise descriptions |
| **Troubleshooting** | Common issues | Collapsible `<details>` sections |
| **Contributing** | How to help | Brief numbered steps |

### Best Practices

- **Use tables** for structured data (configs, options, comparisons)
- **Use collapsible sections** for detailed/optional content:
  ```markdown
  <details>
  <summary><b>Click to expand</b></summary>

  Detailed content here...

  </details>
  ```
- **Use badges** for status, version, license (shields.io)
- **Use diagrams** for architecture (ASCII in code blocks or Mermaid)
- **Link, don't duplicate** - Reference other docs instead of copying

## Code Documentation

### What to Document

| Element | Required | Format |
|---------|----------|--------|
| Public functions | Yes | JSDoc/docstring with params, return, example |
| Classes | Yes | Purpose, usage example |
| Complex logic | Yes | Inline comments explaining "why" |
| Config options | Yes | Type, default, description |
| API endpoints | Yes | Method, path, params, response |

### What NOT to Document

- Self-explanatory code (e.g., `getUserById(id)`)
- Implementation details that may change
- Obvious variable names
- Boilerplate code

### Comment Style

```typescript
/**
 * Calculates the total price with tax.
 *
 * @param price - Base price without tax
 * @param taxRate - Tax rate as decimal (0.21 for 21%)
 * @returns Total price including tax
 *
 * @example
 * calculateTotal(100, 0.21) // returns 121
 */
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

## Documentation Review Cycle

**Every piece of documentation must go through 3 review iterations:**

### Iteration 1: Initial Draft
1. Write the documentation
2. Self-review for completeness
3. Rate it (1-10) with brief justification
4. Identify areas for improvement

### Iteration 2: Refinement
1. Address identified issues
2. Check for clarity and conciseness
3. Remove redundancies
4. Rate again and compare to previous

### Iteration 3: Polish
1. Final grammar and formatting check
2. Verify all links work
3. Ensure consistency with project style
4. Final rating (should be 8+)

### Rating Criteria

| Score | Meaning | Action |
|-------|---------|--------|
| 9-10 | Excellent | Ready to merge |
| 7-8 | Good | Minor improvements needed |
| 5-6 | Acceptable | Significant revision needed |
| 1-4 | Poor | Rewrite required |

### Review Checklist

- [ ] Is it complete? All features/changes documented?
- [ ] Is it concise? No unnecessary words or code?
- [ ] Is it clear? Would a new developer understand?
- [ ] Is it correct? Matches actual implementation?
- [ ] Is it consistent? Follows project style guide?
- [ ] Is it current? No outdated information?

## File Organization

```
docs/
├── README.md           # Project overview (follows header style)
├── CONTRIBUTING.md     # How to contribute
├── CHANGELOG.md        # Version history
└── api/                # API documentation
    └── endpoints.md

standards/              # Coding standards (this project)
├── documentation/
│   └── guidelines.md   # This file
├── architecture/
└── testing/
```

## Changelog Format

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.2.0] - 2026-01-15

### Added
- New feature X for Y purpose

### Changed
- Improved Z performance by 50%

### Fixed
- Bug where A caused B

### Removed
- Deprecated method C
```

## Summary

| Do | Don't |
|----|-------|
| Be concise and direct | Write walls of text |
| Use examples | Explain without showing |
| Keep docs with code | Separate docs repository |
| Update on every change | Let docs get stale |
| Review in 3 iterations | Ship first draft |
| Rate your own work | Skip self-review |
