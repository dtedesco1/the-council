import { Message, Attachment } from '../../types';

export interface GenerateOptions {
  modelId: string;
  history: Message[];
  newMessage: string;
  systemInstruction?: string;
  attachment?: Attachment;
  apiKey: string;
  baseUrl?: string;
}

export interface ILLMProvider {
  id: string; // 'google' | 'openai' | 'anthropic' etc
  generateResponse(options: GenerateOptions): Promise<string>;
}
