import { describe, it, expect } from 'vitest';
import { listResources, readResource } from '../src/resources.js';

describe('Resources', () => {
  describe('listResources', () => {
    it('should list all available resources', async () => {
      const resources = await listResources();

      expect(resources.length).toBeGreaterThan(0);
      expect(resources.every((r) => r.uri.startsWith('corbat://'))).toBe(true);
    });

    it('should include profiles resource', async () => {
      const resources = await listResources();
      const profilesResource = resources.find((r) => r.uri === 'corbat://profiles');

      expect(profilesResource).toBeDefined();
      expect(profilesResource?.name).toBe('All Profiles');
      expect(profilesResource?.mimeType).toBe('application/json');
    });

    it('should include standards resource', async () => {
      const resources = await listResources();
      const standardsResource = resources.find((r) => r.uri === 'corbat://standards');

      expect(standardsResource).toBeDefined();
      expect(standardsResource?.name).toBe('All Standards');
      expect(standardsResource?.mimeType).toBe('text/markdown');
    });

    it('should include default profile', async () => {
      const resources = await listResources();
      const defaultProfile = resources.find((r) => r.uri === 'corbat://profiles/default');

      expect(defaultProfile).toBeDefined();
      expect(defaultProfile?.mimeType).toBe('text/markdown');
    });

    it('should include category resources', async () => {
      const resources = await listResources();
      const categoryResources = resources.filter((r) =>
        r.uri.startsWith('corbat://standards/') && r.uri !== 'corbat://standards'
      );

      expect(categoryResources.length).toBeGreaterThan(0);
    });
  });

  describe('readResource', () => {
    it('should read all profiles as JSON', async () => {
      const result = await readResource('corbat://profiles');

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('application/json');
      expect(() => JSON.parse(result?.text || '')).not.toThrow();

      const profiles = JSON.parse(result?.text || '');
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should read specific profile as markdown', async () => {
      const result = await readResource('corbat://profiles/default');

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('text/markdown');
      expect(result?.text).toContain('Coding Standards Profile');
    });

    it('should read all standards as markdown', async () => {
      const result = await readResource('corbat://standards');

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('text/markdown');
      expect(result?.text.length).toBeGreaterThan(0);
    });

    it('should read standards by category', async () => {
      // First get available categories
      const resources = await listResources();
      const categoryResource = resources.find(
        (r) => r.uri.startsWith('corbat://standards/') && r.uri !== 'corbat://standards'
      );

      if (categoryResource) {
        const result = await readResource(categoryResource.uri);

        expect(result).not.toBeNull();
        expect(result?.mimeType).toBe('text/markdown');
      }
    });

    it('should return null for non-existent profile', async () => {
      const result = await readResource('corbat://profiles/non-existent-profile');

      expect(result).toBeNull();
    });

    it('should return null for non-existent category', async () => {
      const result = await readResource('corbat://standards/non-existent-category');

      expect(result).toBeNull();
    });

    it('should return null for unknown URI', async () => {
      const result = await readResource('corbat://unknown/resource');

      expect(result).toBeNull();
    });
  });
});
