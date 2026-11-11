/**
 * Detailed Layer Inspector & Property Tuning
 */

import React, { useState } from 'react';
import {
  Sliders,
  Palette,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { VisualizerLayer, AudioAnalysisSource } from '../types/avee';

interface LayerInspectorProps {
  layer: VisualizerLayer | undefined;
  onUpdateLayer: (updated: VisualizerLayer) => void;
  onDeleteLayer: (id: string) => void;
}

const FONTS = [
  'Plus Jakarta Sans',
  'Outfit',
  'Orbitron',
  'Bebas Neue',
  'Space Mono',
  'Teko',
  'Archivo',
  'Playfair Display',
];

const ANALYSIS_SOURCES: AudioAnalysisSource[] = [
  'bass',
  'sub',
  'lowmid',
  'mid',
  'upmid',
  'presence',
  'brill',
  'volume',
  'peak',
  'beat',
  'kick',
  'snare',
  'flux',
];

export const LayerInspector: React.FC<LayerInspectorProps> = ({
  layer,
  onUpdateLayer,
  onDeleteLayer,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    transform: true,
    geometry: true,
    color: true,
    reactive: true,
  });

  if (!layer) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-[#8e95a5] text-xs">
        <div>
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="font-semibold text-[#f2f4f8]">No Layer Selected</div>
          <div className="text-[11px] text-[#6b7182] mt-0.5">
            Tap a layer in the Avee tree or on the canvas to inspect its properties.
          </div>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (patch: Partial<VisualizerLayer>) => {
    onUpdateLayer({ ...layer, ...patch });
  };

  const addRule = () => {
    const newRule = {
      id: `rule-${Date.now()}`,
      on: true,
      src: 'bass' as AudioAnalysisSource,
      prop: 'sy',
      i0: 0,
      i1: 1,
      o0: layer.sy,
      o1: layer.sy * 1.35,
      cv: 'linear' as const,
      inv: false,
      att: 60,
      rel: 15,
    };
    update({ rules: [...layer.rules, newRule] });
  };

  const removeRule = (id: string) => {
    update({ rules: layer.rules.filter((r) => r.id !== id) });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs flex flex-col gap-3 bg-[#0c0d12]">
      {/* Layer Header */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#14161f] border border-[#232734]">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: layer.color }}
          />
          <input
            type="text"
            value={layer.name}
            onChange={(e) => update({ name: e.target.value })}
            className="bg-transparent font-bold text-sm text-[#f2f4f8] focus:outline-none truncate w-full"
          />
        </div>
        <button
          onClick={() => onDeleteLayer(layer.id)}
          className="p-1.5 rounded-lg text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors flex-shrink-0"
          title="Delete layer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Transform Section */}
      <div className="rounded-xl bg-[#14161f] border border-[#232734] overflow-hidden">
        <button
          onClick={() => toggleSection('transform')}
          className="w-full p-3 font-bold flex items-center justify-between text-[#f2f4f8] hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#00e5c0]" /> Transform & Position
          </span>
          {openSections.transform ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.transform && (
          <div className="p-3 pt-0 flex flex-col gap-2.5 border-t border-[#232734]/50">
            {/* Position X / Y */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>X Position</span>
                  <span>{Math.round(layer.x)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.x}
                  onChange={(e) => update({ x: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Y Position</span>
                  <span>{Math.round(layer.y)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.y}
                  onChange={(e) => update({ y: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Scale X / Y */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Scale X</span>
                  <span>{Math.round(layer.sx)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={layer.sx}
                  onChange={(e) => update({ sx: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Scale Y</span>
                  <span>{Math.round(layer.sy)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={layer.sy}
                  onChange={(e) => update({ sy: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Rotation & Opacity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Rotation</span>
                  <span>{Math.round(layer.rot)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={layer.rot}
                  onChange={(e) => update({ rot: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Opacity</span>
                  <span>{Math.round(layer.op)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.op}
                  onChange={(e) => update({ op: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Blend Mode */}
            <div>
              <span className="text-[11px] text-[#8e95a5] block mb-1">Blend Mode</span>
              <select
                value={layer.blend}
                onChange={(e) => update({ blend: e.target.value as any })}
                className="w-full bg-[#1c1f2c] border border-[#2b2f40] rounded-lg p-1.5 text-[#f2f4f8]"
              >
                <option value="source-over">Normal (Alpha)</option>
                <option value="screen">Screen (Avee Light)</option>
                <option value="lighter">Add / Lighter (Neon Glow)</option>
                <option value="multiply">Multiply</option>
                <option value="overlay">Overlay</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Geometry & Bars Section */}
      <div className="rounded-xl bg-[#14161f] border border-[#232734] overflow-hidden">
        <button
          onClick={() => toggleSection('geometry')}
          className="w-full p-3 font-bold flex items-center justify-between text-[#f2f4f8] hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#6d8cff]" /> Geometry & Spectrum
          </span>
          {openSections.geometry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.geometry && (
          <div className="p-3 pt-0 flex flex-col gap-2.5 border-t border-[#232734]/50">
            {/* Bar Count & Thickness */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Bar Count</span>
                  <span>{layer.n}</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="180"
                  value={layer.n}
                  onChange={(e) => update({ n: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Thickness</span>
                  <span>{layer.thick}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={layer.thick}
                  onChange={(e) => update({ thick: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Inner Radius for Circles */}
            {(layer.type === 'circle' || layer.type === 'multiring' || layer.type === 'ring') && (
              <div>
                <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                  <span>Inner Radius</span>
                  <span>{layer.r0}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={layer.r0}
                  onChange={(e) => update({ r0: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}

            {/* Mirror / Symmetry */}
            <div>
              <span className="text-[11px] text-[#8e95a5] block mb-1">Mirror Mode</span>
              <div className="grid grid-cols-3 gap-1">
                {(['none', 'mirror', 'sym'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => update({ mir: mode })}
                    className={`py-1.5 rounded-lg font-semibold capitalize text-[11px] transition-colors ${
                      layer.mir === mode
                        ? 'bg-[#00e5c0] text-black'
                        : 'bg-[#1c1f2c] text-[#8e95a5] hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography if Text layer */}
            {layer.type === 'text' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#232734]">
                <div>
                  <span className="text-[11px] text-[#8e95a5] block mb-1">Text Template</span>
                  <input
                    type="text"
                    value={layer.text}
                    onChange={(e) => update({ text: e.target.value })}
                    className="w-full bg-[#1c1f2c] border border-[#2b2f40] rounded-lg p-2 text-[#f2f4f8]"
                    placeholder="{ArtistOrTitle}"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-[#8e95a5] block mb-1">Font Family</span>
                  <select
                    value={layer.font}
                    onChange={(e) => update({ font: e.target.value })}
                    className="w-full bg-[#1c1f2c] border border-[#2b2f40] rounded-lg p-1.5 text-[#f2f4f8]"
                  >
                    {FONTS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Color & Gradient Section */}
      <div className="rounded-xl bg-[#14161f] border border-[#232734] overflow-hidden">
        <button
          onClick={() => toggleSection('color')}
          className="w-full p-3 font-bold flex items-center justify-between text-[#f2f4f8] hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#ff6a3d]" /> Colors & Glow
          </span>
          {openSections.color ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.color && (
          <div className="p-3 pt-0 flex flex-col gap-2.5 border-t border-[#232734]/50">
            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-[#8e95a5] block mb-1">Primary Color</span>
                <div className="flex items-center gap-2 bg-[#1c1f2c] p-1 rounded-lg border border-[#2b2f40]">
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={layer.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-full bg-transparent font-mono text-[11px] text-[#f2f4f8] focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#8e95a5] block mb-1">Secondary Color</span>
                <div className="flex items-center gap-2 bg-[#1c1f2c] p-1 rounded-lg border border-[#2b2f40]">
                  <input
                    type="color"
                    value={layer.color2}
                    onChange={(e) => update({ color2: e.target.value })}
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={layer.color2}
                    onChange={(e) => update({ color2: e.target.value })}
                    className="w-full bg-transparent font-mono text-[11px] text-[#f2f4f8] focus:outline-none uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Glow Intensity */}
            <div>
              <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
                <span>Neon Glow Radius</span>
                <span>{layer.glow}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={layer.glow}
                onChange={(e) => update({ glow: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Audio Reactive Rules */}
      <div className="rounded-xl bg-[#14161f] border border-[#232734] overflow-hidden">
        <button
          onClick={() => toggleSection('reactive')}
          className="w-full p-3 font-bold flex items-center justify-between text-[#f2f4f8] hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00e5c0]" /> Audio Reactive Mapping ({layer.rules.length})
          </span>
          {openSections.reactive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSections.reactive && (
          <div className="p-3 pt-0 flex flex-col gap-2.5 border-t border-[#232734]/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8e95a5]">
                Map live audio features to layer properties
              </span>
              <button
                onClick={addRule}
                className="px-2 py-1 bg-[#1c1f2c] text-[#00e5c0] rounded-lg font-semibold flex items-center gap-1 hover:bg-[#282d40]"
              >
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>

            {layer.rules.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#181a24] text-center text-[#8e95a5] text-[11px]">
                No reactive rules. Tap &ldquo;Add Rule&rdquo; to make this layer react to bass, kicks, or snares!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {layer.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-xl bg-[#181a24] border border-[#282c3c] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={rule.on}
                          onChange={(e) => {
                            const updated = layer.rules.map((r) =>
                              r.id === rule.id ? { ...r, on: e.target.checked } : r
                            );
                            update({ rules: updated });
                          }}
                          className="rounded text-[#00e5c0]"
                        />
                        <span className="font-bold text-[#f2f4f8] capitalize">{rule.src}</span>
                        <span className="text-[#8e95a5]">→</span>
                        <span className="text-[#00e5c0] font-mono">{rule.prop}</span>
                      </div>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-[#ff453a] hover:opacity-80"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-[#8e95a5] block">Audio Source</span>
                        <select
                          value={rule.src}
                          onChange={(e) => {
                            const updated = layer.rules.map((r) =>
                              r.id === rule.id ? { ...r, src: e.target.value as any } : r
                            );
                            update({ rules: updated });
                          }}
                          className="w-full bg-[#12141c] border border-[#2b2f40] rounded p-1 text-[#f2f4f8]"
                        >
                          {ANALYSIS_SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[#8e95a5] block">Target Property</span>
                        <select
                          value={rule.prop}
                          onChange={(e) => {
                            const updated = layer.rules.map((r) =>
                              r.id === rule.id ? { ...r, prop: e.target.value } : r
                            );
                            update({ rules: updated });
                          }}
                          className="w-full bg-[#12141c] border border-[#2b2f40] rounded p-1 text-[#f2f4f8]"
                        >
                          <option value="sy">Scale Y (Height)</option>
                          <option value="sx">Scale X (Width)</option>
                          <option value="rot">Rotation</option>
                          <option value="glow">Glow Radius</option>
                          <option value="op">Opacity</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
