import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Application configuration schema with Zod validation.
 */
const ConfigSchema = z.object({
  profilesDir: z.string().min(1),
  standardsDir: z.string().min(1),
  defaultProfile: z.string().default('default'),
  serverName: z.string().default('corbat-mcp'),
  serverVersion: z.string().default('1.0.0'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration.
 */
export function loadConfig(): Config {
  const rootDir = join(__dirname, '..');

  return ConfigSchema.parse({
    profilesDir: process.env.CORBAT_PROFILES_DIR || join(rootDir, 'profiles'),
    standardsDir: process.env.CORBAT_STANDARDS_DIR || join(rootDir, 'standards'),
    defaultProfile: process.env.CORBAT_DEFAULT_PROFILE || 'default',
    serverName: 'corbat-mcp',
    serverVersion: '1.0.0',
  });
}

export const config = loadConfig();
