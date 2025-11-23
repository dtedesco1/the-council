import React, { useState } from 'react';
import { ModelConfig, AppSettings } from '../types';
import { X, Plus, Trash2, Save, RefreshCw, Link, MessageSquare, Cpu, ChevronDown, ChevronRight } from 'lucide-react';
import { INITIAL_MODELS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelConfig[];
  settings: AppSettings;
  onUpdateModels: (models: ModelConfig[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
}

type Tab = 'models' | 'connections' | 'prompts';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, models, settings, onUpdateModels, onUpdateSettings 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('connections'); // Default to connections for new users
  const [newModel, setNewModel] = useState<Partial<ModelConfig>>({ provider: 'openai', enabled: true });
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const updateApiKey = (provider: 'google' | 'openai' | 'anthropic' | 'xai', value: string) => {
    onUpdateSettings({
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [provider]: value
      }
    });
  };

  const updateApiEndpoint = (provider: 'openai' | 'anthropic' | 'xai', value: string) => {
    onUpdateSettings({
      ...settings,
      apiEndpoints: {
        ...settings.apiEndpoints,
        [provider]: value
      }
    });
  };

  // --- Model Management Logic ---

  const handleToggleModel = (id: string) => {
    const updated = models.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    onUpdateModels(updated);
  };

  const handleDeleteModel = (id: string) => {
    if (window.confirm('Remove this model?')) {
      onUpdateModels(models.filter(m => m.id !== id));
    }
  };

  const handleAddModel = () => {
    if (!newModel.name || !newModel.id || !newModel.provider) return;
    
    const modelToAdd: ModelConfig = {
      id: newModel.id,
      name: newModel.name,
      provider: newModel.provider as any,
      enabled: true
    };
    
    if (models.some(m => m.id === modelToAdd.id)) {
        alert("Duplicate Model ID");
        return;
    }

    onUpdateModels([...models, modelToAdd]);
    setNewModel({ provider: 'openai', name: '', id: '', enabled: true });
  };

  const handleResetModels = () => {
    if (window.confirm("Reset models to default?")) {
        onUpdateModels(INITIAL_MODELS);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="font-bold text-xl text-gray-800">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6">
           <button 
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'connections' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Link size={16} /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'models' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Cpu size={16} /> Models
          </button>
          <button 
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'prompts' ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MessageSquare size={16} /> Prompts
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* --- CONNECTIONS TAB --- */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
               <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">Providers</h3>
                    <p className="text-xs text-gray-400 mt-1">Enter your API keys below. Keys are stored locally in your browser.</p>
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
                            <label className="text-sm font-medium">OpenAI</label>
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
                            <label className="text-sm font-medium">Anthropic</label>
                        </div>
                        <input 
                            type="password"
                            value={settings.apiKeys.anthropic}
                            onChange={(e) => updateApiKey('anthropic', e.target.value)}
                            placeholder="sk-ant-..."
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                        />
                    </div>

                    {/* xAI Config */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-gray-800"></div>
                            <label className="text-sm font-medium">xAI (Grok)</label>
                        </div>
                        <input 
                            type="password"
                            value={settings.apiKeys.xai}
                            onChange={(e) => updateApiKey('xai', e.target.value)}
                            placeholder="xAI API Key..."
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-500 outline-none font-mono"
                        />
                    </div>

                    {/* Advanced Toggle */}
                    <div className="pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                            {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Advanced Configuration (Base URLs)
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-4 p-4 bg-gray-100 rounded text-xs">
                                <p className="text-gray-500 mb-2">Useful for proxies, local models (Ollama), or LiteLLM.</p>
                                
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

          {/* --- MODELS TAB --- */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">Active Models</h3>
                <button onClick={handleResetModels} className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
                    <RefreshCw size={12} /> Reset Defaults
                </button>
              </div>

              {/* Add New Model */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                        <label className="block text-xs mb-1 text-gray-400">Provider</label>
                        <select 
                            className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none bg-white"
                            value={newModel.provider}
                            onChange={(e) => setNewModel({...newModel, provider: e.target.value as any})}
                        >
                            <option value="google">Google</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="xai">xAI</option>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs mb-1 text-gray-400">Name</label>
                        <input 
                            type="text" 
                            placeholder="Display Name"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none"
                            value={newModel.name || ''}
                            onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                        />
                    </div>
                    <div className="col-span-4">
                        <label className="block text-xs mb-1 text-gray-400">Model ID</label>
                        <input 
                            type="text" 
                            placeholder="API ID"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-2 outline-none font-mono"
                            value={newModel.id || ''}
                            onChange={(e) => setNewModel({...newModel, id: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2">
                        <button 
                            onClick={handleAddModel}
                            disabled={!newModel.name || !newModel.id}
                            className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-2 rounded hover:bg-slate-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>
                </div>
              </div>

              {/* Existing Models List */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                        <tr>
                            <th className="px-4 py-3">Enabled</th>
                            <th className="px-4 py-3">Provider</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {models.map((m) => (
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
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                        ${m.provider === 'google' ? 'bg-blue-100 text-blue-700' : 
                                          m.provider === 'openai' ? 'bg-green-100 text-green-700' :
                                          m.provider === 'anthropic' ? 'bg-purple-100 text-purple-700' :
                                          'bg-gray-100 text-gray-700'}`}
                                    >
                                        {m.provider}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{m.id}</td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => handleDeleteModel(m.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
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
                        onChange={(e) => onUpdateSettings({...settings, systemPrompt: e.target.value})}
                        className="w-full border border-gray-300 rounded-md p-3 text-sm h-28 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Global Compare Template</label>
                    <textarea 
                        value={settings.comparePromptTemplate}
                        onChange={(e) => onUpdateSettings({...settings, comparePromptTemplate: e.target.value})}
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