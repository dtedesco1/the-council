export type Role = 'user' | 'model';

/**
 * File attachment for messages (images, text files, etc.)
 */
export interface Attachment {
  mimeType: string;
  data: string; // Base64 encoded file content
  name: string;
}

/**
 * Token usage information from an API response.
 * These values come DIRECTLY from the provider's API response - never calculated/estimated.
 */
export interface TokenUsage {
  /** Number of tokens in the input/prompt (from API response) */
  inputTokens: number;
  /** Number of tokens in the output/response (from API response) */
  outputTokens: number;
  /** Total tokens - sum of input + output */
  totalTokens: number;
}

/**
 * A single message in a conversation thread.
 */
export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachment?: Attachment;
  /** Token usage for this message (only for model responses, from API) */
  usage?: TokenUsage;
}

/**
 * Configuration for a model provider.
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'anthropic' | 'openai' | 'xai' | 'openrouter';
  capabilities: ('text' | 'image' | 'video')[];
  enabled: boolean;
  // Optional overrides for custom endpoints (e.g. OpenRouter, LocalAI)
  baseUrl?: string;
  apiKey?: string;
}

/**
 * A conversation thread for a specific model.
 * Contains message history, typing state, and cumulative token usage.
 */
export interface Thread {
  modelId: string;
  messages: Message[];
  isTyping: boolean;
  error?: string;
  /** Cumulative token usage for this thread (from API responses) */
  totalTokens: number;
}

export interface ImageGeneration {
  id: string;
  url: string;
  mimeType: string; // 'image/png', 'image/jpeg', 'video/mp4'
  prompt: string;
  modelId: string;
  timestamp: number;
  metadata?: {
    width: number;
    height: number;
    seed?: number;
    revisedPrompt?: string;
  };
}

export interface StudioSettings {
  imageCount: number; // 1-4
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3';
  style?: string; // vivid, natural
  videoMode?: boolean; // Filter for video models
  // User-configurable Model IDs
  imageModelIds: {
    google: string;
    openai: string;
    xai: string;
    openrouter: string;
  };
}

export type ViewMode = 'chat' | 'studio';

export interface ApiKeys {
  google: string;
  openai: string;
  anthropic: string;
  xai: string;
  openrouter: string;
}

export interface ApiEndpoints {
  openai: string;
  anthropic: string;
  xai: string;
  openrouter: string;
}

export interface AppSettings {
  systemPrompt: string;
  comparePromptTemplate: string;
  apiKeys: ApiKeys;
  apiEndpoints: ApiEndpoints;
}

export interface AppState {
  models: ModelConfig[];
  threads: Record<string, Thread>;
  gallery: ImageGeneration[];
  studioSettings: StudioSettings;
  viewMode: ViewMode;
  settings: AppSettings;
}