export type Role = 'user' | 'model';

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachment?: Attachment;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'anthropic' | 'openai' | 'xai';
  enabled: boolean;
  // Optional overrides for custom endpoints (e.g. OpenRouter, LocalAI)
  baseUrl?: string;
  apiKey?: string;
}

export interface Thread {
  modelId: string;
  messages: Message[];
  isTyping: boolean;
  error?: string;
}

export interface ApiKeys {
  google: string;
  openai: string;
  anthropic: string;
  xai: string;
}

export interface ApiEndpoints {
  openai: string;
  anthropic: string;
  xai: string;
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
  settings: AppSettings;
}