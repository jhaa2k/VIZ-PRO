/**
 * Presets & Avee Templates Browser
 */

import React, { useState } from 'react';
import { Sparkles, Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { VisualizerLayer, SceneSettings } from '../types/avee';
import { DEFAULT_PRESETS, PresetItem } from '../data/defaultPresets';

interface PresetsBrowserProps {
  onApplyPreset: (layers: VisualizerLayer[], scene: SceneSettings, name: string) => void;
  currentLayers: VisualizerLayer[];
  currentScene: SceneSettings;
  onNotify: (msg: string, type?: 'ok' | 'err') => void;
}

export const PresetsBrowser: React.FC<PresetsBrowserProps> = ({
  onApplyPreset,
  currentLayers,
  currentScene,
  onNotify,
}) => {
  const [userPresets, setUserPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem('avee.user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [newPresetName, setNewPresetName] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const allPresets: PresetItem[] = [...DEFAULT_PRESETS, ...userPresets];

  const categories = ['All', 'Avee Famous', 'Bass / Trap', 'Neon & Cyber', 'Lo-Fi & Chill', 'Retro', 'Mine'];

  const filteredPresets = allPresets.filter((p) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Mine') return userPresets.some((u) => u.id === p.id);
    return p.category === activeCategory;
  });

  const handleSaveCurrent = () => {
    if (!newPresetName.trim()) {
      onNotify('Please enter a preset name', 'err');
      return;
    }

    const newPreset: PresetItem = {
      id: `user-preset-${Date.now()}`,
      name: newPresetName.trim(),
      category: 'Avee Famous',
      description: 'Custom user visualizer preset',
      layers: JSON.parse(JSON.stringify(currentLayers)),
      scene: { ...currentScene },
    };

    const updated = [newPreset, ...userPresets];
    setUserPresets(updated);
    localStorage.setItem('avee.user_presets', JSON.stringify(updated));
    setNewPresetName('');
    onNotify(`Saved preset: ${newPreset.name}`, 'ok');
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userPresets.filter((u) => u.id !== id);
    setUserPresets(updated);
    localStorage.setItem('avee.user_presets', JSON.stringify(updated));
    onNotify('Preset removed', 'ok');
  };

  const handleSelect = (preset: PresetItem) => {
    onApplyPreset(preset.layers, preset.scene, preset.name);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 1500);
    onNotify(`Loaded ${preset.name}`, 'ok');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0c0d12] overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs gap-3">
      {/* Save current as preset banner */}
      <div className="bg-[#14161f] border border-[#232734] rounded-2xl p-3 flex flex-col gap-2">
        <span className="font-bold text-[#f2f4f8] text-[12px] flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-[#00e5c0]" /> Save Current as Avee Template
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="My Custom Trap Template..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 bg-[#1a1c27] border border-[#2b2e3e] rounded-xl px-3 py-2 text-xs text-[#f2f4f8] focus:outline-none focus:border-[#00e5c0]"
          />
          <button
            onClick={handleSaveCurrent}
            className="px-4 py-2 bg-[#00e5c0] hover:bg-[#33ffdb] text-black font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap text-[11px] transition-colors ${
              activeCategory === cat
                ? 'bg-[#00e5c0] text-black shadow-md'
                : 'bg-[#151722] text-[#8e95a5] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Presets Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredPresets.map((preset) => {
          const isApplied = appliedId === preset.id;
          const isUser = userPresets.some((u) => u.id === preset.id);

          return (
            <div
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group ${
                isApplied
                  ? 'bg-[#1b2230] border-[#00e5c0] ring-1 ring-[#00e5c0]'
                  : 'bg-[#14161f] border-[#232734] hover:bg-[#1a1d29]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-[13px] text-[#f2f4f8] leading-tight">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-[#00e5c0] font-semibold mt-0.5">
                    {preset.category}
                  </div>
                </div>

                {isUser && (
                  <button
                    onClick={(e) => handleDeleteUserPreset(preset.id, e)}
                    className="p-1.5 text-[#ff453a] hover:bg-[#ff453a]/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[11px] text-[#8e95a5] line-clamp-2 leading-relaxed">
                {preset.description}
              </div>

              {/* Layer Color Dots Preview */}
              <div className="flex items-center justify-between pt-1 border-t border-[#232734]/60">
                <div className="flex items-center gap-1.5">
                  {preset.layers.slice(0, 5).map((l, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: l.color || '#00e5c0' }}
                    />
                  ))}
                  <span className="text-[10px] text-[#6b7182] ml-1">
                    {preset.layers.length} layers
                  </span>
                </div>

                <span className="text-[11px] font-bold text-[#00e5c0]">
                  {isApplied ? 'Applied ✓' : 'Load →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
