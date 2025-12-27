import React, { useState } from 'react';
import { ModelConfig, AppSettings, StudioSettings } from '../types';
import { X, Plus, Trash2, Save, RefreshCw, Link, MessageSquare, Cpu, ChevronDown, ChevronRight, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { INITIAL_MODELS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelConfig[];
  settings: AppSettings;
  studioSettings: StudioSettings;
  onUpdateModels: (models: ModelConfig[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateStudioSettings: (s: StudioSettings) => void;
}

type Tab = 'chat_models' | 'image_models' | 'studio_config' | 'connections' | 'prompts';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, models, settings, studioSettings, onUpdateModels, onUpdateSettings, onUpdateStudioSettings
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('chat_models');

  // State for new model form
  const [newModelProvider, setNewModelProvider] = useState<'google' | 'openai' | 'anthropic'>('openai');
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);
  const [newModelType, setNewModelType] = useState<'text' | 'image'>('text'); // For adding custom models

  const [showAdvancedGlobal, setShowAdvancedGlobal] = useState(false);

  if (!isOpen) return null;

  const updateApiKey = (provider: 'google' | 'openai' | 'anthropic' | 'xai' | 'openrouter', value: string) => {
    onUpdateSettings({
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [provider]: value
      }
    });
  };

  const updateApiEndpoint = (provider: 'openai' | 'anthropic' | 'xai' | 'openrouter', value: string) => {
    onUpdateSettings({
      ...settings,
      apiEndpoints: {
        ...settings.apiEndpoints,
        [provider]: value
      }
    });
  };

  const updateStudioModelId = (provider: 'google' | 'openai' | 'xai' | 'openrouter', value: string) => {
    onUpdateStudioSettings({
      ...studioSettings,
      imageModelIds: {
        ...studioSettings.imageModelIds,
        [provider]: value
      }
    });
  };

  // --- Model Management Logic ---

  const handleToggleModel = (id: string) => {
    const updated = models.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    onUpdateModels(updated);
  };

  const handleDeleteModel = (idToDelete: string) => {
    // Directly filter out the model with the matching ID
    const updated = models.filter(m => m.id !== idToDelete);
    onUpdateModels(updated);
  };

  const handleAddModel = () => {
    if (!newModelId) return;

    // xai is just openai-compatible, so we group it for the UI but mapping is handled in App
    let providerToSave = newModelProvider;

    const modelToAdd: ModelConfig = {
      id: newModelId.trim(),
      name: newModelName.trim() || newModelId.trim(), // Default name to ID if empty
      provider: providerToSave as any,
      enabled: true,
      baseUrl: customBaseUrl.trim() || undefined,
      apiKey: customApiKey.trim() || undefined,
      capabilities: [newModelType] // Use selected type
    };

    if (models.some(m => m.id === modelToAdd.id)) {
      alert("A model with this ID already exists. Please use a unique ID.");
      return;
    }

    onUpdateModels([...models, modelToAdd]);

    // Reset form
    setNewModelId('');
    setNewModelName('');
    setCustomBaseUrl('');
    setCustomApiKey('');
    setShowAdvancedAdd(false);
  };

  const handleResetModels = () => {
    if (window.confirm("This will delete all custom models and restore the defaults. Continue?")) {
      onUpdateModels(INITIAL_MODELS);
    }
  };

  // Filter models for display
  const chatModels = models.filter(m => m.capabilities.includes('text'));
  const imageModels = models.filter(m => m.capabilities.includes('image'));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="font-bold text-xl text-gray-800">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('chat_models')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'chat_models' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Cpu size={16} /> Chat Models
          </button>
          <button
            onClick={() => setActiveTab('image_models')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'image_models' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ImageIcon size={16} /> Image Models
          </button>
          <button
            onClick={() => setActiveTab('studio_config')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'studio_config' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ImageIcon size={16} /> Studio defaults
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'connections' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Link size={16} /> Global Keys
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'prompts' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MessageSquare size={16} /> Prompts
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">

          {/* --- STUDIO CONFIG TAB --- */}
          {activeTab === 'studio_config' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-xs text-indigo-800 flex gap-2">
                <ImageIcon size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Studio Default Configuration</p>
                  <p>These model IDs are used by the Studio app when the specific providers are invoked. Ensure the corresponding models are enabled in the 'Image Models' tab for them to appear in the Studio.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Google (Nano Banana Pro)
                  </label>
                  <input
                    type="text"
                    value={studioSettings.imageModelIds?.google || ''}
                    onChange={(e) => updateStudioModelId('google', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="gemini-3-pro-image-preview"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 ">Required: Access to Vertex AI or AI Studio image generation models.</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    OpenAI
                  </label>
                  <input
                    type="text"
                    value={studioSettings.imageModelIds?.openai || ''}
                    onChange={(e) => updateStudioModelId('openai', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono"
                    placeholder="gpt-image-1"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">Note: Use 'gpt-image-1' for optimal results.</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                    xAI (Grok)
                  </label>
                  <input
                    type="text"
                    value={studioSettings.imageModelIds?.xai || ''}
                    onChange={(e) => updateStudioModelId('xai', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-slate-500 outline-none font-mono"
                    placeholder="grok-2-image-latest"
                  />
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    OpenRouter
                  </label>
                  <input
                    type="text"
                    value={studioSettings.imageModelIds?.openrouter || ''}
                    onChange={(e) => updateStudioModelId('openrouter' as any, e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                    placeholder="sourceful/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- CONNECTIONS TAB --- */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800 flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>Keys are stored in your browser's Local Storage. These global keys are used unless a specific model overrides them.</p>
              </div>

              <div className="grid gap-4">
                {/* Google Config */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <label className="text-sm font-medium text-blue-800">Google Gemini</label>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.google}
                    onChange={(e) => updateApiKey('google', e.target.value)}
                    placeholder="Paste AI Studio API Key here..."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                {/* OpenAI Config */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <label className="text-sm font-medium">OpenAI (Default)</label>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.openai}
                    onChange={(e) => updateApiKey('openai', e.target.value)}
                    placeholder="sk-..."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono"
                  />
                </div>

                {/* Anthropic Config */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <label className="text-sm font-medium">Anthropic (Default)</label>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.anthropic}
                    onChange={(e) => updateApiKey('anthropic', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                  />
                </div>

                {/* OpenRouter Config */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <label className="text-sm font-medium">OpenRouter</label>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.openrouter || ''}
                    onChange={(e) => updateApiKey('openrouter' as any, e.target.value)}
                    placeholder="sk-or-..."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                  />
                </div>

                {/* Advanced Toggle */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowAdvancedGlobal(!showAdvancedGlobal)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    {showAdvancedGlobal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Global Base URLs (Advanced)
                  </button>

                  {showAdvancedGlobal && (
                    <div className="mt-4 space-y-4 p-4 bg-gray-100 rounded text-xs">
                      <p className="text-gray-500 mb-2">Use these to point standard providers to local proxies or alternative backends globally.</p>

                      <div>
                        <label className="block mb-1 font-semibold">OpenAI Base URL</label>
                        <input
                          type="text"
                          value={settings.apiEndpoints.openai}
                          onChange={(e) => updateApiEndpoint('openai', e.target.value)}
                          className="w-full p-2 border rounded font-mono"
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold">Anthropic Base URL</label>
                        <input
                          type="text"
                          value={settings.apiEndpoints.anthropic}
                          onChange={(e) => updateApiEndpoint('anthropic', e.target.value)}
                          className="w-full p-2 border rounded font-mono"
                          placeholder="https://api.anthropic.com/v1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- MODEL TABS (Combined Structure) --- */}
          {(activeTab === 'chat_models' || activeTab === 'image_models') && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">
                  {activeTab === 'chat_models' ? 'Active Chat Models' : 'Active Image Models'}
                </h3>
                <button onClick={handleResetModels} className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
                  <RefreshCw size={12} /> Reset to Defaults
                </button>
              </div>

              {/* Add New Model Form */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Plus size={16} /> Add Custom {activeTab === 'chat_models' ? 'Chat' : 'Image'} Model
                </h4>
                {/* Auto-set type based on active tab */}
                {(() => {
                  if (activeTab === 'chat_models' && newModelType !== 'text') setNewModelType('text');
                  if (activeTab === 'image_models' && newModelType !== 'image') setNewModelType('image');
                  return null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Protocol / Interface</label>
                    <select
                      className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none bg-white"
                      value={newModelProvider}
                      onChange={(e) => setNewModelProvider(e.target.value as any)}
                    >
                      <option value="openai">OpenAI Compatible (Grok, OpenRouter, LiteLLM)</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Model ID (Required)</label>
                    <input
                      type="text"
                      placeholder="e.g. deepseek/deepseek-r1"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none font-mono"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Display Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="My Custom Model"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Advanced Add Toggle */}
                <button
                  onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {showAdvancedAdd ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Custom Connection Details (OpenRouter / LocalAI)
                </button>

                {showAdvancedAdd && (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1 text-gray-500 font-semibold">Custom Base URL</label>
                      <input
                        type="text"
                        placeholder="https://openrouter.ai/api/v1"
                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 outline-none font-mono"
                        value={customBaseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Leave empty to use global defaults.</p>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-500 font-semibold">Custom API Key</label>
                      <input
                        type="password"
                        placeholder="sk-..."
                        className="w-full text-xs border border-gray-300 rounded px-2 py-2 outline-none font-mono"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Leave empty to use global keys.</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddModel}
                  disabled={!newModelId}
                  className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-2 rounded hover:bg-slate-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> Add Model
                </button>
              </div>

              {/* Models List */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Enabled</th>
                      <th className="px-4 py-3">Protocol</th>
                      <th className="px-4 py-3">ID / Name</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activeTab === 'chat_models' ? chatModels : imageModels).map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={m.enabled}
                            onChange={() => handleToggleModel(m.id)}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                            ${m.provider === 'google' ? 'bg-blue-100 text-blue-700' :
                                m.provider === 'openai' ? 'bg-green-100 text-green-700' :
                                  m.provider === 'anthropic' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'}`}
                            >
                              {m.provider === 'xai' ? 'OPENAI' : m.provider.toUpperCase()}
                            </span>
                            {m.baseUrl && <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded">Custom URL</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{m.name}</div>
                          <div className="font-mono text-gray-400 text-xs">{m.id}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteModel(m.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Empty State */}
                    {(activeTab === 'chat_models' ? chatModels : imageModels).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                          No models found. Add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- PROMPTS TAB --- */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => onUpdateSettings({ ...settings, systemPrompt: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-3 text-sm h-28 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Global Compare Template</label>
                <textarea
                  value={settings.comparePromptTemplate}
                  onChange={(e) => onUpdateSettings({ ...settings, comparePromptTemplate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-3 text-sm h-40 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Save size={16} /> Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;