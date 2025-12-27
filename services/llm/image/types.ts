import { Attachment, StudioSettings } from '../../../types';

export interface GenerateImageOptions {
    modelId: string;
    prompt: string;
    apiKey: string;
    baseUrl?: string;
    settings: StudioSettings;
    referenceImages?: Attachment[];
    negativePrompt?: string;
    generateVideo?: boolean;
}

export interface ImageResult {
    url: string;
    mimeType: string;
    metadata?: {
        width: number;
        height: number;
        seed?: number;
        revisedPrompt?: string;
    };
}

export interface IImageGenProvider {
    id: string;
    generateImage(options: GenerateImageOptions): Promise<ImageResult[]>;
}
