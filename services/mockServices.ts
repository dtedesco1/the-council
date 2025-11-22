import { MOCK_DELAY_MS } from '../constants';
import { Message, Attachment } from '../types';

export const generateMockResponse = async (
  provider: string,
  modelName: string,
  history: Message[],
  newMessage: string,
  systemInstruction?: string,
  attachment?: Attachment
): Promise<string> => {
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const contextLength = history.length;
      let response = "";

      if (systemInstruction && history.length === 0) {
        // Simulate acknowledging system prompt on first message implicitly
      }

      if (newMessage.includes("Here is alternative advice")) {
         response = `**Comparison Analysis**\n\nI have reviewed the input from other models.\n\n*   **Agreement:** We all seem to agree on the core premises.\n*   **Divergence:** My previous answer focused more on technical implementation, while the others touched on high-level strategy.\n\nI stand by my initial assessment but acknowledge the value in the alternative viewpoints regarding scalability.`;
      } else {
        response = `Response from **${modelName}**\n\n`;
        response += `I received: "${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}"\n`;
        
        if (attachment) {
            response += `\n*I also noticed you attached a file: ${attachment.name} (${attachment.mimeType})*`;
        }

        response += `\n\nThis is a simulated response. Configure the real API for **${provider}** to get actual results.`;
      }
      resolve(response);
    }, MOCK_DELAY_MS);
  });
};