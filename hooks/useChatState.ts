import { useState, useEffect } from 'react';
import { ModelConfig, Thread, AppSettings, Message, Attachment } from '../types';
import { INITIAL_MODELS, INITIAL_SETTINGS } from '../constants';

const KEYS = {
    MODELS: 'omnichat_models_v1',
    SETTINGS: 'omnichat_settings_v1'
};

export function useChatState() {
    // Models
    const [models, setModels] = useState<ModelConfig[]>(() => {
        try {
            const s = localStorage.getItem(KEYS.MODELS);
            return s ? JSON.parse(s) : INITIAL_MODELS;
        } catch { return INITIAL_MODELS; }
    });

    // Settings
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const s = localStorage.getItem(KEYS.SETTINGS);
            return s ? { ...INITIAL_SETTINGS, ...JSON.parse(s) } : INITIAL_SETTINGS;
        } catch { return INITIAL_SETTINGS; }
    });

    // Threads (Derived from models, not persisted intentionally for now)
    const [threads, setThreads] = useState<Record<string, Thread>>({});

    // Persistence
    useEffect(() => localStorage.setItem(KEYS.MODELS, JSON.stringify(models)), [models]);
    useEffect(() => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)), [settings]);

    // Sync threads when models change
    useEffect(() => {
        setThreads(prev => {
            const next = { ...prev };
            let changed = false;
            models.forEach(m => {
                if (!next[m.id]) {
                    next[m.id] = { modelId: m.id, messages: [], isTyping: false };
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [models]);

    // Actions
    const updateThread = (modelId: string, fn: (t: Thread) => Partial<Thread>) => {
        setThreads(prev => {
            const t = prev[modelId] || { modelId, messages: [], isTyping: false };
            return { ...prev, [modelId]: { ...t, ...fn(t) } };
        });
    };

    const addMessage = (modelId: string, text: string, role: 'user'|'model', attach?: Attachment) => {
        const msg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2,9),
            role, text, timestamp: Date.now(), attachment: attach
        };
        updateThread(modelId, (t) => ({ messages: [...t.messages, msg] }));
        return msg;
    };

    return {
        models, setModels,
        settings, setSettings,
        threads, updateThread, addMessage
    };
}
