
import { ILLMProvider, GenerateOptions } from "../types";
import { Message, Attachment } from "../../../types";
import { isTextBasedMime, isImageMime, decodeBase64Text } from "../../../utils/files";

export class AnthropicProvider implements ILLMProvider {
    id = 'anthropic';

    private normalizeMessages(history: Message[], newMessage: string, attachment?: Attachment): any[] {
        const allInputs = [...history, { 
            id: 'current', role: 'user' as const, text: newMessage, timestamp: Date.now(), attachment 
        }];
        
        const normalized: any[] = [];
        let currentRole: string | null = null;
        let currentBlocks: any[] = [];

        for (const msg of allInputs) {
            const msgRole = msg.role === 'model' ? 'assistant' : 'user';
            const blocks: any[] = [];

            if (msg.attachment) {
                if (isImageMime(msg.attachment.mimeType)) {
                    blocks.push({
                        type: 'image',
                        source: { type: 'base64', media_type: msg.attachment.mimeType, data: msg.attachment.data }
                    });
                } else if (isTextBasedMime(msg.attachment.mimeType)) {
                    blocks.push({
                        type: 'text',
                        text: `\n--- File: ${msg.attachment.name} ---\n${decodeBase64Text(msg.attachment.data)}\n--- End ---\n`
                    });
                }
            }

            if (msg.text?.trim()) blocks.push({ type: 'text', text: msg.text });
            if (blocks.length === 0) continue;

            if (msgRole === currentRole) {
                currentBlocks.push(...blocks);
            } else {
                if (currentRole) normalized.push({ role: currentRole, content: currentBlocks });
                currentRole = msgRole;
                currentBlocks = [...blocks];
            }
        }
        if (currentRole) normalized.push({ role: currentRole, content: currentBlocks });
        
        // Anthropic must start with user
        if (normalized.length > 0 && normalized[0].role !== 'user') normalized.shift();
        
        return normalized;
    }

    async generateResponse(options: GenerateOptions): Promise<string> {
        const { apiKey, baseUrl, modelId, history, newMessage, systemInstruction, attachment } = options;
        if (!apiKey) throw new Error("Anthropic API Key missing.");

        const messages = this.normalizeMessages(history, newMessage, attachment);
        if (messages.length === 0) throw new Error("Empty conversation.");

        const cleanBaseUrl = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
        const url = `${cleanBaseUrl}/messages`;

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
                messages,
                system: systemInstruction,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const txt = await response.text().catch(() => "Unknown");
            try {
                const json = JSON.parse(txt);
                throw new Error(json.error?.message || txt);
            } catch {
                if (txt.includes('Failed to fetch')) throw new Error("Network/CORS Error.");
                throw new Error(`Anthropic Error: ${txt}`);
            }
        }

        const data = await response.json();
        const textBlock = data.content?.find((c: any) => c.type === 'text');
        return textBlock?.text || "No text response.";
    }
}
