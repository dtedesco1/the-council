import { useState, useEffect } from 'react';
import { ModelConfig, Thread, AppSettings, Message, Attachment, TokenUsage, StudioSettings, ViewMode, ImageGeneration } from '../types';
import { INITIAL_MODELS, INITIAL_SETTINGS } from '../constants';

/**
 * LocalStorage keys for persisting state.
 * Note: Only user CUSTOMIZATIONS are persisted - base configuration comes from .env
 */
const KEYS = {
    /** Stores only user-added custom models (not the default 4 from .env) */
    CUSTOM_MODELS: 'omnichat_custom_models_v2',
    /** Stores user settings (prompts, etc.) - NOT API keys or endpoints */
    SETTINGS: 'omnichat_settings_v2'
};

/**
 * Legacy localStorage keys - used for migration and cleanup
 */
const LEGACY_KEYS = {
    MODELS: 'omnichat_models_v1',
    SETTINGS: 'omnichat_settings_v1'
};

/**
 * Merges base models from .env with user-added custom models from localStorage.
 *
 * The .env file is the SINGLE SOURCE OF TRUTH for the default 4 models
 * (Google, Anthropic, OpenAI, xAI). User can add additional custom models
 * which are persisted to localStorage.
 *
 * @returns Array of model configs with .env models first, then custom additions
 */
const initializeModels = (): ModelConfig[] => {
    // Step 1: Start with INITIAL_MODELS from .env (this is the source of truth)
    const baseModels = [...INITIAL_MODELS];
    const baseProviders = new Set(baseModels.map(m => m.provider));

    console.log('[useChatState] Base models from .env:', baseModels.map(m => `${m.provider}:${m.id}`).join(', '));

    // Step 2: Load custom models from localStorage (user additions only)
    try {
        const customModelsStr = localStorage.getItem(KEYS.CUSTOM_MODELS);
        if (customModelsStr) {
            const customModels = JSON.parse(customModelsStr) as ModelConfig[];
            // Only include models that don't conflict with base providers
            const validCustomModels = customModels.filter(cm => !baseProviders.has(cm.provider));
            if (validCustomModels.length > 0) {
                console.log('[useChatState] Custom models from localStorage:', validCustomModels.map(m => m.id).join(', '));
                return [...baseModels, ...validCustomModels];
            }
        }
    } catch (e) {
        console.warn('[useChatState] Failed to load custom models from localStorage:', e);
    }

    // Step 3: Migration - check for legacy localStorage and extract any custom models
    try {
        const legacyModelsStr = localStorage.getItem(LEGACY_KEYS.MODELS);
        if (legacyModelsStr) {
            console.log('[useChatState] Found legacy models in localStorage, migrating...');
            const legacyModels = JSON.parse(legacyModelsStr) as ModelConfig[];

            // Extract only custom models (those not matching base provider)
            const customModels = legacyModels.filter(lm => !baseProviders.has(lm.provider));

            if (customModels.length > 0) {
                console.log('[useChatState] Migrated custom models:', customModels.map(m => m.id).join(', '));
                // Save custom models to new key
                localStorage.setItem(KEYS.CUSTOM_MODELS, JSON.stringify(customModels));
            }

            // Clear legacy key after migration
            localStorage.removeItem(LEGACY_KEYS.MODELS);
            console.log('[useChatState] Legacy models migrated and cleared');

            return [...baseModels, ...customModels];
        }
    } catch (e) {
        console.warn('[useChatState] Failed to migrate legacy models:', e);
    }

    return baseModels;
};

/**
 * Initializes settings by merging .env values with user customizations from localStorage.
 *
 * The .env file provides API keys and endpoints.
 * LocalStorage stores user customizations like prompts.
 * .env values ALWAYS take precedence for API keys and endpoints.
 *
 * @returns Merged settings with .env as source of truth for API configuration
 */
const initializeSettings = (): AppSettings => {
    // Start with INITIAL_SETTINGS from .env
    const baseSettings = { ...INITIAL_SETTINGS };

    try {
        const storedSettingsStr = localStorage.getItem(KEYS.SETTINGS);
        if (storedSettingsStr) {
            const storedSettings = JSON.parse(storedSettingsStr) as Partial<AppSettings>;

            // Merge stored settings BUT always use .env for API keys and endpoints
            // This ensures .env is the single source of truth for sensitive configuration
            return {
                ...baseSettings,
                // Only merge non-sensitive user customizations
                systemPrompt: storedSettings.systemPrompt || baseSettings.systemPrompt,
                comparePromptTemplate: storedSettings.comparePromptTemplate || baseSettings.comparePromptTemplate,
                // API keys and endpoints ALWAYS come from .env (INITIAL_SETTINGS)
                apiKeys: baseSettings.apiKeys,
                apiEndpoints: baseSettings.apiEndpoints
            };
        }

        // Try legacy key migration
        const legacySettingsStr = localStorage.getItem(LEGACY_KEYS.SETTINGS);
        if (legacySettingsStr) {
            console.log('[useChatState] Found legacy settings, migrating...');
            const legacySettings = JSON.parse(legacySettingsStr) as Partial<AppSettings>;

            // Migrate only non-sensitive settings
            const migratedSettings = {
                systemPrompt: legacySettings.systemPrompt || baseSettings.systemPrompt,
                comparePromptTemplate: legacySettings.comparePromptTemplate || baseSettings.comparePromptTemplate
            };

            // Save migrated settings to new key
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify(migratedSettings));
            localStorage.removeItem(LEGACY_KEYS.SETTINGS);
            console.log('[useChatState] Legacy settings migrated and cleared');

            return {
                ...baseSettings,
                ...migratedSettings,
                apiKeys: baseSettings.apiKeys,
                apiEndpoints: baseSettings.apiEndpoints
            };
        }
    } catch (e) {
        console.warn('[useChatState] Failed to load settings from localStorage:', e);
    }

    return baseSettings;
};

