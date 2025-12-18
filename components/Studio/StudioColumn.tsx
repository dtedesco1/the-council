import React, { useRef, useEffect } from 'react';
import { ModelConfig, Message, ImageGeneration } from '../../types';
import MediaCard from './MediaCard';
import { Loader2 } from 'lucide-react';

interface StudioColumnProps {
    model: ModelConfig;
    messages: Message[];
    isGenerating: boolean;
    onRefine: (item: ImageGeneration) => void;
}

export default function StudioColumn({ model, messages, isGenerating, onRefine }: StudioColumnProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    return (
        <div className="flex flex-col min-w-[320px] max-w-[400px] h-full border-r border-gray-200 bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
                    <h3 className="font-medium text-sm text-gray-800">{model.name}</h3>
                </div>
                <div className="flex gap-1">
                    {/* Model capabilities badges could go here */}
                    {model.capabilities.includes('video') && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">Video</span>
                    )}
                </div>
            </div>

            {/* Content List (Chat History) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && !isGenerating && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        <p>No history yet.</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isUser = msg.role === 'user';

                    // Render User Message (Prompt)
                    if (isUser) {
                        return (
                            <div key={msg.id} className="flex justify-end">
                                <div className="bg-white border border-gray-200 rounded-lg rounded-tr-none p-3 max-w-[90%] shadow-sm text-sm text-gray-800">
                                    <p>{msg.text}</p>
                                    {msg.attachment && (
                                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                            {/* Minimal attachment indicator */}
                                            Used reference: {msg.attachment.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // Render Model Message (Image or Error/Text)
                    if (msg.attachment) {
                        // It's an image generation result
                        // Reconstruct ImageGeneration object for MediaCard
                        const fakeGeneration: ImageGeneration = {
                            id: msg.id,
                            url: `data:${msg.attachment.mimeType};base64,${msg.attachment.data}`,
                            mimeType: msg.attachment.mimeType,
                            prompt: "Generated Image", // We don't have the prompt link here easily unless we look back, but MediaCard mainly needs image
                            modelId: model.id,
                            timestamp: msg.timestamp,
                            metadata: { width: 1024, height: 1024 } // Mock metadata
                        };
                        return <MediaCard key={msg.id} item={fakeGeneration} onRefine={onRefine} />;
                    } else {
                        // It's a text message (Error or status)
                        const isError = msg.text.toLowerCase().includes('error');
                        return (
                            <div key={msg.id} className={`flex justify-start`}>
                                <div className={`rounded-lg rounded-tl-none p-3 max-w-[90%] text-sm ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        );
                    }
                })}

                {isGenerating && (
                    <div className="animate-pulse space-y-3">
                        <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={24} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
