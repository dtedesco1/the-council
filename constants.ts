import { ModelConfig, AppSettings } from './types';

export const INITIAL_MODELS: ModelConfig[] = [
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    enabled: true,
  },
  {
    id: 'claude-opus-4.1',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    enabled: true,
  },
  {
    id: 'gpt-5-thinking',
    name: 'GPT-5 Thinking',
    provider: 'openai',
    enabled: true,
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    enabled: true,
  },
];

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful, high-intelligence AI assistant. Be concise and accurate.";

export const DEFAULT_COMPARE_PROMPT = `Here is alternative advice I received on this matter from other AI models. 
Please give me your assessment and compare it with your most recent suggestions.
Highlight differences in reasoning or conclusion.

{{OTHER_RESPONSES}}`;

export const INITIAL_SETTINGS: AppSettings = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  comparePromptTemplate: DEFAULT_COMPARE_PROMPT,
};

export const MOCK_DELAY_MS = 1500;