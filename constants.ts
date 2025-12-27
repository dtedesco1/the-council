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
// ============================================================================
// API KEYS (Optional - empty string if not set)
// Users may not have API keys for all providers, so these are optional.
// The app will show an error only when trying to use a provider without a key.
// ============================================================================
export const GOOGLE_API_KEY = getEnv('VITE_GEMINI_API_KEY');
export const OPENAI_API_KEY = getEnv('VITE_OPENAI_API_KEY');
export const ANTHROPIC_API_KEY = getEnv('VITE_ANTHROPIC_API_KEY');
export const XAI_API_KEY = getEnv('VITE_XAI_API_KEY');
export const OPENROUTER_API_KEY = getEnv('VITE_OPENROUTER_API_KEY');

// ============================================================================
// BASE URLS (Optional - use standard endpoints if not set)
// These have sensible defaults since the standard API endpoints are well-known.
// Users can override these to use proxies, OpenRouter, or other compatible endpoints.
// ============================================================================
export const OPENAI_BASE_URL = getEnv('VITE_OPENAI_BASE_URL') || 'https://api.openai.com/v1';
export const ANTHROPIC_BASE_URL = getEnv('VITE_ANTHROPIC_BASE_URL') || 'https://api.anthropic.com/v1';
export const XAI_BASE_URL = getEnv('VITE_XAI_BASE_URL') || 'https://api.x.ai/v1';
export const OPENROUTER_BASE_URL = getEnv('VITE_OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';

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

const GEMINI_IMAGE_MODEL_ID = getRequiredEnv('VITE_GEMINI_IMAGE_MODEL_ID');
const GPT_IMAGE_MODEL_ID = getRequiredEnv('VITE_GPT_IMAGE_MODEL_ID');
const GROK_IMAGE_MODEL_ID = getRequiredEnv('VITE_GROK_IMAGE_MODEL_ID');

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
    name: GEMINI_MODEL_ID,
    provider: 'google',
    capabilities: ['text'],
    enabled: true,
  },
  {
    id: CLAUDE_MODEL_ID,
    name: CLAUDE_MODEL_ID,
    provider: 'anthropic',
    capabilities: ['text'],
    enabled: true,
  },
  {
    id: GPT_MODEL_ID,
    name: GPT_MODEL_ID,
    provider: 'openai',
    capabilities: ['text'],
    enabled: true,
  },
  {
    id: GROK_MODEL_ID,
    name: GROK_MODEL_ID,
    provider: 'xai',
    capabilities: ['text'],
    enabled: true,
  },
  // Image Models
  {
    id: GEMINI_IMAGE_MODEL_ID,
    name: GEMINI_IMAGE_MODEL_ID,
    provider: 'google',
    capabilities: ['image', 'video'],
    enabled: true,
  },
  {
    id: GPT_IMAGE_MODEL_ID,
    name: GPT_IMAGE_MODEL_ID,
    provider: 'openai',
    capabilities: ['image'],
    enabled: true,
  },
  {
    id: GROK_IMAGE_MODEL_ID,
    name: GROK_IMAGE_MODEL_ID,
    provider: 'xai',
    capabilities: ['image', 'video'],
    enabled: true,
  },
];
// EXPORTED INITIAL MODELS
// Merges DEFAULT_MODELS with any custom configurations from VITE_MODEL_CONFIG.
// Custom models are appended to the list.
// ============================================================================
const customModels = getEnvModelConfig() || [];
export const INITIAL_MODELS: ModelConfig[] = [...DEFAULT_MODELS, ...customModels];

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
    xai: XAI_API_KEY,
    openrouter: OPENROUTER_API_KEY
  },
  apiEndpoints: {
    openai: OPENAI_BASE_URL,
    anthropic: ANTHROPIC_BASE_URL,
    xai: XAI_BASE_URL,
    openrouter: OPENROUTER_BASE_URL
  }
};

console.log('[constants] Configuration loaded successfully from .env');
