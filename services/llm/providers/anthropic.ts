/**
 * Anthropic Claude API Provider
 *
 * Handles communication with Anthropic's Claude API for chat completions.
 * Supports text messages, text file attachments, and image attachments.
 *
 * IMPORTANT CORS NOTE:
 * Direct browser access to api.anthropic.com will fail due to CORS restrictions.
 * To fix this, either:
 * 1. Use the local Vite proxy by setting VITE_ANTHROPIC_BASE_URL=/api/anthropic in .env
 * 2. Use a CORS proxy or backend server
 * 3. Use a compatible endpoint like OpenRouter that supports browser access
 */

import { ILLMProvider, GenerateOptions } from "../types";
import { Message, Attachment } from "../../../types";
import { isTextBasedMime, isImageMime, decodeBase64Text } from "../../../utils/files";

export class AnthropicProvider implements ILLMProvider {
    id = 'anthropic';

    /**
     * Normalizes message history into Anthropic's expected format.
     * Anthropic requires alternating user/assistant messages, and messages
     * must start with a user message.
     *
     * @param history - Previous messages in the conversation
     * @param newMessage - The new user message being sent
     * @param attachment - Optional file attachment
     * @returns Array of normalized messages in Anthropic format
     */
    private normalizeMessages(history: Message[], newMessage: string, attachment?: Attachment): any[] {
        // Combine history with the new message
        const allInputs = [...history, {
            id: 'current', role: 'user' as const, text: newMessage, timestamp: Date.now(), attachment
        }];

        const normalized: any[] = [];
        let currentRole: string | null = null;
        let currentBlocks: any[] = [];

        for (const msg of allInputs) {
            const msgRole = msg.role === 'model' ? 'assistant' : 'user';
            const blocks: any[] = [];

            // Process attachments - Anthropic supports images and text files
            if (msg.attachment) {
                console.log(`[Anthropic] Processing attachment: ${msg.attachment.name}, MIME: ${msg.attachment.mimeType}`);

                if (isImageMime(msg.attachment.mimeType)) {
                    // Anthropic native image support
                    blocks.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: msg.attachment.mimeType,
                            data: msg.attachment.data
                        }
                    });
                    console.log(`[Anthropic] Added image attachment: ${msg.attachment.name}`);
                } else if (isTextBasedMime(msg.attachment.mimeType)) {
                    // For text files, decode and include as text block
                    const fileContent = decodeBase64Text(msg.attachment.data);
                    blocks.push({
                        type: 'text',
                        text: `\n--- Attached File: ${msg.attachment.name} ---\n${fileContent}\n--- End File ---\n`
                    });
                    console.log(`[Anthropic] Added text file attachment: ${msg.attachment.name} (${fileContent.length} chars)`);
                } else {
                    // Unsupported file type - notify user
                    blocks.push({
                        type: 'text',
                        text: `[Unsupported file attachment: ${msg.attachment.name} (${msg.attachment.mimeType})]`
                    });
                    console.warn(`[Anthropic] Unsupported attachment type: ${msg.attachment.mimeType}`);
                }
            }

            // Add the text content
            if (msg.text?.trim()) {
                blocks.push({ type: 'text', text: msg.text });
            }

            // Skip empty messages
            if (blocks.length === 0) continue;

            // Merge consecutive messages of the same role (Anthropic requires alternating)
            if (msgRole === currentRole) {
                currentBlocks.push(...blocks);
            } else {
                if (currentRole) {
                    normalized.push({ role: currentRole, content: currentBlocks });
                }
                currentRole = msgRole;
                currentBlocks = [...blocks];
            }
        }

        // Don't forget the last accumulated message
        if (currentRole) {
            normalized.push({ role: currentRole, content: currentBlocks });
        }

        // Anthropic requires conversation to start with user message
        if (normalized.length > 0 && normalized[0].role !== 'user') {
            console.warn('[Anthropic] Removing leading non-user message (API requirement)');
            normalized.shift();
        }

        return normalized;
    }

    /**
     * Generates a response from Claude using the Anthropic API.
     *
     * @param options - Generation options including API key, model, history, etc.
     * @returns The generated text response
     * @throws Error if API call fails or returns an error
     */
    async generateResponse(options: GenerateOptions): Promise<string> {
        const { apiKey, baseUrl, modelId, history, newMessage, systemInstruction, attachment } = options;

        if (!apiKey) {
            throw new Error("Anthropic API Key missing. Please add VITE_ANTHROPIC_API_KEY to your .env file.");
        }

        const messages = this.normalizeMessages(history, newMessage, attachment);
        if (messages.length === 0) {
            throw new Error("Cannot send empty conversation to Claude.");
        }

        // Clean up the base URL and construct the full endpoint
        const cleanBaseUrl = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
        const url = `${cleanBaseUrl}/messages`;

        // Check if using direct API (will likely fail due to CORS)
        const isDirectApi = cleanBaseUrl.includes('api.anthropic.com');
        if (isDirectApi) {
            console.warn('[Anthropic] Using direct API access. If you get CORS errors, set VITE_ANTHROPIC_BASE_URL=/api/anthropic in .env to use the local proxy.');
        }

        console.log(`[Anthropic] Sending request to: ${url}`);
        console.log(`[Anthropic] Model: ${modelId}, Messages: ${messages.length}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    // This header is required for browser access but may not prevent CORS issues
                    'anthropic-dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages,
                    system: systemInstruction,
                    max_tokens: 4096
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                console.error(`[Anthropic] API Error (${response.status}): ${errorText}`);

                try {
                    const json = JSON.parse(errorText);
                    throw new Error(json.error?.message || `API Error: ${errorText}`);
                } catch (parseError) {
                    throw new Error(`Anthropic Error (${response.status}): ${errorText}`);
                }
            }

            const data = await response.json();
            const textBlock = data.content?.find((c: any) => c.type === 'text');

            if (!textBlock?.text) {
                console.warn('[Anthropic] No text content in response:', data);
                return "No text response received from Claude.";
            }

            console.log(`[Anthropic] Response received: ${textBlock.text.length} chars`);
            return textBlock.text;

        } catch (error: any) {
            console.error('[Anthropic] Request failed:', error);

            // Provide helpful error messages for common issues
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                throw new Error(
                    'Network error connecting to Anthropic API. This is likely a CORS issue. ' +
                    'To fix, set VITE_ANTHROPIC_BASE_URL=/api/anthropic in your .env file to use the local proxy, ' +
                    'then restart the dev server.'
                );
            }

            throw error;
        }
    }
}
