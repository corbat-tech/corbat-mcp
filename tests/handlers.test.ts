import { describe, expect, it } from 'vitest';
import { handleToolCall } from '../src/tools.js';

describe('Tool Handlers Integration (Simplified API)', () => {
  describe('get_context (PRIMARY)', () => {
    it('should return context for a task', async () => {
      const result = await handleToolCall('get_context', {
        task: 'Create a payment service',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Context for:');
      expect(result.content[0].text).toContain('Guardrails');
      expect(result.content[0].text).toContain('Workflow');
    });

    it('should classify task type correctly', async () => {
      const result = await handleToolCall('get_context', {
        task: 'Fix the login bug',
      });

      expect(result.content[0].text).toContain('BUGFIX');
    });

    it('should include naming conventions', async () => {
      const result = await handleToolCall('get_context', {
        task: 'Create a user service',
      });

      expect(result.content[0].text).toContain('Naming');
    });
  });

  describe('validate', () => {
    it('should return validation criteria for code', async () => {
      const result = await handleToolCall('validate', {
        code: 'public class UserService { }',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Validation');
      expect(result.content[0].text).toContain('Thresholds');
    });

    it('should include guardrails when task_type is provided', async () => {
      const result = await handleToolCall('validate', {
        code: 'public class UserService { }',
        task_type: 'feature',
      });

      expect(result.content[0].text).toContain('FEATURE');
      expect(result.content[0].text).toContain('Guardrails');
    });
  });

  describe('search', () => {
    it('should find results for kafka query', async () => {
      const result = await handleToolCall('search', { query: 'kafka' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Results for');
      expect(result.content[0].text.toLowerCase()).toContain('kafka');
    });

    it('should find results for testing query', async () => {
      const result = await handleToolCall('search', { query: 'testing' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Results for');
    });

    it('should return no results message for unknown query', async () => {
      const result = await handleToolCall('search', {
        query: 'xyznonexistent123',
      });

      expect(result.content[0].text).toContain('No results');
    });

    it('should return error for empty query', async () => {
      const result = await handleToolCall('search', { query: '   ' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Please provide');
    });
  });

  describe('profiles', () => {
    it('should return available profiles', async () => {
      const result = await handleToolCall('profiles', {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Available Profiles');
      expect(result.content[0].text).toContain('java-spring-backend');
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await handleToolCall('health', {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Health');
      expect(result.content[0].text).toContain('OK');
      expect(result.content[0].text).toContain('Profiles');
    });
  });

  describe('unknown tool', () => {
    it('should return error with available tools list', async () => {
      const result = await handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
      expect(result.content[0].text).toContain('get_context');
      expect(result.content[0].text).toContain('validate');
      expect(result.content[0].text).toContain('search');
    });
  });
});
