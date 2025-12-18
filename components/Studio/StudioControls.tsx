import React from 'react';
import { Layers, Video, Image as ImageIcon, Sparkles } from 'lucide-react';
import { StudioSettings } from '../../types';

interface StudioControlsProps {
    settings: StudioSettings;
    onUpdate: (s: StudioSettings) => void;
}

export default function StudioControls({ settings, onUpdate }: StudioControlsProps) {
    return (
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-lg border border-gray-200/50 text-xs">

            {/* Video Mode Toggle */}
            <button
                onClick={() => onUpdate({ ...settings, videoMode: !settings.videoMode })}
                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${settings.videoMode
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
            >
                <Video size={14} />
                <span className="font-medium">Video</span>
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-300" />

            {/* Batch Count */}
            <div className="flex items-center gap-1.5 px-2">
                <Layers size={14} className="text-gray-500" />
                <span className="font-medium text-gray-700">Count:</span>
                <div className="flex bg-gray-100 rounded p-0.5">
                    {[1, 2, 3, 4].map(n => (
                        <button
                            key={n}
                            onClick={() => onUpdate({ ...settings, imageCount: n })}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${settings.imageCount === n
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-300" />

            {/* Aspect Ratio */}
            <div className="flex items-center gap-2 px-2">
                <span className="font-medium text-gray-700">Aspect:</span>
                <select
                    value={settings.aspectRatio}
                    onChange={(e) => onUpdate({ ...settings, aspectRatio: e.target.value as any })}
                    className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="4:3">4:3 (Photo)</option>
                </select>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-300" />

            {/* Style / Quality (Simplified for MVP) */}
            <div className="flex items-center gap-2 px-2">
                <Sparkles size={14} className="text-amber-500" />
                <select
                    value={settings.style}
                    onChange={(e) => onUpdate({ ...settings, style: e.target.value })}
                    className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="vivid">Vivid</option>
                    <option value="natural">Natural</option>
                    <option value="cinematic">Cinematic</option>
                </select>
            </div>
        </div>
    );
}
