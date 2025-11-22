import React from 'react';
import { ModelConfig, AppSettings } from '../types';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelConfig[];
  settings: AppSettings;
  onToggleModel: (id: string) => void;
  onUpdateSettings: (s: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, models, settings, onToggleModel, onUpdateSettings 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Model Selection */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Active Models</h3>
            <div className="grid grid-cols-2 gap-3">
              {models.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={m.enabled}
                    onChange={() => onToggleModel(m.id)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">{m.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* System Prompt */}
          <section>
             <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">System Prompt</h3>
             <p className="text-xs text-gray-400 mb-2">Applied to all new conversations.</p>
             <textarea 
                value={settings.systemPrompt}
                onChange={(e) => onUpdateSettings({...settings, systemPrompt: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-3 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </section>

          {/* Compare Prompt */}
          <section>
             <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Comparison Prompt Template</h3>
             <p className="text-xs text-gray-400 mb-2">Use <code>{"{{OTHER_RESPONSES}}"}</code> as the placeholder for other models' answers.</p>
             <textarea 
                value={settings.comparePromptTemplate}
                onChange={(e) => onUpdateSettings({...settings, comparePromptTemplate: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-3 text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
             />
          </section>

          {/* API Keys Note */}
          <section className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-1">API Keys</h3>
            <p className="text-xs text-blue-700">
              The Gemini API key is securely loaded from your environment variables. 
              Other providers are currently running in simulation mode for this demo.
            </p>
          </section>

        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-medium hover:bg-slate-700"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;