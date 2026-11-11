/**
 * Visualizer Canvas Stage with Transport & Waveform Scrubbing
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Mic,
  Maximize2,
  Grid,
} from 'lucide-react';
import { VisualizerLayer, SceneSettings } from '../types/avee';
import { audioEngine } from '../utils/audioEngine';
import { renderScene } from '../utils/canvasRenderer';

interface VisualizerStageProps {
  layers: VisualizerLayer[];
  scene: SceneSettings;
  selectedLayerId: string | null;
  onUpdateLayerPos: (id: string, x: number, y: number) => void;
  trackTitle: string;
  trackArtist: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  aspectRatio: string;
  isRecording: boolean;
  onMicToggle: () => void;
  isMicActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const VisualizerStage: React.FC<VisualizerStageProps> = ({
  layers,
  scene,
  selectedLayerId,
  onUpdateLayerPos,
  trackTitle,
  trackArtist,
  isPlaying,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  aspectRatio,
  isRecording,
  onMicToggle,
  isMicActive,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(60);
  const [showGuides, setShowGuides] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Dragging state on canvas
  const isDragging = useRef(false);
  const dragStartPos = useRef({ startX: 0, startY: 0, initLayerX: 50, initLayerY: 50 });

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Main animation frame loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);

      // Analyze audio
      audioEngine.analyse(now, 0.08, 130);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderScene(
            ctx,
            canvas.width,
            canvas.height,
            now / 1000,
            layers,
            scene,
            selectedLayerId,
            showGuides,
            { title: trackTitle, artist: trackArtist }
          );
        }
      }

      // Update playhead
      if (audioEngine.isPlaying) {
        setCurrentTime(audioEngine.getCurrentTime());
        setDuration(audioEngine.duration);
      }

      // Calculate FPS
      frameCount++;
      if (now - fpsTimer >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }
      lastTime = now;
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [layers, scene, selectedLayerId, showGuides, trackTitle, trackArtist]);

  // Adjust canvas resolution based on container & aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let targetW = 960;
    let targetH = 540;

    if (aspectRatio === '9:16') {
      targetW = 540;
      targetH = 960;
    } else if (aspectRatio === '1:1') {
      targetW = 720;
      targetH = 720;
    } else if (aspectRatio === '4:5') {
      targetW = 720;
      targetH = 900;
    }

    canvas.width = targetW;
    canvas.height = targetH;
  }, [aspectRatio]);

  // Draw timeline waveform
  useEffect(() => {
    const wf = waveformRef.current;
    if (!wf) return;
    const ctx = wf.getContext('2d');
    if (!ctx) return;

    wf.width = wf.clientWidth * (window.devicePixelRatio || 1);
    wf.height = wf.clientHeight * (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, wf.width, wf.height);

    const W = wf.width;
    const H = wf.height;
    const bars = 80;
    const progressFrac = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < bars; i++) {
      const frac = i / bars;
      // Synthetic pseudo peak based on time
      const seed = Math.sin(i * 12.3) * 0.5 + 0.5;
      const barH = Math.max(4, seed * H * 0.8);
      const isPast = frac <= progressFrac;

      ctx.fillStyle = isPast ? '#00e5c0' : '#323642';
      ctx.fillRect((i * W) / bars, (H - barH) / 2, Math.max(1, W / bars - 2), barH);
    }
  }, [currentTime, duration]);

  // Canvas pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!selectedLayerId) return;
    const selected = layers.find((l) => l.id === selectedLayerId);
    if (!selected || selected.lock || selected.type === 'bg') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragStartPos.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLayerX: selected.x,
      initLayerY: selected.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !selectedLayerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dx = ((e.clientX - dragStartPos.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragStartPos.current.startY) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragStartPos.current.initLayerX + dx));
    const newY = Math.max(0, Math.min(100, dragStartPos.current.initLayerY + dy));

    onUpdateLayerPos(selectedLayerId, newX, newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
    }
  };

  // Waveform scrub
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (duration > 0) {
      audioEngine.seek(frac * duration);
      setCurrentTime(frac * duration);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#08090d]">
      {/* ================= CANVAS VIEWPORT ================= */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl bg-black cursor-crosshair touch-none ring-1 ring-white/10"
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span
              className={`px-2 py-0.5 rounded-md backdrop-blur-md text-black font-extrabold tracking-wider ${
                isRecording ? 'bg-[#ff3b30] text-white animate-pulse' : 'bg-[#00e5c0]'
              }`}
            >
              {isRecording ? 'REC' : 'AVEE PREVIEW'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/60 text-[#a0a6b5] backdrop-blur-md border border-white/10">
              {canvasRef.current ? `${canvasRef.current.width}×${canvasRef.current.height}` : '720p'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`p-1 rounded-md backdrop-blur-md border transition-colors ${
                showGuides
                  ? 'bg-[#00e5c0]/20 border-[#00e5c0] text-[#00e5c0]'
                  : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Toggle Guides & Safe Areas"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-0.5 rounded-md bg-black/60 text-[#00e5c0] backdrop-blur-md border border-white/10 font-mono">
              {fps} FPS
            </span>
          </div>
        </div>
      </div>

      {/* ================= TRANSPORT & TIMELINE ================= */}
      <div className="flex-none bg-[#101217] border-t border-[#1e212b] px-4 py-2.5 flex flex-col gap-2 z-20">
        {/* Track Title & Time */}
        <div className="flex items-center justify-between text-xs">
          <div className="min-w-0 pr-2">
            <div className="font-bold text-[#f2f4f8] truncate text-[13px] leading-tight">
              {trackTitle}
            </div>
            <div className="text-[11px] text-[#8e95a5] truncate">
              {trackArtist || 'Audio Track'}
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#8e95a5] flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Waveform Scrubber */}
        <div
          onClick={handleWaveformClick}
          className="relative h-6 bg-[#181a22] rounded-md overflow-hidden cursor-pointer active:opacity-90 transition-opacity"
        >
          <canvas ref={waveformRef} className="w-full h-full block" />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
            style={{
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center justify-center gap-4 py-0.5">
          <button
            onClick={() => setShuffle(!shuffle)}
            aria-label="Shuffle"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              shuffle ? 'text-[#00e5c0] bg-[#00e5c0]/10' : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrevTrack}
            aria-label="Previous Track"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#f2f4f8] bg-[#1a1c24] hover:bg-[#252834] active:scale-95 transition-all"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-[#00e5c0] text-black shadow-lg shadow-[#00e5c0]/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNextTrack}
            aria-label="Next Track"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#f2f4f8] bg-[#1a1c24] hover:bg-[#252834] active:scale-95 transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
              const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
              setRepeatMode(next);
            }}
            aria-label="Repeat Mode"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              repeatMode !== 'off'
                ? 'text-[#00e5c0] bg-[#00e5c0]/10'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>

          <button
            onClick={onMicToggle}
            title={isMicActive ? 'Turn off mic' : 'Use live microphone input'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isMicActive
                ? 'bg-[#ff3b30] text-white animate-pulse'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
