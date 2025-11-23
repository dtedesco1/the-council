import { Message, Attachment } from '../types';

interface OpenAIMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface AnthropicContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

const isTextBasedMime = (mime: string): boolean => {
  return mime.startsWith('text/') || 
         mime === 'application/json' ||
         mime === 'application/xml' ||
         mime.includes('javascript') ||
         mime.includes('typescript') ||
         mime.includes('python') ||
         mime.includes('csv');
};

const isImageMime = (mime: string): boolean => {
  return mime.startsWith('image/');
};

const decodeBase64Text = (base64: string): string => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Failed to decode base64 text", e);
    return "[Error decoding file content]";
  }
};

const normalizeAnthropicMessages = (history: Message[], newMessage: string, attachment?: Attachment): AnthropicMessage[] => {
  const normalized: AnthropicMessage[] = [];
  
  const allInputs = [...history, { 
    id: 'current', 
    role: 'user' as const, 
    text: newMessage, 
    timestamp: Date.now(), 
    attachment 
  }];

  let currentRole: 'user' | 'assistant' | null = null;
  let currentBlocks: AnthropicContentBlock[] = [];

  for (const msg of allInputs) {
    const msgRole = msg.role === 'model' ? 'assistant' : 'user';
    const msgBlocks: AnthropicContentBlock[] = [];

    if (msg.attachment) {
      if (isImageMime(msg.attachment.mimeType)) {
        msgBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: msg.attachment.mimeType,
            data: msg.attachment.data
          }
        });
      } else if (isTextBasedMime(msg.attachment.mimeType)) {
        const textContent = decodeBase64Text(msg.attachment.data);
        msgBlocks.push({
          type: 'text',
          text: `\n--- Attached File: ${msg.attachment.name} ---\n${textContent}\n--- End File ---\n`
        });
      }
    }

    if (msg.text && msg.text.trim()) {
      msgBlocks.push({
        type: 'text',
        text: msg.text
      });
    }

    if (msgBlocks.length === 0) continue;

    if (msgRole === currentRole) {
      currentBlocks.push(...msgBlocks);
    } else {
      if (currentRole && currentBlocks.length > 0) {
        normalized.push({ role: currentRole, content: currentBlocks });
      }
      currentRole = msgRole;
      currentBlocks = [...msgBlocks];
    }
  }

  if (currentRole && currentBlocks.length > 0) {
    normalized.push({ role: currentRole, content: currentBlocks });
  }

  if (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  return normalized;
};

export const generateOpenAILikeResponse = async (
  baseUrl: string,
  apiKey: string,
  modelId: string,
  history: Message[],
  newMessage: string,
  systemInstruction?: string,
  attachment?: Attachment
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing. Please add it in Settings.");

  const messages: OpenAIMessage[] = [];

  if (systemInstruction) {
    if (modelId.startsWith('o1')) {
        messages.push({ role: 'user', content: `System Instruction: ${systemInstruction}` });
    } else {
        messages.push({ role: 'system', content: systemInstruction });
    }
  }

  for (const msg of history) {
    messages.push({ 
      role: msg.role === 'model' ? 'assistant' : 'user', 
      content: msg.text 
    });
  }

  let textToSend = newMessage;

  if (attachment && isTextBasedMime(attachment.mimeType)) {
    const fileContent = decodeBase64Text(attachment.data);
    textToSend += `\n\n--- Attached File: ${attachment.name} ---\n${fileContent}\n--- End File ---`;
  }

  const currentContent: any[] = [{ type: 'text', text: textToSend }];

  if (attachment && attachment.mimeType.startsWith('image/')) {
    currentContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${attachment.mimeType};base64,${attachment.data}`
      }
    });
  }

  messages.push({ role: 'user', content: currentContent });

  try {
    // Construct URL cleanly
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/chat/completions`;
    
    console.log(`POST ${url} (Model: ${modelId})`);

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
      let errorMsg = `API Error (${response.status})`;
      
      try {
        const json = JSON.parse(errorText);
        if (json.error && json.error.message) errorMsg = json.error.message;
        else errorMsg = errorText;
      } catch {
        errorMsg = `API Error: ${errorText}`;
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response content";
  } catch (error: any) {
    console.error("OpenAI/Compat API Error:", error);
    if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error("Network Error: Failed to connect to API. This is likely a CORS issue or incorrect Base URL.");
    }
    throw error;
  }
};

export const generateAnthropicResponse = async (
  baseUrl: string,
  apiKey: string,
  modelId: string,
  history: Message[],
  newMessage: string,
  systemInstruction?: string,
  attachment?: Attachment
): Promise<string> => {
  if (!apiKey) throw new Error("Anthropic API Key missing. Please add it in Settings.");

  const messages = normalizeAnthropicMessages(history, newMessage, attachment);

  if (messages.length === 0) {
     throw new Error("Cannot send empty message conversation.");
  }

  try {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/messages`;
    
    console.log(`POST ${url} (Model: ${modelId})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerously-allow-browser': 'true' 
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        system: systemInstruction,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      let errorMsg = `Anthropic API Error (${response.status})`;
      
      try {
        const json = JSON.parse(errorText);
        if (json.error && json.error.message) errorMsg = json.error.message;
        else errorMsg = errorText;
      } catch {
        errorMsg = `API Error: ${errorText}`;
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    const content = data.content;
    if (Array.isArray(content)) {
        const textBlock = content.find((c: any) => c.type === 'text');
        if (textBlock) return textBlock.text;
    }
    
    return "No text response found in output.";
  } catch (error: any) {
    console.error("Anthropic API Error:", error);
    if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error("Network Error (CORS): Browser blocked the request to Anthropic. You must use a proxy or LiteLLM.");
    }
    throw error;
  }
};