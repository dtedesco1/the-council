import React, { useState, useCallback, useRef } from 'react';
import { Send, Settings as SettingsIcon, Paperclip, Download, GitCompare, X, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import ThreadColumn from './components/ThreadColumn';
import SettingsModal from './components/SettingsModal';
import { useChatState } from './hooks/useChatState';
import { getProvider } from './services/llm/factory';
import { detectMimeType } from './utils/files';
import { Attachment, Message } from './types';

export default function App() {
    const { models, setModels, settings, setSettings, threads, updateThread, addMessage, gallery, setGallery, viewMode, setViewMode, studioSettings, setStudioSettings } = useChatState();
    const [input, setInput] = useState('');
    const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTextModels = models.filter(m => m.enabled && m.capabilities.includes('text'));

    // --- Core Business Logic ---

    const sendMessageToModel = async (modelId: string, text: string, attach?: Attachment, contextOverride?: Message[]) => {
        const model = models.find(m => m.id === modelId);
        if (!model) return;

        updateThread(modelId, () => ({ isTyping: true, error: undefined }));

        try {
            const provider = getProvider(model.provider);
            const history = contextOverride || threads[modelId]?.messages || [];

            // Resolve Config (Model Override > Global Settings)
            const apiKey = model.apiKey || settings.apiKeys[model.provider];
            let baseUrl = model.baseUrl;
            if (!baseUrl) {
                if (model.provider === 'openai') baseUrl = settings.apiEndpoints.openai;
                if (model.provider === 'anthropic') baseUrl = settings.apiEndpoints.anthropic;
                if (model.provider === 'xai') baseUrl = settings.apiEndpoints.xai;
            }

            const response = await provider.generateResponse({
                modelId: model.id,
                apiKey,
                baseUrl,
                history,
                newMessage: text,
                systemInstruction: settings.systemPrompt,
                attachment: attach
            });

            // Add message with token usage from API response
            addMessage(model.id, response.text, 'model', undefined, response.usage);

        } catch (err: any) {
            updateThread(modelId, () => ({ error: err.message || "Unknown error" }));
        } finally {
            updateThread(modelId, () => ({ isTyping: false }));
        }
    };

    const handleSend = useCallback(async () => {
        if ((!input.trim() && !attachment) || activeTextModels.length === 0) return;
        const txt = input;
        const att = attachment;

        setInput('');
        setAttachment(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';

        activeTextModels.forEach(m => {
            addMessage(m.id, txt, 'user', att);
            sendMessageToModel(m.id, txt, att);
        });
    }, [input, attachment, activeTextModels, threads, settings]);

    const handleGlobalCompare = async () => {
        if (activeTextModels.length < 2) return alert("Activate at least 2 models.");

        activeTextModels.forEach(target => {
            const others = activeTextModels.filter(m => m.id !== target.id)
                .map(m => {
                    const msgs = threads[m.id]?.messages || [];
                    const last = msgs[msgs.length - 1];
                    return (last?.role === 'model') ? `<model_response name="${m.name}">${last.text}</model_response>` : null;
                })
                .filter(Boolean);

            if (others.length === 0) return;
            const prompt = settings.comparePromptTemplate.replace('{{OTHER_RESPONSES}}', others.join('\n\n'));
            addMessage(target.id, prompt, 'user');
            sendMessageToModel(target.id, prompt);
        });
    };

    const handleGlobalDownload = async () => {
        const zip = new JSZip();
        const folder = zip.folder("omnichat_export");

        activeTextModels.forEach(m => {
            const thread = threads[m.id];
            if (!thread?.messages.length) return;
            const content = thread.messages.map(msg => {
                const role = msg.role === 'user' ? 'User' : m.name;
                const attach = msg.attachment ? `[File: ${msg.attachment.name}]` : '';
                return `## ${role} (${new Date(msg.timestamp).toISOString()})\n${attach}\n\n${msg.text}\n\n---`;
            }).join('\n\n');
            folder?.file(`${m.name.replace(/\s+/g, '_')}.md`, content);
        });

        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `omnichat_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();
    };

    // --- Handlers ---
    /**
     * Handles file selection from the file input.
     * Uses detectMimeType to properly identify file types that browsers often miss
     * (e.g., .md files which browsers report as empty or application/octet-stream).
     */
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const r = new FileReader();
        r.onloadend = () => {
            // Use detectMimeType to properly identify file types
            // This fixes issues where browsers return empty or 'application/octet-stream' for .md, .ts, etc.
            const detectedMime = detectMimeType(file.name, file.type);
            console.log(`[App] File selected: ${file.name}, browser type: "${file.type}", detected type: "${detectedMime}"`);

            setAttachment({
                mimeType: detectedMime,
                data: (r.result as string).split(',')[1],
                name: file.name
            });
        };
        r.readAsDataURL(file);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // New Import Logic for Studio
    const StudioLayout = React.lazy(() => import('./components/Studio/StudioLayout'));

    // --- Render ---
    return (
        <div className="flex flex-col h-screen md:h-screen supports-[height:100dvh]:h-[100dvh] bg-gray-100">
            <SettingsModal
                isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
                models={models} settings={settings} studioSettings={studioSettings}
                onUpdateModels={setModels} onUpdateSettings={setSettings} onUpdateStudioSettings={setStudioSettings}
            />

            <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-30 flex-shrink-0">
                <div className="font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">C</div>
                    <span className="hidden md:inline">The Council</span>
                </div>

                {/* Mode Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('chat')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'chat' ? 'bg-white shadow text-slate-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => setViewMode('studio')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'studio' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Studio
                    </button>
                </div>

                <div className="w-8" /> {/* Balance */}
            </header>

            {viewMode === 'chat' ? (
                <>
                    <main className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100 snap-x snap-mandatory">
                        <div className="h-full flex gap-px">
                            {activeTextModels.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <AlertTriangle size={48} className="text-gray-300" />
                                    <p>No active models selected.</p>
                                    <button onClick={() => setIsSettingsOpen(true)} className="text-blue-600 hover:underline">Configure Settings</button>
                                </div>
                            ) : (
                                activeTextModels.map(m => (
                                    <ThreadColumn key={m.id} model={m} thread={threads[m.id] || { modelId: m.id, messages: [], isTyping: false, totalTokens: 0 }} />
                                ))
                            )}
                        </div>
                    </main>

                    <footer className="bg-white border-t border-gray-200 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex-shrink-0">
                        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between text-xs">
                            <div className="flex gap-2">
                                <button onClick={handleGlobalCompare} disabled={activeTextModels.length < 2} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50">
                                    <GitCompare size={14} /> <span className="hidden sm:inline">Global Compare</span>
                                </button>
                                <button onClick={handleGlobalDownload} disabled={!activeTextModels.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-green-50 hover:text-green-600 disabled:opacity-50">
                                    <Download size={14} /> <span className="hidden sm:inline">Download All</span>
                                </button>
                            </div>
                            <div className="text-gray-400 font-medium">{activeTextModels.length} Active</div>
                        </div>

                        <div className="p-4 max-w-6xl mx-auto flex gap-3 items-end">
                            <button onClick={() => setIsSettingsOpen(true)} className="mb-3 p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Settings">
                                <SettingsIcon size={20} />
                            </button>

                            <div className="flex-1 flex flex-col gap-2">
                                {attachment && (
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded text-xs text-blue-700 w-fit">
                                        <Paperclip size={14} /> <span className="max-w-[200px] truncate">{attachment.name}</span>
                                        <button onClick={() => { setAttachment(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 hover:text-blue-900"><X size={14} /></button>
                                    </div>
                                )}
                                <div className="relative flex-1">
                                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="w-full resize-none border border-gray-300 rounded-lg pl-4 pr-10 py-3 focus:ring-2 focus:ring-slate-400 outline-none min-h-[50px] max-h-[150px] shadow-sm" rows={1} />
                                    <button onClick={() => fileInputRef.current?.click()} className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 p-1">
                                        <Paperclip size={18} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                </div>
                            </div>

                            <button onClick={handleSend} disabled={!input.trim() && !attachment} className="h-[50px] w-[50px] bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center shadow-sm mb-px">
                                <Send size={20} />
                            </button>
                        </div>
                    </footer>
                </>
            ) : (
                <React.Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Studio...</div>}>
                    <StudioLayout
                        models={models}
                        state={{ models, threads, gallery, settings, viewMode, studioSettings }}
                        onUpdateSettings={setStudioSettings}
                        onAddMessage={addMessage}
                        onAddGalleryItem={(item) => {
                            // OPTIMIZATION: Convert Base64 Key to Blob URL to prevent React State OOM Crashes
                            let safeUrl = item.url;
                            if (item.url.startsWith('data:')) {
                                try {
                                    const [header, base64Data] = item.url.split(',');
                                    const mime = header.split(':')[1].split(';')[0];
                                    const binary = atob(base64Data);
                                    const array = new Uint8Array(binary.length);
                                    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
                                    const blob = new Blob([array], { type: mime });
                                    safeUrl = URL.createObjectURL(blob);
                                } catch (e) {
                                    console.error("Failed to convert base64 to blob", e);
                                }
                            }
                            setGallery(prev => [{ ...item, url: safeUrl }, ...prev]);
                        }}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                    />
                </React.Suspense>
            )}
        </div>
    );
}
