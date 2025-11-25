import { ILLMProvider } from "./types";
import { GoogleProvider } from "./providers/google";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";

// Singleton instances
const google = new GoogleProvider();
const openai = new OpenAIProvider();
const anthropic = new AnthropicProvider();

export const getProvider = (providerName: string): ILLMProvider => {
    switch (providerName) {
        case 'google': return google;
        case 'anthropic': return anthropic;
        case 'openai': return openai;
        case 'xai': return openai; // xAI uses OpenAI format
        default: return openai; // Default fallback for generic 'openai-compatible'
    }
};
