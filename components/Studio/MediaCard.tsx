import React from 'react';
import { Download, Edit2, Maximize2 } from 'lucide-react';
import { ImageGeneration } from '../../types';

interface MediaCardProps {
    item: ImageGeneration;
    onRefine: (item: ImageGeneration) => void;
}

export default function MediaCard({ item, onRefine }: MediaCardProps) {
    const isVideo = item.url.includes('data:video') || item.url.endsWith('.mp4');

    const handleDownload = async () => {
        try {
            let blobUrl = item.url;
            let shouldRevoke = false;

            // Check if it's a data URI
            if (item.url.startsWith('data:')) {
                const [header, base64Data] = item.url.split(',');
                const mimeString = header.split(':')[1].split(';')[0];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeString });
                blobUrl = URL.createObjectURL(blob);
                shouldRevoke = true;
            } else {
                // Fetch remote URL and convert to blob to support 'download' attribute
                try {
                    const response = await fetch(item.url);
                    const blob = await response.blob();
                    blobUrl = URL.createObjectURL(blob);
                    shouldRevoke = true;
                } catch (fetchErr) {
                    console.warn("Fetch failed, falling back to direct link (might open in new tab)", fetchErr);
                    // Fallback handled by using original URL
                }
            }

            const link = document.createElement('a');
            link.href = blobUrl;

            // Determine extension from mimeType
            let ext = isVideo ? 'mp4' : 'png';
            if (item.mimeType === 'image/jpeg') ext = 'jpg';
            if (item.mimeType === 'image/webp') ext = 'webp';

            link.download = `generated-${item.id}.${ext}`;
            // target=_blank is safer for direct links but optional for blobs
            if (!shouldRevoke) link.target = '_blank';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            if (shouldRevoke) {
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            }
        } catch (e) {
            console.error("Download failed:", e);
            alert("Failed to download image. See console.");
        }
    };

    return (
        <div className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm transition-all hover:shadow-md">
            {/* Aspect Ratio Fix: Use 'min-h-[200px]' or similar, but remove fixed aspect-square to show actual ratio */}
            <div className="w-full bg-gray-100 flex items-center justify-center overflow-hidden min-h-[200px]">
                {isVideo ? (
                    <video src={item.url} controls className="w-full h-auto object-cover" />
                ) : (
                    <img src={item.url} alt={item.prompt} className="w-full h-auto object-contain" loading="lazy" />
                )}
            </div>

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                    onClick={() => onRefine(item)}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                    title="Refine / Edit (Use as Reference)"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={handleDownload}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                    title="Download"
                >
                    <Download size={16} />
                </button>
            </div>

            {/* Info Footer */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white line-clamp-2">{item.prompt}</p>
            </div>
        </div>
    );
}
