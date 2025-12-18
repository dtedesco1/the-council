import { Attachment, StudioSettings } from '../../types';

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

// --- Google (Gemini 3 Pro / Imagen via Gemini) ---
class GoogleImageProvider implements IImageGenProvider {
    id = 'google';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        // Use User Override if available
        const effectiveModelId = options.settings.imageModelIds?.google || options.modelId;

        // Endpoint: generateContent
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModelId}:generateContent?key=${options.apiKey}`;

        // Construct Payload
        const parts: any[] = [{ text: options.prompt }];

        // Check for reference images - Gemini supports inline data
        if (options.referenceImages && options.referenceImages.length > 0) {
            options.referenceImages.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: img.mimeType,
                        data: img.data
                    }
                });
            });
        }

        // Append Aspect Ratio to prompt since generationConfig rejects it
        if (options.settings.aspectRatio) {
            parts[0].text += ` --aspect-ratio ${options.settings.aspectRatio}`;
        }

        const body = {
            contents: [{
                parts: parts // Updated to use the constructed parts array (text + images)
            }],
            // Strict BLOCK_NONE for all categories
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                // Add Civility if needed, but these 4 are standard
                { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                // responseMimeType: "image/jpeg", // Sometimes useful, but sticking to requested JSON default unless needed
                candidateCount: 1
            }
        };

        try {
            console.log(`[GoogleImageProvider] Requesting: ${url}`);
            const response = await fetch(options.baseUrl ? `${options.baseUrl}/models/${effectiveModelId}:generateContent?key=${options.apiKey}` : url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[GoogleImageProvider] Error ${response.status}:`, errText);
                try {
                    const errJson = JSON.parse(errText);
                    throw new Error(errJson.error?.message || `Google Error ${response.status}`);
                } catch {
                    throw new Error(`Google Error ${response.status}: ${errText}`);
                }
            }

            const data = await response.json();
            const candidates = data.candidates || [];

            // Extract images if present in parts
            const results: ImageResult[] = [];
            candidates.forEach((cand: any) => {
                if (cand.content?.parts) {
                    cand.content.parts.forEach((part: any) => {
                        // Check for inlineData (camelCase or snake_case)
                        const inline = part.inlineData || part.inline_data;
                        if (inline && inline.data) {
                            results.push({
                                url: `data:${inline.mimeType || inline.mime_type || 'image/jpeg'};base64,${inline.data}`,
                                mimeType: inline.mimeType || inline.mime_type || 'image/jpeg',
                                metadata: { width: 1024, height: 1024 }
                            });
                        }
                        // Fallback: check executable_code or other blocks if API changes
                    });
                }
            });

            if (results.length === 0) {
                // Check if it was a text refusal or safety block despite BLOCK_NONE
                // LOG DEBUGGING INFO for "No image data"
                console.log("[GoogleImageProvider] Debug - Full Response:", JSON.stringify(data, null, 2));

                if (data.promptFeedback?.blockReason) {
                    throw new Error(`Google Blocked: ${data.promptFeedback.blockReason}`);
                }
                throw new Error("No image data found in Google response");
            }

            return results;

        } catch (e: any) {
            console.error("Google Image Gen Error", e);
            throw new Error(e.message || "Google Failed");
        }
    }
}

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

// --- OpenAI (GPT Image 1.5) ---
class OpenAIImageProvider implements IImageGenProvider {
    id = 'openai';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        const effectiveModelId = options.settings.imageModelIds?.openai || options.modelId || 'gpt-image-1.5';

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

// --- xAI (Grok 2 Image) ---
class XAIImageProvider implements IImageGenProvider {
    id = 'xai';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        // Use Proxy Path by default
        const url = options.baseUrl ? `${options.baseUrl}/images/generations` : '/api/xai/images/generations';
        const effectiveModelId = options.settings.imageModelIds?.xai || options.modelId || 'grok-2-image-latest';

