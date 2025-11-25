import { GoogleGenAI, Chat, Part } from "@google/genai";
import { ILLMProvider, GenerateOptions } from "../types";

export class GoogleProvider implements ILLMProvider {
  id = 'google';

  async generateResponse(options: GenerateOptions): Promise<string> {
    const { apiKey, modelId, history: currentHistory, newMessage, systemInstruction, attachment } = options;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error("Gemini API Key is missing.");
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Filter and format history to ensure valid parts
      const history = currentHistory.map(msg => {
        const parts: Part[] = [];
        if (msg.attachment && msg.attachment.mimeType) {
          parts.push({
            inlineData: {
              mimeType: msg.attachment.mimeType,
              data: msg.attachment.data
            }
          });
        }
        if (msg.text && msg.text.trim().length > 0) {
          parts.push({ text: msg.text });
        }
        // Fallback for empty
        if (parts.length === 0) parts.push({ text: "..." });

        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: parts,
        };
      });

      const chat: Chat = ai.chats.create({
        model: modelId,
        history: history,
        config: { systemInstruction }
      });

      const newParts: Part[] = [];
      if (attachment && attachment.mimeType) {
        newParts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data
          }
        });
      }
      if (newMessage && newMessage.trim().length > 0) {
        newParts.push({ text: newMessage });
      }
      if (newParts.length === 0) newParts.push({ text: " " });

      const messageContent = (newParts.length === 1 && newParts[0].text) 
          ? newParts[0].text 
          : newParts;

      const result = await chat.sendMessage({ message: messageContent });
      
      if (result.text) return result.text;
      throw new Error("No text returned from Gemini");

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Failed to generate response from Gemini");
    }
  }
}
