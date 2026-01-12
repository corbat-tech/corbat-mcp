import { describe, expect, it } from 'vitest';
import { ProfileBuilder, ProfileFixtures } from './fixtures/profile.fixtures.js';

describe('ProfileBuilder', () => {
  it('should create a minimal valid profile', () => {
    const profile = new ProfileBuilder().build();

    expect(profile.name).toBe('Test Profile');
    expect(profile.description).toBe('A test profile for unit testing');
  });

  it('should allow customizing the name', () => {
    const profile = new ProfileBuilder().withName('Custom Name').build();

    expect(profile.name).toBe('Custom Name');
  });

  it('should allow customizing architecture', () => {
    const profile = new ProfileBuilder()
      .withArchitecture('hexagonal', {
        enforceLayerDependencies: true,
        layers: [
          {
            name: 'domain',
            description: 'Core business logic',
            allowedDependencies: [],
          },
        ],
      })
      .build();

    expect(profile.architecture?.type).toBe('hexagonal');
    expect(profile.architecture?.enforceLayerDependencies).toBe(true);
    expect(profile.architecture?.layers).toHaveLength(1);
  });

  it('should allow configuring DDD settings', () => {
    const profile = new ProfileBuilder()
      .withDdd(true, {
        ubiquitousLanguageEnforced: true,
        patterns: {
          aggregates: true,
          valueObjects: true,
        },
      })
      .build();

    expect(profile.ddd?.enabled).toBe(true);
    expect(profile.ddd?.ubiquitousLanguageEnforced).toBe(true);
    expect(profile.ddd?.patterns?.aggregates).toBe(true);
  });

  it('should allow configuring CQRS settings', () => {
    const profile = new ProfileBuilder().withCqrs(true, 'physical').build();

    expect(profile.cqrs?.enabled).toBe(true);
    expect(profile.cqrs?.separation).toBe('physical');
  });

  it('should allow configuring code quality settings', () => {
    const profile = new ProfileBuilder()
      .withCodeQuality({
        maxMethodLines: 30,
        minimumTestCoverage: 90,
      })
      .build();

    expect(profile.codeQuality?.maxMethodLines).toBe(30);
    expect(profile.codeQuality?.minimumTestCoverage).toBe(90);
  });

  it('should allow chaining multiple configurations', () => {
    const profile = new ProfileBuilder()
      .withName('Full Profile')
      .withDescription('A complete profile')
      .withArchitecture('clean')
      .withDdd(true)
      .withCqrs(true)
      .withCodeQuality()
      .withTesting()
      .withObservability()
      .build();

    expect(profile.name).toBe('Full Profile');
    expect(profile.architecture?.type).toBe('clean');
    expect(profile.ddd?.enabled).toBe(true);
    expect(profile.cqrs?.enabled).toBe(true);
    expect(profile.codeQuality).toBeDefined();
    expect(profile.testing).toBeDefined();
    expect(profile.observability?.enabled).toBe(true);
  });

  it('should provide raw data without validation', () => {
    const raw = new ProfileBuilder().withName('Raw Profile').buildRaw();

    expect(raw.name).toBe('Raw Profile');
    expect(typeof raw).toBe('object');
  });
});

describe('ProfileFixtures', () => {
  it('should create a minimal profile', () => {
    const profile = ProfileFixtures.minimal();

    expect(profile.name).toBe('Test Profile');
  });

  it('should create a full-featured profile', () => {
    const profile = ProfileFixtures.fullFeatured();

    expect(profile.name).toBe('Full Featured Profile');
    expect(profile.architecture?.type).toBe('hexagonal');
    expect(profile.architecture?.layers).toHaveLength(3);
    expect(profile.ddd?.enabled).toBe(true);
    expect(profile.cqrs?.enabled).toBe(true);
    expect(profile.observability?.enabled).toBe(true);
  });

  it('should create a react profile', () => {
    const profile = ProfileFixtures.react();

    expect(profile.name).toBe('React Profile');
    expect(profile.architecture?.type).toBe('clean');
  });

  it('should create a microservices profile', () => {
    const profile = ProfileFixtures.microservices();

    expect(profile.name).toBe('Microservices Profile');
    expect(profile.architecture?.type).toBe('hexagonal');
    expect(profile.cqrs?.separation).toBe('physical');
  });
});
