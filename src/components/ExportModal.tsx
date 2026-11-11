/**
 * Video Export & High-Res PNG Capture
 */

import React, { useState, useRef } from 'react';
import { Video, Camera, Download, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface ExportModalProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  aspectRatio: string;
  setAspectRatio: (ar: string) => void;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  onNotify: (msg: string, type?: 'ok' | 'err') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  canvasRef,
  aspectRatio,
  setAspectRatio,
  isRecording,
  setIsRecording,
  onNotify,
}) => {
  const [resolution, setResolution] = useState<number>(720);
  const [fps, setFps] = useState<number>(30);
  const [bitrateMbps, setBitrateMbps] = useState<number>(8);
  const [format, setFormat] = useState<'mp4' | 'webm'>('webm');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordProgress, setRecordProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordInterval = useRef<any>(null);

  // Still capture
  const handleCaptureStill = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avee_visualizer_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      onNotify('Saved Still PNG capture', 'ok');
    }, 'image/png');
  };

  // Start real-time video recording with audio stream
  const handleStartRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!audioEngine.isPlaying) {
      audioEngine.play();
    }

    try {
      // 1. Capture canvas video stream
      const stream = canvas.captureStream(fps);

      // 2. Add audio track from WebAudio record destination
      const audioStream = audioEngine.getRecordStream();
      if (audioStream) {
        audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
      }

      // Check supported MIME types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (format === 'mp4') {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
          mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrateMbps * 1_000_000,
        audioBitsPerSecond: 192_000,
      });

      recordedChunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(recordInterval.current);
        const finalBlob = new Blob(recordedChunks.current, {
          type: mimeType.split(';')[0],
        });
        const url = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(url);
        setIsRecording(false);
        setRecordProgress(100);
        onNotify('Video export ready for download!', 'ok');
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordProgress(0);

      // Progress tracker
      const duration = audioEngine.duration || 30;
      const startTime = Date.now();
      recordInterval.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordProgress(Math.min(99, (elapsed / duration) * 100));

        if (elapsed >= duration) {
          handleStopRecording();
        }
      }, 500);

      onNotify('Recording started... Keep this tab active', 'ok');
    } catch (err: any) {
      console.error(err);
      onNotify('Failed to start recorder: ' + err.message, 'err');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordInterval.current);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0c0d12] overflow-y-auto no-scrollbar p-3 sm:p-4 text-xs gap-3">
      {/* Title Card */}
      <div className="bg-[#14161f] border border-[#232734] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-[#ff6a3d]/15 text-[#ff6a3d]">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#f4f5f8]">Video & Still Exporter</div>
            <div className="text-[11px] text-[#8e95a5]">
              Render TikTok / Reels 9:16 or YouTube 16:9 with synced audio
            </div>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="p-3.5 bg-[#14161f] border border-[#232734] rounded-2xl flex flex-col gap-3">
        {/* Aspect Ratio */}
        <div>
          <span className="text-[11px] text-[#8e95a5] block mb-1">Target Aspect Ratio</span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: '9:16', label: '9:16 (Shorts / Reels)' },
              { id: '16:9', label: '16:9 (Landscape)' },
              { id: '1:1', label: '1:1 (Square)' },
            ].map((ar) => (
              <button
                key={ar.id}
                onClick={() => setAspectRatio(ar.id)}
                className={`py-2 px-1 rounded-xl font-bold text-[11px] transition-colors ${
                  aspectRatio === ar.id
                    ? 'bg-[#00e5c0] text-black shadow-md'
                    : 'bg-[#1c1f2c] text-[#8e95a5] hover:text-white'
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution & FPS */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-[#8e95a5] block mb-1">Resolution</span>
            <select
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value))}
              className="w-full bg-[#1c1f2c] border border-[#2b2f40] rounded-xl p-2 text-[#f2f4f8]"
            >
              <option value="480">480p SD (Fast)</option>
              <option value="720">720p HD (Balanced)</option>
              <option value="1080">1080p Full HD</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] text-[#8e95a5] block mb-1">Frame Rate</span>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full bg-[#1c1f2c] border border-[#2b2f40] rounded-xl p-2 text-[#f2f4f8]"
            >
              <option value="24">24 FPS</option>
              <option value="30">30 FPS (Standard)</option>
              <option value="60">60 FPS (Ultra Smooth)</option>
            </select>
          </div>
        </div>

        {/* Video Bitrate */}
        <div>
          <div className="flex justify-between text-[11px] text-[#8e95a5] mb-1">
            <span>Video Bitrate</span>
            <span className="font-mono text-[#00e5c0]">{bitrateMbps} Mbps</span>
          </div>
          <input
            type="range"
            min="2"
            max="25"
            value={bitrateMbps}
            onChange={(e) => setBitrateMbps(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232734]">
          <button
            onClick={handleCaptureStill}
            className="py-2.5 px-3 bg-[#202330] hover:bg-[#2b3040] text-[#f2f4f8] rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
          >
            <Camera className="w-4 h-4 text-[#00e5c0]" />
            <span>Snap Still PNG</span>
          </button>

          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="py-2.5 px-3 bg-[#ff3b30] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStartRecording}
              className="py-2.5 px-3 bg-[#00e5c0] hover:bg-[#33ffdb] text-black rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#00e5c0]/20"
            >
              <Video className="w-4 h-4" />
              <span>Record Video</span>
            </button>
          )}
        </div>

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="p-2.5 bg-[#181a24] rounded-xl border border-[#ff3b30]/30 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] text-[#ff3b30] font-bold">
              <span>● Recording Real-Time Output...</span>
              <span>{Math.round(recordProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-[#252834] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff3b30] transition-all duration-300"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Video Preview & Download */}
      {recordedVideoUrl && (
        <div className="p-3.5 bg-[#14161f] border border-[#232734] rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-200">
          <div className="font-bold text-[#f2f4f8] text-[12px] flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#00e5c0]" /> Rendered Video Ready
          </div>
          <video
            controls
            src={recordedVideoUrl}
            className="w-full max-h-56 rounded-xl bg-black border border-white/10"
          />
          <a
            href={recordedVideoUrl}
            download={`avee_visualizer_${Date.now()}.${format}`}
            className="w-full py-2.5 bg-[#00e5c0] text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#00e5c0]/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Video File</span>
          </a>
        </div>
      )}
    </div>
  );
};
