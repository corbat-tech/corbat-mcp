import {
  formatProfileAsMarkdown,
  getCategories,
  getProfile,
  getStandardsByCategory,
  listProfiles,
  loadStandards,
} from './profiles.js';

/**
 * List all available resources.
 */
export async function listResources(): Promise<
  Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }>
> {
  const profiles = await listProfiles();
  const categories = await getCategories();

  const profileResources = profiles.map(({ id, profile }) => ({
    uri: `corbat://profiles/${id}`,
    name: `Profile: ${profile.name}`,
    description: profile.description || `Coding standards profile: ${profile.name}`,
    mimeType: 'text/markdown',
  }));

  const categoryResources = categories.map((category) => ({
    uri: `corbat://standards/${category}`,
    name: `Standards: ${category}`,
    description: `Coding standards documentation for ${category}`,
    mimeType: 'text/markdown',
  }));

  return [
    {
      uri: 'corbat://profiles',
      name: 'All Profiles',
      description: 'List of all available coding standards profiles',
      mimeType: 'application/json',
    },
    ...profileResources,
    {
      uri: 'corbat://standards',
      name: 'All Standards',
      description: 'Complete coding standards documentation',
      mimeType: 'text/markdown',
    },
    ...categoryResources,
  ];
}

/**
 * Read a specific resource by URI.
 */
export async function readResource(uri: string): Promise<{ uri: string; mimeType: string; text: string } | null> {
  // List all profiles
  if (uri === 'corbat://profiles') {
    const profiles = await listProfiles();
    const data = profiles.map(({ id, profile }) => ({
      id,
      name: profile.name,
      description: profile.description,
    }));

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    };
  }

  // Specific profile
  if (uri.startsWith('corbat://profiles/')) {
    const profileId = uri.replace('corbat://profiles/', '');
    const profile = await getProfile(profileId);

    if (!profile) return null;

    const standards = await loadStandards();
    const profileMarkdown = formatProfileAsMarkdown(profileId, profile);
    const standardsMarkdown = standards.map((s) => `## ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

    return {
      uri,
      mimeType: 'text/markdown',
      text: `${profileMarkdown}\n\n---\n\n# Standards Documentation\n\n${standardsMarkdown}`,
    };
  }

  // All standards
  if (uri === 'corbat://standards') {
    const standards = await loadStandards();
    const content = standards.map((s) => `# ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

    return {
      uri,
      mimeType: 'text/markdown',
      text: content,
    };
  }

  // Standards by category
  if (uri.startsWith('corbat://standards/')) {
    const category = uri.replace('corbat://standards/', '');
    const standards = await getStandardsByCategory(category);

    if (standards.length === 0) return null;

    const content = standards.map((s) => `# ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

    return {
      uri,
      mimeType: 'text/markdown',
      text: content,
    };
  }

  return null;
}
