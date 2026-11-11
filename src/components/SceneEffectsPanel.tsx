/**
 * Scene & Post-Processing Effects Controls (Camera Bounce, Vignette, Scanlines, Grain, RGB Split)
 */

import React from 'react';
import { Sliders, Camera, Eye, Film, Sparkles, RotateCcw } from 'lucide-react';
import { SceneSettings } from '../types/avee';
import { DEFAULT_SCENE } from '../utils/aveeParser';

interface SceneEffectsPanelProps {
  scene: SceneSettings;
  setScene: React.Dispatch<React.SetStateAction<SceneSettings>>;
}

export const SceneEffectsPanel: React.FC<SceneEffectsPanelProps> = ({ scene, setScene }) => {
  const update = (patch: Partial<SceneSettings>) => {
    setScene((prev) => ({ ...prev, ...patch }));
  };

  const handleReset = () => {
    setScene({ ...DEFAULT_SCENE });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0c0d12] overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs gap-3">
      {/* Reset button bar */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#f2f4f8] text-[13px] flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-[#00e5c0]" /> Global Scene & Post FX
        </span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[11px] text-[#8e95a5] hover:text-[#ff453a] transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="p-3.5 bg-[#14161f] border border-[#232734] rounded-2xl flex flex-col gap-3">
        {/* Background Color */}
        <div>
          <span className="text-[11px] text-[#8e95a5] block mb-1">Canvas Background</span>
          <div className="flex items-center gap-2 bg-[#1c1f2c] p-1.5 rounded-xl border border-[#2b2f40]">
            <input
              type="color"
              value={scene.bg}
              onChange={(e) => update({ bg: e.target.value })}
              className="w-8 h-8 rounded-lg border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={scene.bg}
              onChange={(e) => update({ bg: e.target.value })}
              className="w-full bg-transparent font-mono text-xs text-[#f2f4f8] focus:outline-none uppercase"
            />
          </div>
        </div>

        {/* Camera Bass Bounce */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span className="flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-[#00e5c0]" /> Camera Bass Zoom Shake
            </span>
            <span className="font-mono text-[#00e5c0]">{scene.cam}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={scene.cam}
            onChange={(e) => update({ cam: Number(e.target.value) })}
            className="w-full"
          />
          <span className="text-[10px] text-[#6b7182] mt-0.5 block">
            Pumps viewport zoom dynamically on heavy bass kicks
          </span>
        </div>

        {/* Vignette */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-[#6d8cff]" /> Vignette Shadowing
            </span>
            <span className="font-mono text-[#6d8cff]">{scene.vig}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={scene.vig}
            onChange={(e) => update({ vig: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Scanlines */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-[#ff6a3d]" /> CRT Scanlines
            </span>
            <span className="font-mono text-[#ff6a3d]">{scene.scan}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={scene.scan}
            onChange={(e) => update({ scan: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Film Grain */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span>Analog Film Grain</span>
            <span className="font-mono">{scene.grain}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={scene.grain}
            onChange={(e) => update({ grain: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Beat Strobe Flash */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#ffd000]" /> Beat Strobe Flash
            </span>
            <span className="font-mono text-[#ffd000]">{scene.flash}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={scene.flash}
            onChange={(e) => update({ flash: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
