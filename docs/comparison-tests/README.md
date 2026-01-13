# CORBAT Benchmark Suite v2.0

Reproducible benchmarks comparing AI-generated code quality **with and without** Corbat MCP.

---

## Quick Start (3 Steps)

### Step 1: Run WITHOUT MCP

```bash
# Disable Corbat MCP
claude mcp remove corbat

# Open NEW conversation, paste prompt from:
# RUN-TESTS-WITHOUT-MCP.md
```

### Step 2: Run WITH MCP

```bash
# Enable Corbat MCP
claude mcp add corbat -- npx -y @corbat-tech/coding-standards-mcp

# Open NEW conversation, paste prompt from:
# RUN-TESTS-WITH-MCP.md
```

### Step 3: Analyze Results

```bash
# Paste prompt from:
# ANALYZE-RESULTS.md
```

---

## Test Matrix

**20 tests** across 4 stacks, covering 5 scenarios (4 basic + 1 advanced):

| Stack | Create | CRUD/API | Bugfix | Refactor | Advanced |
|-------|:------:|:--------:|:------:|:--------:|:--------:|
| **TypeScript** | UserService | ProductService | NaN bug | processOrder | Event-driven |
| **Java Spring** | UserService | REST Products | NPE bug | PaymentService | Saga pattern |
| **React** | UserCard | ContactForm | Re-render bug | Custom hooks | Checkout wizard |
| **Python** | UserService | FastAPI Products | TypeError bug | process_order | Async aggregator |

### Test Types

| Type | What It Evaluates |
|------|-------------------|
| **Create** | Architecture, interfaces, DI, validation |
| **CRUD/API** | DTOs, error handling, HTTP conventions |
| **Bugfix** | Test-first approach, root cause analysis |
| **Refactor** | SOLID principles, code extraction, testability |
| **Advanced** | Async, transactions, state machines, concurrency |

---

## Metrics Collected

### Quantitative
- Lines of Code (LOC)
- Cyclomatic Complexity
- Cognitive Complexity
- Test count & assertions
- Code smells count

### Qualitative
- SOLID compliance (0-100%)
- Architecture patterns
- Type safety
- Error handling
- Test coverage categories

---

## Folder Structure

```
comparison-tests/
├── README.md                     # This file
├── RUN-TESTS-WITHOUT-MCP.md      # Step 1: Execute without MCP
├── RUN-TESTS-WITH-MCP.md         # Step 2: Execute with MCP
├── ANALYZE-RESULTS.md            # Step 3: Generate report
├── RESULTS-REPORT.md             # Generated analysis
├── prompts/                      # Individual test prompts
│   ├── typescript/
│   │   ├── 01-create-service.md
│   │   ├── 02-crud-feature.md
│   │   ├── 03-bugfix.md
│   │   ├── 04-refactor.md
│   │   └── 05-event-driven.md
│   ├── java-spring/
│   │   ├── 01-create-service.md
│   │   ├── 02-rest-endpoint.md
│   │   ├── 03-bugfix.md
│   │   ├── 04-refactor.md
│   │   └── 05-transaction-saga.md
│   ├── react/
│   │   ├── 01-create-component.md
│   │   ├── 02-form-validation.md
│   │   ├── 03-bugfix.md
│   │   ├── 04-refactor-hooks.md
│   │   └── 05-checkout-wizard.md
│   └── python/
│       ├── 01-create-service.md
│       ├── 02-fastapi-endpoint.md
│       ├── 03-bugfix.md
│       ├── 04-refactor.md
│       └── 05-async-aggregator.md
├── results-without-mcp/          # Generated code (no MCP)
│   ├── typescript/
│   ├── java-spring/
│   ├── react/
│   ├── python/
│   └── metrics.json
└── results-with-mcp/             # Generated code (with MCP)
    ├── typescript/
    ├── java-spring/
    ├── react/
    ├── python/
    └── metrics.json
```

---

## Running Individual Stacks

If you want to test just one stack:

1. Read the prompts in `prompts/<stack>/`
2. Modify the master prompts to include only that stack
3. Run the tests

---

## Expected Results

Based on previous benchmarks:

| Metric | Without MCP | With MCP | Expected Improvement |
|--------|:-----------:|:--------:|:--------------------:|
| Quality Score | ~65/100 | ~93/100 | +40-50% |
| Code Smells | 10-15 | 0-2 | -80-100% |
| SOLID Compliance | ~50% | ~90% | +70-80% |
| Test Assertions | baseline | +100% | +100%+ |

---

## Interpreting Results

### Quality Score Breakdown

| Range | Interpretation |
|-------|----------------|
| 90-100 | Enterprise-grade, passes all quality gates |
| 75-89 | Good quality, minor improvements possible |
| 60-74 | Acceptable, some technical debt |
| <60 | Below standard, significant issues |

### SOLID Compliance

| Score | Interpretation |
|-------|----------------|
| 90%+ | Excellent architecture |
| 70-89% | Good separation of concerns |
| 50-69% | Some coupling issues |
| <50% | Poor architecture |

---

## Contributing New Tests

1. Create prompt in `prompts/<stack>/XX-description.md`
2. Follow the existing format:
   - Clear prompt
   - Expected evaluation points table
   - Output file path
3. Update the master prompts to include the new test
4. Update this README

---

## Previous Results

See [RESULTS-REPORT.md](RESULTS-REPORT.md) for the latest benchmark results.

---

## Version History

- **v2.1** - Added 4 advanced tests (event-driven, saga, wizard, async)
- **v2.0** - Expanded to 16 tests across 4 stacks
- **v1.0** - Initial 4 TypeScript tests
