import { Message, Attachment, TokenUsage } from '../../types';

export interface GenerateOptions {
  modelId: string;
  history: Message[];
  newMessage: string;
  systemInstruction?: string;
  attachment?: Attachment;
  apiKey: string;
  baseUrl?: string;
}

/**
 * Response from an LLM provider.
 * Contains the generated text and token usage from the API response.
 */
export interface GenerateResponse {
  /** The generated text response */
  text: string;
  /** Token usage from the API response (if provided by the API) */
  usage?: TokenUsage;
}

export interface ILLMProvider {
  id: string;
  generateResponse(options: GenerateOptions): Promise<GenerateResponse>;
}
