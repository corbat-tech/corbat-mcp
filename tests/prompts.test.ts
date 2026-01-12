import { describe, expect, it } from 'vitest';
import { prompts } from '../src/prompts.js';

describe('Prompts Definition (Simplified API)', () => {
  it('should have exactly 2 prompts', () => {
    expect(prompts).toHaveLength(2);
  });

  it('should have implement prompt', () => {
    const prompt = prompts.find((p) => p.name === 'implement');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('implementation');
    expect(prompt?.arguments).toHaveLength(2);
  });

  it('should have review prompt', () => {
    const prompt = prompts.find((p) => p.name === 'review');

    expect(prompt).toBeDefined();
    expect(prompt?.description).toContain('Review');
    expect(prompt?.arguments).toHaveLength(2);
  });

  it('should require task argument for implement', () => {
    const prompt = prompts.find((p) => p.name === 'implement');
    const taskArg = prompt?.arguments.find((a) => a.name === 'task');

    expect(taskArg).toBeDefined();
    expect(taskArg?.required).toBe(true);
  });

  it('should have optional project_dir for implement', () => {
    const prompt = prompts.find((p) => p.name === 'implement');
    const projectDirArg = prompt?.arguments.find((a) => a.name === 'project_dir');

    expect(projectDirArg).toBeDefined();
    expect(projectDirArg?.required).toBe(false);
  });

  it('should require code argument for review', () => {
    const prompt = prompts.find((p) => p.name === 'review');
    const codeArg = prompt?.arguments.find((a) => a.name === 'code');

    expect(codeArg).toBeDefined();
    expect(codeArg?.required).toBe(true);
  });

  it('should have optional role for review', () => {
    const prompt = prompts.find((p) => p.name === 'review');
    const roleArg = prompt?.arguments.find((a) => a.name === 'role');

    expect(roleArg).toBeDefined();
    expect(roleArg?.required).toBe(false);
  });
});
