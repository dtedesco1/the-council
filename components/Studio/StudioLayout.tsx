import React, { useState } from 'react';
import { ModelConfig, AppState, Attachment, ImageGeneration, StudioSettings } from '../../types';
import StudioColumn from './StudioColumn';
import StudioControls from './StudioControls';
import { getImageProvider } from '../../services/llm/image';
import { Paperclip, X, Send, Sparkles, Settings } from 'lucide-react'; // Import Settings icon

interface StudioLayoutProps {
    models: ModelConfig[];
    state: AppState;
    onUpdateSettings: (s: StudioSettings) => void;
    onAddGalleryItem: (item: ImageGeneration) => void;
    onOpenSettings: () => void;
    onAddMessage: (modelId: string, text: string, role: 'user' | 'model', attach?: Attachment) => void;
}

export default function StudioLayout({ models, state, onUpdateSettings, onAddGalleryItem, onOpenSettings, onAddMessage }: StudioLayoutProps) {
    const activeModels = models.filter(m => m.enabled && (m.capabilities.includes('image') || m.capabilities.includes('video')));

    // Local state for input
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
    // errors state removed in favor of thread messages
    const [referenceImages, setReferenceImages] = useState<Attachment[]>([]);

    const handleRefine = async (item: ImageGeneration) => {
        // Convert gallery item to reference attachment
        // Handle Blob URLs (from safeUrl optimization)
        let data: string = '';
        const mimeType = item.mimeType || (item.url.includes('video') ? 'video/mp4' : 'image/png');

        const newRef: Attachment = {
            name: 'reference-' + item.id,
            mimeType,
            data: ''
        };

        try {
            if (item.url.startsWith('blob:')) {
                const response = await fetch(item.url);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise<void>((resolve) => {
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        newRef.data = result.split(',')[1];
                        resolve();
                    };
                    reader.readAsDataURL(blob);
                });
            } else if (item.url.startsWith('data:')) {
                newRef.data = item.url.split(',')[1];
            } else {
                // Fallback for real URLs if any
                newRef.data = ''; // TODO: handle external URL
            }

            if (newRef.data) {
                setReferenceImages(prev => [...prev, newRef]);
            }
        } catch (e) {
            console.error("Failed to process blob for refinement", e);
        }

        setPrompt(prev => prev || item.prompt); // Pre-fill prompt if empty
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || activeModels.length === 0) return;

        // Parallel Requests
        activeModels.forEach(async (model) => {
            // Basic Capability Check for Video
            // If Video Mode is ON, only trigger video-capable models
            if (state.studioSettings.videoMode && !model.capabilities.includes('video')) return;

            setIsGenerating(prev => ({ ...prev, [model.id]: true }));

            // Add User Prompt to Thread
            // If we have reference images, we could try to attach them to the 'user' message, 
            // but for now we just log the prompt text.
            onAddMessage(model.id, prompt, 'user', referenceImages[0]); // Attach first ref image for context in history

            try {
                const provider = getImageProvider(model.provider);
                const apiKey = state.settings.apiKeys[model.provider];

                if (!apiKey) throw new Error(`Missing API Key for ${model.provider}`);

                const results = await provider.generateImage({
                    modelId: model.id,
                    prompt,
                    apiKey,
                    baseUrl: state.settings.apiEndpoints[model.provider],
                    settings: state.studioSettings,
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined
                });

                results.forEach(res => {
                    // Add to Gallery (for persistence/grids if needed later)
                    onAddGalleryItem({
                        id: Date.now().toString() + Math.random().toString(36).substring(2),
                        url: res.url,
                        prompt,
                        modelId: model.id,
                        timestamp: Date.now(),
                        mimeType: res.mimeType,
                        metadata: res.metadata
                    });

                    // Add to Thread History (Model Response)
                    onAddMessage(model.id, "Generated Image", 'model', {
                        name: 'generated.png',
                        mimeType: res.mimeType,
                        data: res.url.startsWith('data:') ? res.url.split(',')[1] : '' // If it's a URL, we might need a placeholder or download it
                        // Note: App.tsx addMessage logic might need data. If 'url' is external, 'data' is empty.
                        // Message component usually handles this if 'attachment' is structurally valid.
                    });
                });

            } catch (e: any) {
                // Log Error to Thread
                onAddMessage(model.id, `Error: ${e.message}`, 'model');
            } finally {
                setIsGenerating(prev => ({ ...prev, [model.id]: false }));
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Main Canvas / Grid */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex gap-px">
                    {activeModels.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Sparkles size={48} className="mb-4 text-gray-300" />
                            <p>Select active image models in settings</p>
                        </div>
                    ) : (
                        activeModels.map(m => (
                            <StudioColumn
                                key={m.id}
                                model={m}
                                messages={state.threads[m.id]?.messages || []} // Pass messages instead of generations
                                isGenerating={!!isGenerating[m.id]}
                                onRefine={handleRefine}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white border-t border-gray-200 p-4 shadow-lg z-20">
                <div className="max-w-4xl mx-auto space-y-3">
                    {/* Settings Toolbar */}
                    <div className="flex justify-between items-end">
                        <StudioControls settings={state.studioSettings} onUpdate={onUpdateSettings} />
                        {/* SETTINGS BUTTON */}
                        <button
                            onClick={onOpenSettings}
                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Reference Image Preview */}
                    {referenceImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {referenceImages.map((img, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded text-xs text-purple-700 w-fit">
                                    <Paperclip size={14} />
                                    <span className="font-medium max-w-[100px] truncate">{img.name}</span>
                                    <button
                                        onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                                        className="ml-2 hover:text-purple-900"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Prompt Input */}
                    <div className="flex gap-2 relative">
                        {/* Reference Image Upload Overlay / Button */}
                        <div className="absolute left-3 bottom-3 flex gap-2">
                            <label className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors bg-white/50 backdrop-blur rounded p-1">
                                <Paperclip size={18} />
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                const result = reader.result as string;
                                                setReferenceImages(prev => [...prev, {
                                                    name: file.name,
                                                    mimeType: file.type,
                                                    data: result.split(',')[1]
                                                }]);
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }}
                                />
                            </label>
                        </div>

                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                            placeholder={referenceImages.length > 0 ? "Add instructions for these references..." : "Describe your imagination... (e.g. 'Cyberpunk city at night, neon lights')"}
                            className="flex-1 resize-none border border-gray-300 rounded-lg pl-10 pr-20 py-3 focus:ring-2 focus:ring-indigo-500 outline-none h-[60px]"
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || activeModels.length === 0}
                            className="h-[60px] px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg flex flex-col items-center justify-center shadow-sm transition-colors"
                        >
                            <Send size={20} />
                            <span className="text-[10px] uppercase font-bold mt-1">Create</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
