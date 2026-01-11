import { describe, expect, it } from 'vitest';
import { handleToolCall } from '../src/tools.js';

describe('Tool Handlers Integration', () => {
  describe('get_coding_standards', () => {
    it('should return coding standards for default profile', async () => {
      const result = await handleToolCall('get_coding_standards', {});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Coding Standards Profile');
      expect(result.content[0].text).toContain('Architecture');
    });

    it('should return error for non-existent profile', async () => {
      const result = await handleToolCall('get_coding_standards', {
        profile: 'non-existent-profile',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Profile not found');
    });
  });

  describe('list_profiles', () => {
    it('should return available profiles', async () => {
      const result = await handleToolCall('list_profiles', {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Available Profiles');
      expect(result.content[0].text).toContain('java-spring-backend');
    });
  });

  describe('get_architecture_guidelines', () => {
    it('should return architecture guidelines for default profile', async () => {
      const result = await handleToolCall('get_architecture_guidelines', {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Architecture Guidelines');
      expect(result.content[0].text).toContain('Pattern');
    });

    it('should include layers information', async () => {
      const result = await handleToolCall('get_architecture_guidelines', {});

      expect(result.content[0].text).toContain('Layers');
    });

    it('should include DDD patterns if enabled', async () => {
      const result = await handleToolCall('get_architecture_guidelines', {});

      expect(result.content[0].text).toContain('DDD Patterns');
    });
  });

  describe('get_naming_conventions', () => {
    it('should return naming conventions for default profile', async () => {
      const result = await handleToolCall('get_naming_conventions', {});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Naming Conventions');
    });

    it('should include general naming conventions', async () => {
      const result = await handleToolCall('get_naming_conventions', {});

      // Should contain either custom naming or defaults
      const text = result.content[0].text;
      expect(text).toMatch(/class|interface|method/i);
    });
  });

  describe('search_standards', () => {
    it('should find results for kafka query', async () => {
      const result = await handleToolCall('search_standards', { query: 'kafka' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Search Results');
      expect(result.content[0].text.toLowerCase()).toContain('kafka');
    });

    it('should find results for testing query', async () => {
      const result = await handleToolCall('search_standards', { query: 'testing' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Search Results');
    });

    it('should find results for docker query', async () => {
      const result = await handleToolCall('search_standards', { query: 'docker' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Search Results');
    });

    it('should return no results message for unknown query', async () => {
      const result = await handleToolCall('search_standards', {
        query: 'xyznonexistent123',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('No results found');
    });

    it('should return error for empty query', async () => {
      const result = await handleToolCall('search_standards', { query: '   ' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Please provide a search query');
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const result = await handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });
  });
});
