import { describe, expect, it } from 'vitest';
import { handleToolCall } from '../src/tools.js';

describe('health_check tool', () => {
  it('should return healthy status with profile and standards info', async () => {
    const result = await handleToolCall('health_check', {});

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('# Corbat MCP Health Check');
    expect(text).toContain('**Status:** healthy');
    expect(text).toContain('**Version:**');
    expect(text).toContain('## Profiles');
    expect(text).toContain('## Standards');
    expect(text).toContain('## Configuration');
    expect(text).toContain('## Performance');
  });

  it('should include profile count and IDs', async () => {
    const result = await handleToolCall('health_check', {});
    const text = result.content[0].text;

    expect(text).toContain('- Count:');
    expect(text).toContain('- Available:');
  });

  it('should include standards categories', async () => {
    const result = await handleToolCall('health_check', {});
    const text = result.content[0].text;

    expect(text).toContain('- Documents:');
    expect(text).toContain('- Categories:');
  });

  it('should include performance metrics', async () => {
    const result = await handleToolCall('health_check', {});
    const text = result.content[0].text;

    expect(text).toContain('- Load Time:');
    expect(text).toMatch(/Load Time: \d+ms/);
  });

  it('should include timestamp in ISO format', async () => {
    const result = await handleToolCall('health_check', {});
    const text = result.content[0].text;

    expect(text).toContain('**Timestamp:**');
    // ISO format check
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
