import { describe, expect, it } from 'vitest';
import { tools } from '../src/tools.js';

describe('Tools Definition (Simplified API)', () => {
  it('should have exactly 5 tools', () => {
    expect(tools).toHaveLength(5);
  });

  it('should have get_context tool (PRIMARY)', () => {
    const tool = tools.find((t) => t.name === 'get_context');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('PRIMARY');
    expect(tool?.description).toContain('COMPLETE');
    expect(tool?.inputSchema.properties).toHaveProperty('task');
    expect(tool?.inputSchema.required).toContain('task');
  });

  it('should have validate tool', () => {
    const tool = tools.find((t) => t.name === 'validate');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Validate');
    expect(tool?.inputSchema.properties).toHaveProperty('code');
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('should have search tool', () => {
    const tool = tools.find((t) => t.name === 'search');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Search');
    expect(tool?.inputSchema.properties).toHaveProperty('query');
    expect(tool?.inputSchema.required).toContain('query');
  });

  it('should have profiles tool', () => {
    const tool = tools.find((t) => t.name === 'profiles');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('profiles');
  });

  it('should have health tool', () => {
    const tool = tools.find((t) => t.name === 'health');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('status');
  });

  it('should have valid input schemas for all tools', () => {
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('should have optional project_dir for get_context', () => {
    const tool = tools.find((t) => t.name === 'get_context');
    expect(tool?.inputSchema.properties).toHaveProperty('project_dir');
    expect(tool?.inputSchema.required).not.toContain('project_dir');
  });

  it('should have optional task_type for validate', () => {
    const tool = tools.find((t) => t.name === 'validate');
    expect(tool?.inputSchema.properties).toHaveProperty('task_type');
    expect(tool?.inputSchema.required).not.toContain('task_type');
  });
});
