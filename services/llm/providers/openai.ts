
import { ILLMProvider, GenerateOptions } from "../types";
import { isTextBasedMime, isImageMime, decodeBase64Text } from "../../../utils/files";

export class OpenAIProvider implements ILLMProvider {
    id = 'openai'; // Also handles 'xai'

    async generateResponse(options: GenerateOptions): Promise<string> {
        const { apiKey, baseUrl, modelId, history, newMessage, systemInstruction, attachment } = options;

        if (!apiKey) throw new Error("API Key missing.");

        const messages: any[] = [];

        if (systemInstruction) {
            // O1 models (and potentially others) act differently with system prompts, 
            // but standard OpenAI uses 'system' role.
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

        if (attachment && isImageMime(attachment.mimeType)) {
            currentContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${attachment.mimeType};base64,${attachment.data}`
                }
            });
        }

        messages.push({ role: 'user', content: currentContent });

        const cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const url = `${cleanBaseUrl}/chat/completions`;

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
            } catch {
                errorMsg = `API Error: ${errorText}`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No response content";
    }
}