import { GenerateImageOptions, IImageGenProvider, ImageResult } from './types';

export class XAIImageProvider implements IImageGenProvider {
    id = 'xai';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        // Use Proxy Path by default
        const url = options.baseUrl ? `${options.baseUrl}/images/generations` : '/api/xai/images/generations';
        const effectiveModelId = options.settings.imageModelIds?.xai || options.modelId || 'grok-2-image-latest';

        try {
            const isVariation = options.referenceImages && options.referenceImages.length > 0;

            // Case 1: Variations / Image Input
            if (isVariation) {
                // xAI currently returns 404 for /images/variations. 
                // It does not support image-to-image or variations yet.
                throw new Error("Image input / variations are not currently supported by the xAI provider.");
            }

            // Case 2: Standard Text Generation

            // xAI has a strict 1024 character limit for prompts
            const truncatedPrompt = options.prompt.length > 1000
                ? options.prompt.substring(0, 1000)
                : options.prompt;

            let body: any = {
                model: effectiveModelId,
                n: options.settings.imageCount,
                response_format: "b64_json",
                prompt: truncatedPrompt
            };

            console.log(`[xAI] Requesting (${effectiveModelId})`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${options.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`xAI Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            return data.data.map((item: any) => ({
                url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url,
                mimeType: 'image/png',
                metadata: { revisedPrompt: item.revised_prompt }
            }));

        } catch (e: any) {
            console.error("xAI Image Error", e);
            throw new Error(e.message || "xAI Failed");
        }
    }
}
