import React from 'react';
import { ModelConfig } from '../types';

interface ModelSelectorProps {
  models: ModelConfig[];
  onToggle: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, onToggle }) => {
  return (
    <div className="flex flex-wrap gap-2 items-center p-2">
      <span className="text-xs font-bold uppercase text-gray-400 mr-2 tracking-wider">Active Models:</span>
      {models.map((m) => (
        <button
          key={m.id}
          onClick={() => onToggle(m.id)}
          className={`px-3 py-1 text-xs rounded-full border transition-all ${
            m.enabled
              ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {m.name}
        </button>
      ))}
    </div>
  );
};

export default ModelSelector;
