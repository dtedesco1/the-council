/**
 * Google Gemini API Provider
 *
 * Handles communication with Google's Gemini API for chat completions.
 * Supports multimodal inputs including text, images, and file attachments.
 *
 * File Attachment Support:
 * - Text files (.md, .txt, .json, etc.): Sent as inlineData with appropriate MIME type
 * - Images (.png, .jpg, etc.): Sent as inlineData for vision processing
 *
 * IMPORTANT: MIME types must be correctly detected for Gemini to accept attachments.
 * 'application/octet-stream' is NOT supported - use specific MIME types.
 */

import { GoogleGenAI, Chat, Part } from "@google/genai";
import { ILLMProvider, GenerateOptions } from "../types";

export class GoogleProvider implements ILLMProvider {
  id = 'google';

  /**
   * Generates a response from Gemini using the Google AI SDK.
   *
   * @param options - Generation options including API key, model, history, etc.
   * @returns The generated text response
   * @throws Error if API call fails or returns an error
   */
  async generateResponse(options: GenerateOptions): Promise<string> {
    const { apiKey, modelId, history: currentHistory, newMessage, systemInstruction, attachment } = options;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
    }

    console.log(`[Gemini] Starting request to model: ${modelId}`);
    console.log(`[Gemini] History length: ${currentHistory.length}, Has attachment: ${!!attachment}`);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Format conversation history for Gemini
      const history = currentHistory.map(msg => {
        const parts: Part[] = [];

        // Add attachment if present in history message
        if (msg.attachment && msg.attachment.mimeType) {
          console.log(`[Gemini] History message has attachment: ${msg.attachment.name}, MIME: ${msg.attachment.mimeType}`);
          parts.push({
            inlineData: {
              mimeType: msg.attachment.mimeType,
              data: msg.attachment.data
            }
          });
        }

        // Add text content
        if (msg.text && msg.text.trim().length > 0) {
          parts.push({ text: msg.text });
        }

        // Fallback for empty messages (Gemini requires at least one part)
        if (parts.length === 0) {
          parts.push({ text: "..." });
        }

        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: parts,
        };
      });

      // Create chat session with history
      const chat: Chat = ai.chats.create({
        model: modelId,
        history: history,
        config: { systemInstruction }
      });

      // Build the new message parts
      const newParts: Part[] = [];

      // Add attachment if provided
      if (attachment && attachment.mimeType) {
        console.log(`[Gemini] Adding attachment: ${attachment.name}, MIME: ${attachment.mimeType}`);

        // Validate MIME type - Gemini doesn't accept application/octet-stream
        if (attachment.mimeType === 'application/octet-stream') {
          console.error(`[Gemini] REJECTED: MIME type 'application/octet-stream' is not supported.`);
          throw new Error(
            `Gemini does not support MIME type 'application/octet-stream'. ` +
            `The file "${attachment.name}" needs a specific MIME type. ` +
            `This is a bug - please report it.`
          );
        }

        newParts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data
          }
        });
      }

      // Add text message
      if (newMessage && newMessage.trim().length > 0) {
        newParts.push({ text: newMessage });
      }

      // Ensure we have at least one part
      if (newParts.length === 0) {
        newParts.push({ text: " " });
      }

      // Format message content for the API
      // If only text, send as string; otherwise send as parts array
      const messageContent = (newParts.length === 1 && newParts[0].text)
        ? newParts[0].text
        : newParts;

      console.log(`[Gemini] Sending message with ${newParts.length} part(s)`);

      const result = await chat.sendMessage({ message: messageContent });

      if (result.text) {
        console.log(`[Gemini] Response received: ${result.text.length} chars`);
        return result.text;
      }

      console.warn('[Gemini] No text in response');
      throw new Error("No text returned from Gemini");

    } catch (error: any) {
      console.error("[Gemini] API Error:", error);

      // Provide more helpful error messages
      if (error.message?.includes('MIME type')) {
        throw error; // Re-throw MIME type errors as-is
      }

      throw new Error(error.message || "Failed to generate response from Gemini");
    }
  }
}
