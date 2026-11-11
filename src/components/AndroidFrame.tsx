/**
 * Android Device Shell & System Bars
 * Provides authentic Android status bar, app bar, navigation pill, and device mockup mode.
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Battery,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Smartphone,
  RotateCw,
  FolderOpen,
  Layers,
  Sparkles,
  Sliders,
  Video,
  Music2,
  MoreVertical,
  Check,
} from 'lucide-react';

interface AndroidFrameProps {
  activeTab: 'media' | 'viz' | 'layers' | 'presets' | 'scene' | 'export';
  setActiveTab: (tab: 'media' | 'viz' | 'layers' | 'presets' | 'scene' | 'export') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  templateName: string;
  hasVizLoaded: boolean;
  orientation: 'portrait' | 'landscape';
  toggleOrientation: () => void;
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  activeTab,
  setActiveTab,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  templateName,
  hasVizLoaded,
  orientation,
  toggleOrientation,
  children,
}) => {
  const [timeStr, setTimeStr] = useState('10:45');
  const [batteryLevel] = useState(88);
  const [isDeviceFrame, setIsDeviceFrame] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`h-screen w-screen bg-[#07080a] flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isDeviceFrame ? 'p-2 sm:p-4' : 'p-0'
      }`}
    >
      {/* Device Shell (when frame mode enabled) */}
      <div
        className={`relative flex flex-col bg-[#0e1014] text-[#f2f4f8] overflow-hidden transition-all duration-300 shadow-2xl ${
          isDeviceFrame
            ? orientation === 'portrait'
              ? 'w-full max-w-[430px] h-full max-h-[920px] rounded-[42px] border-[5px] border-[#22252e] ring-1 ring-white/10'
              : 'w-full max-w-[920px] h-full max-h-[440px] rounded-[36px] border-[5px] border-[#22252e] ring-1 ring-white/10'
            : 'w-full h-full'
        }`}
      >
        {/* Device Punch-Hole Camera (Phone Mockup Mode) */}
        {isDeviceFrame && orientation === 'portrait' && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0a0c] rounded-full z-50 ring-1 ring-[#2c2f38] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#171922] rounded-full" />
          </div>
        )}

        {/* ================= ANDROID STATUS BAR ================= */}
        <div className="flex-none h-7 px-4 pt-1 flex items-center justify-between text-[11px] font-semibold text-[#a6acb8] select-none z-40 bg-[#0e1014]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono tracking-tight text-[#f2f4f8]">{timeStr}</span>
            {hasVizLoaded && (
              <span className="text-[10px] text-[#00e5c0] font-medium hidden sm:inline">
                Avee .viz Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[#9fa5b2]">
            <span className="text-[10px] tracking-wide font-mono">5G</span>
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono">{batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* ================= ANDROID APP TOP BAR ================= */}
        <header className="flex-none h-12 px-3 border-b border-[#1f222b] bg-[#12141a] flex items-center justify-between gap-2 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00b8ff] to-[#00e5c0] flex items-center justify-center font-black text-black text-xs shadow-sm shadow-[#00e5c0]/20 flex-shrink-0">
              AV
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold tracking-tight text-[#f4f4f7] truncate leading-tight">
                {templateName || 'Avee .viz Studio'}
              </span>
              <span className="text-[10px] text-[#00e5c0] font-mono leading-none truncate">
                Android Edition Pro
              </span>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                canUndo ? 'text-[#f2f4f8] hover:bg-white/10 active:bg-white/20' : 'text-white/20 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                canRedo ? 'text-[#f2f4f8] hover:bg-white/10 active:bg-white/20' : 'text-white/20 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={toggleOrientation}
              title={`Switch to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9ea4b2] hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDeviceFrame(!isDeviceFrame)}
              title={isDeviceFrame ? 'Full screen view' : 'Device mockup view'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9ea4b2] hover:text-white hover:bg-white/10 active:scale-95 transition-all hidden sm:flex"
            >
              {isDeviceFrame ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9ea4b2] hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-10 w-48 bg-[#181a22] border border-[#2b2e3b] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowMenu(false)}
                >
                  <button
                    onClick={() => setActiveTab('viz')}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-lg hover:bg-white/10 text-[#f2f4f8]"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[#00e5c0]" />
                    <span>Open / Save .viz</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('export')}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-lg hover:bg-white/10 text-[#f2f4f8]"
                  >
                    <Video className="w-3.5 h-3.5 text-[#ff6a3d]" />
                    <span>Export Video / MP4</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-lg hover:bg-white/10 text-[#f2f4f8]"
                  >
                    <Music2 className="w-3.5 h-3.5 text-[#6d8cff]" />
                    <span>Equalizer & Audio FX</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ================= MAIN APPLICATION CONTENT ================= */}
        <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-[#0c0d12]">
          {children}
        </main>

        {/* ================= ANDROID BOTTOM NAVIGATION TABS ================= */}
        <nav className="flex-none h-14 bg-[#12141a]/95 backdrop-blur-md border-t border-[#1f222b] grid grid-cols-6 z-40 select-none">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'media' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <Music2 className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">Media</span>
            {activeTab === 'media' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('viz')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'viz' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <FolderOpen className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">.viz File</span>
            {activeTab === 'viz' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('layers')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'layers' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">Layers</span>
            {activeTab === 'layers' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'presets' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <Sparkles className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">Presets</span>
            {activeTab === 'presets' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('scene')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'scene' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <Sliders className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">Scene FX</span>
            {activeTab === 'scene' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'export' ? 'text-[#00e5c0]' : 'text-[#8c92a0] hover:text-[#c4c9d4]'
            }`}
          >
            <Video className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-medium leading-none">Export</span>
            {activeTab === 'export' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00e5c0]" />
            )}
          </button>
        </nav>

        {/* ================= ANDROID GESTURE PILL BAR ================= */}
        <div className="flex-none h-4 bg-[#12141a] flex items-center justify-center">
          <div className="w-28 h-1 rounded-full bg-white/25 active:bg-white/50 transition-colors" />
        </div>
      </div>
    </div>
  );
};