export function useChatState() {
    /**
     * Models state - initialized from .env with optional custom additions from localStorage.
     * The 4 default models (by provider) ALWAYS use .env configuration.
     */
    const [models, setModels] = useState<ModelConfig[]>(initializeModels);

    /**
     * Settings state - .env provides API keys/endpoints, localStorage provides user customizations.
     * API keys and endpoints ALWAYS come from .env.
     */
    const [settings, setSettings] = useState<AppSettings>(initializeSettings);

    // Threads (Derived from models, not persisted intentionally for now)
    const [threads, setThreads] = useState<Record<string, Thread>>({});

    // Studio State
    const [gallery, setGallery] = useState<ImageGeneration[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('chat');
    const [studioSettings, setStudioSettings] = useState<StudioSettings>({
        imageCount: 1,
        aspectRatio: '1:1',
        videoMode: false,
        imageModelIds: {
            google: 'gemini-3-pro-image-preview', // Default (Nano Banana Pro)
            openai: 'gpt-image-1.5',
            xai: 'grok-2-image-latest',
            openrouter: '' // User must select a model or it will default to empty
        }
    });

    /**
     * Persistence effects.
     *
     * IMPORTANT: We only persist USER CUSTOMIZATIONS, not base configuration.
     * - Models: Only save custom models (not the default 4 from .env)
     * - Settings: Only save prompts (API keys/endpoints come from .env)
     */

    // Persist only custom models (those not in the default 4 providers)
    useEffect(() => {
        const baseProviders = new Set(INITIAL_MODELS.map(m => m.provider));
        const customModels = models.filter(m => !baseProviders.has(m.provider));

        if (customModels.length > 0) {
            localStorage.setItem(KEYS.CUSTOM_MODELS, JSON.stringify(customModels));
            console.log('[useChatState] Saved custom models:', customModels.map(m => m.id).join(', '));
        } else {
            // No custom models, remove the key
            localStorage.removeItem(KEYS.CUSTOM_MODELS);
        }
    }, [models]);

    // Persist only user-customizable settings (NOT API keys or endpoints)
    useEffect(() => {
        const settingsToSave = {
            systemPrompt: settings.systemPrompt,
            comparePromptTemplate: settings.comparePromptTemplate
            // API keys and endpoints are NOT saved - they come from .env
        };
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settingsToSave));
    }, [settings]);

    // Sync threads when models change
    useEffect(() => {
        setThreads(prev => {
            const next = { ...prev };
            let changed = false;
            models.forEach(m => {
                if (!next[m.id]) {
                    next[m.id] = { modelId: m.id, messages: [], isTyping: false, totalTokens: 0 };
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [models]);

    // Actions
    const updateThread = (modelId: string, fn: (t: Thread) => Partial<Thread>) => {
        setThreads(prev => {
            const t = prev[modelId] || { modelId, messages: [], isTyping: false, totalTokens: 0 };
            return { ...prev, [modelId]: { ...t, ...fn(t) } };
        });
    };

    /**
     * Adds a message to a thread.
     * For model responses, optionally includes token usage from the API response.
     * Token usage is accumulated in the thread's totalTokens.
     */
    const addMessage = (
        modelId: string,
        text: string,
        role: 'user' | 'model',
        attach?: Attachment,
        usage?: TokenUsage
    ) => {
        const msg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            role, text, timestamp: Date.now(), attachment: attach,
            usage: role === 'model' ? usage : undefined
        };
        updateThread(modelId, (t) => ({
            messages: [...t.messages, msg],
            // Accumulate tokens from API response
            totalTokens: t.totalTokens + (usage?.totalTokens ?? 0)
        }));
        return msg;
    };

    return {
        models, setModels,
        settings, setSettings,
        threads, updateThread, addMessage,
        gallery, setGallery,
        viewMode, setViewMode,
        studioSettings, setStudioSettings
    };
}