        try {
            const isVariation = options.referenceImages && options.referenceImages.length > 0;

            // Case 1: Variations / Image Input
            if (isVariation) {
                const refImg = options.referenceImages![0];
                // Use Proxy Path by default
                const variationUrl = options.baseUrl ? `${options.baseUrl}/images/variations` : '/api/xai/images/variations';

                const formData = new FormData();
                const imageBlob = getBlobFromBase64(refImg.data, refImg.mimeType);

                formData.append('image', imageBlob, 'reference.png');
                formData.append('model', effectiveModelId);
                formData.append('n', options.settings.imageCount.toString());
                formData.append('response_format', "b64_json");

                console.log(`[xAI] Requesting Variations: ${variationUrl}`);

                // IMPORTANT: Do NOT set Content-Type header manually for FormData.
                const response = await fetch(variationUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${options.apiKey}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`xAI Variation Error ${response.status}: ${errText}`);
                }

                const data = await response.json();
                return data.data.map((item: any) => ({
                    url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url,
                    mimeType: 'image/png',
                    metadata: { width: 1024, height: 1024 }
                }));
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

// --- OpenRouter (Via OpenAI-Compatible API) ---
class OpenRouterImageProvider implements IImageGenProvider {
    id = 'openrouter';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        // OpenRouter uses standard Chat Completions API for image models, returning markdown links.
        // It does NOT support the OpenAI /images/generations endpoint.
        const url = options.baseUrl ? `${options.baseUrl}/chat/completions` : '/api/openrouter/chat/completions';
        const effectiveModelId = options.modelId;

        console.log(`[OpenRouter] Requesting (${effectiveModelId}) at ${url}`);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.apiKey}`,
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://omnichat.local',
                'X-Title': 'The Council'
            };

            const body = {
                model: effectiveModelId,
                messages: [{ role: 'user', content: options.prompt }],
                // Some models might support 'n' or size params in content, but standard chat doesn't.
            };

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
            }

            const data = await response.json();

            // Log full response for debugging
            console.log("[OpenRouter] Raw Response:", JSON.stringify(data, null, 2));

            // 1. Try Parse Markdown Image: ![alt](url)
            const content = data.choices?.[0]?.message?.content || "";
            const mdMatch = content.match(/!\[.*?\]\((.*?)\)/) || content.match(/\((https?:\/\/.*?)\)/) || content.match(/(https?:\/\/[^\s)]+)/);

            if (mdMatch && mdMatch[1]) {
                return [{
                    url: mdMatch[1],
                    mimeType: 'image/png',
                    metadata: { width: 1024, height: 1024, revisedPrompt: content }
                }];
            }

            // 2. Try Standard OpenAI Image Format (if some models pipe it through)
            // Some Flux/OpenRouter models might return distinct 'images' or 'data' array in choices?
            // Checking search structure: choice.message.images[0].url OR choice.message.images[0].image_url.url
            // @ts-ignore
            if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
                // @ts-ignore
                const imgUrl = data.choices[0].message.images[0].image_url.url;
                return [{
                    url: imgUrl,
                    mimeType: 'image/png',
                    metadata: { width: 1024, height: 1024 }
                }];
            }
            // @ts-ignore
            if (data.choices?.[0]?.message?.images?.[0]?.url) {
                // @ts-ignore
                const imgUrl = data.choices[0].message.images[0].url;
                return [{
                    url: imgUrl,
                    mimeType: 'image/png',
                    metadata: { width: 1024, height: 1024 }
                }];
            }

            // 3. Try standard root-level data array (unlikely for chat/completions but possible)
            if (data.data?.[0]?.url || data.data?.[0]?.b64_json) {
                const item = data.data[0];
                return [{
                    url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url,
                    mimeType: 'image/png',
                    metadata: { width: 1024, height: 1024 }
                }];
            }

            throw new Error("No image URL found in OpenRouter response. Content: " + content.substring(0, 100));

        } catch (e: any) {
            console.error("OpenRouter Image Error", e);
            throw new Error(e.message || "OpenRouter Failed");
        }
    }
}

// --- Factory ---
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
