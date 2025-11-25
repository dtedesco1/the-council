import { ModelConfig } from '../types';

// Safely retrieve environment variables
export const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || '';
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not supported
  }
  return '';
};

// Helper to parse JSON config if available
export const getEnvModelConfig = (): ModelConfig[] | null => {
  try {
    const configStr = getEnv('VITE_MODEL_CONFIG');
    if (configStr) {
      return JSON.parse(configStr) as ModelConfig[];
    }
  } catch (e) {
    console.error("Failed to parse VITE_MODEL_CONFIG", e);
  }
  return null;
};
