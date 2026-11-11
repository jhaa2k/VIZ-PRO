/**
 * Media Library, 10-Band Equalizer, Audio FX & Live Spectrum Monitor
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Upload,
  Play,
  Pause,
  Sliders,
  Volume2,
  Mic,
  Music,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AudioSettings, AudioTrackItem } from '../types/avee';
import { audioEngine, EQ_FREQUENCIES, DEFAULT_AUDIO_SETTINGS } from '../utils/audioEngine';

interface MediaLibraryProps {
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  trackList: AudioTrackItem[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMicActive: boolean;
  onMicToggle: () => void;
}

const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Heavy Bass': [7, 6, 5, 2, 0, 0, 0, 0, 0, 0],
  Electronic: [5, 4, 2, 0, -1, 1, 3, 4, 5, 4],
  Rock: [4, 3, 1, 0, -1, 0, 2, 4, 5, 4],
  Vocal: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
  Treble: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
};

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  audioSettings,
  setAudioSettings,
  trackList,
  currentTrackIndex,
  onSelectTrack,
  onAddFiles,
  isPlaying,
  onTogglePlay,
  isMicActive,
  onMicToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'tracks' | 'eq' | 'fx'>('tracks');
  const monitorRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Spectrum Monitor Drawing Loop
  useEffect(() => {
    let animId: number;
    const canvas = monitorRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderMonitor = () => {
      animId = requestAnimationFrame(renderMonitor);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.fillStyle = '#0e1017';
      ctx.fillRect(0, 0, W, H);

      // Draw frequency bars
      const numBins = 64;
      const barW = W / numBins;

      for (let i = 0; i < numBins; i++) {
        const hz0 = 30 * Math.pow(16000 / 30, i / numBins);
        const hz1 = 30 * Math.pow(16000 / 30, (i + 1) / numBins);
        const val = audioEngine.bandAverage(hz0, hz1);

        const h = Math.max(2, val * (H * 0.75));
        const hue = 160 + (i / numBins) * 80;
        ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        ctx.fillRect(i * barW, H - h, barW - 1, h);
      }

      // Draw Waveform overlay line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const pCount = 80;
      for (let i = 0; i <= pCount; i++) {
        const k = Math.floor((i / pCount) * (audioEngine.timeData.length - 1));
        const y = ((audioEngine.timeData[k] - 128) / 128) * (H * 0.25) + H * 0.3;
        const x = (i / pCount) * W;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    animId = requestAnimationFrame(renderMonitor);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleEqPreset = (presetName: string) => {
    const values = EQ_PRESETS[presetName];
    if (values) {
      const updated = { ...audioSettings, eq: [...values] };
      setAudioSettings(updated);
      audioEngine.applySettings(updated);
    }
  };

  const handleEqSlider = (index: number, val: number) => {
    const newEq = [...audioSettings.eq];
    newEq[index] = val;
    const updated = { ...audioSettings, eq: newEq };
    setAudioSettings(updated);
    audioEngine.applySettings(updated);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0c0d12] overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs gap-3">
      {/* ================= LIVE SPECTRUM MONITOR ================= */}
      <div className="bg-[#14161f] border border-[#232734] rounded-2xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-[#f2f4f8]">
            <ActivityIcon className="w-3.5 h-3.5 text-[#00e5c0]" />
            <span>Audio Spectrum Monitor</span>
          </div>
          <span className="text-[10px] text-[#00e5c0] font-mono">
            {isMicActive ? 'MIC INPUT' : isPlaying ? 'PLAYING' : 'IDLE'}
          </span>
        </div>
        <canvas
          ref={monitorRef}
          width={360}
          height={75}
          className="w-full h-[75px] rounded-xl border border-white/5 block"
        />
      </div>

      {/* ================= SUB-TABS (TRACKS / 10-BAND EQ / FX) ================= */}
      <div className="flex items-center gap-1 bg-[#151720] p-1 rounded-xl border border-[#212532]">
        <button
          onClick={() => setActiveTab('tracks')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'tracks' ? 'bg-[#222634] text-[#00e5c0]' : 'text-[#8e95a5]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Playlist ({trackList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('eq')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'eq' ? 'bg-[#222634] text-[#00e5c0]' : 'text-[#8e95a5]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>10-Band EQ</span>
        </button>
        <button
          onClick={() => setActiveTab('fx')}
          className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'fx' ? 'bg-[#222634] text-[#00e5c0]' : 'text-[#8e95a5]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Audio FX</span>
        </button>
      </div>

      {/* ================= SUB-TAB 1: TRACK PLAYLIST ================= */}
      {activeTab === 'tracks' && (
        <div className="flex flex-col gap-3">
          {/* Import & Actions */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-[#202330] hover:bg-[#2b3040] text-[#f2f4f8] rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
            >
              <Upload className="w-4 h-4 text-[#00e5c0]" />
              <span>Import Audio Files</span>
            </button>

            <button
              onClick={onMicToggle}
              className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md ${
                isMicActive
                  ? 'bg-[#ff3b30] text-white animate-pulse'
                  : 'bg-[#202330] hover:bg-[#2b3040] text-[#f2f4f8]'
              }`}
            >
              <Mic className="w-4 h-4 text-[#ff6a3d]" />
              <span>{isMicActive ? 'Stop Mic' : 'Live Mic In'}</span>
            </button>
          </div>


          {/* Track List */}
          <div className="flex flex-col gap-1.5">
            {trackList.map((track, idx) => {
              const isCurrent = idx === currentTrackIndex;
              return (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack(idx)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#1b2230] border-[#00e5c0]/50 shadow-md ring-1 ring-[#00e5c0]/20'
                      : 'bg-[#14161f] border-[#222532] hover:bg-[#1a1c27]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) onTogglePlay();
                        else onSelectTrack(idx);
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCurrent
                          ? 'bg-[#00e5c0] text-black font-bold'
                          : 'bg-[#202330] text-[#a0a6b5]'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0 flex flex-col">
                      <span
                        className={`font-semibold truncate text-[12px] leading-tight ${
                          isCurrent ? 'text-[#00e5c0]' : 'text-[#f2f4f8]'
                        }`}
                      >
                        {track.name}
                      </span>
                      <span className="text-[10px] text-[#8e95a5] truncate leading-none">
                        {track.artist || 'Audio Track'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#8e95a5] flex-shrink-0">
                    {track.duration > 0
                      ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60)
                          .toString()
                          .padStart(2, '0')}`
                      : '0:30'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: 10-BAND EQUALIZER ================= */}
      {activeTab === 'eq' && (
        <div className="flex flex-col gap-3">
          {/* Quick EQ Presets */}
          <div className="flex flex-wrap gap-1.5 items-center bg-[#141620] p-2 rounded-xl border border-[#222634]">
            <span className="text-[10px] font-bold text-[#8e95a5] px-1 uppercase tracking-wider">
              Presets:
            </span>
            {Object.keys(EQ_PRESETS).map((p) => (
              <button
                key={p}
                onClick={() => handleEqPreset(p)}
                className="px-2 py-1 bg-[#1e2230] hover:bg-[#282d40] text-[#f2f4f8] rounded-lg font-medium text-[11px]"
              >
                {p}
              </button>
            ))}
          </div>

          {/* 10 Vertical Sliders */}
          <div className="p-3 bg-[#14161f] border border-[#232734] rounded-2xl flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            {EQ_FREQUENCIES.map((freq, idx) => {
              const val = audioSettings.eq[idx] || 0;
              const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
              return (
                <div key={freq} className="flex flex-col items-center gap-1.5 flex-1 min-w-[32px]">
                  <span className="text-[10px] font-mono text-[#8e95a5]">
                    {val > 0 ? `+${val}` : val}
                  </span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={val}
                    onChange={(e) => handleEqSlider(idx, Number(e.target.value))}
                    className="h-28 [writing-mode:vertical-lr] [direction:rtl]"
                  />
                  <span className="text-[10px] font-mono font-bold text-[#f2f4f8] mt-1">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: AUDIO EFFECTS ================= */}
      {activeTab === 'fx' && (
        <div className="p-3 bg-[#14161f] border border-[#232734] rounded-2xl flex flex-col gap-3">
          {/* Bass Boost */}
          <div>
            <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
              <span>Bass Boost</span>
              <span>+{audioSettings.bass} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={audioSettings.bass}
              onChange={(e) => {
                const updated = { ...audioSettings, bass: Number(e.target.value) };
                setAudioSettings(updated);
                audioEngine.applySettings(updated);
              }}
              className="w-full"
            />
          </div>

          {/* Distortion / Overdrive */}
          <div>
            <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
              <span>Distortion / Overdrive</span>
              <span>{audioSettings.dist}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.dist}
              onChange={(e) => {
                const updated = { ...audioSettings, dist: Number(e.target.value) };
                setAudioSettings(updated);
                audioEngine.applySettings(updated);
              }}
              className="w-full"
            />
          </div>

          {/* Reverb */}
          <div>
            <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
              <span>Convolver Reverb Wet</span>
              <span>{audioSettings.rev}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.rev}
              onChange={(e) => {
                const updated = { ...audioSettings, rev: Number(e.target.value) };
                setAudioSettings(updated);
                audioEngine.applySettings(updated);
              }}
              className="w-full"
            />
          </div>

          {/* Delay */}
          <div>
            <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
              <span>Echo Delay Wet</span>
              <span>{audioSettings.dly}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.dly}
              onChange={(e) => {
                const updated = { ...audioSettings, dly: Number(e.target.value) };
                setAudioSettings(updated);
                audioEngine.applySettings(updated);
              }}
              className="w-full"
            />
          </div>

          {/* Playback Speed */}
          <div>
            <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
              <span>Playback Speed</span>
              <span>{(audioSettings.speed / 100).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={audioSettings.speed}
              onChange={(e) => {
                const updated = { ...audioSettings, speed: Number(e.target.value) };
                setAudioSettings(updated);
                audioEngine.applySettings(updated);
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

function ActivityIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
