import { GenerateImageOptions, IImageGenProvider, ImageResult } from './types';

export class GoogleImageProvider implements IImageGenProvider {
    id = 'google';

    async generateImage(options: GenerateImageOptions): Promise<ImageResult[]> {
        // Use User Override if available
        const effectiveModelId = options.settings.imageModelIds?.google || options.modelId;

        // Block Video Generation for standard Gemini models
        // Correctly checks the settings.videoMode flag
        if (options.settings.videoMode || options.generateVideo) {
            throw new Error("Video generation is not currently supported by the Google provider (Gemini/Imagen).");
        }

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
