/**
 * Web Audio Engine for Real-Time Analysis, 10-Band EQ & DSP Audio Processing
 */

import { AudioAnalysisSource, AudioSettings } from '../types/avee';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const FREQ_BANDS: Record<string, [number, number]> = {
  sub: [20, 60],
  bass: [60, 250],
  lowmid: [250, 500],
  mid: [500, 2000],
  upmid: [2000, 4000],
  presence: [4000, 6000],
  brill: [6000, 20000],
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  vol: 100,
  pre: 0,
  bass: 4,
  bal: 0,
  speed: 100,
  norm: true,
  rev: 0,
  dly: 0,
  dist: 0,
  eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  fft: 2048,
  smooth: 65,
  floor: 8,
  beat: 130,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private preGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoost: BiquadFilterNode | null = null;
  private panner: StereoPannerNode | GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;

  // Effects
  private shaper: WaveShaperNode | null = null;
  private distortionWet: GainNode | null = null;
  private distortionDry: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayWet: GainNode | null = null;
  private delayFeedback: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;

  // Playback Source
  private sourceNode: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private isMicActive = false;

  // Analysis Data Buffers
  public freqData = new Uint8Array(1024);
  public timeData = new Uint8Array(2048).fill(128);
  public timeL = new Uint8Array(512).fill(128);
  public timeR = new Uint8Array(512).fill(128);

  // Analysis State
  public smoothValues: Record<AudioAnalysisSource, number> = {
    bass: 0,
    sub: 0,
    lowmid: 0,
    mid: 0,
    upmid: 0,
    presence: 0,
    brill: 0,
    volume: 0,
    peak: 0,
    beat: 0,
    kick: 0,
    snare: 0,
    flux: 0,
    left: 0,
    right: 0,
  };

  private prevBandValues: Record<string, number> = {};
  private envelopeValues: Record<string, number> = {};
  private bassHistory: number[] = [];
  private lastBeatTime = 0;
  public isBeatNow = false;

  // Playhead & Transport
  public isPlaying = false;
  public playbackOffset = 0;
  public playbackStartTime = 0;
  public playbackRate = 1;
  public duration = 0;
  public normGain = 1;

  public onEndedCallback: (() => void) | null = null;

  init(): boolean {
    if (this.ctx) return true;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;

    this.ctx = new AudioContextClass();
    this.preGain = this.ctx.createGain();
    let currentIn: AudioNode = this.preGain;

    // 10-Band EQ
    this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      filter.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.2;
      currentIn.connect(filter);
      currentIn = filter;
      return filter;
    });

    // Bass Boost
    this.bassBoost = this.ctx.createBiquadFilter();
    this.bassBoost.type = 'lowshelf';
    this.bassBoost.frequency.value = 110;
    this.bassBoost.gain.value = 4;
    currentIn.connect(this.bassBoost);
    currentIn = this.bassBoost;

    // Distortion
    this.shaper = this.ctx.createWaveShaper();
    const distMix = this.ctx.createGain();
    this.distortionDry = this.ctx.createGain();
    this.distortionWet = this.ctx.createGain();
    currentIn.connect(this.distortionDry);
    this.distortionDry.connect(distMix);
    currentIn.connect(this.shaper);
    this.shaper.connect(this.distortionWet);
    this.distortionWet.connect(distMix);
    this.distortionWet.gain.value = 0;
    currentIn = distMix;

    // Delay
    this.delayNode = this.ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.28;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    const delayMix = this.ctx.createGain();
    const delayDry = this.ctx.createGain();
    this.delayWet = this.ctx.createGain();
    currentIn.connect(delayDry);
    delayDry.connect(delayMix);
    currentIn.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(delayMix);
    this.delayWet.gain.value = 0;
    currentIn = delayMix;

    // Reverb
    this.reverbNode = this.ctx.createConvolver();
    this.createSyntheticImpulse();
    const verbMix = this.ctx.createGain();
    const verbDry = this.ctx.createGain();
    this.reverbWet = this.ctx.createGain();
    currentIn.connect(verbDry);
    verbDry.connect(verbMix);
    currentIn.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWet);
    this.reverbWet.connect(verbMix);
    this.reverbWet.gain.value = 0;
    currentIn = verbMix;

    // Stereo Panner
    if (this.ctx.createStereoPanner) {
      this.panner = this.ctx.createStereoPanner();
    } else {
      this.panner = this.ctx.createGain();
    }
    currentIn.connect(this.panner);

    // Analyser & Master Gain
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.65;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    this.masterGain = this.ctx.createGain();
    this.recordDest = this.ctx.createMediaStreamDestination();

    this.panner.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.panner.connect(this.recordDest);

    // Stereo L / R Splitter
    const splitter = this.ctx.createChannelSplitter(2);
    this.analyserL = this.ctx.createAnalyser();
    this.analyserR = this.ctx.createAnalyser();
    this.analyserL.fftSize = this.analyserR.fftSize = 512;
    this.panner.connect(splitter);
    splitter.connect(this.analyserL, 0);
    splitter.connect(this.analyserR, 1);

    this.applyDistortionCurve(0);
    return true;
  }

  private createSyntheticImpulse() {
    if (!this.ctx || !this.reverbNode) return;
    const rate = this.ctx.sampleRate;
    const len = rate * 2;
    const ir = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
    }
    this.reverbNode.buffer = ir;
  }

  private applyDistortionCurve(amount: number) {
    if (!this.shaper) return;
    const k = 1 + (amount / 100) * 12;
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    this.shaper.curve = curve;
  }

  applySettings(s: AudioSettings) {
    if (!this.ctx || !this.preGain || !this.masterGain) return;

    this.preGain.gain.value = Math.pow(10, s.pre / 20) * this.normGain;
    if (this.bassBoost) this.bassBoost.gain.value = s.bass;
    this.masterGain.gain.value = s.vol / 100;

    if (this.panner && 'pan' in this.panner) {
      this.panner.pan.value = s.bal / 100;
    }

    // EQ
    this.eqFilters.forEach((f, i) => {
      if (s.eq[i] !== undefined) f.gain.value = s.eq[i];
    });

    // Distortion
    if (this.distortionWet && this.distortionDry) {
      this.distortionWet.gain.value = s.dist / 100;
      this.distortionDry.gain.value = 1 - (s.dist / 200);
      this.applyDistortionCurve(s.dist);
    }

    // Delay & Reverb
    if (this.delayWet) this.delayWet.gain.value = s.dly / 100;
    if (this.reverbWet) this.reverbWet.gain.value = s.rev / 100;

    // Rate
    this.playbackRate = s.speed / 100;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = this.playbackRate;
    }

    // FFT
    if (this.analyser && this.analyser.fftSize !== s.fft) {
      this.analyser.fftSize = s.fft;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = s.smooth / 100;
    }
  }

  async loadBuffer(buffer: AudioBuffer, autoPlay = true, norm = true) {
    this.init();
    await this.ctx?.resume();
    this.stop();
    this.currentBuffer = buffer;
    this.duration = buffer.duration;
    this.playbackOffset = 0;

    // Normalization check
    if (norm) {
      let maxPeak = 0;
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 32) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
      this.normGain = maxPeak > 0 ? 0.95 / maxPeak : 1;
    } else {
      this.normGain = 1;
    }

    if (autoPlay) {
      this.play();
    }
  }

  play() {
    if (!this.currentBuffer || !this.ctx) return;
    this.ctx.resume();
    this.stopSourceOnly();

    const node = this.ctx.createBufferSource();
    node.buffer = this.currentBuffer;
    node.playbackRate.value = this.playbackRate;
    node.connect(this.preGain!);

    node.onended = () => {
      if (this.sourceNode === node) {
        this.isPlaying = false;
        this.playbackOffset = 0;
        if (this.onEndedCallback) this.onEndedCallback();
      }
    };

    node.start(0, this.playbackOffset);
    this.sourceNode = node;
    this.playbackStartTime = this.ctx.currentTime;
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying) return;
    this.playbackOffset = this.getCurrentTime();
    this.stopSourceOnly();
    this.isPlaying = false;
  }

  togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  seek(time: number) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.playbackOffset = Math.max(0, Math.min(this.duration, time));
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime(): number {
    if (!this.ctx || !this.currentBuffer) return 0;
    if (!this.isPlaying) return this.playbackOffset;
    const elapsed = (this.ctx.currentTime - this.playbackStartTime) * this.playbackRate;
    return Math.min(this.duration, Math.max(0, this.playbackOffset + elapsed));
  }

  private stopSourceOnly() {
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
  }

  stop() {
    this.stopSourceOnly();
    this.playbackOffset = 0;
    this.isPlaying = false;
  }

  getRecordStream(): MediaStream | null {
    return this.recordDest ? this.recordDest.stream : null;
  }

  /**
   * Toggle Live Microphone Input
   */
  async toggleMic(): Promise<boolean> {
    this.init();
    await this.ctx?.resume();

    if (this.isMicActive) {
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => t.stop());
        this.micStream = null;
      }
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
      this.isMicActive = false;
      return false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.micStream = stream;
        this.micSource = this.ctx!.createMediaStreamSource(stream);
        this.micSource.connect(this.preGain!);
        this.isMicActive = true;
        this.isPlaying = true;
        return true;
      } catch (err) {
        console.error('Microphone access denied:', err);
        return false;
      }
    }
  }

  getIsMic(): boolean {
    return this.isMicActive;
  }

  /**
   * Frequency Band Average (normalized 0-1)
   */
  bandAverage(minHz: number, maxHz: number): number {
    const sr = this.ctx ? this.ctx.sampleRate : 44100;
    const hzPerBin = sr / 2 / this.freqData.length;
    const i = Math.max(0, Math.floor(minHz / hzPerBin));
    const j = Math.max(i + 1, Math.min(this.freqData.length, Math.ceil(maxHz / hzPerBin)));
    let sum = 0;
    for (let k = i; k < j; k++) sum += this.freqData[k];
    return sum / (j - i) / 255;
  }

  /**
   * Main per-frame audio analysis step
   */
  analyse(now: number, noiseFloor = 0.08, beatSensitivity = 1.3) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData);
      this.analyser.getByteTimeDomainData(this.timeData);
    }
    if (this.analyserL && this.analyserR) {
      this.analyserL.getByteTimeDomainData(this.timeL);
      this.analyserR.getByteTimeDomainData(this.timeR);
    }

    const norm = (v: number) => Math.max(0, Math.min(1, (v - noiseFloor) / (1 - noiseFloor)));
    let flux = 0;

    for (const [key, range] of Object.entries(FREQ_BANDS)) {
      const v = norm(this.bandAverage(range[0], range[1]));
      flux += Math.max(0, v - (this.prevBandValues[key] || 0));
      this.prevBandValues[key] = v;
      this.smoothValues[key as AudioAnalysisSource] = v;
    }

    // RMS Volume
    let sumSq = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const x = (this.timeData[i] - 128) / 128;
      sumSq += x * x;
    }
    this.smoothValues.volume = Math.min(1, Math.sqrt(sumSq / this.timeData.length) * 2.2);

    // Left and Right RMS
    let sumL = 0, sumR = 0;
    for (let i = 0; i < this.timeL.length; i++) {
      const xl = (this.timeL[i] - 128) / 128;
      const xr = (this.timeR[i] - 128) / 128;
      sumL += xl * xl;
      sumR += xr * xr;
    }
    this.smoothValues.left = Math.min(1, Math.sqrt(sumL / this.timeL.length) * 2.2);
    this.smoothValues.right = Math.min(1, Math.sqrt(sumR / this.timeR.length) * 2.2);

    // Peak
    let peak = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      if (this.freqData[i] > peak) peak = this.freqData[i];
    }
    this.smoothValues.peak = peak / 255;

    // Kick and Snare Envelopes
    const bassDiff = Math.max(0, this.smoothValues.bass - (this.envelopeValues.pBass || 0));
    this.envelopeValues.pBass = this.smoothValues.bass;
    this.envelopeValues.kick = Math.max(bassDiff * 5.2, (this.envelopeValues.kick || 0) * 0.86);
    this.smoothValues.kick = Math.min(1, this.envelopeValues.kick);

    const snareDiff = Math.max(0, this.smoothValues.upmid - (this.envelopeValues.pSnare || 0));
    this.envelopeValues.pSnare = this.smoothValues.upmid;
    this.envelopeValues.snare = Math.max(snareDiff * 5.0, (this.envelopeValues.snare || 0) * 0.86);
    this.smoothValues.snare = Math.min(1, this.envelopeValues.snare);

    this.smoothValues.flux = Math.min(1, (this.envelopeValues.flux || 0) * 0.88 + flux * 2.2);
    this.envelopeValues.flux = this.smoothValues.flux;

    // Beat Detection
    const avgBass = this.bassHistory.length
      ? this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length
      : 0;

    this.isBeatNow =
      (this.isPlaying || this.isMicActive) &&
      this.smoothValues.bass > 0.28 &&
      this.smoothValues.bass > avgBass * (beatSensitivity / 100) &&
      now - this.lastBeatTime > 180;

    if (this.isBeatNow) {
      this.lastBeatTime = now;
      this.smoothValues.beat = 1;
    } else {
      this.smoothValues.beat *= 0.88;
    }

    this.bassHistory.push(this.smoothValues.bass);
    if (this.bassHistory.length > 40) this.bassHistory.shift();
  }
}

export const audioEngine = new AudioEngine();

