import { ModelConfig, AppSettings } from './types';

// Helper to parse JSON config if available
const getEnvModelConfig = (): ModelConfig[] | null => {
  try {
    const configStr = process.env.REACT_APP_MODEL_CONFIG;
    if (configStr) {
      return JSON.parse(configStr) as ModelConfig[];
    }
  } catch (e) {
    console.error("Failed to parse REACT_APP_MODEL_CONFIG", e);
  }
  return null;
};

// Added export for MOCK_DELAY_MS
export const MOCK_DELAY_MS = 1000;

// API Configurations
export const GOOGLE_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.API_KEY || '';

// Reverting to REAL endpoints. 
// If CORS issues occur, the user must use a local proxy or LiteLLM, 
// but we default to the standard URLs so it works out-of-the-box for non-browser-blocked providers.
export const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';
export const OPENAI_BASE_URL = process.env.REACT_APP_OPENAI_BASE_URL || 'https://api.openai.com/v1';

export const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY || '';
export const ANTHROPIC_BASE_URL = process.env.REACT_APP_ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';

export const XAI_API_KEY = process.env.REACT_APP_XAI_API_KEY || '';
export const XAI_BASE_URL = process.env.REACT_APP_XAI_BASE_URL || 'https://api.x.ai/v1';

// Default config using REAL, CURRENTLY AVAILABLE Model IDs
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: process.env.REACT_APP_GEMINI_MODEL_ID || 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro',
    provider: 'google',
    enabled: true,
  },
  {
    id: process.env.REACT_APP_CLAUDE_MODEL_ID || 'claude-3-5-sonnet-latest', 
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    enabled: true,
  },
  {
    id: process.env.REACT_APP_GPT_MODEL_ID || 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    enabled: true,
  },
  {
    id: process.env.REACT_APP_GROK_MODEL_ID || 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    enabled: true,
  },
];

export const INITIAL_MODELS: ModelConfig[] = getEnvModelConfig() || DEFAULT_MODELS;

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful, high-intelligence AI assistant. Be concise and accurate.";

export const DEFAULT_COMPARE_PROMPT = `I have collected responses from other AI models regarding our current conversation. 
They are provided below, enclosed in <model_response> tags.

Please analyze these alternative perspectives and compare them with your own previous response.
1. Identify key areas of agreement and disagreement.
2. Critique the other approaches—did they miss something you caught, or vice versa?
3. Synthesize the best insights from all responses into a final, comprehensive recommendation.

{{OTHER_RESPONSES}}`;

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