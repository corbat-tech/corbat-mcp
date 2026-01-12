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

  it('should have implement_feature prompt', () => {
    const prompt = prompts.find((p) => p.name === 'implement_feature');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('workflow');
    expect(prompt?.arguments.find((a) => a.name === 'feature')?.required).toBe(true);
  });

  it('should have expert_review prompt', () => {
    const prompt = prompts.find((p) => p.name === 'expert_review');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('expert review');
    expect(prompt?.arguments.find((a) => a.name === 'role')?.required).toBe(true);
  });

  // Agent Mode Prompts
  it('should have agent_mode prompt', () => {
    const prompt = prompts.find((p) => p.name === 'agent_mode');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('AGENT MODE');
    expect(prompt?.arguments.find((a) => a.name === 'task')?.required).toBe(true);
  });

  it('should have quick_implement prompt', () => {
    const prompt = prompts.find((p) => p.name === 'quick_implement');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('Quick implementation');
    expect(prompt?.arguments.find((a) => a.name === 'task')?.required).toBe(true);
  });

  it('should have 7 prompts total (5 original + 2 agent mode)', () => {
    expect(prompts).toHaveLength(7);
  });

  it('should require code argument for code_review', () => {
    const prompt = prompts.find((p) => p.name === 'code_review');
    const codeArg = prompt?.arguments.find((a) => a.name === 'code');

    expect(codeArg?.required).toBe(true);
  });

  it('should have optional profile argument for prompts that use it', () => {
    const promptsWithProfile = prompts.filter((p) => p.arguments.some((a) => a.name === 'profile'));

    for (const prompt of promptsWithProfile) {
      const profileArg = prompt.arguments.find((a) => a.name === 'profile');
      expect(profileArg?.required).toBe(false);
    }
  });
});
