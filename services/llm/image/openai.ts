import { GenerateImageOptions, IImageGenProvider, ImageResult } from './types';

// Helper to get Blob from base64 string
function getBlobFromBase64(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

export class OpenAIImageProvider implements IImageGenProvider {
    id = 'openai';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        const effectiveModelId = options.settings.imageModelIds?.openai || options.modelId || 'gpt-image-1';

        // Headers - Authorization is generic, but Content-Type varies
        let headers: Record<string, string> = {
            'Authorization': `Bearer ${options.apiKey}`
        };

        const referenceImage = options.referenceImages?.[0];

        try {
            // Case 1: Reference Image present -> Use Edits Endpoint
            // Modern GPT-Image models use /edits for "Image + Prompt" generation
            if (referenceImage) {
                // Use Proxy Path by default to avoid CORS in browser
                const editUrl = options.baseUrl ? `${options.baseUrl}/images/edits` : '/api/openai/images/edits';

                // Construct FormData
                const formData = new FormData();

                // Convert Reference Image to Blob (Raw, no processing)
                const imageBlob = getBlobFromBase64(referenceImage.data, referenceImage.mimeType);

                formData.append('image', imageBlob, 'image.png'); // Filename often required
                formData.append('model', effectiveModelId);
                formData.append('prompt', options.prompt);
                formData.append('n', "1");
                formData.append('size', "1024x1024");
                // Note: mask is optional for some "edit" endpoints depending on model. 
                // We send just 'image' and 'prompt' per instruction.

                console.log(`[OpenAI] Requesting Edit (${effectiveModelId})`);

                const response = await fetch(editUrl, {
                    method: 'POST',
                    headers: headers, // Browser sets Content-Type boundary
                    body: formData
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`OpenAI Edit Error ${response.status}: ${errText}`);
                }

                const data = await response.json();
                return data.data.map((item: any) => ({
                    url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url,
                    mimeType: 'image/png',
                    metadata: { revisedPrompt: item.revised_prompt }
                }));
            }

            // Case 2: Text to Image (Generations)
            // Use Proxy Path by default
            let url = options.baseUrl ? `${options.baseUrl}/images/generations` : '/api/openai/images/generations';

            // For JSON body, we MUST set Content-Type
            headers['Content-Type'] = 'application/json';

            let body: any = {
                model: effectiveModelId,
                prompt: options.prompt,
                n: 1,
                moderation: "low",
            };

            // Aspect Ratio Updates
            if (options.settings.aspectRatio === '16:9') body.size = "1024x1024"; // Default
            if (effectiveModelId.includes('dall-e-3')) {
                // DALL-E 3 specific sizes
                if (options.settings.aspectRatio === '16:9') body.size = "1792x1024";
                if (options.settings.aspectRatio === '9:16') body.size = "1024x1792";
                if (options.settings.aspectRatio === '1:1') body.size = "1024x1024";
            } else if (effectiveModelId.includes('gpt-image')) {
                // GPT-Image 1.5 specific sizes
                if (options.settings.aspectRatio === '16:9') body.size = "1536x1024";
                if (options.settings.aspectRatio === '9:16') body.size = "1024x1536";
                if (options.settings.aspectRatio === '1:1') body.size = "1024x1024";
            } else {
                // Fallback
                if (options.settings.aspectRatio === '16:9') body.size = "1536x1024";
                if (options.settings.aspectRatio === '9:16') body.size = "1024x1536";
                if (options.settings.aspectRatio === '1:1') body.size = "1024x1024";
            }

            console.log(`[OpenAI] Requesting (${effectiveModelId})`);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                // Check specifically for moderation errors to give a friendlier message
                if (errText.includes('moderation_blocked')) {
                    throw new Error("OpenAI Safety System blocked this prompt. Please check your text.");
                }
                throw new Error(`OpenAI Generation Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            return data.data.map((item: any) => ({
                url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url,
                mimeType: 'image/png',
                metadata: { revisedPrompt: item.revised_prompt }
            }));

        } catch (e: any) {
            console.error("OpenAI Image Error", e);
            throw new Error(e.message || "OpenAI Failed");
        }
    }
}
