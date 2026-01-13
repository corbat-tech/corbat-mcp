# React Test 5: Multi-Step Checkout Wizard

## Prompt

```
Create a CheckoutWizard React component in TypeScript with proper state management.

Requirements:
- 4 steps: Cart Review → Shipping Info → Payment → Confirmation
- Each step validates before allowing next
- Can go back to previous steps (data persisted)
- Step indicators showing current/completed/pending
- Async validation on shipping (address verification API mock)
- Async payment processing with loading state
- Error recovery: if payment fails, stay on payment step with error
- Timeout handling: if payment takes >10s, show retry option

State management:
- Use useReducer for complex state
- Actions: NEXT_STEP, PREV_STEP, SET_FIELD, VALIDATE, SUBMIT, SET_ERROR, RESET
- Derive: canGoNext, canGoBack, isStepComplete from state

Accessibility:
- Announce step changes to screen readers
- Focus management when changing steps
- Proper form labels and error associations

Include tests:
- Full wizard flow (happy path)
- Validation errors on each step
- Back navigation preserves data
- Payment failure and retry
- Timeout handling
- Keyboard navigation
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| State machine | useReducer with proper actions/reducer |
| Step validation | Per-step validation logic |
| Async handling | Loading states, error states, timeout |
| Accessibility | ARIA, focus management, announcements |
| Component structure | Step components, shared wizard logic |
| Error recovery | Graceful failure, retry mechanisms |
| Testing | Step transitions, async operations, a11y |
| Types | Discriminated unions for steps, strict types |

## Output File

- Without MCP: `results-without-mcp/react/test-5-result.tsx`
- With MCP: `results-with-mcp/react/test-5-result.tsx`
