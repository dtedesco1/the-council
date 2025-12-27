import { IImageGenProvider } from './types';
import { GoogleImageProvider } from './google';
import { OpenAIImageProvider } from './openai';
import { XAIImageProvider } from './xai';
import { OpenRouterImageProvider } from './openrouter';

const googleProvider = new GoogleImageProvider();
const openaiProvider = new OpenAIImageProvider();
const xaiProvider = new XAIImageProvider();
const openrouterProvider = new OpenRouterImageProvider();

export function getImageProvider(providerName: string): IImageGenProvider {
    switch (providerName) {
        case 'google': return googleProvider;
        case 'openai': return openaiProvider;
        case 'xai': return xaiProvider;
        case 'openrouter': return openrouterProvider;
        default: throw new Error(`Unknown image provider: ${providerName}`);
    }
}

export * from './types';
