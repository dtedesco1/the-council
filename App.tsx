import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Settings as SettingsIcon, Paperclip, Download, GitCompare, X, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { 
  INITIAL_MODELS, 
  INITIAL_SETTINGS 
} from './constants';
import { ModelConfig, Thread, Message, Attachment, AppSettings } from './types';
import ThreadColumn from './components/ThreadColumn';
import SettingsModal from './components/SettingsModal';
import { generateGeminiResponse } from './services/geminiService';
import { generateOpenAILikeResponse, generateAnthropicResponse } from './services/apiService';

const LOCAL_STORAGE_MODELS_KEY = 'omnichat_models_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'omnichat_settings_v1';

export default function App() {
  // --- Initialization State ---
  const [models, setModels] = useState<ModelConfig[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MODELS_KEY);
      if (saved) {
        return JSON.parse(saved) as ModelConfig[];
      }
    } catch (e) {
      console.error("Failed to load models", e);
    }
    return INITIAL_MODELS;
  });

  const [threads, setThreads] = useState<Record<string, Thread>>(() => {
    const initialThreads: Record<string, Thread> = {};
    // Initialize threads for whatever models we have loaded
    models.forEach((m: ModelConfig) => {
      initialThreads[m.id] = { modelId: m.id, messages: [], isTyping: false };
    });
    return initialThreads;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...INITIAL_SETTINGS, ...parsed }; 
    }
    return INITIAL_SETTINGS;
  });
  
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync threads with models on change
  useEffect(() => {
    setThreads(prev => {
      const next = { ...prev };
      let hasChanges = false;
      models.forEach(m => {
        if (!next[m.id]) {
          next[m.id] = { modelId: m.id, messages: [], isTyping: false };
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
    localStorage.setItem(LOCAL_STORAGE_MODELS_KEY, JSON.stringify(models));
  }, [models]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const activeModels = models.filter(m => m.enabled);

  // --- Helpers ---
  
  // FIXED: This function now creates the thread entry if it doesn't exist.
  // This prevents the "silent failure" / hanging bug when a new model is added
  // but the threads state hasn't fully synchronized yet.
  const updateThread = (modelId: string, updater: (t: Thread) => Partial<Thread>) => {
    setThreads(prev => {
        const current = prev[modelId] || { modelId, messages: [], isTyping: false };
        const updates = updater(current);
        return {
            ...prev,
            [modelId]: { ...current, ...updates }
        };
    });
  };

  const addMessageToThread = (modelId: string, text: string, role: 'user' | 'model', attach?: Attachment) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      text,
      timestamp: Date.now(),
      attachment: attach
    };

    updateThread(modelId, (thread) => ({
      messages: [...thread.messages, newMessage]
    }));
    return newMessage;
  };

  // --- Core Logic ---

  const sendMessageToModel = async (
      model: ModelConfig, 
      text: string, 
      attach?: Attachment, 
      contextOverride?: Message[]
  ) => {
    // Set loading state
    updateThread(model.id, () => ({ isTyping: true, error: undefined }));

    try {
      // We fetch the CURRENT thread state from the setter to ensure we have the latest messages
      // However, for simplicity in this async flow, we rely on 'threads' captured in closure 
      // OR the contextOverride if provided (for global compare).
      // A safer way for the history is to pull it from the state updater, but for now:
      const currentThread = threads[model.id] || { messages: [] };
      
      const history = contextOverride || currentThread.messages;
      let responseText = "";
      
      console.log(`[OmniChat] Sending to ${model.name} (${model.provider}) ID: ${model.id}`);

      if (model.provider === 'google') {
        responseText = await generateGeminiResponse(
            settings.apiKeys.google, 
            model.id, 
            history, 
            text, 
            settings.systemPrompt, 
            attach
        );
      } 
      else if (model.provider === 'openai') {
        responseText = await generateOpenAILikeResponse(
            settings.apiEndpoints.openai, 
            settings.apiKeys.openai, 
            model.id, 
            history, 
            text, 
            settings.systemPrompt, 
            attach
        );
      }
      else if (model.provider === 'anthropic') {
        responseText = await generateAnthropicResponse(
            settings.apiEndpoints.anthropic, 
            settings.apiKeys.anthropic, 
            model.id, 
            history, 
            text, 
            settings.systemPrompt, 
            attach
        );
      }
      else if (model.provider === 'xai') {
        responseText = await generateOpenAILikeResponse(
            settings.apiEndpoints.xai, 
            settings.apiKeys.xai, 
            model.id, 
            history, 
            text, 
            settings.systemPrompt, 
            attach
        );
      } else {
        throw new Error(`Unknown provider: ${model.provider}`);
      }

      console.log(`[OmniChat] Received response from ${model.name}`);
      addMessageToThread(model.id, responseText, 'model');
      
    } catch (err: any) {
      console.error(`[OmniChat] Error (${model.name}):`, err);
      updateThread(model.id, () => ({ error: err.message || "Unknown error occurred" }));
    } finally {
      // CRITICAL: Ensure isTyping is ALWAYS turned off
      updateThread(model.id, () => ({ isTyping: false }));
    }
  };

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !attachment) || activeModels.length === 0) return;
    
    const textToSend = input;
    const attachToSend = attachment;

    setInput('');
    setAttachment(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Trigger all models
    activeModels.forEach(model => {
      addMessageToThread(model.id, textToSend, 'user', attachToSend);
      sendMessageToModel(model, textToSend, attachToSend);
    });
  }, [input, attachment, activeModels, threads, settings]);

  const handleGlobalCompare = async () => {
    if (activeModels.length < 2) {
      alert("Activate at least 2 models to compare.");
      return;
    }

    const promptTemplate = settings.comparePromptTemplate;

    // For EACH model, gather context from ALL OTHER models
    activeModels.forEach(targetModel => {
      const otherResponses: string[] = [];
      
      activeModels.forEach(sourceModel => {
        if (sourceModel.id === targetModel.id) return;
        
        const sourceThread = threads[sourceModel.id];
        if (!sourceThread) return;

        const lastMsg = sourceThread.messages.length > 0 
            ? sourceThread.messages[sourceThread.messages.length - 1] 
            : null;

        if (lastMsg && lastMsg.role === 'model') {
           otherResponses.push(
             `<model_response name="${sourceModel.name}">\n${lastMsg.text}\n</model_response>`
           );
        }
      });

      if (otherResponses.length === 0) return;

      const prompt = promptTemplate.replace('{{OTHER_RESPONSES}}', otherResponses.join('\n\n'));
      
      addMessageToThread(targetModel.id, prompt, 'user');
      sendMessageToModel(targetModel, prompt);
    });
  };

  const handleGlobalDownload = async () => {
    const zip = new JSZip();
    const folder = zip.folder("omnichat_export");
    
    activeModels.forEach(model => {
        const thread = threads[model.id];
        if (!thread || thread.messages.length === 0) return;

        const content = thread.messages.map(m => {
            const roleName = m.role === 'user' ? "User" : model.name;
            const time = new Date(m.timestamp).toISOString();
            const attachInfo = m.attachment ? `[Attached: ${m.attachment.name}]` : '';
            return `## ${roleName} (${time})\n${attachInfo}\n\n${m.text}\n\n---`;
        }).join('\n\n');

        folder?.file(`${model.name.replace(/\s+/g, '_')}.md`, content);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnichat_conversations_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const typeMap: Record<string, string> = {
            'txt': 'text/plain',
            'md': 'text/markdown',
            'js': 'text/javascript',
            'ts': 'text/typescript',
            'py': 'text/x-python',
            'html': 'text/html',
            'css': 'text/css',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'text/xml',
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        mimeType = typeMap[ext || ''] || 'application/octet-stream';
      }

      setAttachment({
        mimeType: mimeType,
        data: base64String,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        models={models}
        settings={settings}
        onUpdateModels={setModels}
        onUpdateSettings={setSettings}
      />

      {/* Main Grid */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100">
        <div className="h-full flex gap-px">
            {activeModels.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                    <AlertTriangle size={48} className="text-gray-300" />
                    <p>No active models selected.</p>
                    <button onClick={() => setIsSettingsOpen(true)} className="text-blue-600 font-medium hover:underline">
                        Configure Settings
                    </button>
                </div>
            ) : (
                activeModels.map(model => {
                    const thread = threads[model.id] || { modelId: model.id, messages: [], isTyping: false };
                    return (
                        <ThreadColumn 
                            key={model.id}
                            model={model}
                            thread={thread}
                        />
                    );
                })
            )}
        </div>
      </main>

      {/* Control Bar */}
      <footer className="bg-white border-t border-gray-200 flex-shrink-0 relative z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs">
             <div className="flex gap-2">
                 <button 
                    onClick={handleGlobalCompare}
                    disabled={activeModels.length < 2}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50"
                 >
                    <GitCompare size={14} />
                    <span>Global Compare</span>
                 </button>
                 <button 
                    onClick={handleGlobalDownload}
                    disabled={activeModels.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all disabled:opacity-50"
                 >
                    <Download size={14} />
                    <span>Download All</span>
                 </button>
             </div>
             <div className="text-gray-400 font-medium">
                 {activeModels.length} Active
             </div>
        </div>

        <div className="p-4 max-w-6xl mx-auto flex gap-3 items-end">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="mb-3 p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Settings"
            >
                <SettingsIcon size={20} />
            </button>

            <div className="flex-1 flex flex-col gap-2">
                {attachment && (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded text-xs text-blue-700 w-fit">
                        <Paperclip size={14} />
                        <span className="max-w-[200px] truncate">{attachment.name}</span>
                        <button onClick={() => { setAttachment(undefined); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 hover:text-blue-900"><X size={14} /></button>
                    </div>
                )}
                <div className="relative flex-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="w-full resize-none border border-gray-300 rounded-lg pl-4 pr-10 py-3 focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none min-h-[50px] max-h-[150px] shadow-sm"
                        rows={1}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 p-1"
                        title="Attach File"
                    >
                        <Paperclip size={18} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            <button 
                onClick={handleSend}
                disabled={!input.trim() && !attachment}
                className="h-[50px] w-[50px] bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm mb-px"
            >
                <Send size={20} />
            </button>
        </div>
      </footer>
    </div>
  );
}