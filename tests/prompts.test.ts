import { describe, expect, it } from 'vitest';
import { prompts } from '../src/prompts.js';

describe('Prompts Definition', () => {
  it('should have code_review prompt', () => {
    const prompt = prompts.find((p) => p.name === 'code_review');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('Review code');
    expect(prompt?.arguments).toHaveLength(2);
  });

  it('should have refactor_suggestion prompt', () => {
    const prompt = prompts.find((p) => p.name === 'refactor_suggestion');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('refactoring');
  });

  it('should have architecture_check prompt', () => {
    const prompt = prompts.find((p) => p.name === 'architecture_check');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('architecture');
  });

  it('should have 3 prompts total', () => {
    expect(prompts).toHaveLength(3);
  });

  it('should require code argument for code_review', () => {
    const prompt = prompts.find((p) => p.name === 'code_review');
    const codeArg = prompt?.arguments.find((a) => a.name === 'code');

    expect(codeArg?.required).toBe(true);
  });

  it('should have optional profile argument for all prompts', () => {
    for (const prompt of prompts) {
      const profileArg = prompt.arguments.find((a) => a.name === 'profile');
      expect(profileArg?.required).toBe(false);
    }
  });
});
