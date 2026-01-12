import { describe, expect, it } from 'vitest';
import { handleToolCall } from '../src/tools.js';

describe('health tool (Simplified API)', () => {
  it('should return healthy status', async () => {
    const result = await handleToolCall('health', {});

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('Corbat Health');
    expect(text).toContain('OK');
    expect(text).toContain('Version');
  });

  it('should include profile count', async () => {
    const result = await handleToolCall('health', {});
    const text = result.content[0].text;

    expect(text).toContain('Profiles');
    expect(text).toContain('java-spring-backend');
  });

  it('should include standards count', async () => {
    const result = await handleToolCall('health', {});
    const text = result.content[0].text;

    expect(text).toContain('Standards');
    expect(text).toContain('documents');
  });

  it('should include load time', async () => {
    const result = await handleToolCall('health', {});
    const text = result.content[0].text;

    expect(text).toContain('Load time');
    expect(text).toMatch(/\d+ms/);
  });

  it('should include default profile', async () => {
    const result = await handleToolCall('health', {});
    const text = result.content[0].text;

    expect(text).toContain('Default profile');
  });
});
