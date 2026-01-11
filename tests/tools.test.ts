import { describe, it, expect } from 'vitest';
import { tools } from '../src/tools.js';

describe('Tools Definition', () => {
  it('should have get_coding_standards tool', () => {
    const tool = tools.find((t) => t.name === 'get_coding_standards');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('coding standards');
    expect(tool?.inputSchema.properties).toHaveProperty('profile');
  });

  it('should have list_profiles tool', () => {
    const tool = tools.find((t) => t.name === 'list_profiles');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('profiles');
  });

  it('should have get_architecture_guidelines tool', () => {
    const tool = tools.find((t) => t.name === 'get_architecture_guidelines');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('architecture');
  });

  it('should have get_naming_conventions tool', () => {
    const tool = tools.find((t) => t.name === 'get_naming_conventions');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('naming');
  });

  it('should have search_standards tool', () => {
    const tool = tools.find((t) => t.name === 'search_standards');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Search');
    expect(tool?.inputSchema.properties).toHaveProperty('query');
    expect(tool?.inputSchema.required).toContain('query');
  });

  it('should have 5 tools total', () => {
    expect(tools).toHaveLength(5);
  });

  it('should have valid input schemas', () => {
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });
});
