import { GoogleGenAI, Chat, Part } from "@google/genai";
import { Message, Attachment } from '../types';

// Initialize the client
// API_KEY is expected to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGeminiResponse = async (
  currentHistory: Message[],
  newMessage: string,
  systemInstruction?: string,
  attachment?: Attachment
): Promise<string> => {
  try {
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
      // Only add text part if content exists
      if (msg.text && msg.text.trim().length > 0) {
        parts.push({ text: msg.text });
      }
      
      // Fallback if a message in history ended up empty (should be prevented by UI, but safe to handle)
      if (parts.length === 0) {
        parts.push({ text: "..." });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts,
      };
    });

    const chat: Chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    // Construct the new message content
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

    // Ensure we don't send an empty message
    if (newParts.length === 0) {
        // This case implies user sent nothing (e.g. just a space), which UI should usually block.
        // We send a non-empty string to satisfy the API requirement.
        newParts.push({ text: " " }); 
    }

    // Use string for simple text messages, parts array for complex/multimodal
    const messageContent = (newParts.length === 1 && newParts[0].text) 
        ? newParts[0].text 
        : newParts;

    const result = await chat.sendMessage({ 
      message: messageContent 
    });

    if (result.text) {
      return result.text;
    }

    throw new Error("No text returned from Gemini");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate response from Gemini");
  }
};