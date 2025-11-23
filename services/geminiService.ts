import { GoogleGenAI, Chat, Part } from "@google/genai";
import { Message, Attachment } from '../types';

export const generateGeminiResponse = async (
  apiKey: string,
  modelId: string,
  currentHistory: Message[],
  newMessage: string,
  systemInstruction?: string,
  attachment?: Attachment
): Promise<string> => {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  try {
    // Initialize client with the specific key provided in settings
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
      // Only add text part if content exists
      if (msg.text && msg.text.trim().length > 0) {
        parts.push({ text: msg.text });
      }
      
      // Fallback if a message in history ended up empty
      if (parts.length === 0) {
        parts.push({ text: "..." });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts,
      };
    });

    const chat: Chat = ai.chats.create({
      model: modelId,
      history: history,
      config: {
        systemInstruction: systemInstruction,
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

    if (newParts.length === 0) {
        newParts.push({ text: " " }); 
    }

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