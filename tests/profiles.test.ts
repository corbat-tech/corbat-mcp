import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// We need to test the profile loading logic
// For this, we'll create a temporary directory with test profiles

describe('Profile Loading', () => {
  let tempDir: string;

  const defaultYaml = `
name: "Test Default Profile"
description: "A test profile"
architecture:
  type: hexagonal
ddd:
  enabled: true
  patterns:
    aggregates: true
    valueObjects: true
codeQuality:
  maxMethodLines: 20
  minimumTestCoverage: 80
naming:
  class: PascalCase
  method: camelCase
`;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `corbat-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should parse valid YAML profile', async () => {
    await writeFile(join(tempDir, 'default.yaml'), defaultYaml);

    // Import dynamically to test
    const { ProfileSchema } = await import('../src/types.js');
    const { parse } = await import('yaml');
    const { readFile } = await import('node:fs/promises');

    const content = await readFile(join(tempDir, 'default.yaml'), 'utf-8');
    const rawData = parse(content);
    const profile = ProfileSchema.parse(rawData);

    expect(profile.name).toBe('Test Default Profile');
    expect(profile.description).toBe('A test profile');
    expect(profile.architecture?.type).toBe('hexagonal');
    expect(profile.ddd?.enabled).toBe(true);
    expect(profile.codeQuality?.maxMethodLines).toBe(20);
  });
});

describe('Types Schema Validation', () => {
  it('should validate architecture schema', async () => {
    const { ArchitectureSchema } = await import('../src/types.js');

    const valid = ArchitectureSchema.parse({
      type: 'hexagonal',
      enforceLayerDependencies: true,
    });

    expect(valid.type).toBe('hexagonal');
    expect(valid.enforceLayerDependencies).toBe(true);
  });

  it('should use default values for architecture', async () => {
    const { ArchitectureSchema } = await import('../src/types.js');

    const defaults = ArchitectureSchema.parse({});

    expect(defaults.type).toBe('hexagonal');
    expect(defaults.enforceLayerDependencies).toBe(true);
  });

  it('should validate code quality schema', async () => {
    const { CodeQualitySchema } = await import('../src/types.js');

    const valid = CodeQualitySchema.parse({
      maxMethodLines: 25,
      minimumTestCoverage: 90,
    });

    expect(valid.maxMethodLines).toBe(25);
    expect(valid.minimumTestCoverage).toBe(90);
    // Defaults should be applied
    expect(valid.maxClassLines).toBe(200);
  });

  it('should reject invalid coverage values', async () => {
    const { CodeQualitySchema } = await import('../src/types.js');

    expect(() => CodeQualitySchema.parse({ minimumTestCoverage: 150 })).toThrow();

    expect(() => CodeQualitySchema.parse({ minimumTestCoverage: -10 })).toThrow();
  });

  it('should validate DDD schema', async () => {
    const { DddSchema } = await import('../src/types.js');

    const valid = DddSchema.parse({
      enabled: true,
      patterns: {
        aggregates: true,
        valueObjects: true,
      },
    });

    expect(valid.enabled).toBe(true);
    expect(valid.patterns?.aggregates).toBe(true);
  });
});

describe('Profile Formatting', () => {
  it('should format profile as markdown', async () => {
    const { formatProfileAsMarkdown } = await import('../src/profiles.js');
    const { ProfileSchema } = await import('../src/types.js');

    const profile = ProfileSchema.parse({
      name: 'Test Profile',
      description: 'A test description',
      architecture: { type: 'hexagonal' },
      ddd: { enabled: true },
      codeQuality: { maxMethodLines: 20 },
    });

    const markdown = formatProfileAsMarkdown('test', profile);

    expect(markdown).toContain('# Coding Standards Profile: Test Profile');
    expect(markdown).toContain('A test description');
    expect(markdown).toContain('hexagonal');
    expect(markdown).toContain('Domain-Driven Design');
    expect(markdown).toContain('Code Quality Rules');
  });
});
