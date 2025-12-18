import { ModelConfig } from '../types';

/**
 * Array to collect missing required environment variables.
 * This is populated during initialization and checked at the end of constants.ts.
 */
export const missingRequiredEnvVars: string[] = [];

/**
 * Safely retrieve an OPTIONAL environment variable.
 * Returns empty string if not found or in unsupported environments.
 *
 * Use this for truly optional configuration values (e.g., API keys which
 * the user may not have for all providers).
 *
 * @param key - The environment variable key (e.g., 'VITE_OPENAI_API_KEY')
 * @returns The value of the environment variable, or empty string if not set
 */
export const getEnv = (key: string): string => {
  try {
    // @ts-ignore - import.meta.env is provided by Vite at build time
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const value = import.meta.env[key];
      return value !== undefined && value !== '' ? value : '';
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not supported
    console.warn(`[env] Could not access import.meta.env for key: ${key}`);
  }
  return '';
};

/**
 * Retrieve a REQUIRED environment variable.
 * If the variable is missing or empty, records it as missing and returns empty string.
 * The app will fail at startup with a clear error listing all missing variables.
 *
 * Use this for configuration values that MUST be set in .env for the app to function correctly.
 *
 * @param key - The environment variable key (e.g., 'VITE_GEMINI_MODEL_ID')
 * @returns The value of the environment variable
 * @throws Collects missing vars; actual error thrown after all are collected in constants.ts
 */
export const getRequiredEnv = (key: string): string => {
  const value = getEnv(key);
  if (value === '') {
    missingRequiredEnvVars.push(key);
    console.error(`[env] MISSING REQUIRED: ${key} - Please add this to your .env file`);
  }
  return value;
};

/**
 * Checks if all required environment variables are present.
 * If any are missing, throws an error with a clear message listing all missing variables.
 *
 * This should be called AFTER all getRequiredEnv() calls have been made during initialization.
 */
export const validateRequiredEnvVars = (): void => {
  if (missingRequiredEnvVars.length > 0) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════════════════╗
║                    MISSING REQUIRED ENVIRONMENT VARIABLES               ║
╠════════════════════════════════════════════════════════════════════════╣
║ The following required environment variables are not set in your .env: ║
║                                                                         ║
${missingRequiredEnvVars.map(v => `║   • ${v.padEnd(60)}║`).join('\n')}
║                                                                         ║
║ Please add these to your .env file and restart the application.        ║
║ See env-example.txt for reference.                                      ║
╚════════════════════════════════════════════════════════════════════════╝
`;
    console.error(errorMessage);
    throw new Error(`Missing required environment variables: ${missingRequiredEnvVars.join(', ')}`);
  }
};

/**
 * Logs the current state of all environment variables at startup.
 * Useful for debugging configuration issues.
 */
export const logEnvLoadStatus = (): void => {
  console.log('[env] ══════════════════════════════════════════════════════');
  console.log('[env] Environment Configuration Status:');
  console.log('[env] ──────────────────────────────────────────────────────');

  // Model IDs
  const modelVars = ['VITE_GEMINI_MODEL_ID', 'VITE_CLAUDE_MODEL_ID', 'VITE_GPT_MODEL_ID', 'VITE_GROK_MODEL_ID'];
  console.log('[env] Model IDs:');
  modelVars.forEach(key => {
    const value = getEnv(key);
    console.log(`[env]   ${key}: ${value || '(NOT SET)'}`);
  });

  // API Keys (masked for security)
  const apiKeyVars = ['VITE_GEMINI_API_KEY', 'VITE_OPENAI_API_KEY', 'VITE_ANTHROPIC_API_KEY', 'VITE_XAI_API_KEY', 'VITE_OPENROUTER_API_KEY'];
  console.log('[env] API Keys:');
  apiKeyVars.forEach(key => {
    const value = getEnv(key);
    const masked = value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : '(NOT SET)';
    console.log(`[env]   ${key}: ${masked}`);
  });

  // Base URLs
  const urlVars = ['VITE_OPENAI_BASE_URL', 'VITE_ANTHROPIC_BASE_URL', 'VITE_XAI_BASE_URL', 'VITE_OPENROUTER_BASE_URL'];
  console.log('[env] Base URLs:');
  urlVars.forEach(key => {
    const value = getEnv(key);
    console.log(`[env]   ${key}: ${value || '(using default)'}`);
  });

  console.log('[env] ══════════════════════════════════════════════════════');
};

/**
 * Helper to parse JSON config from VITE_MODEL_CONFIG if available.
 * This allows advanced users to completely override the default model configuration.
 *
 * @returns Parsed ModelConfig array if valid JSON is provided, null otherwise
 */
export const getEnvModelConfig = (): ModelConfig[] | null => {
  try {
    const configStr = getEnv('VITE_MODEL_CONFIG');
    if (configStr) {
      console.log('[env] Using custom model configuration from VITE_MODEL_CONFIG');
      return JSON.parse(configStr) as ModelConfig[];
    }
  } catch (e) {
    console.error('[env] Failed to parse VITE_MODEL_CONFIG - ensure it is valid JSON:', e);
  }
  return null;
};
