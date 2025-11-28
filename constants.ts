/**
 * Application Constants
 *
 * ALL configuration values are loaded from the .env file.
 * The .env file is the SINGLE SOURCE OF TRUTH for configuration.
 *
 * If required environment variables are missing, the application will fail
 * at startup with a clear error message listing all missing variables.
 *
 * See env-example.txt for a template of all available configuration options.
 */

import { ModelConfig, AppSettings } from './types';
import {
  getEnv,
  getRequiredEnv,
  getEnvModelConfig,
  validateRequiredEnvVars,
  logEnvLoadStatus
} from './utils/env';

// ============================================================================
// STARTUP: Log environment configuration status
// ============================================================================
logEnvLoadStatus();

// ============================================================================
// API KEYS (Optional - empty string if not set)
// Users may not have API keys for all providers, so these are optional.
// The app will show an error only when trying to use a provider without a key.
// ============================================================================
export const GOOGLE_API_KEY = getEnv('VITE_GEMINI_API_KEY');
export const OPENAI_API_KEY = getEnv('VITE_OPENAI_API_KEY');
export const ANTHROPIC_API_KEY = getEnv('VITE_ANTHROPIC_API_KEY');
export const XAI_API_KEY = getEnv('VITE_XAI_API_KEY');

// ============================================================================
// BASE URLS (Optional - use standard endpoints if not set)
// These have sensible defaults since the standard API endpoints are well-known.
// Users can override these to use proxies, OpenRouter, or other compatible endpoints.
// ============================================================================
export const OPENAI_BASE_URL = getEnv('VITE_OPENAI_BASE_URL') || 'https://api.openai.com/v1';
export const ANTHROPIC_BASE_URL = getEnv('VITE_ANTHROPIC_BASE_URL') || 'https://api.anthropic.com/v1';
export const XAI_BASE_URL = getEnv('VITE_XAI_BASE_URL') || 'https://api.x.ai/v1';

// ============================================================================
// MODEL IDs (REQUIRED - must be set in .env file)
// These are REQUIRED because there are no universally "correct" defaults.
// The .env file is the single source of truth for which models to use.
// If these are missing, the app will fail with a clear error message.
// ============================================================================
const GEMINI_MODEL_ID = getRequiredEnv('VITE_GEMINI_MODEL_ID');
const CLAUDE_MODEL_ID = getRequiredEnv('VITE_CLAUDE_MODEL_ID');
const GPT_MODEL_ID = getRequiredEnv('VITE_GPT_MODEL_ID');
const GROK_MODEL_ID = getRequiredEnv('VITE_GROK_MODEL_ID');

// ============================================================================
// VALIDATE REQUIRED ENVIRONMENT VARIABLES
// If any required variables are missing, this will throw an error with
// a clear message listing all missing variables.
// ============================================================================
validateRequiredEnvVars();

// ============================================================================
// DEFAULT MODEL CONFIGURATION
// Model IDs and names come directly from .env - NO HARDCODED DEFAULTS.
// The name field uses the same value as the ID since that's what users set in .env.
// ============================================================================
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: GEMINI_MODEL_ID,
    name: GEMINI_MODEL_ID, // Name matches ID from .env - single source of truth
    provider: 'google',
    enabled: true,
  },
  {
    id: CLAUDE_MODEL_ID,
    name: CLAUDE_MODEL_ID, // Name matches ID from .env - single source of truth
    provider: 'anthropic',
    enabled: true,
  },
  {
    id: GPT_MODEL_ID,
    name: GPT_MODEL_ID, // Name matches ID from .env - single source of truth
    provider: 'openai',
    enabled: true,
  },
  {
    id: GROK_MODEL_ID,
    name: GROK_MODEL_ID, // Name matches ID from .env - single source of truth
    provider: 'xai',
    enabled: true,
  },
];

// ============================================================================
// EXPORTED INITIAL MODELS
// Uses VITE_MODEL_CONFIG JSON override if provided, otherwise uses DEFAULT_MODELS.
// This allows advanced users to completely customize the model list via .env.
// ============================================================================
export const INITIAL_MODELS: ModelConfig[] = getEnvModelConfig() || DEFAULT_MODELS;

console.log('[constants] Loaded models from .env:', INITIAL_MODELS.map(m => `${m.provider}:${m.id}`).join(', '));

// ============================================================================
// PROMPT TEMPLATES
// These are application defaults, not user-configurable via .env.
// Users can modify these through the Settings UI.
// ============================================================================
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful, high-intelligence AI assistant. Be concise and accurate.";

export const DEFAULT_COMPARE_PROMPT = `I have collected responses from other AI models regarding our current conversation.
They are provided below, enclosed in <model_response> tags.

Please analyze these alternative perspectives and compare them with your own previous response.
1. Identify key areas of agreement and disagreement.
2. Critique the other approaches—did they miss something you caught, or vice versa?
3. Synthesize the best insights from all responses into a final, comprehensive recommendation.

{{OTHER_RESPONSES}}`;

// ============================================================================
// INITIAL APP SETTINGS
// Combines all configuration into the initial settings object.
// API keys and endpoints come from .env, prompts use application defaults.
// ============================================================================
export const INITIAL_SETTINGS: AppSettings = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  comparePromptTemplate: DEFAULT_COMPARE_PROMPT,
  apiKeys: {
    google: GOOGLE_API_KEY,
    openai: OPENAI_API_KEY,
    anthropic: ANTHROPIC_API_KEY,
    xai: XAI_API_KEY
  },
  apiEndpoints: {
    openai: OPENAI_BASE_URL,
    anthropic: ANTHROPIC_BASE_URL,
    xai: XAI_BASE_URL
  }
};

console.log('[constants] Configuration loaded successfully from .env');
