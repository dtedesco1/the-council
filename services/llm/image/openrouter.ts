import { GenerateImageOptions, IImageGenProvider, ImageResult } from './types';

export class OpenRouterImageProvider implements IImageGenProvider {
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
