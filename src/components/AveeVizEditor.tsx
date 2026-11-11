/**
 * Avee Player .viz Reader, Inspector, Element Tree & Exporter
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileCode,
  Layers,
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  Copy,
  FolderArchive,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { VisualizerLayer, SceneSettings, AveeTemplateMeta } from '../types/avee';
import { exportAveeVizFile, createLayer, readAveeVizFile } from '../utils/aveeParser';
import { DEFAULT_PRESETS } from '../data/defaultPresets';

interface AveeVizEditorProps {
  layers: VisualizerLayer[];
  setLayers: React.Dispatch<React.SetStateAction<VisualizerLayer[]>>;
  scene: SceneSettings;
  setScene: React.Dispatch<React.SetStateAction<SceneSettings>>;
  meta: AveeTemplateMeta;
  setMeta: React.Dispatch<React.SetStateAction<AveeTemplateMeta>>;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  onNotify: (msg: string, type?: 'ok' | 'err') => void;
}

export const AveeVizEditor: React.FC<AveeVizEditorProps> = ({
  layers,
  setLayers,
  scene,
  setScene,
  meta,
  setMeta,
  selectedLayerId,
  setSelectedLayerId,
  onNotify,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'elements' | 'assets' | 'json'>('elements');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editJsonText, setEditJsonText] = useState(meta.rawJson || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  // Handle uploading any .viz file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onNotify('Reading Avee .viz file...');
      const result = await readAveeVizFile(file);
      setLayers(result.layers);
      setScene(result.scene);
      setMeta(result.meta);
      setEditJsonText(result.meta.rawJson || '');
      setSelectedLayerId(result.layers[0]?.id || null);
      onNotify(`Loaded Avee .viz: ${result.meta.name} (${result.layers.length} layers)`, 'ok');
    } catch (err: any) {
      console.error(err);
      onNotify(err.message || 'Failed to read Avee .viz file', 'err');
    }

    if (e.target) e.target.value = '';
  };

  // Export genuine .viz file
  const handleExportViz = async () => {
    try {
      setIsExporting(true);
      onNotify('Compiling genuine Avee Player .viz package...');
      const blob = await exportAveeVizFile(meta.name, layers, scene, meta.embeddedAssets);

      const fileName = `${(meta.name || 'template').replace(/\s+/g, '_')}.viz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      onNotify(`Downloaded ${fileName} (${(blob.size / 1024).toFixed(1)} KB)`, 'ok');
    } catch (err: any) {
      console.error(err);
      onNotify('Export failed: ' + (err.message || err), 'err');
    } finally {
      setIsExporting(false);
    }
  };

  // Add custom image asset to .viz bundle
  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `local:${cleanName}`;
    const url = URL.createObjectURL(file);

    const newAssets = new Map(meta.embeddedAssets);
    newAssets.set(key, { blob: file, url, size: file.size });
    newAssets.set(cleanName, { blob: file, url, size: file.size });

    setMeta({
      ...meta,
      embeddedAssets: newAssets,
    });

    onNotify(`Embedded ${cleanName} into .viz package`, 'ok');
    if (e.target) e.target.value = '';
  };

  // Quick add element to Avee hierarchy
  const handleAddElement = (type: VisualizerLayer['type'], name: string) => {
    const newL = createLayer(type, { name });
    setLayers((prev) => [...prev, newL]);
    setSelectedLayerId(newL.id);
    onNotify(`Added Avee Element: ${name}`, 'ok');
  };

  // Delete layer
  const handleDeleteElement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Toggle visibility
  const handleToggleVis = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, vis: !l.vis } : l))
    );
  };

  // Toggle lock
  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, lock: !l.lock } : l))
    );
  };

  // Copy raw JSON to clipboard
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify({ layers, scene }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify('JSON copied to clipboard', 'ok');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0c0d12] overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs">
      {/* ================= HEADER & IMPORT/EXPORT HERO ================= */}
      <div className="bg-[#14161f] border border-[#232734] rounded-2xl p-3.5 mb-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00e5c0]/15 text-[#00e5c0]">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#f4f5f8] leading-tight">
                Avee Player .viz Manager
              </div>
              <div className="text-[11px] text-[#8e95a5]">
                Read, customize, and export genuine Avee templates
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".viz,.json,.zip"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202330] hover:bg-[#2b3040] text-[#f2f4f8] font-semibold active:scale-95 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-[#00e5c0]" />
              <span>Open .viz</span>
            </button>

            <button
              onClick={handleExportViz}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00e5c0] hover:bg-[#33ffdb] text-black font-bold shadow-md shadow-[#00e5c0]/20 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Packing...' : 'Save .viz'}</span>
            </button>
          </div>
        </div>

        {/* Template Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#232734] text-[11px]">
          <div className="bg-[#181a24] p-2 rounded-xl">
            <span className="text-[#8e95a5] block text-[10px]">Template Name</span>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              className="w-full bg-transparent font-semibold text-[#f2f4f8] focus:outline-none"
            />
          </div>
          <div className="bg-[#181a24] p-2 rounded-xl">
            <span className="text-[#8e95a5] block text-[10px]">Elements</span>
            <span className="font-bold text-[#00e5c0]">{layers.length} active</span>
          </div>
          <div className="bg-[#181a24] p-2 rounded-xl">
            <span className="text-[#8e95a5] block text-[10px]">Embedded Assets</span>
            <span className="font-bold text-[#6d8cff]">{meta.embeddedAssets.size} files</span>
          </div>
        </div>
      </div>

      {/* ================= SUB-TABS (ELEMENTS / ASSETS / JSON) ================= */}
      <div className="flex items-center gap-1 bg-[#151720] p-1 rounded-xl mb-3 border border-[#212532]">
        <button
          onClick={() => setActiveSubTab('elements')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSubTab === 'elements'
              ? 'bg-[#222634] text-[#00e5c0] shadow-sm'
              : 'text-[#8e95a5] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Composition Tree</span>
        </button>
        <button
          onClick={() => setActiveSubTab('assets')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSubTab === 'assets'
              ? 'bg-[#222634] text-[#00e5c0] shadow-sm'
              : 'text-[#8e95a5] hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Asset Images ({meta.embeddedAssets.size})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('json')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSubTab === 'json'
              ? 'bg-[#222634] text-[#00e5c0] shadow-sm'
              : 'text-[#8e95a5] hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Avee JSON</span>
        </button>
      </div>

      {/* ================= SUB-TAB 1: COMPOSITION TREE ================= */}
      {activeSubTab === 'elements' && (
        <div className="flex flex-col gap-2.5">
          {/* Quick Add Element Bar */}
          <div className="flex flex-wrap gap-1.5 items-center bg-[#141620] p-2 rounded-xl border border-[#222634]">
            <span className="text-[10px] font-bold text-[#8e95a5] px-1 uppercase tracking-wider">
              + Avee Element:
            </span>
            <button
              onClick={() => handleAddElement('circle', 'Circular Spectrum')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Circle
            </button>
            <button
              onClick={() => handleAddElement('bars', 'Equalizer Bars')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Bars
            </button>
            <button
              onClick={() => handleAddElement('wave', 'Oscilloscope Wave')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Wave
            </button>
            <button
              onClick={() => handleAddElement('particles', 'Particle Dust')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Particles
            </button>
            <button
              onClick={() => handleAddElement('image', 'Custom Logo / Art')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Image
            </button>
            <button
              onClick={() => handleAddElement('text', 'Song Title')}
              className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#00e5c0]" /> Text
            </button>
          </div>

          {/* Element Rows */}
          <div className="flex flex-col gap-1.5">
            {layers.map((layer, idx) => {
              const isSelected = layer.id === selectedLayerId;
              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1b2230] border-[#00e5c0]/50 shadow-md ring-1 ring-[#00e5c0]/20'
                      : 'bg-[#14161f] border-[#222532] hover:bg-[#1a1c27]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-[#6d7382] w-4">
                      {layers.length - idx}
                    </span>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: layer.color || '#00e5c0' }}
                    />
                    <div className="min-w-0 flex flex-col">
                      <span
                        className={`font-semibold truncate text-[12px] leading-tight ${
                          isSelected ? 'text-[#00e5c0]' : 'text-[#f2f4f8]'
                        }`}
                      >
                        {layer.name}
                      </span>
                      <span className="text-[10px] text-[#8e95a5] capitalize leading-none">
                        Avee {layer.type} · Pos {Math.round(layer.x)}%, {Math.round(layer.y)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleToggleVis(layer.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        layer.vis ? 'text-[#a0a6b5] hover:text-white' : 'text-white/20'
                      }`}
                    >
                      {layer.vis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => handleToggleLock(layer.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        layer.lock ? 'text-[#00e5c0]' : 'text-[#a0a6b5] hover:text-white'
                      }`}
                    >
                      {layer.lock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => handleDeleteElement(layer.id, e)}
                      className="p-1.5 rounded-lg text-[#a0a6b5] hover:text-[#ff453a] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: EMBEDDED ASSETS ================= */}
      {activeSubTab === 'assets' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8e95a5]">
              Images bundled directly inside the .viz archive
            </span>
            <input
              type="file"
              ref={assetInputRef}
              onChange={handleAssetUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => assetInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#202330] hover:bg-[#2b3040] text-[#f2f4f8] rounded-xl font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#00e5c0]" />
              <span>Add Image into .viz</span>
            </button>
          </div>

          {meta.embeddedAssets.size === 0 ? (
            <div className="p-8 rounded-2xl bg-[#14161f] border border-[#222532] text-center text-[#8e95a5]">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div>No embedded images in this template.</div>
              <div className="text-[10px] mt-1 text-[#6a7080]">
                Add custom logo, vinyl album art, or backgrounds to save them into the .viz file.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from(meta.embeddedAssets.entries())
                .filter(([key]) => key.startsWith('local:'))
                .map(([key, asset]) => (
                  <div
                    key={key}
                    className="p-2 bg-[#14161f] border border-[#232734] rounded-xl flex flex-col gap-2 relative group"
                  >
                    <div className="w-full h-24 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={asset.url}
                        alt={key}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[11px] text-[#f2f4f8] truncate">
                        {key}
                      </div>
                      <div className="text-[10px] text-[#8e95a5]">
                        {(asset.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 3: RAW AVEE JSON ================= */}
      {activeSubTab === 'json' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#8e95a5]">
              Live Avee Player scene.json specification
            </span>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1f2230] text-[#f2f4f8] rounded-xl font-medium hover:bg-[#2b3040] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00e5c0]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <textarea
            value={editJsonText}
            onChange={(e) => setEditJsonText(e.target.value)}
            rows={14}
            className="w-full p-3 bg-[#11131a] border border-[#222534] rounded-xl font-mono text-[11px] text-[#00e5c0] focus:outline-none focus:border-[#00e5c0]"
            spellCheck={false}
          />

          <button
            onClick={() => {
              try {
                const parsed = JSON.parse(editJsonText);
                onNotify('Applied JSON updates', 'ok');
              } catch (err: any) {
                onNotify('Invalid JSON: ' + err.message, 'err');
              }
            }}
            className="w-full py-2 bg-[#202330] hover:bg-[#2c3244] text-[#f2f4f8] font-bold rounded-xl transition-colors"
          >
            Apply JSON to Live Stage
          </button>
        </div>
      )}
    </div>
  );
};
