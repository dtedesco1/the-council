/**
 * OpenAI-Compatible API Provider
 *
 * Handles communication with OpenAI and OpenAI-compatible APIs (xAI/Grok, OpenRouter, etc.)
 * Supports text messages, text file attachments, and image attachments via vision API.
 *
 * File Attachment Support:
 * - Text files (.md, .txt, .json, .py, etc.): Decoded and included inline in the message
 * - Images (.png, .jpg, etc.): Sent as base64-encoded image_url for vision models
 */

import { ILLMProvider, GenerateOptions, GenerateResponse } from "../types";
import { isTextBasedMime, isImageMime, decodeBase64Text } from "../../../utils/files";

export class OpenAIProvider implements ILLMProvider {
    id = 'openai'; // Also handles 'xai' (Grok) and other OpenAI-compatible APIs

    /**
     * Generates a response from an OpenAI-compatible API.
     *
     * @param options - Generation options including API key, model, history, etc.
     * @returns GenerateResponse with text and token usage from API
     * @throws Error if API call fails or returns an error
     */
    async generateResponse(options: GenerateOptions): Promise<GenerateResponse> {
        const { apiKey, baseUrl, modelId, history, newMessage, systemInstruction, attachment } = options;

        if (!apiKey) {
            throw new Error("API Key missing. Please check your .env file.");
        }

        const messages: any[] = [];

        // Add system instruction
        if (systemInstruction) {
            // O1 models (and potentially others) act differently with system prompts
            // They may not support the 'system' role, so we include it as a user message
            if (modelId.startsWith('o1')) {
                console.log(`[OpenAI] Using user role for system instruction (o1 model)`);
                messages.push({ role: 'user', content: `System Instruction: ${systemInstruction}` });
            } else {
                messages.push({ role: 'system', content: systemInstruction });
            }
        }

        // Add conversation history
        for (const msg of history) {
            messages.push({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text
            });
        }

        // Build the current user message with text and optional attachment
        let textToSend = newMessage;

        // Handle text-based file attachments by including content inline
        if (attachment) {
            console.log(`[OpenAI] Processing attachment: ${attachment.name}, MIME: ${attachment.mimeType}`);

            if (isTextBasedMime(attachment.mimeType)) {
                const fileContent = decodeBase64Text(attachment.data);
                console.log(`[OpenAI] Including text file content: ${attachment.name} (${fileContent.length} chars)`);
                textToSend += `\n\n--- Attached File: ${attachment.name} ---\n${fileContent}\n--- End File ---`;
            } else if (!isImageMime(attachment.mimeType)) {
                // For unsupported file types, notify the user
                console.warn(`[OpenAI] Unsupported attachment type: ${attachment.mimeType}`);
                textToSend += `\n\n[Note: Attached file "${attachment.name}" (${attachment.mimeType}) could not be processed - unsupported format]`;
            }
        }

        // Build content array for the message
        const currentContent: any[] = [{ type: 'text', text: textToSend }];

        // Handle image attachments for vision-capable models
        if (attachment && isImageMime(attachment.mimeType)) {
            console.log(`[OpenAI] Adding image attachment for vision: ${attachment.name}`);
            currentContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${attachment.mimeType};base64,${attachment.data}`
                }
            });
        }

        messages.push({ role: 'user', content: currentContent });

        // Construct the API URL
        const cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const url = `${cleanBaseUrl}/chat/completions`;

        console.log(`[OpenAI] Sending request to: ${url}`);
        console.log(`[OpenAI] Model: ${modelId}, Messages: ${messages.length}, Has attachment: ${!!attachment}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                console.error(`[OpenAI] API Error (${response.status}): ${errorText}`);

                let errorMsg = `API Error (${response.status})`;
                try {
                    const json = JSON.parse(errorText);
                    if (json.error && json.error.message) {
                        errorMsg = json.error.message;
                    }
                } catch {
                    errorMsg = `API Error: ${errorText}`;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                console.warn('[OpenAI] No content in response:', data);
                return { text: "No response content received." };
            }

            // Extract token usage directly from API response
            const usage = data.usage ? {
                inputTokens: data.usage.prompt_tokens ?? 0,
                outputTokens: data.usage.completion_tokens ?? 0,
                totalTokens: data.usage.total_tokens ?? 0
            } : undefined;

            if (usage) {
                console.log(`[OpenAI] Tokens: ${usage.inputTokens} in, ${usage.outputTokens} out, ${usage.totalTokens} total`);
            }

            console.log(`[OpenAI] Response received: ${content.length} chars`);
            return { text: content, usage };

        } catch (error: any) {
            console.error('[OpenAI] Request failed:', error);

            // Provide helpful error messages for common issues
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                throw new Error(
                    'Network error connecting to API. This might be a CORS issue or the API endpoint is unreachable. ' +
                    'Check your VITE_OPENAI_BASE_URL or VITE_XAI_BASE_URL settings in .env'
                );
            }

            throw error;
        }
    }
}