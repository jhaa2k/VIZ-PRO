/**
 * AUDIOVIS Studio Pro Engine with Avee Player .viz Reader, Editor & Exporter
 * Features: JSZip Avee reader/exporter, Avee presets, Live mic, Java Android Exporter
 */

import JSZip from 'jszip';

export function initAppletEngine() {
  // Utility functions
  const $ = (s: string) => document.querySelector(s) as any;
  const $$ = (s: string) => [...document.querySelectorAll(s)] as any[];
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const fmt = (s: number) => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
  const esc = (s: any) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

  const cv = $('#cv') as HTMLCanvasElement;
  if (!cv) return;
  const ctx = cv.getContext('2d')!;

  // Localstorage helpers
  const ls = {
    get(k: string, d: any) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k: string) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // Toast
  let toastTimer: any;
  function toast(msg: string, kind?: string) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = '', 2600);
  }

  // Themes
  const THEMES: Record<string, string[]> = {
    'Claude Dark': ['#262624', '#30302E', '#454440', '#FAF9F5', '#B0AEA5', '#D97757'],
    'CapCut': ['#000000', '#141416', '#2a2a2e', '#ffffff', '#8e8e93', '#00e5c0'],
    'Claude Light': ['#FAF9F5', '#FFFFFF', '#E8E6DC', '#141413', '#6B6A63', '#C15F3C'],
    'Pure Black': ['#000000', '#0e0e10', '#252529', '#f2f2f5', '#a8a8b2', '#00e6a8'],
    'Graphite': ['#1a1a1c', '#232326', '#3a3a3e', '#f0f0f0', '#8e8e93', '#f0f0f0'],
    'Slate': ['#1e2530', '#262e3b', '#3b4657', '#e8edf4', '#8794a8', '#cfd8e6'],
    'Silver': ['#c9c9cc', '#d8d8db', '#9a9a9f', '#111111', '#55555a', '#111111'],
    'Arctic White': ['#f7f9fb', '#ffffff', '#d0d6dc', '#0b0f14', '#5b6670', '#0b0f14'],
    'Ivory': ['#f3efe3', '#faf7ee', '#cfc8b3', '#1c1a14', '#6b6654', '#1c1a14'],
    'Midnight Blue': ['#060b1f', '#0c1330', '#223063', '#e6ecff', '#7a89c2', '#6d8cff'],
    'Electric Cyan': ['#031215', '#08202a', '#0f4a57', '#e0fbff', '#5fa3b0', '#00e5ff'],
    'Neon Purple': ['#0d0617', '#170a29', '#3d1d6b', '#f3e8ff', '#9a7bc4', '#b44dff'],
    'Crimson': ['#120406', '#20080c', '#5a1620', '#ffe8ea', '#b07078', '#ff2d4a'],
    'Emerald': ['#03120b', '#08201a', '#134a36', '#e3fff1', '#6aa88a', '#18e08a'],
    'Amber': ['#120c03', '#201607', '#5a3f12', '#fff3dc', '#b09260', '#ffb020']
  };
  const luminance = (h: string) => { const n = parseInt(h.slice(1), 16); return (.299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; };
  let THEME_COLORS = { '--ac': '#D97757', '--dm': '#B0AEA5' };
  function applyTheme(name: string) {
    const t = THEMES[name] || THEMES['Claude Dark'];
    const root = document.documentElement.style;
    ['--bg', '--pn', '--ln', '--tx', '--dm', '--ac'].forEach((k, i) => root.setProperty(k, t[i]));
    root.setProperty('--on', luminance(t[5]) > .5 ? '#000' : '#fff');
    THEME_COLORS = { '--ac': t[5], '--dm': t[4] };
    S.theme = name;
    if ($('#theme')) $('#theme').value = name;
    save();
  }

  // Settings
  const SETTINGS_DEFAULTS = {
    theme: 'Claude Dark', rot: 'auto', pq: 75, fps: 60, showFps: 0, guides: 0,
    fft: 2048, smooth: 50, floor: 8, beat: 130,
    vol: 100, pre: 0, bass: 0, bal: 0, speed: 100, norm: 0, rev: 0, dly: 0, dist: 0,
    eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    sh: 0, rp: 'off', ratio: '16:9', res: 720, cw: 1280, ch: 720,
    xfps: 30, mbps: 8, abr: 192, fmt: 0, t0: 0, t1: 0,
    cc: 1, cv: 3,
    // Avee Audio Provider & Beat Box properties
    sampleProvider: 'Spectrum',
    sampleOutCount: 64,
    mirrorSamples: 0,
    repeatSamples: 1,
    startEndGap: 0,
    preSmooth: 40,
    filterRadius: 2,
    filterStrength: 2,
    aWeight: 0,
    outputMultiplier: 1.0,
    lowerHz: 20,
    higherHz: 16000,
    hzLinearFactor: 0.25,
    freqShift: 0,
    beatSmooth: 50,
    beatBarFirst: 1,
    beatBarLast: 14,
    beatValLower: 0.15,
    beatValHigher: 0.75,
    wfSampleOutPower: 8,
    wfInputSize: 8,
    waveformStyle: 'circular'
  };
  let S: any = { ...SETTINGS_DEFAULTS, ...ls.get('av.set', {}) };
  const save = () => ls.set('av.set', S);

  if ($('#theme')) $('#theme').innerHTML = Object.keys(THEMES).map(k => `<option>${k}</option>`).join('');

  // Audio Engine
  const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode, gainNode: GainNode, recordDest: MediaStreamAudioDestinationNode, preGain: GainNode, bassBoost: BiquadFilterNode, panner: any;
  let eqFilters: BiquadFilterNode[] = [], stereoNode: any, stereoY: any, stereoR: any, shaper: WaveShaperNode, delayNode: DelayNode, feedback: GainNode, reverb: ConvolverNode, analyserL: AnalyserNode, analyserR: AnalyserNode;
  let freqData = new Uint8Array(1024);
  let timeData = new Uint8Array(2048).fill(128);
  let timeL = new Uint8Array(512).fill(128);
  let timeR = new Uint8Array(512).fill(128);
  let files: any[] = [], currentIndex = -1, loadToken = 0, recorder: any = null, sleepTimer: any = null;
  let micStream: MediaStream | null = null, micNode: MediaStreamAudioSourceNode | null = null, isMic = false;

  // Embedded assets stored for Avee Player .viz export
  let embeddedAveeAssets: Map<string, { blob: Blob; url: string; size: number }> = new Map();
  let currentAveeTemplateName = 'Avee Classic Template';

  const audioPlayer: any = {
    buffer: null, offset: 0, startTime: 0, rate: 1, node: null, paused: true, norm: 1,
    onplay() {}, onpause() {}, onended() {},
    get duration() { return this.buffer ? this.buffer.duration : NaN; },
    get currentTime() {
      if (!this.buffer || !audioCtx) return 0;
      const t = this.paused ? this.offset : this.offset + (audioCtx.currentTime - this.startTime) * this.rate;
      return clamp(t, 0, this.buffer.duration);
    },
    set currentTime(v: number) {
      if (!this.buffer) return;
      const wasPlaying = !this.paused;
      this.stop();
      this.offset = clamp(v, 0, this.buffer.duration - .05);
      if (wasPlaying) this.play();
    },
    setRate(r: number) {
      if (!this.paused && audioCtx) { this.offset = this.currentTime; this.startTime = audioCtx.currentTime; }
      this.rate = r;
      if (this.node) this.node.playbackRate.value = r;
    },
    play() {
      if (!this.buffer || !this.paused || !audioCtx) return;
      audioCtx.resume();
      const n = audioCtx.createBufferSource();
      n.buffer = this.buffer;
      n.playbackRate.value = this.rate;
      n.connect(preGain);
      n.onended = () => { if (audioPlayer.node === n) { audioPlayer.stop(); audioPlayer.offset = 0; audioPlayer.onpause(); audioPlayer.onended(); } };
      n.start(0, this.offset);
      this.node = n;
      this.startTime = audioCtx.currentTime;
      this.paused = false;
      this.onplay();
    },
    pause() {
      if (this.paused) return;
      this.offset = this.currentTime;
      this.stop();
      this.onpause();
    },
    stop() {
      const n = this.node;
      this.node = null;
      this.paused = true;
      if (n) { n.onended = null; try { n.stop(); } catch(e) {} n.disconnect(); }
    }
  };

  function initAudio(): boolean {
    if (audioCtx) return true;
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) { toast('Web Audio is not supported here', 'err'); return false; }

    audioCtx = new C();
    preGain = audioCtx.createGain();
    let node: AudioNode = preGain;

    eqFilters = EQ_FREQS.map((f, i) => {
      const b = audioCtx!.createBiquadFilter();
      b.type = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking';
      b.frequency.value = f;
      b.Q.value = 1;
      node.connect(b);
      node = b;
      return b;
    });

    bassBoost = audioCtx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.value = 120;
    node.connect(bassBoost);

    const createEffectStereo = (input: AudioNode, effectNode: AudioNode) => {
      const out = audioCtx!.createGain(), dry = audioCtx!.createGain(), wet = audioCtx!.createGain();
      input.connect(dry); dry.connect(out);
      input.connect(effectNode); effectNode.connect(wet); wet.connect(out);
      wet.gain.value = 0;
      return { o: out, w: wet, d: dry };
    };

    shaper = audioCtx.createWaveShaper();
    stereoNode = createEffectStereo(bassBoost, shaper);

    delayNode = audioCtx.createDelay(2);
    delayNode.delayTime.value = .32;
    feedback = audioCtx.createGain();
    feedback.gain.value = .4;
    delayNode.connect(feedback); feedback.connect(delayNode);
    stereoY = createEffectStereo(stereoNode.o, delayNode);

    reverb = audioCtx.createConvolver();
    const len = audioCtx.sampleRate * 2;
    const ir = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    reverb.buffer = ir;
    stereoR = createEffectStereo(stereoY.o, reverb);

    panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : audioCtx.createGain();
    stereoR.o.connect(panner);

    analyser = audioCtx.createAnalyser();
    gainNode = audioCtx.createGain();
    recordDest = audioCtx.createMediaStreamDestination();
    panner.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    panner.connect(recordDest);

    const sp = audioCtx.createChannelSplitter(2);
    analyserL = audioCtx.createAnalyser();
    analyserR = audioCtx.createAnalyser();
    analyserL.fftSize = analyserR.fftSize = 512;
    panner.connect(sp);
    sp.connect(analyserL, 0);
    sp.connect(analyserR, 1);

    applyAudioSettings();
    return true;
  }

  function applyAudioSettings() {
    if (!audioCtx) return;
    preGain.gain.value = Math.pow(10, S.pre / 20) * audioPlayer.norm;
    bassBoost.gain.value = S.bass;
    if (panner.pan) panner.pan.value = S.bal / 100;
    gainNode.gain.value = S.vol / 100;

    stereoNode.w.gain.value = S.dist / 100;
    stereoNode.d.gain.value = 1 - S.dist / 200;
    const k = 1 + S.dist * .8, curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = i / 1024 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    shaper.curve = curve;

    stereoY.w.gain.value = S.dly / 100;
    stereoY.d.gain.value = 1;
    stereoR.w.gain.value = S.rev / 100;

    eqFilters.forEach((f, i) => f.gain.value = S.eq[i]);
    audioPlayer.setRate(S.speed / 100);

    if (analyser.fftSize !== +S.fft) {
      analyser.fftSize = +S.fft;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
    }
    analyser.smoothingTimeConstant = S.smooth / 100;
  }

  // Live Microphone toggle
  async function toggleMicrophone() {
    initAudio();
    await audioCtx!.resume();
    if (isMic) {
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (micNode) micNode.disconnect();
      isMic = false;
      $('#bmic')?.classList.remove('on');
      toast('Microphone off', 'ok');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStream = stream;
        micNode = audioCtx!.createMediaStreamSource(stream);
        micNode.connect(preGain);
        isMic = true;
        $('#bmic')?.classList.add('on');
        toast('Live Microphone active', 'ok');
      } catch (e: any) {
        toast('Microphone access denied: ' + e.message, 'err');
      }
    }
  }

  // Analysis
  const FREQ_BANDS: Record<string, [number, number]> = {
    sub: [20, 60], bass: [60, 250], lowmid: [250, 500], mid: [500, 2000],
    upmid: [2000, 4000], presence: [4000, 6000], brill: [6000, 20000]
  };
  const ANALYSIS_SOURCES = ['bass', 'sub', 'lowmid', 'mid', 'upmid', 'presence', 'brill', 'volume', 'peak', 'beat', 'kick', 'snare', 'flux', 'left', 'right'];

  let smoothValues: Record<string, number> = { beat: 0 };
  let prevValues: Record<string, number> = {};
  let envelopeValues: Record<string, number> = {};
  let history: number[] = [];
  let beatNow = false, lastBeat = 0, beatCount = 0, currentBpm = 0, lastBeatTimes: number[] = [];

  function bandAverage(minHz: number, maxHz: number): number {
    const sr = audioCtx ? audioCtx.sampleRate : 44100;
    const hzPerBin = sr / 2 / freqData.length;
    let i = Math.max(0, Math.floor(minHz / hzPerBin));
    let j = Math.max(i + 1, Math.min(freqData.length, Math.ceil(maxHz / hzPerBin)));
    let sum = 0;
    for (let k = i; k < j; k++) {
      // Optional A-weighting reduction for bass if requested by AudioProvider
      let w = 1.0;
      if (S.aWeight && k * hzPerBin < 250) {
        w = Math.max(0.05, 1 - (S.aWeight / 100) * (1 - (k * hzPerBin) / 250));
      }
      sum += freqData[k] * w;
    }
    const mul = S.outputMultiplier || 1.0;
    return clamp((sum / (j - i) / 255) * mul, 0, 1);
  }

  const rms = (a: Uint8Array) => {
    let r = 0;
    for (let i = 0; i < a.length; i++) { const x = (a[i] - 128) / 128; r += x * x; }
    return clamp(Math.sqrt(r / a.length) * 2.2 * (S.outputMultiplier || 1.0), 0, 1);
  };

  function analyse(now: number) {
    if (analyser) {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);
      analyserL.getByteTimeDomainData(timeL);
      analyserR.getByteTimeDomainData(timeR);
    }
    const floor = S.floor / 100;
    const norm = (v: number) => clamp((v - floor) / (1 - floor), 0, 1);
    let flux = 0;

    for (const k in FREQ_BANDS) {
      const v = norm(bandAverage(...FREQ_BANDS[k]));
      flux += Math.max(0, v - (prevValues[k] || 0));
      prevValues[k] = v;
      smoothValues[k] = v;
    }

    smoothValues.volume = rms(timeData);
    smoothValues.left = rms(timeL);
    smoothValues.right = rms(timeR);

    let peak = 0;
    for (let i = 0; i < freqData.length; i++) if (freqData[i] > peak) peak = freqData[i];
    smoothValues.peak = clamp((peak / 255) * (S.outputMultiplier || 1.0), 0, 1);

    for (const k of ['bass', 'upmid']) {
      const diff = Math.max(0, smoothValues[k] - (envelopeValues['p' + k] || 0));
      envelopeValues['p' + k] = smoothValues[k];
      envelopeValues[k] = Math.max(diff * 5, (envelopeValues[k] || 0) * .88);
    }

    smoothValues.kick = Math.min(1, envelopeValues.bass || 0);
    smoothValues.snare = Math.min(1, envelopeValues.upmid || 0);
    smoothValues.flux = Math.min(1, (envelopeValues.f || 0) * .9 + flux * 2);
    envelopeValues.f = smoothValues.flux;

    // Avee Player Beat Range Box detection ("as more bars lie inside a box - beat value increases")
    const b0 = Math.max(0, Math.min(freqData.length - 2, S.beatBarFirst || 1));
    const b1 = Math.max(b0 + 1, Math.min(freqData.length - 1, S.beatBarLast || 14));
    const vLow = (S.beatValLower !== undefined ? S.beatValLower : 0.15) * 255;
    const vHigh = (S.beatValHigher !== undefined ? S.beatValHigher : 0.75) * 255;
    let barsInBox = 0;
    for (let i = b0; i <= b1; i++) {
      if (freqData[i] >= vLow && freqData[i] <= vHigh) barsInBox++;
    }
    const boxSpan = b1 - b0 + 1;
    const boxRatio = boxSpan > 0 ? barsInBox / boxSpan : 0;

    const avg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
    beatNow = !!analyser && (!audioPlayer.paused || isMic) &&
              (boxRatio > 0.35 || smoothValues.bass > 0.3) &&
              smoothValues.bass > avg * S.beat / 100 &&
              now - lastBeat > 160;

    if (beatNow) {
      lastBeat = now;
      beatCount++;
      // Live dynamic BPM estimation
      if (lastBeatTimes.length >= 10) lastBeatTimes.shift();
      lastBeatTimes.push(now);
      if (lastBeatTimes.length >= 4) {
        const intervals = [];
        for (let idx = 1; idx < lastBeatTimes.length; idx++) {
          intervals.push(lastBeatTimes[idx] - lastBeatTimes[idx - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avgInterval > 220 && avgInterval < 1400) {
          currentBpm = Math.round(60000 / avgInterval);
        }
      }
    }
    history.push(smoothValues.bass);
    if (history.length > 43) history.shift();

    // Beat smooth variable
    const beatDecay = (100 - clamp(S.beatSmooth || 50, 10, 95)) / 100 * 0.18;
    smoothValues.beat = beatNow ? 1 : Math.max(0, smoothValues.beat - beatDecay);

    // Update HUD beat indicators
    const hudBpm = $('#hud-bpm');
    if (hudBpm) hudBpm.textContent = currentBpm ? String(currentBpm) : '--';
    const hudDot = $('#hud-dot');
    if (hudDot) {
      hudDot.style.background = beatNow ? 'var(--ac)' : 'var(--dm)';
      hudDot.style.transform = beatNow ? 'scale(1.7)' : 'scale(1)';
    }
  }

  // Layers & Presets Model
  const LAYER_DEFAULTS = {
    type: 'bars', name: '', vis: 1, lock: 0,
    x: 50, y: 50, sx: 100, sy: 100, uni: 0, rot: 0, spin: 0, op: 100,
    blend: 'source-over',
    n: 48, thick: 70, round: 0, maxH: 100, r0: 60, a0: -90, a1: 270,
    rings: 3, seg: 8,
    dir: 'up', odir: 'out', mir: 'none', ws: 'line', wfill: 0,
    shape: 'circle', sides: 5,
    text: 'AUDIOVIS', fz: 12, font: 'Archivo', fw: 800, fi: 0, ls: 0, up: 0, al: 'center',
    rvar: 0, sw: 0, sc: '#ffffff',
    mask: 'none',
    band: 'all', f0: 30, f1: 16000, fsc: 'log', sens: 100, att: 60, rel: 15,
    color: '#ffffff', color2: '#6a6a75', color3: '#00e6a8', three: 0,
    grad: 'linear', gAng: 90, gAnim: 0,
    glow: 0, shOff: 0, blur: 0, hue: 0, bright: 100, contr: 100, sat: 100,
    anim: 'none', as: 1, aa: 30,

    // Avee Segments / Bars
    flipInput: 0,
    heightScale: 100,
    minHeightScale: 0,
    shapePath: 'HorizontalLine',
    colorBlendOffset: 0,
    segment1: 'Bars',
    segment2: 'None',
    softness: 20,
    reactionDelay: 0,
    reactionAccumulatedDelay: 0,
    audioProviderIndex: 0,
    peakCaps: 0,
    peakHold: 18,
    peakDecay: 2,

    // Avee Image & Mask
    customImage: '',
    animSpeed: 1,
    cropFit: 1,
    keepAspect: 1,
    blurBorder: 0,
    maskImage: '',
    maskMode: 'alpha',
    colorTo: '#ffffff',
    colorBlend: 0,
    colorKeyEnabled: 0,
    autoDetectColorKey: 0,
    colorKey: '#000000',
    transparencyStrength: 100,
    opacityStrength: 100,
    blurEnabled: 0,
    blurRadius: 0,
    genShiftHue: 0,
    genNoText: 0,
    genForce: 0,
    genColor: '#12141c',

    // Avee Blur Effect
    blendModeContent: 'normal',
    sourceCompIndex: 0,
    showUnblurred: 1,
    showUnblurredUnder: 0,
    blurMultiplier: 1.0,
    scale1: 1.05,
    scale2: 1.15,
    scale3: 0,

    // Avee 3D Particles
    colorFrom: '#00e5c0',
    countLimit: 120,
    mirrorX: 0,
    mirrorY: 0,
    pDepth: 0,
    pFov: 75,
    spawnArea: 'Rectangle',
    vertOrient: 0,
    vecAngle: 0,
    vecAngleZ: 0,
    randomVec: 1,
    vecRelCenter: 1,
    forceField: 0,
    pScale: 1.0,
    trail: 0,
    fadeTime: 1.0,
    velAngle: 0,
    sizeAspect: 1.0,
    startSize: 8,
    fadeInSize: 12,
    endSize: 2,
    endSizeRand: 4,
    speed: 2.0,
    speedRand: 1.5,
    life: 2.5,
    grav: 0,
    sideFreq: 1.0,
    sideMag: 5.0
  };

  // Audio Waveform Rendering Styles Library
  const WAVEFORM_STYLES: Array<{
    id: string;
    name: string;
    badge: string;
    desc: string;
    svg: string;
  }> = [
    {
      id: 'circular',
      name: 'Circular Wave',
      badge: 'Radial 360°',
      desc: 'Polar oscilloscope loop radiating around center',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 C15,4 25,18 35,11 C45,5 55,17 65,11 C75,4 85,18 95,11" stroke="#00e5c0" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'starburst',
      name: 'Starburst Spikes',
      badge: 'Explosive',
      desc: 'Sharp audio-reactive spikes bursting 360° outward',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 L15,3 L25,19 L35,5 L45,17 L55,2 L65,20 L75,6 L85,16 L95,11" stroke="#ffb020" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'mirror',
      name: 'Dual Mirror',
      badge: 'Bilateral',
      desc: 'Symmetric dual reflection across central baseline',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 Q25,3 50,11 T95,11 M5,11 Q25,19 50,11 T95,11" stroke="#6d8cff" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'linear',
      name: 'Linear Scope',
      badge: 'Oscilloscope',
      desc: 'High-definition horizontal oscilloscope audio beam',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 Q20,2 35,11 T65,11 T95,11" stroke="#00e5c0" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'ribbon',
      name: 'Centred Ribbon',
      badge: 'Glow Fill',
      desc: 'Luminous neon filled audio ribbon with breathing glow',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 Q25,4 50,11 T95,11 L95,15 Q70,19 50,13 T5,15 Z" fill="#b44dff" opacity="0.6"/><path d="M5,11 Q25,4 50,11 T95,11" stroke="#b44dff" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'segmented',
      name: 'Segmented Wave',
      badge: 'Digital Pulse',
      desc: 'Quantized digital points and audio transient dashes',
      svg: '<svg viewBox="0 0 100 22"><circle cx="10" cy="11" r="2.5" fill="#00e5c0"/><circle cx="25" cy="5" r="3" fill="#00e5c0"/><circle cx="40" cy="17" r="2.5" fill="#00e5c0"/><circle cx="55" cy="3" r="3.5" fill="#00e5c0"/><circle cx="70" cy="18" r="2.5" fill="#00e5c0"/><circle cx="85" cy="7" r="3" fill="#00e5c0"/></svg>'
    },
    {
      id: 'heartbeat',
      name: 'Heartbeat ECG',
      badge: 'Transient',
      desc: 'Sharp cardio audio pulses reacting violently to kicks',
      svg: '<svg viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M5,11 L30,11 L35,3 L42,19 L48,7 L52,13 L56,11 L95,11" stroke="#ff2d4a" stroke-width="2" fill="none"/></svg>'
    },
    {
      id: 'vortex',
      name: 'Ring Vortex',
      badge: 'Orbital Rings',
      desc: 'Concentric orbital wave loops pulsating dynamically',
      svg: '<svg viewBox="0 0 100 22"><circle cx="50" cy="11" r="4" stroke="#00e5c0" stroke-width="1.5" fill="none"/><circle cx="50" cy="11" r="7.5" stroke="#6d8cff" stroke-width="1.5" fill="none"/><circle cx="50" cy="11" r="10" stroke="#ffb020" stroke-width="1.5" stroke-dasharray="3,2" fill="none"/></svg>'
    }
  ];

  function applyWaveformStyle(styleId: string) {
    S.waveformStyle = styleId;
    S.sampleProvider = 'Waveform';
    save();

    let waveLayer = layers.find((l: any) => l.type === 'wave' || l.type === 'wavec' || l.type === 'scope' || l.type === 'concentric' || l.isWaveformLayer);
    if (!waveLayer) {
      waveLayer = makeLayer('wave', { name: 'Audio Waveform', isWaveformLayer: 1 });
      layers.push(waveLayer);
      selected = layers.length - 1;
    }

    waveLayer.waveformStyle = styleId;
    if (styleId === 'circular') {
      waveLayer.type = 'wavec';
      waveLayer.r0 = 55;
      waveLayer.thick = 35;
      waveLayer.sens = 125;
      waveLayer.ws = 'smooth';
      waveLayer.wfill = 0;
      waveLayer.name = 'Circular Wave';
    } else if (styleId === 'starburst') {
      waveLayer.type = 'wavec';
      waveLayer.r0 = 40;
      waveLayer.thick = 35;
      waveLayer.sens = 190;
      waveLayer.ws = 'spiky';
      waveLayer.wfill = 0;
      waveLayer.name = 'Starburst Wave';
    } else if (styleId === 'mirror') {
      waveLayer.type = 'wave';
      waveLayer.mir = 'center';
      waveLayer.thick = 35;
      waveLayer.sens = 120;
      waveLayer.ws = 'smooth';
      waveLayer.wfill = 0;
      waveLayer.name = 'Mirror Wave';
    } else if (styleId === 'linear') {
      waveLayer.type = 'wave';
      waveLayer.mir = 'none';
      waveLayer.thick = 30;
      waveLayer.sens = 100;
      waveLayer.ws = 'smooth';
      waveLayer.wfill = 0;
      waveLayer.name = 'Linear Wave';
    } else if (styleId === 'ribbon') {
      waveLayer.type = 'wave';
      waveLayer.mir = 'center';
      waveLayer.thick = 25;
      waveLayer.sens = 140;
      waveLayer.ws = 'smooth';
      waveLayer.wfill = 1;
      waveLayer.name = 'Ribbon Wave';
    } else if (styleId === 'segmented') {
      waveLayer.type = 'dots';
      waveLayer.thick = 50;
      waveLayer.n = 64;
      waveLayer.sens = 130;
      waveLayer.name = 'Segmented Wave';
    } else if (styleId === 'heartbeat') {
      waveLayer.type = 'wave';
      waveLayer.mir = 'none';
      waveLayer.thick = 40;
      waveLayer.sens = 180;
      waveLayer.ws = 'spiky';
      waveLayer.wfill = 0;
      waveLayer.name = 'Heartbeat ECG';
    } else if (styleId === 'vortex') {
      waveLayer.type = 'concentric';
      waveLayer.rings = 4;
      waveLayer.thick = 35;
      waveLayer.sens = 130;
      waveLayer.name = 'Ring Vortex';
    }

    touch();
    renderAll();
    showTab('aud');
    toast(`Waveform style: ${styleId.toUpperCase()}`, 'ok');
  }

  const makeLayer = (type: string, overrides: any = {}) => ({ ...LAYER_DEFAULTS, type, name: type, rules: [], ...overrides });
  const makeBackground = (c1: string, c2: string, overrides: any = {}) => makeLayer('bg', { color: c1, color2: c2, ...overrides });
  const SCENE_DEFAULTS = {
    bg: '#000000', cam: 0, vig: 0, scan: 0, grain: 0, flash: 0,
    // Avee Composition elements
    introBlend: 'normal', introFadeDur: 0, outroFadeDur: 0, introFadeColor: '#000000', finalComp: 1,
    // Beat reactive features
    beatFlash: 0, beatPunch: 0, beatHueShift: 0, beatBurst: 0
  };

  const PRESETS: any[] = [
    // Famous Avee Player templates
    ['Avee Famous', 'Avee Classic Trap Circle', [makeBackground('#08090d', '#12141c', { grad: 'radial' }), makeLayer('circle', { name: 'Avee Circular Spectrum', n: 72, r0: 56, thick: 65, glow: 15, color: '#00e5c0', color2: '#6d8cff' }), makeLayer('ring', { name: 'Avee Inner Disc', r0: 52, thick: 18, color: '#00e5c0', color2: '#00e5c0', glow: 18 }), makeLayer('particles', { name: 'Avee Floating Dust', n: 110, color: '#00e5c0' }), makeLayer('text', { name: 'Track Title', text: '{ArtistOrTitle}', y: 50, fz: 13, font: 'Outfit', color: '#ffffff', glow: 8 })]],
    ['Avee Famous', 'Avee Neon Bass Reactor', [makeBackground('#05020c', '#140026', { grad: 'radial' }), makeLayer('circle', { name: 'Cyan Sub Reactor', n: 80, r0: 45, thick: 55, color: '#00f0ff', color2: '#ff00aa', glow: 22, spin: 4 }), makeLayer('circle', { name: 'Pink Treble Burst', n: 110, r0: 75, thick: 35, color: '#ff00aa', color2: '#ff00aa', glow: 20, spin: -6 }), makeLayer('particles', { n: 130, color: '#00f0ff' }), makeLayer('text', { name: 'Song Title', text: '{Title}', y: 44, fz: 14, font: 'Orbitron', color: '#ffffff', glow: 15 })], { cam: 12, vig: 45, flash: 25 }],
    ['Avee Famous', 'Avee Cyberpunk Bars & Scope', [makeBackground('#010806', '#03140e'), makeLayer('bars', { name: 'Equalizer Bars', y: 82, n: 64, thick: 65, color: '#00ff9d', color2: '#00b8ff', glow: 16, mir: 'sym' }), makeLayer('scope', { name: 'Center Scope Wave', y: 45, thick: 26, color: '#00ff9d', glow: 15 }), makeLayer('text', { name: 'Track Display', text: '{ArtistOrTitle}', y: 28, fz: 13, font: 'Space Mono', color: '#00ff9d' })], { scan: 25, vig: 35 }],
    ['Avee Famous', 'Avee Lo-Fi Chill Vinyl', [makeBackground('#14120e', '#201a14'), makeLayer('ring', { name: 'Vinyl Disc Grooves', r0: 68, thick: 16, color: '#ff8a5c', color2: '#e6c280', glow: 8 }), makeLayer('circle', { n: 48, r0: 42, thick: 40, maxH: 40, color: '#e6c280', color2: '#ff8a5c' }), makeLayer('particles', { n: 60, color: '#ffc17a' }), makeLayer('text', { text: '{ArtistOrTitle}', y: 50, fz: 14, font: 'Playfair Display', fi: 1, color: '#faf4eb' })], { vig: 55, grain: 20 }],
    ['Avee Famous', 'Avee Retro 80s Synthwave', [makeBackground('#1a0033', '#ff5500', { grad: 'linear', gAng: 180 }), makeLayer('blocks', { name: 'LED Blocks', y: 84, n: 28, seg: 14, thick: 80, color: '#ffd000', color2: '#ff0066', glow: 14 }), makeLayer('wave', { y: 62, thick: 24, wfill: 1, color: '#ff00aa', color2: '#00f0ff', glow: 18 }), makeLayer('text', { text: '{Title}', y: 35, fz: 18, font: 'Teko', up: 1, color: '#ffd000', glow: 15 })], { scan: 20, flash: 20 }],
    ['Avee Famous', 'Avee Heavy Sub Drop', [makeBackground('#080002', '#1f0008'), makeLayer('shape', { name: '808 Reactor', shape: 'star', sides: 6, band: 'sub', f0: 20, f1: 80, sens: 180, color: '#ff2244', color2: '#ff8800', glow: 28 }), makeLayer('circle', { n: 64, r0: 55, thick: 60, band: 'bass', f0: 40, f1: 180, color: '#ff2244', glow: 20 }), makeLayer('particles', { n: 150, color: '#ff4400' }), makeLayer('text', { text: '{ArtistOrTitle}', y: 86, fz: 14, font: 'Bebas Neue', up: 1, color: '#ffffff' })], { cam: 22, flash: 45 }],
    // Original styles
    ['Minimal', 'Thin Lines', [makeBackground('#000', '#0a0a0a'), makeLayer('bars', { n: 90, thick: 18, y: 78, color: '#fff', color2: '#fff' })]],
    ['Classic', 'Classic Vertical', [makeBackground('#000', '#0b1018'), makeLayer('bars', { n: 64, y: 78, color: '#00e6a8', color2: '#6d8cff' })]],
    ['Waveform', 'Oscilloscope', [makeBackground('#001a08', '#000'), makeLayer('scope', { thick: 20, glow: 14, color: '#37ff7a', color2: '#37ff7a' })]],
    ['Neon', 'Neon Bars', [makeBackground('#05010f', '#12002a'), makeLayer('bars', { n: 56, y: 78, glow: 20, color: '#00f0ff', color2: '#ff2bd6' })]],
    ['Particles', 'Particle Burst', [makeBackground('#000', '#1a001a'), makeLayer('particles', { n: 120, color: '#ff00ff', color2: '#ff00ff' })]],
    ['Pro', 'Aurora', [makeBackground('#05080f', '#0b1a2a'), makeLayer('bars', { n: 72, y: 78, glow: 18, three: 1, color: '#00e6a8', color2: '#6d8cff', color3: '#ff6bd6', mir: 'mirror' })]]
  ];

  const SOCIAL_EXPORT_PRESETS = [
    { id: 'yt_169', name: 'YouTube Landscape', sub: '16:9 • 1080p • 60fps', ratio: '16:9', res: 1080, fps: 60, mbps: 12 },
    { id: 'tiktok_916', name: 'TikTok / Shorts', sub: '9:16 • 1080p • 60fps', ratio: '9:16', res: 1080, fps: 60, mbps: 10 },
    { id: 'ig_reels', name: 'Instagram Reels', sub: '9:16 • 1080p • 30fps', ratio: '9:16', res: 1080, fps: 30, mbps: 8 },
    { id: 'ig_square', name: 'Instagram Square', sub: '1:1 • 1080p • 30fps', ratio: '1:1', res: 1080, fps: 30, mbps: 6 },
    { id: 'ig_portrait', name: 'Instagram Portrait', sub: '4:5 • 1080p • 30fps', ratio: '4:5', res: 1080, fps: 30, mbps: 8 }
  ];

  const STARTER_TEMPLATES: any[] = [
    {
      id: 'edm_mainstage',
      title: 'EDM Mainstage',
      desc: 'Dual circular 360° reactor, sunburst spokes & 3D bass burst',
      layers: [
        makeBackground('#06020f', '#190333', { grad: 'radial' }),
        makeLayer('circle', { name: 'Cyan 360 Ring', n: 72, r0: 55, thick: 65, color: '#00f0ff', color2: '#ff00aa', glow: 22, spin: 2, peakCaps: 1 }),
        makeLayer('ring', { name: 'Inner Bass Disc', r0: 50, thick: 14, color: '#00f0ff', glow: 18 }),
        makeLayer('particles', { name: '3D Spark Burst', n: 130, pDepth: 120, pFov: 75, color: '#00f0ff', trail: 25 }),
        makeLayer('text', { name: 'Song Title', text: '{ArtistOrTitle}', y: 50, fz: 14, font: 'Orbitron', color: '#ffffff', glow: 12 })
      ],
      scene: { cam: 15, vig: 40, beatPunch: 40, beatBurst: 50 }
    },
    {
      id: 'trap_808_night',
      title: 'Trap 808 Night',
      desc: 'Mirrored dual equalizer bars, 808 sub kick punch & dark red mood',
      layers: [
        makeBackground('#0a0002', '#200008', { grad: 'radial' }),
        makeLayer('bars', { name: 'Mirrored Trap Bars', y: 50, n: 64, thick: 65, color: '#ff0044', color2: '#ff8800', glow: 20, dir: 'both', mir: 'mirror', peakCaps: 1 }),
        makeLayer('scope', { name: 'Sub Oscilloscope', y: 50, thick: 24, color: '#ff2244', glow: 18 }),
        makeLayer('particles', { name: 'Red Embers', n: 90, grav: -8, color: '#ff4400' }),
        makeLayer('text', { name: 'Track Header', text: '{Title}', y: 22, fz: 15, font: 'Bebas Neue', color: '#ffffff', glow: 10 })
      ],
      scene: { cam: 20, vig: 50, beatPunch: 60, beatFlash: 30 }
    },
    {
      id: 'lofi_midnight',
      title: 'Lo-Fi Chill Vinyl',
      desc: 'Warm analog vinyl rings, oscilloscope waveform & film dust',
      layers: [
        makeBackground('#14120e', '#221b14', { grad: 'linear', gAng: 180 }),
        makeLayer('ring', { name: 'Vinyl Disc Grooves', r0: 65, thick: 15, color: '#e6c280', color2: '#ff8a5c', glow: 6 }),
        makeLayer('wave', { name: 'Warm Lo-Fi Wave', y: 64, thick: 22, wfill: 1, color: '#ffaa66', color2: '#e6c280', glow: 10 }),
        makeLayer('particles', { name: 'Floating Dust', n: 60, speed: 0.8, color: '#ffd599' }),
        makeLayer('text', { name: 'Chill Vibes', text: '{ArtistOrTitle}', y: 44, fz: 14, font: 'Playfair Display', fi: 1, color: '#faf4eb' })
      ],
      scene: { vig: 60, grain: 25, scan: 15 }
    },
    {
      id: 'synthwave_1984',
      title: 'Synthwave 1984',
      desc: 'Neon LED equalizer blocks, retro magenta sun & grid horizon',
      layers: [
        makeBackground('#16002c', '#ff5500', { grad: 'linear', gAng: 180 }),
        makeLayer('blocks', { name: 'LED Hardware EQ', y: 82, n: 28, seg: 12, thick: 80, color: '#ffd000', color2: '#ff0066', glow: 16 }),
        makeLayer('shape', { name: 'Neon Sun', shape: 'circle', y: 45, maxH: 60, color: '#ff0066', color2: '#ffd000', glow: 28 }),
        makeLayer('text', { name: '80s Synth Header', text: '{Title}', y: 32, fz: 18, font: 'Teko', up: 1, color: '#ffd000', glow: 16 })
      ],
      scene: { scan: 20, vig: 30, beatFlash: 20 }
    },
    {
      id: 'dubstep_glitch',
      title: 'Dubstep Glitch',
      desc: 'Aggressive multi-ring reactor, violent kick flash & chromatic strobe',
      layers: [
        makeBackground('#020202', '#14001a'),
        makeLayer('multiring', { name: 'Tri-Ring Reactor', rings: 3, n: 64, r0: 48, thick: 65, color: '#ff00ff', color2: '#00ffff', glow: 26, spin: 6 }),
        makeLayer('particles', { name: 'Glitch Particles', n: 160, pDepth: 150, color: '#00ffaa', trail: 35 }),
        makeLayer('text', { name: 'Drop Notice', text: '{ArtistOrTitle}', y: 50, fz: 16, font: 'Righteous', color: '#ffffff', glow: 20 })
      ],
      scene: { cam: 25, flash: 50, beatFlash: 60, beatPunch: 75, beatHueShift: 40 }
    },
    {
      id: 'minimal_podcast',
      title: 'Podcast & Vocal',
      desc: 'Clean horizontal spectrum, centered album disc & typography',
      layers: [
        makeBackground('#121214', '#1e1e24'),
        makeLayer('image', { name: 'Album Disc', shape: 'circle', y: 42, maxH: 50, keepAspect: 1, cropFit: 1, blurBorder: 1, glow: 14 }),
        makeLayer('bars', { name: 'Vocal Spectrum', y: 76, n: 44, thick: 55, color: '#ffffff', color2: '#00e5c0', glow: 10, round: 30, peakCaps: 1 }),
        makeLayer('text', { name: 'Episode Title', text: '{ArtistOrTitle}', y: 64, fz: 13, font: 'Inter', fw: 700, color: '#ffffff' })
      ],
      scene: { vig: 25 }
    }
  ];

  let layers: any[] = [], scene = { ...SCENE_DEFAULTS }, userPresets = ls.get('av.presets', []), favorites = ls.get('av.favs', []), selected = 1, currentTab = 'lib', panelOpen = false, copyBuffer: any = null;

  const clone = (o: any) => JSON.parse(JSON.stringify(o, (k, v) => k[0] === '_' ? undefined : v));
  const normalizeLayer = (l: any) => ({ ...LAYER_DEFAULTS, ...l, rules: (l.rules || []).map((r: any) => ({ ...RULE_DEFAULTS, ...r })) });
  const RULE_DEFAULTS = { on: 1, src: 'bass', prop: 'sy', i0: 0, i1: 1, o0: 100, o1: 130, cv: 'linear', inv: 0, att: 60, rel: 15 };

  function setProject(newLayers: any[], newScene?: any) {
    layers = newLayers.map(normalizeLayer);
    scene = { ...SCENE_DEFAULTS, ...(newScene || {}) };
    selected = Math.min(layers.length - 1, 1);
  }

  // Load saved project or default preset (Avee Classic Trap Circle)
  {
    const saved = ls.get('av.proj', null);
    if (saved && Array.isArray(saved.layers) && saved.layers.length) setProject(saved.layers, saved.scene);
    else setProject(PRESETS[0][2]);
  }

  // Undo/Redo history
  let undoStack: string[] = [], redoStack: string[] = [], lastHistoryTime = 0, saveTimer: any;
  const snapshot = () => JSON.stringify({ L: clone(layers), SC: scene });

  function touch() {
    const now = performance.now();
    if (now - lastHistoryTime > 900) {
      undoStack.push(snapshot());
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
    }
    lastHistoryTime = now;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => ls.set('av.proj', { v: 3, layers: clone(layers), scene }), 400);
  }

  function restore(json: string) {
    const o = JSON.parse(json);
    layers = o.L.map(normalizeLayer);
    scene = o.SC;
    selected = clamp(selected, 0, layers.length - 1);
    renderAll();
    ls.set('av.proj', { v: 3, layers: clone(layers), scene });
  }

  const undo = () => { if (undoStack.length) { redoStack.push(snapshot()); restore(undoStack.pop()!); lastHistoryTime = 0; } };
  const redo = () => { if (redoStack.length) { undoStack.push(snapshot()); restore(redoStack.pop()!); lastHistoryTime = 0; } };

  // Rendering logic
  const EASING: Record<string, (x: number) => number> = {
    linear: x => x, ease_in: x => x * x, ease_out: x => 1 - (1 - x) * (1 - x), smooth: x => x * x * (3 - 2 * x), sqrt: Math.sqrt, step: x => x > .5 ? 1 : 0
  };

  function effectiveLayer(l: any, t: number) {
    l._smooth = l._smooth || [];
    l._particles = l._particles || [];
    l._history = l._history || [];
    l._randomVals = l._randomVals || [];
    const e = { ...l };

    for (const r of l.rules) {
      if (!r.on) continue;
      let x = smoothValues[r.src] || 0;
      x = clamp((x - r.i0) / Math.max(.001, r.i1 - r.i0), 0, 1);
      x = (EASING[r.cv] || EASING.linear)(x);
      if (r.inv) x = 1 - x;
      const old = r._v || 0;
      x = old + (x - old) * (x > old ? r.att / 100 : r.rel / 100);
      r._v = x;
      e[r.prop] = r.o0 + (r.o1 - r.o0) * x;
    }

    const amount = e.aa / 100, s = t * e.as;
    if (e.anim === 'pulse') { const k = 1 + (beatNow ? 0.35 : Math.sin(s * TAU) * 0.15) * amount; e.sx *= k; e.sy *= k; }
    else if (e.anim === 'bounce') e.y -= Math.abs(Math.sin(s * Math.PI)) * amount * 12;
    else if (e.anim === 'sway') e.x += Math.sin(s * TAU) * amount * 10;
    else if (e.anim === 'fade') e.op *= 1 - amount * (1 + Math.sin(s * TAU)) / 2;
    else if (e.anim === 'shake') { if (beatNow || Math.random() < 0.1) { e.x += (Math.random() - 0.5) * amount * 8; e.y += (Math.random() - 0.5) * amount * 8; } }
    else if (e.anim === 'spin') { e.rot += s * 36; }
    else if (e.anim === 'punch') { const p = beatNow ? 1.25 : 1 + (smoothValues.kick || 0) * 0.2 * amount; e.sx *= p; e.sy *= p; }
    else if (e.anim === 'wave') { e.y += Math.sin(s * TAU) * amount * 6; e.rot += Math.cos(s * TAU) * amount * 4; }

    return e;
  }

  function freqPosition(l: any, t: number) {
    const a = Math.max(20, l.f0), b = Math.max(a + 1, l.f1);
    if (l.fsc === 'linear') return a + (b - a) * t;
    if (l.fsc === 'mel') {
      const mel = (x: number) => 2595 * Math.log10(1 + x / 700);
      return 700 * (Math.pow(10, (mel(a) + (mel(b) - mel(a)) * t) / 2595) - 1);
    }
    return a * Math.pow(b / a, t);
  }

  function binValue(l: any, i: number, n: number) {
    let v = bandAverage(freqPosition(l, i / n), freqPosition(l, (i + 1) / n));
    const floor = S.floor / 100;
    v = clamp((v - floor) / (1 - floor), 0, 1);
    const old = l._smooth[i] || 0;
    v = old + (v - old) * (v > old ? l.att / 100 : l.rel / 100);
    l._smooth[i] = v;
    return clamp(v * l.sens / 100, 0, 1.5);
  }

  function fillFor(l: any, bx: number, by: number, bw: number, bh: number, t: number) {
    if (l.grad === 'solid') return l.color;
    const cx = bx + bw / 2, cy = by + bh / 2;
    const a = (l.gAng + l.gAnim * t) * Math.PI / 180;
    const d = Math.hypot(bw, bh) / 2;
    let g: any;
    if (l.grad === 'radial') g = ctx.createRadialGradient(cx, cy, 0, cx, cy, d);
    else if (l.grad === 'conic' && (ctx as any).createConicGradient) g = (ctx as any).createConicGradient(a, cx, cy);
    else g = ctx.createLinearGradient(cx - Math.cos(a) * d, cy - Math.sin(a) * d, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    const colors = l.three ? [l.color, l.color2, l.color3] : [l.color, l.color2];
    colors.forEach((c: string, i: number) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (r > 0 && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
  }

  function drawBars(e: any, W: number, H: number, t: number, horizontal: boolean) {
    if (e.shapePath === 'VerticalLine') horizontal = true;
    if (e.shapePath === 'Circle') return drawCircle(e, W, H, t, 0, 1);
    if (e.shapePath === 'Arc') { e.a0 = 0; e.a1 = 180; return drawCircle(e, W, H, t, 0, 1); }

    const span = (horizontal ? H : W) * .8;
    const len = (horizontal ? W : H) * .4 * e.maxH / 100 * (e.heightScale ? e.heightScale / 100 : 1);
    const n = e.n, slot = span / n;
    const barW = Math.max(1, slot * e.thick / 100);
    if (horizontal) ctx.rotate(Math.PI / 2);
    const both = e.dir === 'both', down = e.dir === 'down';
    ctx.fillStyle = fillFor(e, -span / 2, down ? 0 : -len, span, both ? len * 2 : len, t);
    const half = Math.ceil(n / 2), a0 = ctx.globalAlpha;

    if (e.peakCaps) {
      e._peaks = e._peaks || [];
      e._peakHolds = e._peakHolds || [];
    }

    for (let i = 0; i < n; i++) {
      const idx = e.flipInput ? n - 1 - i : i;
      const v = e.mir === 'sym'
        ? binValue(e, Math.min(half - 1, Math.floor(Math.abs(idx - (n - 1) / 2))), half)
        : binValue(e, idx, n);
      const h = Math.max(1, v * len * (1 - e.rvar / 100 * (e._randomVals[i] ?? (e._randomVals[i] = Math.random()))));
      const x = -span / 2 + i * slot + (slot - barW) / 2;
      const r = e.round * barW / 100;
      if (!down) roundRect(x, -h, barW, h, r);
      if (down || both) roundRect(x, 0, barW, h, r);
      if (e.mir === 'mirror') { ctx.globalAlpha = a0 * .35; roundRect(x, 0, barW, h * .6, r); ctx.globalAlpha = a0; }

      if (e.peakCaps) {
        const curPeak = e._peaks[i] || 0;
        const curHold = e._peakHolds[i] || 0;
        if (h >= curPeak) {
          e._peaks[i] = h;
          e._peakHolds[i] = e.peakHold || 18;
        } else if (curHold > 0) {
          e._peakHolds[i] = curHold - 1;
        } else {
          e._peaks[i] = Math.max(0, curPeak - (e.peakDecay || 2));
        }
        const capY = -e._peaks[i] - 3;
        ctx.fillStyle = e.color3 || e.color2 || '#ffffff';
        roundRect(x, capY, barW, Math.max(2, Math.min(4, barW * 0.4)), r);
        ctx.fillStyle = fillFor(e, -span / 2, down ? 0 : -len, span, both ? len * 2 : len, t);
      }
    }
  }

  function drawCircle(e: any, W: number, H: number, t: number, ringIndex: number, totalRings: number) {
    const R = Math.min(W, H) * .22;
    const n = e.n;
    const r0 = R * e.r0 / 100 * (1 + ringIndex * .55);
    const len = R * e.maxH / 100 * (totalRings > 1 ? .5 : 1);
    const lw = Math.max(1, TAU * Math.max(r0, 10) / n * e.thick / 100);
    const half = Math.ceil(n / 2);

    ctx.lineWidth = lw;
    ctx.strokeStyle = fillFor(e, -R * 2, -R * 2, R * 4, R * 4, t);

    for (let i = 0; i < n; i++) {
      const v = e.mir !== 'none'
        ? binValue(e, i < half ? i : n - 1 - i, half)
        : binValue(e, i + ringIndex * n, n * totalRings);
      const a = (e.a0 + (e.a1 - e.a0) * i / n) * Math.PI / 180;
      const c = Math.cos(a), s = Math.sin(a), l = v * len;
      let p = r0, q = r0 + l;
      if (e.odir === 'in') q = Math.max(0, r0 - l);
      else if (e.odir === 'both') { p = Math.max(0, r0 - l / 2); q = r0 + l / 2; }
      ctx.beginPath(); ctx.moveTo(c * p, s * p); ctx.lineTo(c * q, s * q); ctx.stroke();
    }
  }

  function drawWave(e: any, W: number, H: number, t: number, circular: boolean) {
    const R = Math.min(W, H) * .22;
    const w = W * .8;
    const p = Math.max(16, Math.min(timeData.length, e.n * 4));
    const A = (circular ? R * .4 : H * .2) * e.sens / 100 * e.maxH / 100;

    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.lineWidth = e.thick / 10 + 1;
    ctx.strokeStyle = ctx.fillStyle = fillFor(e, -w / 2, -H * .2, w, H * .4, t);

    const isStarburst = e.waveformStyle === 'starburst' || (e.ws === 'spiky' && circular);
    const isHeartbeat = e.waveformStyle === 'heartbeat';

    const point = (i: number, m: number) => {
      const k = Math.floor(i / p * (timeData.length - 1));
      let raw = (timeData[k] - 128) / 128;
      if (isHeartbeat) {
        raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1.6) * 1.8;
      }
      let v = raw * A * m;

      if (circular) {
        let baseR = R * e.r0 / 100;
        if (isStarburst && i % 2 === 1) {
          baseR += Math.abs(v) * 1.5 + R * 0.1;
        } else {
          baseR += v;
        }
        return [Math.cos(i / p * TAU - 1.571) * baseR, Math.sin(i / p * TAU - 1.571) * baseR];
      }
      return [-w / 2 + i / p * w, v];
    };

    if (e.type === 'scope') {
      const a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * .2; ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + w * i / 8, -H * .25); ctx.lineTo(-w / 2 + w * i / 8, H * .25); ctx.stroke(); }
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2, -H * .25 + H * .5 * i / 4); ctx.lineTo(w / 2, -H * .25 + H * .5 * i / 4); ctx.stroke(); }
      ctx.globalAlpha = a0; ctx.lineWidth = e.thick / 10 + 1;
    }

    const mirrorList = (e.mir !== 'none' || e.waveformStyle === 'mirror' || e.waveformStyle === 'ribbon') && !circular ? [1, -1] : [1];

    for (const m of mirrorList) {
      ctx.beginPath();
      for (let i = 0; i <= p; i++) {
        const [x, y] = point(i, m);
        if (e.ws === 'spiky' && !circular) { ctx.moveTo(x, 0); ctx.lineTo(x, y); }
        else i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (circular) ctx.closePath();
      if ((e.wfill || e.waveformStyle === 'ribbon') && !circular) {
        const a0 = ctx.globalAlpha;
        ctx.lineTo(w / 2, 0); ctx.lineTo(-w / 2, 0);
        ctx.globalAlpha = a0 * .35; ctx.fill(); ctx.globalAlpha = a0;
      }
      ctx.stroke();
    }
  }

  function drawPolygon(n: number, r: number, star: boolean) {
    ctx.beginPath();
    const m = star ? n * 2 : n;
    for (let i = 0; i < m; i++) {
      const a = i / m * TAU - 1.571;
      const q = star && i % 2 ? r * .45 : r;
      i ? ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q) : ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q);
    }
    ctx.closePath();
  }

  function drawHeart(r: number) {
    ctx.beginPath();
    const top = -r * 0.4;
    ctx.moveTo(0, top + r * 0.3);
    ctx.bezierCurveTo(0, top, -r, top, -r, top + r * 0.45);
    ctx.bezierCurveTo(-r, top + r * 0.8, 0, top + r * 1.2, 0, top + r * 1.5);
    ctx.bezierCurveTo(0, top + r * 1.2, r, top + r * 0.8, r, top + r * 0.45);
    ctx.bezierCurveTo(r, top, 0, top, 0, top + r * 0.3);
    ctx.closePath();
  }

  function drawLayer(l: any, W: number, H: number, t: number) {
    const e = effectiveLayer(l, t), u = H / 720;
    ctx.save();
    ctx.globalAlpha = clamp(e.op / 100, 0, 1);
    ctx.globalCompositeOperation = e.blend;

    if (e.blur || e.hue || e.bright !== 100 || e.contr !== 100 || e.sat !== 100) {
      ctx.filter = `hue-rotate(${e.hue}deg) brightness(${e.bright}%) contrast(${e.contr}%) saturate(${e.sat}%) blur(${e.blur * u}px)`;
    }

    if (e.type === 'bg') {
      ctx.fillStyle = fillFor(e, 0, 0, W, H, t);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }

    ctx.translate(e.x / 100 * W, e.y / 100 * H);
    ctx.rotate((e.rot + e.spin * t) * Math.PI / 180);
    ctx.scale(e.sx / 100, e.sy / 100);

    if (e.shOff) { ctx.shadowColor = '#000'; ctx.shadowOffsetY = e.shOff * u; ctx.shadowBlur = Math.max(e.glow, 6) * u; }
    else if (e.glow) { ctx.shadowColor = e.color; ctx.shadowBlur = e.glow * u; }

    const R = Math.min(W, H) * .22, ty = e.type;

    if (ty === 'bars') drawBars(e, W, H, t, false);
    else if (ty === 'barsh') drawBars(e, W, H, t, true);
    else if (ty === 'circle') drawCircle(e, W, H, t, 0, 1);
    else if (ty === 'multiring') { for (let k = 0; k < e.rings; k++) drawCircle(e, W, H, t, k, e.rings); }
    else if (ty === 'concentric') {
      ctx.strokeStyle = fillFor(e, -R * 2, -R * 2, R * 4, R * 4, t);
      for (let k = 0; k < e.rings; k++) {
        const v = binValue(e, k, e.rings);
        ctx.lineWidth = Math.max(1, u * e.thick / 10 * (1 + v * 2));
        ctx.beginPath();
        ctx.arc(0, 0, R * (.25 + .75 * (k + 1) / e.rings) * (1 + v * .15 * e.maxH / 100), 0, TAU);
        ctx.stroke();
      }
    }
    else if (ty === 'ring') {
      const v = binValue(e, 0, 1), p = 180;
      ctx.lineWidth = u * e.thick / 6 * (1 + v);
      ctx.strokeStyle = fillFor(e, -R * 2, -R * 2, R * 4, R * 4, t);
      ctx.beginPath();
      for (let i = 0; i <= p; i++) {
        const k = Math.floor(i / p * (timeData.length - 1));
        const r = R * (e.r0 / 100 + v * .25) + (timeData[k] - 128) / 128 * R * .3 * e.sens / 100;
        const a = i / p * TAU;
        i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.stroke();
    }
    else if (ty === 'pulse') {
      const P = e._particles;
      if (beatNow) P.push({ r: R * e.r0 / 100, a: 1 });
      ctx.strokeStyle = fillFor(e, -R * 3, -R * 3, R * 6, R * 6, t);
      ctx.lineWidth = Math.max(1, u * e.thick / 8);
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.r += R * .025 * (1 + smoothValues.bass * 2);
        p.a -= .018;
        if (p.a <= 0) { P.splice(i, 1); continue; }
        ctx.globalAlpha = e.op / 100 * p.a;
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.stroke();
      }
    }
    else if (ty === 'wave' || ty === 'scope') drawWave(e, W, H, t, false);
    else if (ty === 'wavec') drawWave(e, W, H, t, true);
    else if (ty === 'dots' || ty === 'lines' || ty === 'blocks') {
      const span = W * .8, len = H * .35 * e.maxH / 100 * (e.heightScale ? e.heightScale / 100 : 1), n = e.n, slot = span / n;
      ctx.fillStyle = ctx.strokeStyle = fillFor(e, -span / 2, -len, span, len, t);
      ctx.lineWidth = Math.max(1, slot * e.thick / 100 * .4);
      for (let i = 0; i < n; i++) {
        const idx = e.flipInput ? n - 1 - i : i;
        const rawV = binValue(e, idx, n);
        const minH = (e.minHeightScale || 0) / 100;
        const v = Math.max(minH, rawV);
        const x = -span / 2 + i * slot + slot / 2;
        if (ty === 'dots') { ctx.beginPath(); ctx.arc(x, -v * len, Math.max(2, slot * .35 * e.thick / 70), 0, TAU); ctx.fill(); }
        else if (ty === 'lines') { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -v * len); ctx.stroke(); ctx.beginPath(); ctx.arc(x, -v * len, ctx.lineWidth, 0, TAU); ctx.fill(); }
        else {
          const bh = len / e.seg, lit = Math.floor(v * e.seg);
          for (let b = 0; b < lit; b++) ctx.fillRect(x - slot * e.thick / 200, -(b + 1) * bh, slot * e.thick / 100, bh * .8);
        }
      }
    }
    else if (ty === 'grid') {
      const n = e.n, span = W * .8, cw = span / n, ch = H * .5 / e.seg, hist = e._history, row: number[] = [];
      for (let i = 0; i < n; i++) row.push(binValue(e, i, n));
      hist.unshift(row);
      if (hist.length > e.seg) hist.length = e.seg;
      ctx.fillStyle = fillFor(e, -span / 2, -H * .25, span, H * .5, t);
      const a0 = ctx.globalAlpha;
      hist.forEach((r: number[], y: number) => r.forEach((v: number, x: number) => {
        ctx.globalAlpha = a0 * clamp(v, 0, 1);
        ctx.fillRect(-span / 2 + x * cw, -H * .25 + y * ch, cw * .9, ch * .9);
      }));
      ctx.globalAlpha = a0;
    }
    else if (ty === 'particles') {
      const P = e._particles, v = binValue(e, 0, 1);
      const maxCount = e.countLimit || e.n || 120;
      const is3D = (e.pDepth || 0) > 0;
      const fov = e.pFov || 75;

      if (beatNow || (scene.beatBurst && beatNow) || (smoothValues.volume > .35 && Math.random() < .3)) {
        const spawnCount = beatNow ? Math.floor(maxCount * 0.25) : 3;
        for (let i = 0; i < spawnCount && P.length < maxCount * 2; i++) {
          const a = (e.randomVec !== 0) ? Math.random() * TAU : (e.vecAngle || 0) * Math.PI / 180;
          const spd = ((e.speed || 2) + Math.random() * (e.speedRand || 1.5)) * (.5 + v * 2) * u;
          P.push({
            x: (e.spawnArea === 'HorizontalLine') ? (Math.random() - .5) * W * .8 : 0,
            y: 0,
            z: is3D ? (Math.random() * (e.pDepth || 100)) : 0,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            vz: is3D ? ((Math.random() - .5) * spd * 1.5) : 0,
            l: 1,
            maxL: (e.life || 2.5) * 60,
            seed: Math.random() * 100
          });
        }
      }

      ctx.fillStyle = e.color || '#00e5c0';
      const a0 = ctx.globalAlpha;
      const trail = (e.trail || 0) * 0.1;

      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.vy += (e.grav || 0) * 0.05 * u;
        if (e.sideMag) {
          p.x += Math.sin((p.seed + t * (e.sideFreq || 1)) * TAU) * (e.sideMag * 0.05 * u);
        }
        p.x += p.vx;
        p.y += p.vy;
        if (is3D) p.z += p.vz;
        p.l -= 1 / p.maxL;
        if (p.l <= 0) { P.splice(i, 1); continue; }

        let scale = 1;
        if (is3D) {
          const depth = Math.max(10, fov + p.z);
          scale = fov / depth;
        }

        const size = Math.max(1, (e.thick / 10 + 2) * u * scale * (e.pScale || 1.0));
        ctx.globalAlpha = a0 * p.l;

        if (trail > 0) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * trail, p.y - p.vy * trail);
          ctx.strokeStyle = e.color || '#00e5c0';
          ctx.lineWidth = size;
          ctx.stroke();
        } else {
          ctx.fillRect(p.x, p.y, size, size);
          if (e.mirrorX) ctx.fillRect(-p.x, p.y, size, size);
          if (e.mirrorY) ctx.fillRect(p.x, -p.y, size, size);
        }
      }
    }
    else if (ty === 'shape') {
      const v = binValue(e, 0, 1), r = R * e.maxH / 100 * (.6 + v * .6);
      ctx.fillStyle = fillFor(e, -r, -r, r * 2, r * 2, t);
      ctx.strokeStyle = e.sc;
      ctx.lineWidth = e.sw * u;
      if (e.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }
      else if (e.shape === 'rect') { ctx.beginPath(); ctx.rect(-r, -r, r * 2, r * 2); }
      else if (e.shape === 'capsule') { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * .6, 0, 0, TAU); }
      else if (e.shape === 'heart') { drawHeart(r); }
      else drawPolygon(e.shape === 'triangle' ? 3 : e.sides, r, e.shape === 'star');
      ctx.fill();
      if (e.sw) ctx.stroke();
    }
    else if (ty === 'text') {
      const v = binValue(e, 0, 1);
      const currentTrackName = $('#tt') ? $('#tt').textContent : 'AUDIOVIS';
      let rawText = String(e.text || '{ArtistOrTitle}');
      rawText = rawText.replace(/\{ArtistOrTitle\}/gi, currentTrackName)
                       .replace(/\{Title\}/gi, currentTrackName)
                       .replace(/\{Artist\}/gi, 'Artist');
      const tx = e.up ? rawText.toUpperCase() : rawText;
      ctx.font = `${e.fi ? 'italic ' : ''}${e.fw} ${H * e.fz / 100 * (1 + v * .35)}px "${e.font}",sans-serif`;
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = e.ls * u + 'px';
      ctx.textAlign = e.al; ctx.textBaseline = 'middle';
      ctx.fillStyle = fillFor(e, -W * .3, -H * .1, W * .6, H * .2, t);
      ctx.fillText(tx, 0, 0);
      if (e.sw) { ctx.strokeStyle = e.sc; ctx.lineWidth = e.sw * u; ctx.strokeText(tx, 0, 0); }
    }
    else if (ty === 'blur_effect') {
      const blurRadius = (e.blurRadius || 18) * u;
      const mul = e.blurMultiplier || 1.0;
      const scales = [e.scale1 || 1.05, e.scale2 || 0, e.scale3 || 0].filter(s => s > 0);
      ctx.save();
      ctx.globalCompositeOperation = e.blendModeContent || 'screen';
      scales.forEach((sc, idx) => {
        ctx.save();
        ctx.scale(sc, sc);
        ctx.filter = `blur(${Math.max(2, blurRadius * mul * (idx + 1) * 0.7)}px)`;
        ctx.strokeStyle = e.color || '#00e5c0';
        ctx.lineWidth = 12 * u;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.65, 0, TAU);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
    else if (ty === 'image') {
      const v = binValue(e, 0, 1);
      const img = e._img;
      const w = W * 0.45 * (e.maxH / 100) * (1 + v * 0.2);
      const h = w * (e.keepAspect ? (img && img.width ? img.height / img.width : 1) : 1);

      if (e.blurBorder && img && img.width) {
        ctx.save();
        ctx.filter = 'blur(16px)';
        ctx.globalAlpha = (e.op / 100) * 0.55;
        ctx.drawImage(img, -w * 0.7, -h * 0.7, w * 1.4, h * 1.4);
        ctx.restore();
      }

      ctx.save();
      if (e.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) / 2, 0, TAU); ctx.clip(); }
      else if (e.shape === 'star') { drawPolygon(5, Math.min(w, h) / 2, true); ctx.clip(); }
      else if (e.shape === 'poly') { drawPolygon(6, Math.min(w, h) / 2, false); ctx.clip(); }
      else if (e.shape === 'heart') { drawHeart(Math.min(w, h) * 0.45); ctx.clip(); }

      if (img && img.width) {
        if (e.blurEnabled && e.blurRadius) ctx.filter = `blur(${e.blurRadius * u}px)`;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.fillStyle = e.genColor || '#12141c';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        if (!e.genNoText) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `800 ${Math.round(h * 0.12)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText($('#tt') ? $('#tt').textContent : 'AUDIOVIS', 0, 0);
        }
      }
      ctx.restore();

      if (e.glow) {
        ctx.strokeStyle = e.color || '#00e5c0';
        ctx.lineWidth = 3 * u;
        ctx.beginPath();
        if (e.shape === 'circle') ctx.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
        else ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function render(t: number) {
    const W = cv.width, H = cv.height, u = H / 720;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = scene.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    // Beat punch camera zoom
    const beatPunchZoom = (scene.beatPunch ? scene.beatPunch / 100 : 0) * smoothValues.beat * 0.14;
    const zoom = 1 + smoothValues.bass * scene.cam / 100 + beatPunchZoom;
    ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);

    // Beat Strobe Hue Shift
    if (scene.beatHueShift && smoothValues.beat > 0.05) {
      const shift = Math.floor(beatCount * 18 * (scene.beatHueShift / 100)) % 360;
      ctx.filter = `hue-rotate(${shift}deg)`;
    }

    layers.forEach(l => { if (l.vis) drawLayer(l, W, H, t); });
    ctx.restore();

    if (scene.vig) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${scene.vig / 100})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (scene.scan) {
      ctx.fillStyle = `rgba(0,0,0,${scene.scan / 100 * .5})`;
      for (let y = 0; y < H; y += 4 * u) ctx.fillRect(0, y, W, u);
    }
    if (scene.grain) {
      for (let i = 0; i < scene.grain * 8; i++) {
        ctx.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.2)';
        ctx.fillRect(Math.random() * W, Math.random() * H, 2 * u, 2 * u);
      }
    }
    const flashLevel = Math.max(scene.flash || 0, scene.beatFlash || 0);
    if (flashLevel && smoothValues.beat > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${smoothValues.beat * flashLevel / 100 * .55})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Avee Intro / Outro Screen Fades
    if (audioPlayer.duration > 0 && !audioPlayer.paused) {
      const cur = audioPlayer.currentTime;
      const dur = audioPlayer.duration;
      const blendMode = (scene.introBlend === 'normal' || !scene.introBlend ? 'source-over' : scene.introBlend) as GlobalCompositeOperation;
      if (scene.introFadeDur > 0 && cur < scene.introFadeDur) {
        const progress = 1 - (cur / scene.introFadeDur);
        ctx.save();
        ctx.globalAlpha = clamp(progress, 0, 1);
        ctx.globalCompositeOperation = blendMode;
        ctx.fillStyle = scene.introFadeColor || '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      if (scene.outroFadeDur > 0 && cur > (dur - scene.outroFadeDur)) {
        const progress = 1 - ((dur - cur) / scene.outroFadeDur);
        ctx.save();
        ctx.globalAlpha = clamp(progress, 0, 1);
        ctx.globalCompositeOperation = blendMode;
        ctx.fillStyle = scene.introFadeColor || '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    if (!recorder) {
      ctx.lineWidth = u;
      if (S.guides) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath();
        ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
        ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
        for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(W * f, 0); ctx.lineTo(W * f, H); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); }
        ctx.strokeRect(W * .05, H * .05, W * .9, H * .9);
        ctx.stroke();
      }
      const l = layers[selected];
      if (l && l.type !== 'bg') {
        const x = l.x / 100 * W, y = l.y / 100 * H, s = 10 * u;
        ctx.strokeStyle = '#00e6a8';
        ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
        ctx.stroke();
      }
    }
  }

  function getDimensions() {
    let w, h;
    if (S.ratio === 'custom') { w = S.cw; h = S.ch; }
    else {
      const [a, b] = S.ratio.split(':').map(Number);
      if (a >= b) { h = S.res; w = h * a / b; }
      else { w = S.res; h = w * b / a; }
    }
    return [Math.round(w / 2) * 2, Math.round(h / 2) * 2];
  }

  function sizeCanvas(full?: boolean) {
    const [w, h] = getDimensions();
    const q = full ? 1 : S.pq / 100;
    cv.width = Math.max(2, Math.round(w * q / 2) * 2);
    cv.height = Math.max(2, Math.round(h * q / 2) * 2);
    if ($('#res')) $('#res').textContent = w + '×' + h;
    const info = $('#xinfo');
    if (info) {
      const duration = (S.t1 > 0 ? Math.min(S.t1, audioPlayer.duration || 0) : audioPlayer.duration || 0) - S.t0;
      info.textContent = `Output ${w}×${h} at ${S.xfps} fps` + (duration > 0 ? `, ${fmt(duration)}, about ${(duration * (S.mbps + S.abr / 1000) / 8).toFixed(1)} MB` : '');
    }
  }

  let peaks: number[] = [], beatTimes: number[] = [];
  function analyzeBuffer(b: AudioBuffer) {
    const d = b.getChannelData(0), N = 500, step = Math.max(1, Math.floor(d.length / N));
    peaks = [];
    for (let i = 0; i < N; i++) {
      let m = 0;
      for (let j = i * step; j < (i + 1) * step && j < d.length; j += 8) m = Math.max(m, Math.abs(d[j]));
      peaks.push(m);
    }
    const win = Math.floor(b.sampleRate * .02), n = Math.floor(d.length / win), energy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < win; j += 4) { const x = d[i * win + j] || 0; s += x * x; }
      energy[i] = Math.sqrt(s / (win / 4));
    }
    beatTimes = [];
    let last = -99;
    for (let i = 8; i < n; i++) {
      let avg = 0;
      for (let j = i - 8; j < i; j++) avg += energy[j];
      avg /= 8;
      if (energy[i] > avg * 1.5 && energy[i] > .05 && i - last > 14) { beatTimes.push(i * .02); last = i; }
    }
  }

  function drawWaveform() {
    const c = $('#wf') as HTMLCanvasElement;
    if (!c) return;
    const rect = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    c.width = Math.max(10, rect.width * dpr);
    c.height = Math.max(10, rect.height * dpr);
    const x = c.getContext('2d')!, W = c.width, H = c.height;
    const cs = getComputedStyle(document.documentElement);
    x.clearRect(0, 0, W, H);
    if (!peaks.length) return;
    x.fillStyle = cs.getPropertyValue('--dm');
    peaks.forEach((p, i) => {
      const h = Math.max(1, p * H * .9);
      x.fillRect(i / peaks.length * W, (H - h) / 2, Math.max(1, W / peaks.length - 1), h);
    });
    x.fillStyle = cs.getPropertyValue('--ac');
    const dur = audioPlayer.duration;
    beatTimes.forEach(t => x.fillRect(t / dur * W, 0, 1, H * .2));
  }

  const AUDIO_EXT = /\.(mp3|wav|flac|aac|ogg|oga|opus|m4a|mp4|weba|webm|aif|aiff)$/i;
  function addFiles(arr: any[], bufs: any[]) {
    const valid: any[] = [];
    arr.forEach((f, i) => {
      if (/^(audio|video)/.test(f.type || '') || AUDIO_EXT.test(f.name)) { f._ab = bufs[i]; valid.push(f); }
    });
    if (!valid.length) { toast('No supported audio files in that selection', 'err'); return; }
    files.push(...valid);
    renderQueue();
    if (currentIndex < 0) loadTrack(0);
    else toast('Added ' + valid.length + ' track(s)', 'ok');
  }

  async function loadTrack(i: number, autoPlay?: boolean) {
    const f = files[i];
    if (!f) return false;
    if (!initAudio()) return false;
    currentIndex = i;
    renderQueue();
    const token = ++loadToken;
    $('#tt').textContent = 'Decoding ' + f.name + '...';
    try {
      await audioCtx!.resume();
      let ab = await f._ab;
      if (!ab) ab = await f.arrayBuffer();
      const buf = await new Promise<AudioBuffer>((res, rej) => { const p = audioCtx!.decodeAudioData(ab.slice(0), res, rej); if (p && (p as any).then) (p as any).then(res, rej); });
      if (token !== loadToken) return false;
      audioPlayer.stop();
      audioPlayer.buffer = buf;
      audioPlayer.offset = 0;
      let peak = 0;
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j += 16) peak = Math.max(peak, Math.abs(d[j]));
      audioPlayer.norm = S.norm && peak > 0 ? .9 / peak : 1;
      applyAudioSettings();
      analyzeBuffer(buf);
      $('#tt').textContent = f.name;
      drawWaveform();
      sizeCanvas();
      if (autoPlay !== false) audioPlayer.play();
      return true;
    } catch (e) {
      if (token === loadToken) {
        $('#tt').textContent = 'Cannot play ' + f.name;
        toast('Could not decode file. Try MP3, WAV or OGG.', 'err');
      }
      return false;
    }
  }

  function renderQueue() {
    const q = $('#queue');
    if (!q) return;
    const search = ($('#qs')?.value || '').toLowerCase();
    q.innerHTML = files.length ? files.map((f, i) =>
      f.name.toLowerCase().includes(search)
        ? `<div class="it ${i === currentIndex ? 'sl' : ''}"><button data-act="qsel" data-i="${i}">${esc(f.name)}</button><button data-act="qrm" data-i="${i}"><svg class="i" style="width:16px;height:16px"><use href="#i-trash"/></svg></button></div>`
        : ''
    ).join('') : '<div class="dm">No tracks loaded yet. Tap Choose audio files above to load your music.</div>';
  }

  function nextTrack(dir: number) {
    if (!files.length) return;
    let i;
    if (S.sh && dir > 0) i = Math.floor(Math.random() * files.length);
    else i = currentIndex + dir;
    if (i >= files.length) { if (S.rp === 'all') i = 0; else return; }
    if (i < 0) i = 0;
    loadTrack(i);
  }

  audioPlayer.onplay = () => $$('#pl,#pl2').forEach(b => b.innerHTML = icon('pause'));
  audioPlayer.onpause = () => $$('#pl,#pl2').forEach(b => b.innerHTML = icon('play'));
  audioPlayer.onended = () => {
    if (recorder) return finishRecording();
    if (S.rp === 'one') { audioPlayer.offset = 0; audioPlayer.play(); }
    else nextTrack(1);
  };

  let presetFilter = 'All';
  function allPresets() {
    return [
      ...PRESETS.map(p => ({ cat: p[0], name: p[1], layers: p[2], scene: p[3] })),
      ...userPresets.map((p: any, i: number) => ({ cat: 'Mine', name: p.name, layers: p.layers, scene: p.scene, u: i }))
    ];
  }

  function renderPresets() {
    const el = $('#plist');
    if (!el) return;
    const search = ($('#ps')?.value || '').toLowerCase();
    const list = allPresets().map((p, i) => ({ ...p, i })).filter(p =>
      p.name.toLowerCase().includes(search) && (presetFilter === 'All' || (presetFilter === 'Favorites' ? favorites.includes(p.name) : presetFilter === p.cat))
    ).sort((a, b) => (favorites.includes(b.name) ? 1 : 0) - (favorites.includes(a.name) ? 1 : 0));

    el.innerHTML = list.map(p =>
      `<div class="it"><button data-act="apply" data-i="${p.i}">${esc(p.name)} <span class="dm" style="font-weight:500;margin-left:4px">${p.cat}</span></button><button data-act="fav" data-i="${p.i}"><svg class="i" style="width:18px;height:18px;${favorites.includes(p.name) ? 'fill:var(--ac);stroke:var(--ac)' : ''}"><use href="#i-pre"/></svg></button>${p.u != null ? `<button class="dg" data-act="delp" data-i="${p.u}"><svg class="i" style="width:16px;height:16px"><use href="#i-trash"/></svg></button>` : ''}</div>`
    ).join('') || '<div class="dm">No presets match.</div>';
  }

  const BLEND_MODES = ['source-over', 'lighter', 'screen', 'multiply', 'overlay', 'darken', 'lighten', 'color-dodge', 'difference', 'exclusion', 'hard-light', 'soft-light'];
  const FONTS = ['Archivo', 'Inter', 'Roboto', 'Montserrat', 'Oswald', 'Bebas Neue', 'Anton', 'Poppins', 'Playfair Display', 'Lobster', 'Pacifico', 'Orbitron', 'Audiowide', 'Righteous', 'Press Start 2P', 'Bungee', 'Permanent Marker', 'Caveat', 'Dancing Script', 'Abril Fatface', 'Russo One', 'Teko', 'Space Mono', 'Cinzel', 'Raleway'];
  const icon = (n: string) => `<svg class="i"><use href="#i-${n}"/></svg>`;

  const SELECT_OPTIONS: Record<string, string[]> = {
    font: FONTS,
    al: ['left', 'center', 'right'],
    blend: BLEND_MODES,
    dir: ['up', 'down', 'both'],
    odir: ['out', 'in', 'both'],
    mir: ['none', 'mirror', 'sym'],
    ws: ['line', 'spiky'],
    shape: ['circle', 'rect', 'triangle', 'poly', 'star', 'capsule', 'heart'],
    mask: ['none', 'circle'],
    band: ['custom', 'all', ...Object.keys(FREQ_BANDS)],
    fsc: ['log', 'linear', 'mel'],
    grad: ['solid', 'linear', 'radial', 'conic'],
    anim: ['none', 'pulse', 'bounce', 'sway', 'fade', 'shake', 'spin', 'punch', 'wave'],
    shapePath: ['HorizontalLine', 'VerticalLine', 'Circle', 'Arc', 'Ellipse', 'SidedPolygon', 'Letter'],
    segment1: ['Bars', 'Line', 'Dots', 'Blocks'],
    segment2: ['None', 'Bars', 'Line', 'Dots', 'Blocks'],
    maskMode: ['alpha', 'luminance', 'inverted'],
    blendModeContent: ['normal', 'screen', 'overlay', 'lighter', 'color-dodge'],
    spawnArea: ['Rectangle', 'HorizontalLine', 'Circle', 'Point'],
    introBlend: ['normal', 'screen', 'multiply', 'add', 'overlay'],
    sampleProvider: ['Spectrum', 'Waveform', 'Internal', 'Mic']
  };

  const BAR_TYPES = 'bars barsh circle multiring dots lines blocks grid concentric';
  const AUDIO_TYPES = BAR_TYPES + ' ring pulse particles shape text image blur_effect';

  const FIELD_GROUPS: any[] = [
    ['Transform', [
      ['x', 'X %', 'r', 0, 100, .1, '!bg'], ['y', 'Y %', 'r', 0, 100, .1, '!bg'],
      ['sx', 'Scale X', 'r', 5, 400, 1, '!bg'], ['sy', 'Scale Y', 'r', 5, 400, 1, '!bg'],
      ['uni', 'Uniform scale', 'k', 0, 0, 0, '!bg'],
      ['rot', 'Rotation', 'r', -180, 180, 1, '!bg'], ['spin', 'Spin °/s', 'r', -180, 180, 1, '!bg'],
      ['op', 'Opacity', 'r', 0, 100, 1, '*'], ['blend', 'Blend', 's', 0, 0, 0, '*']
    ]],
    ['Geometry', [
      ['n', 'Count', 'r', 2, 256, 1, BAR_TYPES + ' wave wavec scope particles'],
      ['thick', 'Thickness', 'r', 5, 100, 1, BAR_TYPES + ' ring pulse wave wavec scope particles'],
      ['round', 'Corner %', 'r', 0, 50, 1, 'bars barsh'],
      ['rvar', 'Random variation', 'r', 0, 100, 1, 'bars barsh'],
      ['maxH', 'Length / size %', 'r', 5, 200, 1, BAR_TYPES + ' ring wave wavec scope shape image'],
      ['r0', 'Inner radius %', 'r', 0, 95, 1, 'circle multiring concentric ring pulse wavec'],
      ['a0', 'Start angle', 'r', -180, 360, 1, 'circle multiring'],
      ['a1', 'End angle', 'r', -180, 540, 1, 'circle multiring'],
      ['rings', 'Rings', 'r', 1, 8, 1, 'multiring concentric'],
      ['seg', 'Segments / rows', 'r', 2, 32, 1, 'blocks grid'],
      ['dir', 'Direction', 's', 0, 0, 0, 'bars barsh'],
      ['odir', 'Growth', 's', 0, 0, 0, 'circle multiring'],
      ['mir', 'Mirror', 's', 0, 0, 0, 'bars barsh circle multiring wave scope'],
      ['ws', 'Wave style', 's', 0, 0, 0, 'wave scope'],
      ['wfill', 'Wave fill', 'k', 0, 0, 0, 'wave'],
      ['shape', 'Shape', 's', 0, 0, 0, 'shape'],
      ['sides', 'Sides', 'r', 3, 12, 1, 'shape'],
      ['text', 'Text', 't', 0, 0, 0, 'text'],
      ['fz', 'Font size', 'r', 2, 60, .5, 'text'],
      ['font', 'Font', 's', 0, 0, 0, 'text'],
      ['fw', 'Weight', 'r', 100, 900, 100, 'text'],
      ['fi', 'Italic', 'k', 0, 0, 0, 'text'],
      ['up', 'Uppercase', 'k', 0, 0, 0, 'text'],
      ['ls', 'Letter spacing', 'r', -5, 40, .5, 'text'],
      ['al', 'Align', 's', 0, 0, 0, 'text'],
      ['sw', 'Outline', 'r', 0, 20, .5, 'text shape'],
      ['sc', 'Outline colour', 'c', 0, 0, 0, 'text shape'],
      ['mask', 'Mask', 's', 0, 0, 0, 'image'],
      ['img', 'Image', 'f', 0, 0, 0, 'image']
    ]],
    ['Avee Segments / Bars', [
      ['shapePath', 'Shape Path', 's', 0, 0, 0, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['segment1', 'Segment 1 (Renderer)', 's', 0, 0, 0, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['segment2', 'Segment 2 (Overlay)', 's', 0, 0, 0, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['peakCaps', 'Peak Caps', 'k', 0, 0, 0, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['peakHold', 'Peak Hold (frames)', 'r', 0, 60, 1, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['peakDecay', 'Peak Decay (speed)', 'r', 0.5, 10, 0.5, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['flipInput', 'Flip input start/end', 'k', 0, 0, 0, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['heightScale', 'Height scale %', 'r', 10, 300, 1, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['minHeightScale', 'Min height %', 'r', 0, 50, 1, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['colorBlendOffset', 'Color blend offset', 'r', -100, 100, 1, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['softness', 'Softness / Smoothing', 'r', 0, 100, 1, 'bars barsh circle multiring dots lines blocks grid wave scope'],
      ['reactionDelay', 'Reaction delay (frames)', 'r', 0, 10, 1, 'bars barsh circle multiring dots lines blocks grid wave scope']
    ]],
    ['Avee Image & Mask', [
      ['shape', 'Image shape', 's', 0, 0, 0, 'image'],
      ['cropFit', 'Crop to fit', 'k', 0, 0, 0, 'image'],
      ['keepAspect', 'Keep aspect ratio', 'k', 0, 0, 0, 'image'],
      ['blurBorder', 'Blurred border background', 'k', 0, 0, 0, 'image'],
      ['maskMode', 'Mask mode', 's', 0, 0, 0, 'image'],
      ['colorKeyEnabled', 'Color key enabled', 'k', 0, 0, 0, 'image'],
      ['autoDetectColorKey', 'Auto detect key color', 'k', 0, 0, 0, 'image'],
      ['colorKey', 'Transparency color key', 'c', 0, 0, 0, 'image'],
      ['transparencyStrength', 'Transparency boost %', 'r', 0, 200, 1, 'image'],
      ['opacityStrength', 'Opacity boost %', 'r', 0, 200, 1, 'image'],
      ['blurEnabled', 'Enable blur', 'k', 0, 0, 0, 'image'],
      ['blurRadius', 'Blur radius', 'r', 0, 40, 1, 'image'],
      ['animSpeed', 'Animation speed (GIF/pulse)', 'r', 0, 5, .1, 'image'],
      ['genShiftHue', 'Default art hue shift', 'r', -180, 180, 1, 'image'],
      ['genNoText', 'Hide default text', 'k', 0, 0, 0, 'image'],
      ['genForce', 'Force default art', 'k', 0, 0, 0, 'image'],
      ['genColor', 'Default art color', 'c', 0, 0, 0, 'image']
    ]],
    ['Avee Blur Effect', [
      ['blendModeContent', 'Blend mode content', 's', 0, 0, 0, 'blur_effect'],
      ['blurMultiplier', 'Blur multiplier', 'r', .5, 4, .1, 'blur_effect'],
      ['showUnblurred', 'Show unblurred content', 'k', 0, 0, 0, 'blur_effect'],
      ['showUnblurredUnder', 'Show content under blur', 'k', 0, 0, 0, 'blur_effect'],
      ['scale1', '1 Layer Scale', 'r', .5, 2.5, .05, 'blur_effect'],
      ['scale2', '2 Layer Scale', 'r', 0, 2.5, .05, 'blur_effect'],
      ['scale3', '3 Layer Scale', 'r', 0, 2.5, .05, 'blur_effect']
    ]],
    ['Avee 3D Particles', [
      ['countLimit', 'Count limit', 'r', 10, 500, 5, 'particles'],
      ['mirrorX', 'Mirror X', 'k', 0, 0, 0, 'particles'],
      ['mirrorY', 'Mirror Y', 'k', 0, 0, 0, 'particles'],
      ['pDepth', 'Perspective Depth (3D)', 'r', 0, 300, 5, 'particles'],
      ['pFov', 'Perspective FOV', 'r', 30, 120, 1, 'particles'],
      ['spawnArea', 'Spawn area', 's', 0, 0, 0, 'particles'],
      ['vertOrient', 'Vertical orientation', 'k', 0, 0, 0, 'particles'],
      ['vecAngle', 'Vector angle °', 'r', -180, 180, 1, 'particles'],
      ['vecAngleZ', 'Vector angle Z °', 'r', -180, 180, 1, 'particles'],
      ['randomVec', 'Random vector instead', 'k', 0, 0, 0, 'particles'],
      ['vecRelCenter', 'Vector relative to center', 'k', 0, 0, 0, 'particles'],
      ['pScale', 'Particle scale', 'r', .1, 5, .1, 'particles'],
      ['trail', 'Trail length (motion blur)', 'r', 0, 100, 1, 'particles'],
      ['fadeTime', 'Fade in/out time', 'r', .1, 4, .1, 'particles'],
      ['velAngle', 'Align to velocity angle', 'k', 0, 0, 0, 'particles'],
      ['sizeAspect', 'Size aspect ratio', 'r', .2, 4, .1, 'particles'],
      ['startSize', 'Start size', 'r', 1, 40, 1, 'particles'],
      ['fadeInSize', 'Fade in size', 'r', 1, 50, 1, 'particles'],
      ['endSize', 'End size', 'r', 1, 40, 1, 'particles'],
      ['endSizeRand', 'End size random', 'r', 0, 20, 1, 'particles'],
      ['speed', 'Speed', 'r', .1, 10, .1, 'particles'],
      ['speedRand', 'Speed random', 'r', 0, 8, .1, 'particles'],
      ['life', 'Lifetime s', 'r', .5, 8, .1, 'particles'],
      ['grav', 'Gravity', 'r', -50, 50, 1, 'particles'],
      ['sideFreq', 'Side wave frequency', 'r', 0, 10, .2, 'particles'],
      ['sideMag', 'Side wave magnitude', 'r', 0, 40, 1, 'particles']
    ]],
    ['Frequency', [
      ['band', 'Range preset', 's', 0, 0, 0, AUDIO_TYPES],
      ['f0', 'Min Hz', 'r', 20, 20000, 1, AUDIO_TYPES],
      ['f1', 'Max Hz', 'r', 20, 20000, 1, AUDIO_TYPES],
      ['fsc', 'Scale', 's', 0, 0, 0, AUDIO_TYPES],
      ['sens', 'Sensitivity', 'r', 0, 400, 1, '!bg'],
      ['att', 'Attack', 'r', 1, 100, 1, '!bg'],
      ['rel', 'Release', 'r', 1, 100, 1, '!bg']
    ]],
    ['Colour', [
      ['color', 'Colour', 'c', 0, 0, 0, '*'],
      ['color2', 'Colour 2', 'c', 0, 0, 0, '*'],
      ['three', 'Three stops', 'k', 0, 0, 0, '*'],
      ['color3', 'Colour 3', 'c', 0, 0, 0, '*'],
      ['grad', 'Gradient', 's', 0, 0, 0, '*'],
      ['gAng', 'Angle', 'r', 0, 360, 1, '*'],
      ['gAnim', 'Rotate °/s', 'r', -180, 180, 1, '*']
    ]],
    ['Effects', [
      ['glow', 'Glow', 'r', 0, 80, 1, '*'],
      ['shOff', 'Drop shadow', 'r', 0, 40, 1, '!bg'],
      ['blur', 'Blur', 'r', 0, 30, .5, '*'],
      ['hue', 'Hue', 'r', -180, 180, 1, '*'],
      ['bright', 'Brightness', 'r', 0, 200, 1, '*'],
      ['contr', 'Contrast', 'r', 0, 200, 1, '*'],
      ['sat', 'Saturation', 'r', 0, 200, 1, '*']
    ]],
    ['Animation', [
      ['anim', 'Animation', 's', 0, 0, 0, '!bg'],
      ['as', 'Speed', 'r', .1, 8, .1, '!bg'],
      ['aa', 'Amount', 'r', 0, 100, 1, '!bg']
    ]]
  ];

  const PROP_RANGES: Record<string, [number, number]> = {
    x: [0, 100], y: [0, 100], sx: [5, 400], sy: [5, 400], rot: [-180, 180], op: [0, 100],
    thick: [5, 100], maxH: [5, 200], n: [2, 256], glow: [0, 80], blur: [0, 30],
    hue: [-180, 180], bright: [0, 200], contr: [0, 200], sat: [0, 200],
    sens: [0, 400], r0: [0, 95], fz: [2, 60], spin: [-180, 180]
  };

  const isVisibleForType = (filter: string, type: string) => filter === '*' || (filter === '!bg' ? type !== 'bg' : filter.split(' ').includes(type));
  const selectOptions = (arr: string[], val: string) => arr.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('');
  const rangeRow = (label: string, attr: string, min: number, max: number, step: number, val: any) =>
    `<div class="rg"><span>${label}</span><input type="range" ${attr} min="${min}" max="${max}" step="${step}" value="${val}"><input type="number" class="nm" ${attr} min="${min}" max="${max}" step="${step}" value="${val}"></div>`;

  const fieldHtml = (layer: any, field: any) => {
    const [key, label, kind, min, max, step] = field;
    const val = layer[key], attr = `data-k="${key}"`;
    if (kind === 'r') return rangeRow(label, attr, min, max, step, val);
    if (kind === 'k') return `<label class="f"><span>${label}</span><input type="checkbox" ${attr} ${val ? 'checked' : ''}></label>`;
    if (kind === 's') return `<label class="f"><span>${label}</span><select ${attr}>${selectOptions(SELECT_OPTIONS[key], val)}</select></label>`;
    if (kind === 'c') return `<div class="cr"><span>${label}</span><input type="color" ${attr} value="${val}"><input class="hx" ${attr} value="${val}" maxlength="7"></div>`;
    if (kind === 't') return `<label class="f"><span>${label}</span><input type="text" ${attr} value="${esc(val)}"></label>`;
    return `<label class="f"><span>${label}</span><input type="file" accept="image/*" data-img="1"></label>`;
  };

  let openSections: Record<string, any> = { Transform: 1 };
  function inspectorHtml() {
    const l = layers[selected];
    if (!l) return '<div class="dm">No layer selected.</div>';
    let h = `<div class="${l.lock ? 'lk' : ''}">
      <div class="it" style="margin-bottom:8px">
        <button style="pointer-events:none;color:var(--dm);font-weight:500;font-size:11px">Name</button>
        <input type="text" data-k="name" value="${esc(l.name)}" style="flex:2;min-height:40px;background:transparent;padding:0 14px;font-weight:600;font-size:13px;border-radius:0">
      </div>`;

    for (const [section, fields] of FIELD_GROUPS) {
      const visible = fields.filter((f: any) => isVisibleForType(f[6], l.type));
      if (!visible.length) continue;
      h += `<details data-sec="${section}" ${openSections[section] ? 'open' : ''}><summary>${section}<button data-act="rsts" data-sec="${section}" style="min-height:0;height:32px;width:32px;padding:0;background:transparent;border-radius:50%;color:var(--dm);display:flex;align-items:center;justify-content:center" aria-label="Reset"><svg class="i" style="width:18px;height:18px"><use href="#i-reset"/></svg></button></summary><div>${visible.map((f: any) => fieldHtml(l, f)).join('')}</div></details>`;
    }

    h += `<details data-sec="Reactive" ${openSections.Reactive ? 'open' : ''}><summary>Audio reactive mapping<button data-act="addrule" style="min-height:0;height:32px;width:32px;padding:0;background:transparent;border-radius:50%;color:var(--dm);display:flex;align-items:center;justify-content:center" aria-label="Add"><svg class="i" style="width:18px;height:18px"><use href="#i-plus"/></svg></button></summary><div>${l.rules.map((r: any, i: number) => ruleHtml(r, i)).join('') || '<div class="dm">Map any audio source to any property. Output replaces the property while the rule is on.</div>'}</div></details></div>`;
    return h;
  }

  function ruleHtml(r: any, i: number) {
    const attr = `data-r="${i}"`;
    const num = (key: string, label: string, min: number, max: number, step: number) =>
      `<label class="dm">${label}<input type="number" class="nm" ${attr} data-rk="${key}" min="${min}" max="${max}" step="${step}" value="${r[key]}"></label>`;
    return `<div class="rl"><div class="row">
      <label class="dm"><input type="checkbox" ${attr} data-rk="on" ${r.on ? 'checked' : ''}> On</label>
      <select ${attr} data-rk="src">${selectOptions(ANALYSIS_SOURCES, r.src)}</select>
      <select ${attr} data-rk="prop">${selectOptions(Object.keys(PROP_RANGES), r.prop)}</select>
      <button class="dg" data-act="delrule" data-i="${i}"><svg class="i" style="width:16px;height:16px"><use href="#i-trash"/></svg></button>
    </div><div class="row">
      ${num('i0', 'In min', 0, 1, .05)}${num('i1', 'In max', 0, 1, .05)}${num('o0', 'Out min', -400, 540, 1)}${num('o1', 'Out max', -400, 540, 1)}
    </div><div class="row">
      <select ${attr} data-rk="cv">${selectOptions(Object.keys(EASING), r.cv)}</select>
      <label class="dm"><input type="checkbox" ${attr} data-rk="inv" ${r.inv ? 'checked' : ''}> Invert</label>
      ${num('att', 'Attack', 1, 100, 1)}${num('rel', 'Release', 1, 100, 1)}
    </div></div>`;
  }

  function renderLayers() {
    $$('[data-act=lup],[data-act=ldn],[data-act=ldel]').forEach(b => {
      b.style.opacity = layers[selected] && layers[selected].lock ? .4 : '';
    });
    const el = $('#llist');
    if (el) el.innerHTML = layers.map((l, i) => i).reverse().map(i =>
      `<div class="it ${i === selected ? 'sl' : ''} ${layers[i].lock ? 'lkd' : ''}"><button data-act="lsel" data-i="${i}">${esc(layers[i].name || layers[i].type)} <span class="dm">${layers[i].type}</span></button><button data-act="lvis" data-i="${i}" aria-label="${layers[i].vis ? 'Hide' : 'Show'}"><svg class="i" style="width:18px;height:18px"><use href="#i-${layers[i].vis ? 'eye' : 'eye-off'}"/></svg></button><button data-act="llock" data-i="${i}" aria-label="${layers[i].lock ? 'Unlock' : 'Lock'}"><svg class="i" style="width:18px;height:18px"><use href="#i-${layers[i].lock ? 'lock' : 'unlock'}"/></svg></button></div>`
    ).join('') || '<div class="dm">No layers. Add one above.</div>';
  }

  function renderInspector() {
    const el = $('#insp');
    if (el) el.innerHTML = inspectorHtml();
  }

  const TAB_NAMES: Record<string, string> = { lib: 'Media', lay: 'Layers', pre: 'Presets', aud: 'Audio', scn: 'Scene', exp: 'Export' };
  const rangeSetting = (label: string, key: string, min: number, max: number, step: number) => rangeRow(label, `data-s="${key}"`, min, max, step, S[key]);
  const rangeScene = (label: string, key: string, min: number, max: number, step: number) => rangeRow(label, `data-c="${key}"`, min, max, step, (scene as any)[key]);
  const selectSetting = (label: string, key: string, opts: any[], numeric?: boolean) => `<label class="f"><span>${label}</span><select data-s="${key}" ${numeric ? 'data-n="1"' : ''}>${opts.map(o => `<option ${String(S[key]) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;

  function supportedFormats() {
    const c = [
      ['video/mp4;codecs=avc1,mp4a.40.2', 'MP4 H.264'],
      ['video/mp4;codecs=hvc1,mp4a.40.2', 'MP4 H.265'],
      ['video/webm;codecs=vp9,opus', 'WebM VP9'],
      ['video/webm;codecs=vp8,opus', 'WebM VP8'],
      ['video/webm;codecs=av1,opus', 'WebM AV1']
    ];
    return window.MediaRecorder ? c.filter(x => MediaRecorder.isTypeSupported(x[0])) : [];
  }

  const TAB_CONTENT: Record<string, () => string> = {
    lib: () => {
      const autosaved = ls.get('av.autosave', null);
      return `<div class="sec">Project & Templates</div>
      ${autosaved && autosaved.layers && autosaved.layers.length ? `
      <div class="recovery-banner">
        <span>⚡ Autosaved session from ${new Date(autosaved.time).toLocaleTimeString()}</span>
        <button class="pri" data-act="recover-autosave" style="padding:4px 10px;font-size:10px">Restore</button>
      </div>` : ''}
      
      <div class="row" style="margin-bottom:8px">
        <input type="text" id="proj-name-inp" value="${esc(S.projectName || 'My Visualizer Project')}" placeholder="Project name" style="flex:2">
        <button data-act="new-proj" title="New Blank Project">New</button>
        <button data-act="dup-proj" title="Duplicate Project">Duplicate</button>
      </div>

      <div class="sec">Project Aspect Ratio</div>
      <div class="aspect-bar">
        ${['16:9', '9:16', '1:1', '4:5', '21:9'].map(r => `
          <button class="aspect-btn ${S.ratio === r ? 'active' : ''}" data-act="set-aspect" data-r="${r}">${r}</button>
        `).join('')}
      </div>

      <button id="bmic" data-act="mic" style="margin-bottom:8px;font-weight:700">🎤 Use Live Microphone</button>
      <div class="sec">Import User Audio</div>
      <label class="btn" for="fi">Choose audio files</label>
      <input id="fi" class="hid" type="file" accept="audio/*,video/mp4,.mp3,.wav,.flac,.aac,.ogg,.oga,.opus,.m4a,.aif,.aiff,.weba" multiple>
      <label class="btn" for="fdr">Choose a folder (desktop browsers)</label>
      <input id="fdr" class="hid" type="file" webkitdirectory multiple>
      <div class="sec">Queue</div>
      <input id="qs" placeholder="Search tracks"><div id="queue"></div>
      <div class="sec">Sleep timer</div>
      <select id="slp"><option value="0">Off</option><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select>
      <div class="dm">Audio is decoded in memory, so very long files need RAM. Files stay on this device.</div>`;
    },

    lay: () => `<div class="row" style="margin-bottom:8px"><select id="ltype">${['bars', 'barsh', 'circle', 'multiring', 'concentric', 'ring', 'pulse', 'wave', 'wavec', 'scope', 'dots', 'lines', 'blocks', 'grid', 'particles', 'shape', 'text', 'image', 'blur_effect', 'bg'].map(t => `<option>${t}</option>`).join('')}</select><button class="pri" data-act="addlayer">Add layer</button></div>
      <div id="llist"></div>
      <div class="lay-tools">
        <button data-act="lup" aria-label="Move up"><svg class="i"><use href="#i-up"/></svg></button>
        <button data-act="ldn" aria-label="Move down"><svg class="i"><use href="#i-down"/></svg></button>
        <button data-act="ldup" aria-label="Duplicate"><svg class="i"><use href="#i-dup"/></svg></button>
        <button class="dg" data-act="ldel" aria-label="Delete"><svg class="i"><use href="#i-trash"/></svg></button>
      </div>
      <div class="lay-tools">
        <button data-act="cpy" aria-label="Copy props"><svg class="i"><use href="#i-copy"/></svg></button>
        <button data-act="pst" aria-label="Paste props"><svg class="i"><use href="#i-paste"/></svg></button>
        <button data-act="rstl" aria-label="Reset layer"><svg class="i"><use href="#i-reset"/></svg></button>
      </div>
      <div id="insp"></div>`,

    pre: () => `<input id="ps" placeholder="Search presets" style="margin-bottom:8px">
      <select id="pc" style="margin-bottom:8px">${['All', 'Favorites', 'Avee Famous', 'Mine', ...new Set(PRESETS.map(p => p[0]))].map(c => `<option ${c === presetFilter ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <div id="plist"></div>
      <button data-act="rand" style="margin-top:8px">Controlled random (from presets)</button>
      <div class="sec">Save current as</div>
      <div class="row"><input id="pn" placeholder="Preset name"><button class="pri" data-act="savep">Save</button></div>
      
      <div class="sec">Avee Player .viz & Project Template</div>
      ${embeddedAveeAssets.size ? `
      <div class="avee-card">
        <div class="avee-badge">★ Avee Template: ${esc(currentAveeTemplateName)}</div>
        <div class="dm">${embeddedAveeAssets.size} embedded assets included in template</div>
        <div class="asset-grid">
          ${Array.from(embeddedAveeAssets.entries()).slice(0, 4).map(([k, a]) => `<img src="${a.url}" class="asset-thumb" title="${k}" alt="${k}">`).join('')}
        </div>
      </div>` : ''}
      <textarea id="js" spellcheck="false"></textarea>
      <div class="row" style="margin-bottom:6px">
        <button data-act="jshow">Show</button>
        <button data-act="jload">Load</button>
        <button data-act="jsave">Save JSON</button>
      </div>
      <div class="row">
        <button class="pri" data-act="jsaveavee">Save Avee .viz (ZIP)</button>
      </div>
      <label class="btn" for="vzi" style="margin-top:8px">Import Avee .viz / ZIP / JSON file</label>
      <input id="vzi" class="hid" type="file" accept="*/*">
      <div class="dm">Supports both genuine Avee Player .viz (ZIP archive with scene.json and image assets) and AUDIOVIS templates.</div>`,

    aud: () => `
      <!-- Category 1: Master & Playback Controls -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🎚️</span>
            <span>Master & Playback Controls</span>
            <span class="cat-badge">Core</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          ${rangeSetting('Volume %', 'vol', 0, 100, 1)}
          ${rangeSetting('Preamp dB', 'pre', -12, 12, .5)}
          ${rangeSetting('Bass boost dB', 'bass', 0, 15, .5)}
          ${rangeSetting('Balance', 'bal', -100, 100, 1)}
          ${rangeSetting('Speed %', 'speed', 50, 150, 1)}
          <label class="f"><span>Normalise</span><input type="checkbox" data-s="norm"></label>
          <div class="row" style="margin-top:8px">
            <button class="pri" data-act="tap-tempo" id="btn-tap" style="flex:2">🥁 Tap Tempo (BPM)</button>
            <input type="number" id="inp-bpm" min="40" max="260" value="${Math.round(currentBpm || S.beat || 128)}" style="width:70px;text-align:center" title="Manual BPM">
          </div>
        </div>
      </details>

      <!-- Category 2: Waveform Rendering Styles (Visual Selector) -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🌊</span>
            <span>Waveform Rendering Styles</span>
            <span class="cat-badge">8 Modes</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          <div class="waveform-styles-grid">
            ${WAVEFORM_STYLES.map(st => `
              <div class="waveform-card ${(S.waveformStyle || 'circular') === st.id ? 'active' : ''}" data-act="apply-waveform-style" data-ws="${st.id}">
                <div class="wf-header">
                  <span class="wf-title">${esc(st.name)}</span>
                  <span class="wf-badge">${esc(st.badge)}</span>
                </div>
                <div class="wf-desc">${esc(st.desc)}</div>
                <div class="wf-preview-svg">${st.svg}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </details>

      <!-- Category 3: Avee Audio Provider (FFT Spectrum) -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">📊</span>
            <span>Audio Provider (FFT Spectrum)</span>
            <span class="cat-badge">DSP</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          ${selectSetting('Sample Provider', 'sampleProvider', ['Spectrum', 'Waveform', 'Internal', 'Mic'])}
          ${selectSetting('FFT size', 'fft', [512, 1024, 2048, 4096], true)}
          ${rangeSetting('Sample Out Count', 'sampleOutCount', 16, 512, 8)}
          <label class="f"><span>Mirror Samples</span><input type="checkbox" data-s="mirrorSamples"></label>
          ${selectSetting('Repeat Samples', 'repeatSamples', [1, 2, 3, 4], true)}
          ${rangeSetting('Start & End Gap %', 'startEndGap', 0, 20, 1)}
          ${rangeSetting('Smooth %', 'smooth', 0, 95, 1)}
          ${rangeSetting('Pre Smooth %', 'preSmooth', 0, 95, 1)}
          ${rangeSetting('Filter Radius', 'filterRadius', 0, 10, 1)}
          ${rangeSetting('Filter Strength', 'filterStrength', 0, 10, 1)}
          ${rangeSetting('A-Weighting (Silences Bass)', 'aWeight', 0, 100, 1)}
          ${rangeSetting('Output Multiplier', 'outputMultiplier', 0.2, 5.0, 0.1)}
          ${rangeSetting('Lower Hz', 'lowerHz', 20, 1000, 10)}
          ${rangeSetting('Higher Hz', 'higherHz', 2000, 22000, 250)}
          ${rangeSetting('Hz Linear Factor', 'hzLinearFactor', 0, 1.0, 0.05)}
          ${rangeSetting('Freq Shift', 'freqShift', -50, 50, 1)}
          ${rangeSetting('Noise floor', 'floor', 0, 60, 1)}
        </div>
      </details>

      <!-- Category 4: Avee Beat Range Box & Live Spectrum Monitor -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🥁</span>
            <span>Beat Detection Box & Monitor</span>
            <span class="cat-badge">Reactive</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          <canvas id="mon" height="90" style="width:100%;height:90px;background:var(--bg);border:1px solid var(--ln);border-radius:var(--r);margin-bottom:8px"></canvas>
          <div class="dm" style="margin-bottom:10px">Live AudioProvider spectrum with overlaid Avee Beat Range Box boundaries and transient signals.</div>
          ${rangeSetting('Beat Sensitivity %', 'beat', 110, 250, 1)}
          ${rangeSetting('Beat Smooth %', 'beatSmooth', 10, 95, 1)}
          ${rangeSetting('Beat Range Bar First (Left)', 'beatBarFirst', 0, 64, 1)}
          ${rangeSetting('Beat Range Bar Last (Right)', 'beatBarLast', 1, 128, 1)}
          ${rangeSetting('Beat Value Lower (Bottom)', 'beatValLower', 0.05, 0.6, 0.02)}
          ${rangeSetting('Beat Value Higher (Top)', 'beatValHigher', 0.2, 1.0, 0.02)}
        </div>
      </details>

      <!-- Category 5: 10-Band Graphic Equalizer -->
      <details class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🎛️</span>
            <span>10-Band Graphic Equalizer</span>
            <span class="cat-badge">Tone</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          ${EQ_FREQS.map((f, i) => rangeRow(f >= 1000 ? f / 1000 + 'k' : String(f), `data-eq="${i}"`, -12, 12, .5, S.eq[i])).join('')}
          <div class="row" style="margin-top:10px">
            <select id="eqp" style="flex:1"><option value="">EQ Preset</option>${Object.keys(EQ_PRESETS).map(k => `<option>${k}</option>`).join('')}</select>
            <button data-act="eqrst">Flat</button>
          </div>
        </div>
      </details>

      <!-- Category 6: DSP Sound Effects -->
      <details class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🌌</span>
            <span>Spatial Audio & DSP Effects</span>
            <span class="cat-badge">FX</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          ${rangeSetting('Reverb', 'rev', 0, 100, 1)}
          ${rangeSetting('Delay', 'dly', 0, 100, 1)}
          ${rangeSetting('Distortion', 'dist', 0, 100, 1)}
          <div class="row" style="margin-top:10px">
            <button data-act="rsta" style="width:100%">Reset All Audio Settings</button>
          </div>
        </div>
      </details>
    `,

    scn: () => `
      <!-- Category 1: Avee Composition & Fades -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🎬</span>
            <span>Avee Composition & Screen Fades</span>
            <span class="cat-badge">Composition</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          <label class="f"><span>Final Composition (Screen Output)</span><input type="checkbox" data-c="finalComp" ${scene.finalComp ? 'checked' : ''}></label>
          <label class="f"><span>Intro Blend Mode</span><select data-c="introBlend">${['normal', 'screen', 'multiply', 'add', 'overlay'].map(m => `<option ${m === scene.introBlend ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          ${rangeScene('Intro Fade Duration (s)', 'introFadeDur', 0, 10, .2)}
          ${rangeScene('Outro Fade Duration (s)', 'outroFadeDur', 0, 10, .2)}
          <label class="cr"><span>Intro Fade Color</span><input type="color" data-c="introFadeColor" value="${scene.introFadeColor || '#000000'}"><span></span></label>
        </div>
      </details>

      <!-- Category 2: Camera, Background & Optics -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">🎥</span>
            <span>Camera, Background & Optics</span>
            <span class="cat-badge">Optics</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          <label class="cr"><span>Scene Background Color</span><input type="color" data-c="bg" value="${scene.bg}"><span></span></label>
          ${rangeScene('Camera zoom', 'cam', 0, 30, .5)}
          ${rangeScene('Vignette darkness', 'vig', 0, 100, 1)}
          ${rangeScene('CRT Scanlines', 'scan', 0, 100, 1)}
          ${rangeScene('Film grain texture', 'grain', 0, 100, 1)}
          ${rangeScene('Beat screen flash', 'flash', 0, 100, 1)}
        </div>
      </details>

      <!-- Category 3: Modulation with Every Beat -->
      <details open class="cat-group">
        <summary class="cat-header">
          <div class="cat-title-wrap">
            <span class="cat-icon">⚡</span>
            <span>Modulation with Every Beat</span>
            <span class="cat-badge">Beat Reactive</span>
          </div>
          <span class="cat-chevron">▼</span>
        </summary>
        <div class="cat-body">
          ${rangeScene('Beat Camera Punch', 'beatPunch', 0, 100, 1)}
          ${rangeScene('Beat Screen Flash', 'beatFlash', 0, 100, 1)}
          ${rangeScene('Beat Strobe Hue Shift', 'beatHueShift', 0, 100, 1)}
          ${rangeScene('Beat Particle Burst', 'beatBurst', 0, 100, 1)}
          <div class="row" style="margin-top:10px">
            <button data-act="rstsc" style="width:100%">Reset Scene Settings</button>
          </div>
          <div class="dm" style="margin-top:8px">Camera zoom, screen flashes, and intro/outro fades are rendered directly to canvas and video export.</div>
        </div>
      </details>
    `,

    exp: () => {
      const fmts = supportedFormats();
      return `<div class="sec">☕ Android Java App & Code Converter</div>
      <div style="background:var(--p2);border:1px solid var(--ln);border-radius:var(--r);padding:10px 12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-weight:700;color:var(--tx)">Native Android Studio Project</span>
          <span style="font-size:9px;padding:2px 6px;border-radius:var(--rp);background:#18e08a22;color:#18e08a;font-weight:700">APK Ready</span>
        </div>
        <div class="dm">Convert your active visualizer layers into complete Android Java code or download a ready-to-build Android Studio project (.zip).</div>
        <div class="row">
          <button class="pri" data-act="java-convert" style="background:#d97757;flex:1">☕ Open Java Code & App Converter</button>
          <button data-act="java-download-zip" style="flex:1;background:var(--p2);border:1px solid var(--ln)">📦 Download Project (.zip)</button>
        </div>
      </div>

      <div class="sec">⚡ Social Media Export Presets</div>
      <div class="social-presets">
        ${SOCIAL_EXPORT_PRESETS.map((p, i) => `
          <button class="social-chip ${S.ratio === p.ratio && S.res === p.res ? 'active' : ''}" data-act="apply-social-preset" data-si="${i}">
            <span class="sc-title">${esc(p.name)}</span>
            <span class="sc-sub">${esc(p.sub)}</span>
          </button>
        `).join('')}
      </div>

      <div class="sec">Video Resolution & Framing</div>
      <div class="x-grid">
        <label>Aspect<select data-s="ratio">${['16:9', '9:16', '1:1', '4:5', '4:3', '21:9', 'custom'].map(o => `<option ${o === S.ratio ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
        <label>Short side<select data-s="res" data-n="1">${[360, 480, 720, 1080, 1440, 2160].map(o => `<option ${o == S.res ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      </div>
      ${S.ratio === 'custom' ? `<div class="row" style="margin-bottom:8px">${rangeSetting('Width', 'cw', 64, 4096, 2)}${rangeSetting('Height', 'ch', 64, 4096, 2)}</div>` : ''}
      <div class="x-grid">
        <label>FPS<select data-s="xfps" data-n="1">${[24, 25, 30, 50, 60].map(x => `<option ${x == S.xfps ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Format<select data-s="fmt" data-n="1">${fmts.map((x, i) => `<option value="${i}" ${i == S.fmt ? 'selected' : ''}>${x[1]}</option>`).join('') || '<option>Unsupported</option>'}</select></label>
      </div>
      <div style="background:var(--p2);border-radius:var(--r);padding:8px 14px;margin-bottom:8px">
        ${rangeSetting('Video Mbps', 'mbps', 1, 40, 1)}
        ${rangeSetting('Audio kbps', 'abr', 64, 320, 32)}
        ${rangeSetting('Start s', 't0', 0, 3600, 1)}
        ${rangeSetting('End s (0=end)', 't1', 0, 3600, 1)}
      </div>
      <div class="dm" id="xinfo"></div>
      <div class="row" style="margin-top:8px">
        <button class="pri" data-act="rec">Export Video</button>
        <button data-act="rpause">Pause</button>
        <button class="dg" data-act="rcancel">Cancel</button>
      </div>
      <div class="row" style="margin-top:6px">
        <button data-act="still" style="width:100%">📸 Capture High-Res Still PNG</button>
      </div>
      <progress id="xp" value="0" max="1" style="margin-top:8px"></progress>
      <div class="dm" id="xs">Real-time GPU encoding with native audio. Keep this tab open while exporting.</div>
      <div id="xout"></div>`;
    }
  };

  const EQ_PRESETS: Record<string, number[]> = {
    Bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
    Treble: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
    Vocal: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
    Rock: [4, 3, 2, 0, -1, 0, 2, 4, 5, 4],
    Pop: [2, 1, 0, 2, 3, 3, 2, 0, -1, -2],
    Electronic: [5, 4, 3, 1, 0, -1, 1, 3, 4, 5],
    Classical: [4, 3, 2, 1, 0, 0, 0, 1, 2, 3],
    Loud: [4, 4, 3, 3, 2, 2, 3, 3, 4, 4]
  };

  function renderAll() {
    renderQueue();
    renderLayers();
    renderInspector();
    renderPresets();
  }

  function showTab(t: string) {
    currentTab = t;
    if ($('#st')) $('#st').textContent = TAB_NAMES[t];
    if ($('#sb')) $('#sb').innerHTML = TAB_CONTENT[t]();
    $$('#nav button').forEach(b => b.classList.toggle('on', panelOpen && b.dataset.t === t));
    if (t === 'exp') sizeCanvas();
    renderAll();
  }

  function setPanelOpen(open: boolean) {
    panelOpen = open;
    $('#side')?.classList.toggle('open', open);
    if (open) showTab(currentTab);
    else $$('#nav button').forEach(b => b.classList.remove('on'));
    setTimeout(() => { drawWaveform(); }, 50);
  }

  // Recording
  let recordedChunks: Blob[] = [], exportCancelled = false, outputBlob: Blob | null = null, outputName = '', recorderPaused = false, wakeLock: any = null, droppedFrames = 0, lastRecFrameTime = 0;

  async function startRecording() {
    if (recorder) return;
    if (!audioPlayer.buffer) { toast('Load audio first', 'err'); return; }
    const fmts = supportedFormats();
    if (!fmts.length) { toast('This browser cannot record video', 'err'); return; }
    const fmt = fmts[S.fmt] || fmts[0];
    initAudio();
    sizeCanvas(true);
    await (document.fonts && document.fonts.ready);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { wakeLock = await (navigator as any).wakeLock?.request('screen'); } catch (e) {}
    droppedFrames = 0;
    lastRecFrameTime = 0;
    let stream: MediaStream;
    try { stream = (cv as any).captureStream(S.xfps); } catch (e) { toast('Capture not supported', 'err'); sizeCanvas(); return; }
    recordDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    recordedChunks = [];
    exportCancelled = false;
    recorderPaused = false;
    try {
      recorder = new MediaRecorder(stream, { mimeType: fmt[0], videoBitsPerSecond: S.mbps * 1e6, audioBitsPerSecond: S.abr * 1000 });
    } catch (e: any) {
      recorder = null;
      sizeCanvas();
      toast('Recorder failed: ' + e.message, 'err');
      return;
    }
    const r = recorder;
    r.ondataavailable = (e: any) => { if (e.data.size) recordedChunks.push(e.data); };
    r.onerror = () => { exportCancelled = true; toast('Recording error. Try a lower resolution.', 'err'); };
    r.onstop = () => {
      recorder = null;
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
      $('#bdg').textContent = 'PREVIEW';
      $('#bdg').classList.remove('rec');
      sizeCanvas();
      const xs = $('#xs');
      if (exportCancelled) { recordedChunks = []; if (xs) xs.textContent = 'Cancelled. Partial recording discarded.'; return; }
      const blob = new Blob(recordedChunks, { type: fmt[0].split(';')[0] });
      recordedChunks = [];
      if (!blob.size) { if (xs) xs.textContent = 'Export produced no data.'; return; }
      outputBlob = blob;
      outputName = 'audiovis.' + (fmt[0].includes('mp4') ? 'mp4' : 'webm');
      const url = URL.createObjectURL(blob), xout = $('#xout');
      if (xout) {
        xout.innerHTML = `<video controls src="${url}"></video><div class="dm" id="vf">Checking file...</div><button class="pri" data-act="saveout">Save ${outputName} (${(blob.size / 1048576).toFixed(1)} MB)</button>`;
        const v = xout.querySelector('video')!;
        v.onloadedmetadata = () => {
          const q = $('#vf');
          if (q) q.textContent = `Verified: ${v.videoWidth}×${v.videoHeight}, playable. ${droppedFrames ? `The preview stalled ${droppedFrames} time(s) while recording, so short freezes are possible. Re-record at a lower resolution or frame rate.` : 'No stalled frames were detected.'}`;
        };
        v.onerror = () => { const q = $('#vf'); if (q) q.textContent = 'This browser cannot play the file back. Try another format.'; };
      }
      if (xs) xs.textContent = 'Done.';
      toast('Export finished', 'ok');
    };
    audioPlayer.pause();
    audioPlayer.currentTime = S.t0;
    audioCtx!.resume();
    r.start(1000);
    audioPlayer.play();
    $('#bdg').textContent = 'EXPORT';
    $('#bdg').classList.add('rec');
    if ($('#xs')) $('#xs').textContent = 'Exporting ' + fmt[1] + '...';
  }

  function finishRecording() {
    if (recorder && recorder.state !== 'inactive') { audioPlayer.pause(); recorder.stop(); }
  }

  function cancelRecording() {
    if (recorder) { exportCancelled = true; audioPlayer.pause(); try { recorder.stop(); } catch (e) {} }
  }

  async function saveBlob(blob: Blob, name: string) {
    try {
      const u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      toast('Saved ' + name, 'ok');
    } catch (e: any) {
      toast('Save failed: ' + (e?.message || e), 'err');
    }
  }

  // Avee Import using JSZip
  async function importAveeWithJSZip(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;

      if (!isZip) return false;

      const zip = await JSZip.loadAsync(arrayBuffer);
      let sceneJsonFile = zip.file('scene.json') || zip.file('composition.json');

      if (!sceneJsonFile) {
        for (const [name, obj] of Object.entries(zip.files)) {
          if (name.endsWith('.json') && !obj.dir) {
            sceneJsonFile = obj;
            break;
          }
        }
      }

      if (!sceneJsonFile) return false;

      const sceneText = await sceneJsonFile.async('text');
      const sceneJson = JSON.parse(sceneText);
      const comp = sceneJson.compositions && sceneJson.compositions[0];
      if (!comp || !Array.isArray(comp.elements)) return false;

      currentAveeTemplateName = file.name.replace(/\.(viz|zip)$/i, '');
      embeddedAveeAssets.clear();

      // Extract image files
      for (const [name, obj] of Object.entries(zip.files)) {
        if (obj.dir) continue;
        if (/\.(png|jpg|jpeg|webp|svg)$/i.test(name)) {
          const blob = await obj.async('blob');
          const url = URL.createObjectURL(blob);
          embeddedAveeAssets.set(name, { blob, url, size: blob.size });
          const clean = name.split('/').pop() || name;
          embeddedAveeAssets.set(`local:${clean}`, { blob, url, size: blob.size });
        }
      }

      const propVal = (e: any, k: string) => { const o = e[k]; return o && typeof o === 'object' ? o.v : o; };
      const floats = (v: any) => String(v || '').split(/\s+/).map(Number);
      const blendMap: Record<string, string> = { Screen: 'screen', Add: 'lighter', AddAlpha: 'lighter' };

      const newLayers: any[] = [];
      let audioProvider: any = {};

      for (const e of comp.elements) {
        const type = e.objType || 'Element';
        const name = String(propVal(e, 'tag') || type).slice(0, 40);
        if (type === 'AudioProvider') { audioProvider = e; continue; }

        const [px, py] = floats(propVal(e, 'position'));
        const [sx] = floats(propVal(e, 'scale'));
        const base = {
          name, vis: propVal(e, 'visible') ? 1 : 0,
          blend: blendMap[propVal(e, 'blendMode')] || 'source-over',
          x: clamp(isFinite(px) ? px : .5, 0, 1) * 100,
          y: clamp(isFinite(py) ? py : .5, 0, 1) * 100,
          rot: +propVal(e, 'rotation') || 0
        };

        if (type === 'Image') {
          const ci = String(propVal(e, 'customImage') || '');
          const localAsset = embeddedAveeAssets.get(ci) || embeddedAveeAssets.get(ci.replace(/^local:/, ''));
          if (localAsset) {
            const im = new Image();
            im.src = localAsset.url;
            newLayers.push({ ...makeLayer('image', base), maxH: clamp((sx || 1) * 200, 5, 200), _img: im });
          } else if (/internalres:(black|white)/i.test(ci)) {
            const c = ci.toLowerCase().endsWith('black') ? '#000000' : '#ffffff';
            newLayers.push({ ...makeLayer('bg', base), color: c, color2: c });
          }
        } else if (/Circular|Circle|Radial/i.test(type) || /Circle/i.test(name)) {
          newLayers.push(makeLayer('circle', { ...base, n: 72, r0: 55, glow: 14 }));
        } else if (/Bars|Spectrum/i.test(type)) {
          newLayers.push(makeLayer('bars', { ...base, n: 64, y: 80 }));
        } else if (/Wave|Waveform|Oscilloscope/i.test(type)) {
          newLayers.push(makeLayer('wave', { ...base, n: 100 }));
        } else if (/Particles|Dust/i.test(type)) {
          newLayers.push(makeLayer('particles', { ...base, n: 90 }));
        } else if (/Text|Title/i.test(type)) {
          newLayers.push(makeLayer('text', { ...base, text: String(propVal(e, 'text') || '{ArtistOrTitle}') }));
        }
      }

      if (!newLayers.length) {
        newLayers.push(makeLayer('circle', { name: 'Avee Spectrum Ring', n: 64, r0: 55, color: '#00e5c0' }));
      }

      touch();
      setProject(newLayers, {});
      renderAll();
      toast(`Imported Avee .viz: ${newLayers.length} layers, ${embeddedAveeAssets.size} assets`, 'ok');
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }

  // Export genuine Avee Player .viz (ZIP package)
  async function exportAveeVizPackage() {
    try {
      toast('Packing Avee .viz package...', 'ok');
      const zip = new JSZip();

      const aveeElements: any[] = [
        {
          objType: 'AudioProvider',
          tag: { v: 'AudioProvider' },
          lowerHz: { v: 30 },
          higherHz: { v: 16000 },
          sampleOutCount: { v: 64 }
        }
      ];

      layers.forEach((l: any) => {
        const px = (l.x / 100).toFixed(4);
        const py = (l.y / 100).toFixed(4);
        const sx = (l.sx / 100).toFixed(4);
        const sy = (l.sy / 100).toFixed(4);

        if (l.type === 'bg') {
          aveeElements.push({
            objType: 'Image',
            tag: { v: l.name },
            visible: { v: !!l.vis },
            customImage: { v: 'internalres:black' }
          });
        } else if (l.type === 'circle' || l.type === 'multiring') {
          aveeElements.push({
            objType: 'CircularSpectrum',
            tag: { v: l.name },
            position: { v: `${px} ${py} 0` },
            scale: { v: `${sx} ${sy} 1` },
            barCount: { v: l.n },
            innerRadius: { v: l.r0 / 100 }
          });
        } else if (l.type === 'bars' || l.type === 'barsh') {
          aveeElements.push({
            objType: 'Bars',
            tag: { v: l.name },
            position: { v: `${px} ${py} 0` },
            scale: { v: `${sx} ${sy} 1` },
            barCount: { v: l.n }
          });
        } else if (l.type === 'wave' || l.type === 'scope') {
          aveeElements.push({
            objType: 'Waveform',
            tag: { v: l.name },
            position: { v: `${px} ${py} 0` }
          });
        } else if (l.type === 'particles') {
          aveeElements.push({
            objType: 'Particles',
            tag: { v: l.name },
            particleCount: { v: l.n }
          });
        } else if (l.type === 'text') {
          aveeElements.push({
            objType: 'Text',
            tag: { v: l.name },
            text: { v: l.text },
            position: { v: `${px} ${py} 0` }
          });
        }
      });

      const sceneJson = {
        version: 1,
        author: 'AUDIOVIS Avee Pro',
        title: currentAveeTemplateName,
        compositions: [{ elements: aveeElements }]
      };

      zip.file('scene.json', JSON.stringify(sceneJson, null, 2));

      // Put all embedded image assets
      for (const [k, asset] of embeddedAveeAssets.entries()) {
        const clean = k.replace(/^local:/, '');
        zip.file(clean, asset.blob);
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      saveBlob(blob, `${currentAveeTemplateName.replace(/\s+/g, '_')}.viz`);
      toast('Exported Avee .viz package!', 'ok');
    } catch (e: any) {
      toast('Export failed: ' + e.message, 'err');
    }
  }

  async function inspectVizFile(f: File) {
    try {
      if (await importAveeWithJSZip(f)) return;

      const b = new Uint8Array(await f.arrayBuffer());
      let txt: string | null = null;
      try { txt = new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) {}
      if (txt) {
        txt = txt.replace(/^\uFEFF/, '').trim();
        if (txt[0] === '{' || txt[0] === '[') {
          let o = JSON.parse(txt);
          if (Array.isArray(o)) o = { layers: o };
          const ly = o.layers || (o.project && o.project.layers);
          if (Array.isArray(ly) && ly.length) {
            touch();
            setProject(ly, o.scene || (o.project && o.project.scene) || {});
            renderAll();
            toast('Loaded template JSON', 'ok');
            return;
          }
        }
      }
      toast('Could not parse template', 'err');
    } catch (e) {
      toast('Could not read file', 'err');
    }
  }

  let tapTimes: number[] = [];
  function handleTapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length >= 2) {
      const deltas = [];
      for (let i = 1; i < tapTimes.length; i++) deltas.push(tapTimes[i] - tapTimes[i - 1]);
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      if (avgDelta > 200 && avgDelta < 2000) {
        const tappedBpm = Math.round(60000 / avgDelta);
        currentBpm = tappedBpm;
        S.beat = tappedBpm;
        save();
        if ($('#hud-bpm')) $('#hud-bpm').textContent = String(tappedBpm);
        const inp = $('#inp-bpm') as HTMLInputElement;
        if (inp) inp.value = String(tappedBpm);
        toast(`Tap Tempo: ${tappedBpm} BPM`, 'ok');
      }
    } else {
      toast('Tap again to calculate BPM...', 'ok');
    }
  }

  function initAutosave() {
    setInterval(() => {
      try {
        const state = {
          time: Date.now(),
          projectName: S.projectName || 'My Visualizer Project',
          layers: clone(layers),
          scene,
          ratio: S.ratio
        };
        ls.set('av.autosave', state);
      } catch (e) {}
    }, 15000);
  }

  // ==================== ANDROID JAVA APP & CODE GENERATOR ====================
  let currentJavaFile = 'MainActivity.java';

  function getAndroidJavaProjectFiles(): Record<string, string> {
    const barLayer = layers.find((l: any) => l.type === 'bars') || {};
    const primaryColor = barLayer.color || '#00E5C0';
    const secondaryColor = barLayer.color2 || '#6D8CFF';
    const barCount = clamp(barLayer.n || 56, 16, 128);
    const circleLayer = layers.find((l: any) => l.type === 'circle') || {};
    const circleRadius = circleLayer.rad || 130;
    const bpm = S.beat || 130;
    const beatBarFirst = S.beatBarFirst || 1;
    const beatBarLast = S.beatBarLast || 14;
    const beatValLower = (S.beatValLower || 0.15).toFixed(2);
    const beatValHigher = (S.beatValHigher || 0.75).toFixed(2);

    return {
      'MainActivity.java': `package com.audiovis.visualizer;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * MainActivity - Avee Player & Android Music Visualizer
 * Generated from AUDIOVIS Studio
 */
public class MainActivity extends AppCompatActivity {
    private static final int REQ_PERMISSIONS = 1001;
    private static final int REQ_PICK_AUDIO = 1002;

    private VisualizerView visualizerView;
    private AudioEngine audioEngine;
    private ImageButton btnPlayPause;
    private TextView tvTrackTitle;
    private TextView tvBpm;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep screen on for continuous visualizer playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);

        visualizerView = findViewById(R.id.visualizerView);
        btnPlayPause = findViewById(R.id.btnPlayPause);
        tvTrackTitle = findViewById(R.id.tvTrackTitle);
        tvBpm = findViewById(R.id.tvBpm);

        audioEngine = new AudioEngine(this);
        visualizerView.setAudioEngine(audioEngine);

        btnPlayPause.setOnClickListener(v -> togglePlay());
        findViewById(R.id.btnSelectAudio).setOnClickListener(v -> pickAudioFile());
        findViewById(R.id.btnPresets).setOnClickListener(v -> visualizerView.cyclePreset());

        requestAudioPermission();
    }

    private void requestAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, REQ_PERMISSIONS);
        } else {
            audioEngine.initVisualizer();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_PERMISSIONS && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            audioEngine.initVisualizer();
        } else {
            Toast.makeText(this, "Microphone/Audio permission is needed to analyze spectrum", Toast.LENGTH_SHORT).show();
        }
    }

    private void togglePlay() {
        if (audioEngine.isPlaying()) {
            audioEngine.pause();
            btnPlayPause.setImageResource(android.R.drawable.ic_media_play);
        } else {
            audioEngine.play();
            btnPlayPause.setImageResource(android.R.drawable.ic_media_pause);
        }
    }

    private void pickAudioFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("audio/*");
        startActivityForResult(intent, REQ_PICK_AUDIO);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PICK_AUDIO && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri uri = data.getData();
            audioEngine.loadUri(uri);
            tvTrackTitle.setText(uri.getLastPathSegment());
            btnPlayPause.setImageResource(android.R.drawable.ic_media_pause);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        visualizerView.resume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        visualizerView.pause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (audioEngine != null) audioEngine.release();
    }
}
`,

      'VisualizerView.java': `package com.audiovis.visualizer;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import java.util.Random;

/**
 * VisualizerView - High-Performance 60 FPS Android Canvas SurfaceView
 * Features: Spectrum Bars, Circular Waves, Neon Waveforms, Floating Stems & Beat Shake
 */
public class VisualizerView extends SurfaceView implements SurfaceHolder.Callback, Runnable {
    private SurfaceHolder holder;
    private Thread renderThread;
    private volatile boolean isRunning = false;
    private AudioEngine audioEngine;

    // Configured from AUDIOVIS template
    public static final int BAR_COUNT = ${barCount};
    public static final int PRIMARY_COLOR = Color.parseColor("${primaryColor}");
    public static final int SECONDARY_COLOR = Color.parseColor("${secondaryColor}");

    private Paint barPaint;
    private Paint peakPaint;
    private Paint wavePaint;
    private Paint particlePaint;
    private Paint bgPaint;
    private Paint glowPaint;

    private float[] smoothFft = new float[128];
    private float[] peakCaps = new float[128];
    private float beatPulse = 1.0f;
    private float shakeX = 0, shakeY = 0;

    // Particle system
    private static final int PARTICLE_COUNT = 80;
    private float[] pX = new float[PARTICLE_COUNT];
    private float[] pY = new float[PARTICLE_COUNT];
    private float[] pVx = new float[PARTICLE_COUNT];
    private float[] pVy = new float[PARTICLE_COUNT];
    private float[] pSize = new float[PARTICLE_COUNT];

    // Active Waveform Style generated from AUDIOVIS Audio Provider:
    // "circular", "starburst", "mirror", "linear", "ribbon", "segmented", "heartbeat", "vortex"
    private String waveformStyle = "${S.waveformStyle || 'circular'}";
    private int currentPreset = 0; // 0=Bars + Active Wave, 1=Circle Spectrum + Wave, 2=Mirrored Center, 3=Focused Waveform

    public VisualizerView(Context context, AttributeSet attrs) {
        super(context, attrs);
        holder = getHolder();
        holder.addCallback(this);
        initPaints();
        initParticles();
    }

    private void initPaints() {
        barPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        barPaint.setStyle(Paint.Style.FILL);

        peakPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        peakPaint.setColor(Color.WHITE);
        peakPaint.setStrokeWidth(4f);

        wavePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        wavePaint.setStyle(Paint.Style.STROKE);
        wavePaint.setStrokeWidth(5f);
        wavePaint.setColor(PRIMARY_COLOR);

        particlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        particlePaint.setColor(SECONDARY_COLOR);

        bgPaint = new Paint();
        bgPaint.setColor(Color.parseColor("#0A0B10"));

        glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        glowPaint.setStyle(Paint.Style.FILL);
    }

    private void initParticles() {
        Random rnd = new Random();
        for (int i = 0; i < PARTICLE_COUNT; i++) {
            pX[i] = rnd.nextFloat() * 1080;
            pY[i] = rnd.nextFloat() * 1920;
            pVx[i] = (rnd.nextFloat() - 0.5f) * 2f;
            pVy[i] = -rnd.nextFloat() * 3f - 1f;
            pSize[i] = rnd.nextFloat() * 6f + 2f;
        }
    }

    public void setAudioEngine(AudioEngine engine) {
        this.audioEngine = engine;
    }

    public void cyclePreset() {
        currentPreset = (currentPreset + 1) % 4;
    }

    public void setWaveformStyle(String style) {
        if (style != null && !style.isEmpty()) {
            this.waveformStyle = style.toLowerCase();
        }
    }

    public void cycleWaveformStyle() {
        String[] styles = {"circular", "starburst", "mirror", "linear", "ribbon", "segmented", "heartbeat", "vortex"};
        for (int i = 0; i < styles.length; i++) {
            if (styles[i].equalsIgnoreCase(waveformStyle)) {
                waveformStyle = styles[(i + 1) % styles.length];
                return;
            }
        }
        waveformStyle = "circular";
    }

    public void resume() {
        isRunning = true;
        renderThread = new Thread(this);
        renderThread.start();
    }

    public void pause() {
        isRunning = false;
        try {
            if (renderThread != null) renderThread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        resume();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {}

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        pause();
    }

    @Override
    public void run() {
        while (isRunning) {
            if (!holder.getSurface().isValid()) continue;
            Canvas canvas = holder.lockCanvas();
            if (canvas == null) continue;

            try {
                drawFrame(canvas);
            } finally {
                holder.unlockCanvasAndPost(canvas);
            }

            try {
                Thread.sleep(16); // ~60 FPS lock
            } catch (InterruptedException ignored) {}
        }
    }

    private void drawFrame(Canvas canvas) {
        int w = canvas.getWidth();
        int h = canvas.getHeight();

        float[] rawFft = (audioEngine != null) ? audioEngine.getFftMagnitudes() : new float[BAR_COUNT];
        float beatVal = (audioEngine != null) ? audioEngine.getBeatValue() : 0f;

        // Camera Beat Shake & Radial Pulse
        beatPulse += (1.0f + beatVal * 0.28f - beatPulse) * 0.35f;
        if (beatVal > 0.45f) {
            shakeX = (float) ((Math.random() - 0.5) * beatVal * 18);
            shakeY = (float) ((Math.random() - 0.5) * beatVal * 18);
        } else {
            shakeX *= 0.8f;
            shakeY *= 0.8f;
        }

        canvas.save();
        canvas.translate(shakeX, shakeY);

        // Background
        canvas.drawRect(0, 0, w, h, bgPaint);

        // Center Audio Glow
        RadialGradient glow = new RadialGradient(w / 2f, h / 2f, Math.max(w, h) * 0.6f * beatPulse,
                new int[]{Color.argb(50, 0, 229, 192), Color.TRANSPARENT}, null, Shader.TileMode.CLAMP);
        glowPaint.setShader(glow);
        canvas.drawCircle(w / 2f, h / 2f, Math.max(w, h) * 0.6f * beatPulse, glowPaint);

        // Floating particles
        drawParticles(canvas, w, h, beatVal);

        // Visualizer Styles & Waveforms
        switch (currentPreset) {
            case 0:
                drawLinearBars(canvas, w, h, rawFft);
                drawActiveWaveform(canvas, w, h);
                break;
            case 1:
                drawCircleSpectrum(canvas, w, h, rawFft, beatPulse);
                drawActiveWaveform(canvas, w, h);
                break;
            case 2:
                drawMirroredBars(canvas, w, h, rawFft);
                drawActiveWaveform(canvas, w, h);
                break;
            case 3:
                // Dedicated full waveform display
                drawActiveWaveform(canvas, w, h);
                break;
        }

        canvas.restore();
    }

    private void drawLinearBars(Canvas canvas, int w, int h, float[] fft) {
        int count = Math.min(fft.length, BAR_COUNT);
        float barWidth = (float) w / count;
        float gap = barWidth * 0.22f;
        float actualW = barWidth - gap;

        LinearGradient grad = new LinearGradient(0, h, 0, h * 0.3f, PRIMARY_COLOR, SECONDARY_COLOR, Shader.TileMode.CLAMP);
        barPaint.setShader(grad);

        for (int i = 0; i < count; i++) {
            smoothFft[i] += (fft[i] - smoothFft[i]) * 0.45f;
            float barHeight = smoothFft[i] * (h * 0.65f);
            float x = i * barWidth + gap / 2f;
            float y = h - barHeight;

            canvas.drawRoundRect(x, y, x + actualW, h, 6f, 6f, barPaint);

            // Peak cap decay
            if (y < peakCaps[i]) {
                peakCaps[i] = y;
            } else {
                peakCaps[i] += 4.5f;
                if (peakCaps[i] > h) peakCaps[i] = h;
            }
            canvas.drawLine(x, peakCaps[i], x + actualW, peakCaps[i], peakPaint);
        }
    }

    private void drawCircleSpectrum(Canvas canvas, int w, int h, float[] fft, float pulse) {
        float cx = w / 2f;
        float cy = h / 2f;
        float baseRadius = ${circleRadius}f * pulse;
        int count = Math.min(fft.length, BAR_COUNT);

        barPaint.setShader(null);
        barPaint.setColor(PRIMARY_COLOR);
        barPaint.setStrokeWidth(5f);

        for (int i = 0; i < count; i++) {
            smoothFft[i] += (fft[i] - smoothFft[i]) * 0.45f;
            double angle = (2 * Math.PI / count) * i;
            float mag = smoothFft[i] * (Math.min(w, h) * 0.26f);

            float x1 = (float) (cx + Math.cos(angle) * baseRadius);
            float y1 = (float) (cy + Math.sin(angle) * baseRadius);
            float x2 = (float) (cx + Math.cos(angle) * (baseRadius + mag));
            float y2 = (float) (cy + Math.sin(angle) * (baseRadius + mag));

            canvas.drawLine(x1, y1, x2, y2, barPaint);
        }

        Paint circlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        circlePaint.setStyle(Paint.Style.STROKE);
        circlePaint.setColor(Color.WHITE);
        circlePaint.setStrokeWidth(6f);
        canvas.drawCircle(cx, cy, baseRadius, circlePaint);
    }

    private void drawMirroredBars(Canvas canvas, int w, int h, float[] fft) {
        int half = Math.min(fft.length, BAR_COUNT / 2);
        float midX = w / 2f;
        float barW = midX / half;

        barPaint.setShader(null);
        barPaint.setColor(PRIMARY_COLOR);

        for (int i = 0; i < half; i++) {
            float val = fft[i] * (h * 0.5f);
            float y = h - val;
            canvas.drawRect(midX + i * barW, y, midX + (i + 1) * barW - 4, h, barPaint);
            canvas.drawRect(midX - (i + 1) * barW + 4, y, midX - i * barW, h, barPaint);
        }
    }

    /**
     * Active Waveform Dispatcher - Renders the chosen audio provider waveform style
     */
    private void drawActiveWaveform(Canvas canvas, int w, int h) {
        byte[] wave = (audioEngine != null) ? audioEngine.getWaveformData() : new byte[128];
        float beat = (audioEngine != null) ? audioEngine.getBeatValue() : 0f;
        if (waveformStyle.equalsIgnoreCase("circular")) {
            drawCircularWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("starburst")) {
            drawStarburstWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("mirror")) {
            drawMirrorWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("linear")) {
            drawLinearWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("ribbon")) {
            drawRibbonWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("segmented")) {
            drawSegmentedWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("heartbeat")) {
            drawHeartbeatWave(canvas, w, h, wave, beat);
        } else if (waveformStyle.equalsIgnoreCase("vortex")) {
            drawVortexWave(canvas, w, h, wave, beat);
        } else {
            drawCircularWave(canvas, w, h, wave, beat);
        }
    }

    private void drawLinearWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        Path path = new Path();
        float midY = h / 2f;
        for (int i = 0; i < wave.length; i++) {
            float x = (float) i / (wave.length - 1) * w;
            float val = ((wave[i] & 0xFF) - 128) / 128f;
            float y = midY + val * (h * 0.28f * (1f + beat * 0.4f));
            if (i == 0) path.moveTo(x, y);
            else path.lineTo(x, y);
        }
        canvas.drawPath(path, wavePaint);
    }

    private void drawCircularWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        float cx = w / 2f;
        float cy = h / 2f;
        float baseR = Math.min(w, h) * 0.24f * (1f + beat * 0.25f);
        Path path = new Path();
        int n = wave.length;
        for (int i = 0; i < n; i++) {
            double angle = (2 * Math.PI / n) * i;
            float val = ((wave[i] & 0xFF) - 128) / 128f;
            float r = baseR + val * (baseR * 0.55f);
            float x = (float) (cx + Math.cos(angle) * r);
            float y = (float) (cy + Math.sin(angle) * r);
            if (i == 0) path.moveTo(x, y);
            else path.lineTo(x, y);
        }
        path.close();
        canvas.drawPath(path, wavePaint);
    }

    private void drawStarburstWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        float cx = w / 2f;
        float cy = h / 2f;
        float baseR = Math.min(w, h) * 0.20f * (1f + beat * 0.35f);
        int n = wave.length;
        for (int i = 0; i < n; i += 2) {
            double angle = (2 * Math.PI / n) * i;
            float val = Math.abs(((wave[i] & 0xFF) - 128) / 128f);
            float spikeLen = val * (baseR * 1.6f);
            float x1 = (float) (cx + Math.cos(angle) * baseR);
            float y1 = (float) (cy + Math.sin(angle) * baseR);
            float x2 = (float) (cx + Math.cos(angle) * (baseR + spikeLen));
            float y2 = (float) (cy + Math.sin(angle) * (baseR + spikeLen));
            canvas.drawLine(x1, y1, x2, y2, wavePaint);
        }
    }

    private void drawMirrorWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        Path topPath = new Path();
        Path botPath = new Path();
        float midY = h / 2f;
        for (int i = 0; i < wave.length; i++) {
            float x = (float) i / (wave.length - 1) * w;
            float val = Math.abs(((wave[i] & 0xFF) - 128) / 128f) * (h * 0.22f * (1f + beat * 0.5f));
            if (i == 0) {
                topPath.moveTo(x, midY - val);
                botPath.moveTo(x, midY + val);
            } else {
                topPath.lineTo(x, midY - val);
                botPath.lineTo(x, midY + val);
            }
        }
        canvas.drawPath(topPath, wavePaint);
        canvas.drawPath(botPath, wavePaint);
    }

    private void drawRibbonWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        Path ribbon = new Path();
        float midY = h / 2f;
        int n = wave.length;
        for (int i = 0; i < n; i++) {
            float x = (float) i / (n - 1) * w;
            float val = Math.abs(((wave[i] & 0xFF) - 128) / 128f) * (h * 0.2f * (1f + beat * 0.4f));
            if (i == 0) ribbon.moveTo(x, midY - val);
            else ribbon.lineTo(x, midY - val);
        }
        for (int i = n - 1; i >= 0; i--) {
            float x = (float) i / (n - 1) * w;
            float val = Math.abs(((wave[i] & 0xFF) - 128) / 128f) * (h * 0.2f * (1f + beat * 0.4f));
            ribbon.lineTo(x, midY + val);
        }
        ribbon.close();
        Paint fillPaint = new Paint(wavePaint);
        fillPaint.setStyle(Paint.Style.FILL);
        fillPaint.setAlpha(80);
        canvas.drawPath(ribbon, fillPaint);
        canvas.drawPath(ribbon, wavePaint);
    }

    private void drawSegmentedWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        float midY = h / 2f;
        int step = Math.max(1, wave.length / 48);
        for (int i = 0; i < wave.length; i += step) {
            float x = (float) i / (wave.length - 1) * w;
            float val = ((wave[i] & 0xFF) - 128) / 128f;
            float y = midY + val * (h * 0.25f);
            float dotRadius = 4f + Math.abs(val) * 8f * (1f + beat * 0.5f);
            canvas.drawCircle(x, y, dotRadius, wavePaint);
        }
    }

    private void drawHeartbeatWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        Path ecg = new Path();
        float midY = h / 2f;
        for (int i = 0; i < wave.length; i++) {
            float x = (float) i / (wave.length - 1) * w;
            float rawVal = ((wave[i] & 0xFF) - 128) / 128f;
            float sign = Math.signum(rawVal);
            float sharpVal = (float) (sign * Math.pow(Math.abs(rawVal), 1.6) * (h * 0.35f * (1f + beat * 0.6f)));
            float y = midY + sharpVal;
            if (i == 0) ecg.moveTo(x, y);
            else ecg.lineTo(x, y);
        }
        canvas.drawPath(ecg, wavePaint);
    }

    private void drawVortexWave(Canvas canvas, int w, int h, byte[] wave, float beat) {
        float cx = w / 2f;
        float cy = h / 2f;
        float baseR = Math.min(w, h) * 0.12f;
        int rings = 4;
        for (int r = 0; r < rings; r++) {
            Path ringPath = new Path();
            float ringR = baseR * (r + 1) * (1f + beat * 0.15f);
            int n = wave.length;
            for (int i = 0; i < n; i++) {
                double angle = (2 * Math.PI / n) * i + (r * 0.4);
                float val = ((wave[(i + r * 16) % n] & 0xFF) - 128) / 128f;
                float currentR = ringR + val * (baseR * 0.4f);
                float x = (float) (cx + Math.cos(angle) * currentR);
                float y = (float) (cy + Math.sin(angle) * currentR);
                if (i == 0) ringPath.moveTo(x, y);
                else ringPath.lineTo(x, y);
            }
            ringPath.close();
            canvas.drawPath(ringPath, wavePaint);
        }
    }

    private void drawParticles(Canvas canvas, int w, int h, float beat) {
        for (int i = 0; i < PARTICLE_COUNT; i++) {
            pY[i] += pVy[i] * (1.0f + beat * 2.0f);
            pX[i] += pVx[i];
            if (pY[i] < 0) {
                pY[i] = h;
                pX[i] = (float) (Math.random() * w);
            }
            particlePaint.setAlpha((int) Math.min(255, 120 + beat * 135));
            canvas.drawCircle(pX[i], pY[i], pSize[i] * (1.0f + beat * 0.5f), particlePaint);
        }
    }
}
`,

      'AudioEngine.java': `package com.audiovis.visualizer;

import android.content.Context;
import android.media.MediaPlayer;
import android.media.audiofx.Visualizer;
import android.net.Uri;
import java.io.IOException;

/**
 * AudioEngine - Manages audio playback, FFT spectrum analysis & Avee Beat Detection Box
 */
public class AudioEngine {
    private Context context;
    private MediaPlayer mediaPlayer;
    private Visualizer visualizer;

    private float[] fftMagnitudes = new float[64];
    private byte[] waveformBytes = new byte[128];
    private float currentBeat = 0f;

    // Configured from AUDIOVIS Audio Provider settings
    private int beatBarFirst = ${beatBarFirst};
    private int beatBarLast = ${beatBarLast};
    private float beatValLower = ${beatValLower}f;
    private float beatValHigher = ${beatValHigher}f;

    public AudioEngine(Context context) {
        this.context = context;
        initMediaPlayer();
    }

    private void initMediaPlayer() {
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setLooping(true);
    }

    public void initVisualizer() {
        try {
            if (visualizer != null) {
                visualizer.release();
            }
            int sessionId = (mediaPlayer != null && mediaPlayer.getAudioSessionId() != 0)
                    ? mediaPlayer.getAudioSessionId() : 0;

            visualizer = new Visualizer(sessionId);
            visualizer.setCaptureSize(Visualizer.getCaptureSizeRange()[1]);
            visualizer.setDataCaptureListener(new Visualizer.OnDataCaptureListener() {
                @Override
                public void onWaveFormDataCapture(Visualizer v, byte[] waveform, int samplingRate) {
                    waveformBytes = waveform;
                }

                @Override
                public void onFftDataCapture(Visualizer v, byte[] fft, int samplingRate) {
                    processFft(fft);
                }
            }, Visualizer.getMaxCaptureRate() / 2, true, true);

            visualizer.setEnabled(true);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void processFft(byte[] fft) {
        int n = Math.min(fft.length / 2, fftMagnitudes.length);
        float beatSum = 0;
        int beatCount = 0;

        for (int i = 0; i < n; i++) {
            byte rfk = fft[i * 2];
            byte ifk = fft[i * 2 + 1];
            float magnitude = (float) Math.hypot(rfk, ifk) / 128f;
            fftMagnitudes[i] = magnitude;

            // Check if bar lies inside Beat Box
            if (i >= beatBarFirst && i <= beatBarLast) {
                if (magnitude >= beatValLower) {
                    beatSum += Math.min(magnitude, beatValHigher);
                    beatCount++;
                }
            }
        }

        if (beatCount > 0) {
            currentBeat += ((beatSum / beatCount) - currentBeat) * 0.5f;
        } else {
            currentBeat *= 0.85f;
        }
    }

    public void loadUri(Uri uri) {
        try {
            mediaPlayer.reset();
            mediaPlayer.setDataSource(context, uri);
            mediaPlayer.prepare();
            mediaPlayer.start();
            initVisualizer();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void play() {
        if (mediaPlayer != null) {
            mediaPlayer.start();
        }
    }

    public void pause() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
    }

    public boolean isPlaying() {
        return mediaPlayer != null && mediaPlayer.isPlaying();
    }

    public float[] getFftMagnitudes() {
        return fftMagnitudes;
    }

    public byte[] getWaveformData() {
        return waveformBytes;
    }

    public float getBeatValue() {
        return currentBeat;
    }

    public void release() {
        if (visualizer != null) {
            visualizer.setEnabled(false);
            visualizer.release();
        }
        if (mediaPlayer != null) {
            mediaPlayer.release();
        }
    }
}
`,

      'AveeVizParser.java': `package com.audiovis.visualizer;

import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * AveeVizParser - Reads & Extracts Avee Player .viz ZIP archives containing scene.json
 */
public class AveeVizParser {
    public static class VizPackage {
        public JSONObject sceneJson;
        public Map<String, byte[]> assetFiles = new HashMap<>();
    }

    public static VizPackage parseVizStream(InputStream is) throws Exception {
        VizPackage pkg = new VizPackage();
        ZipInputStream zis = new ZipInputStream(is);
        ZipEntry entry;
        byte[] buffer = new byte[4096];

        while ((entry = zis.getNextEntry()) != null) {
            String name = entry.getName();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            int len;
            while ((len = zis.read(buffer)) > 0) {
                baos.write(buffer, 0, len);
            }
            byte[] bytes = baos.toByteArray();

            if (name.equalsIgnoreCase("scene.json") || name.endsWith(".json")) {
                pkg.sceneJson = new JSONObject(new String(bytes, "UTF-8"));
            } else {
                pkg.assetFiles.put(name, bytes);
            }
            zis.closeEntry();
        }
        zis.close();
        return pkg;
    }
}
`,

      'activity_main.xml': `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0A0B10">

    <com.audiovis.visualizer.VisualizerView
        android:id="@+id/visualizerView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <!-- Top Status Bar -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:padding="16dp"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/tvTrackTitle"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Avee Player 808 Synth Beat"
            android:textColor="#FFFFFF"
            android:textSize="14sp"
            android:textStyle="bold"
            android:shadowColor="#000000"
            android:shadowRadius="4" />

        <TextView
            android:id="@+id/tvBpm"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="#80000000"
            android:paddingHorizontal="10dp"
            android:paddingVertical="4dp"
            android:text="${bpm} BPM"
            android:textColor="${primaryColor}"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- Bottom Controls -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom"
        android:orientation="horizontal"
        android:gravity="center"
        android:padding="20dp"
        android:background="#40000000">

        <Button
            android:id="@+id/btnSelectAudio"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Select Song"
            android:textColor="#FFFFFF"
            android:backgroundTint="#262E3B" />

        <ImageButton
            android:id="@+id/btnPlayPause"
            android:layout_width="64dp"
            android:layout_height="64dp"
            android:layout_marginHorizontal="24dp"
            android:backgroundTint="${primaryColor}"
            android:src="@android:drawable/ic_media_play"
            android:contentDescription="Play/Pause" />

        <Button
            android:id="@+id/btnPresets"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Change Style"
            android:textColor="#000000"
            android:backgroundTint="${primaryColor}" />
    </LinearLayout>
</FrameLayout>
`,

      'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Avee Visualizer"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="audio/*" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,

      'build.gradle': `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.audiovis.visualizer'
    compileSdk 34

    defaultConfig {
        applicationId "com.audiovis.visualizer"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
`,

      'README.md': `# Avee Player Android Java Visualizer Project

Complete native Android Java project generated directly from AUDIOVIS Studio.

## 🚀 How to Build APK in Android Studio (English)
1. Download this project (.zip) and extract it on your computer.
2. Open **Android Studio** and click **Open...** (or File > Open).
3. Select the extracted project directory.
4. Let Gradle sync project dependencies.
5. In the top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. Android Studio will compile and output \`app-debug.apk\` ready to install on your phone!

---

## 📱 Android Phone me APK kaise banayein (Hindi)
1. Upar diya gaya project (.zip) download karein aur extract karein.
2. **Android Studio** software open karein aur **Open** par click karke ye folder chunein.
3. Gradle sync complete hone ke baad, top menu me **Build > Build Bundle(s) / APK(s) > Build APK(s)** par click karein.
4. APK file generate ho jayegi jisko aap direct apne Android phone me install kar sakte hain!
`
    };
  }

  function openJavaModal() {
    const modal = $('#java-modal');
    if (!modal) return;
    modal.hidden = false;
    updateJavaCodeView();
  }

  function closeJavaModal() {
    const modal = $('#java-modal');
    if (modal) modal.hidden = true;
  }

  function switchJavaTab(filename: string) {
    currentJavaFile = filename;
    $$('#java-tabs .java-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.f === filename);
    });
    updateJavaCodeView();
  }

  function updateJavaCodeView() {
    const codeDisplay = $('#java-code-display');
    if (!codeDisplay) return;
    const files = getAndroidJavaProjectFiles();
    codeDisplay.textContent = files[currentJavaFile] || '// File not found';
  }

  function copyJavaCode() {
    const files = getAndroidJavaProjectFiles();
    const code = files[currentJavaFile] || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        toast(`Copied ${currentJavaFile} to clipboard!`, 'ok');
      }).catch(() => {
        toast('Clipboard copy failed', 'err');
      });
    } else {
      toast('Clipboard not supported in this context', 'err');
    }
  }

  async function downloadAndroidJavaZip() {
    toast('Generating Android Studio Java Project (.zip)...', 'ok');
    try {
      const files = getAndroidJavaProjectFiles();
      const zip = new JSZip();

      // Top-level gradle files
      zip.file('settings.gradle', `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AveeAudioVisualizer"
include ':app'
`);

      zip.file('build.gradle', `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath "com.android.tools.build:gradle:8.2.2"
    }
}
`);

      zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
`);

      // App module
      zip.file('app/build.gradle', files['build.gradle']);
      zip.file('app/src/main/AndroidManifest.xml', files['AndroidManifest.xml']);
      zip.file('app/src/main/java/com/audiovis/visualizer/MainActivity.java', files['MainActivity.java']);
      zip.file('app/src/main/java/com/audiovis/visualizer/VisualizerView.java', files['VisualizerView.java']);
      zip.file('app/src/main/java/com/audiovis/visualizer/AudioEngine.java', files['AudioEngine.java']);
      zip.file('app/src/main/java/com/audiovis/visualizer/AveeVizParser.java', files['AveeVizParser.java']);
      zip.file('app/src/main/res/layout/activity_main.xml', files['activity_main.xml']);
      zip.file('app/src/main/res/values/strings.xml', `<resources>
    <string name="app_name">Avee Visualizer</string>
</resources>
`);
      const barLayer = layers.find((l: any) => l.type === 'bars') || {};
      const primaryColor = barLayer.color || '#00E5C0';
      const secondaryColor = barLayer.color2 || '#6D8CFF';

      zip.file('app/src/main/res/values/colors.xml', `<resources>
    <color name="primary">${primaryColor}</color>
    <color name="secondary">${secondaryColor}</color>
    <color name="background">#0A0B10</color>
</resources>
`);

      // Embed the user's active preset in assets so it loads immediately
      zip.file('app/src/main/assets/template.viz', JSON.stringify({
        app: 'AUDIOVIS',
        version: 3,
        name: S.projectName || 'Avee Visualizer',
        layers: clone(layers),
        scene
      }, null, 2));

      zip.file('README.md', files['README.md']);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, 'Avee_Visualizer_Android_Java_Project.zip');
      toast('Downloaded Android Studio Java Project (.zip)!', 'ok');
    } catch (err: any) {
      console.error(err);
      toast('Failed to pack Java project: ' + err.message, 'err');
    }
  }

  let overlayIndex = 1;
  const ACTIONS: Record<string, (b?: any) => any> = {
    help: () => { const m = $('#help-modal'); if (m) m.hidden = false; },
    helpx: () => { const m = $('#help-modal'); if (m) m.hidden = true; },
    'java-convert': openJavaModal,
    javax: closeJavaModal,
    'java-download-zip': downloadAndroidJavaZip,
    'java-copy-code': copyJavaCode,
    'java-tab': (b: any) => switchJavaTab(b.dataset.f),
    fullscreen: () => {
      document.body.classList.toggle('fullscreen-mode');
      sizeCanvas();
      toast(document.body.classList.contains('fullscreen-mode') ? 'Fullscreen preview (Tap canvas to exit)' : 'Exited fullscreen', 'ok');
    },
    'tap-tempo': handleTapTempo,
    'apply-social-preset': (b: any) => {
      const p = SOCIAL_EXPORT_PRESETS[+b.dataset.si];
      if (!p) return;
      S.ratio = p.ratio;
      S.res = p.res;
      S.xfps = p.fps;
      S.mbps = p.mbps;
      save();
      sizeCanvas();
      showTab('exp');
      toast(`Export preset applied: ${p.name}`, 'ok');
    },
    'recover-autosave': () => {
      const autosaved = ls.get('av.autosave', null);
      if (autosaved && autosaved.layers) {
        touch();
        setProject(autosaved.layers, autosaved.scene);
        if (autosaved.ratio) { S.ratio = autosaved.ratio; sizeCanvas(); }
        if (autosaved.projectName) {
          S.projectName = autosaved.projectName;
          if ($('#proj-badge')) $('#proj-badge').textContent = autosaved.projectName;
        }
        renderAll();
        toast('Autosaved project restored!', 'ok');
        showTab('lib');
      }
    },
    'new-proj': () => {
      touch();
      setProject([
        makeBackground('#000000', '#0a0a0a'),
        makeLayer('bars', { name: 'Main Spectrum', y: 75, n: 56, thick: 70, color: '#00e5c0', color2: '#6d8cff', glow: 16, peakCaps: 1 })
      ]);
      S.projectName = 'Untitled Project';
      save();
      if ($('#proj-badge')) $('#proj-badge').textContent = 'Untitled Project';
      renderAll();
      showTab('lib');
      toast('Created new project', 'ok');
    },
    'dup-proj': () => {
      const copyName = (S.projectName || 'My Visualizer Project') + ' (Copy)';
      S.projectName = copyName;
      save();
      touch();
      if ($('#proj-badge')) $('#proj-badge').textContent = copyName;
      if ($('#proj-name-inp')) ($('#proj-name-inp') as HTMLInputElement).value = copyName;
      toast('Duplicated project: ' + copyName, 'ok');
    },
    'set-aspect': (b: any) => {
      const r = b.dataset.r;
      if (r) {
        S.ratio = r;
        save();
        sizeCanvas();
        showTab('lib');
        toast(`Canvas aspect ratio: ${r}`, 'ok');
      }
    },
    'apply-tpl': (b: any) => {
      const tpl = STARTER_TEMPLATES[+b.dataset.ti];
      if (!tpl) return;
      touch();
      setProject(clone(tpl.layers), tpl.scene);
      S.projectName = tpl.title;
      save();
      if ($('#proj-badge')) $('#proj-badge').textContent = tpl.title;
      renderAll();
      toast(`Loaded template: ${tpl.title}`, 'ok');
    },
    osz: () => { overlayIndex = (overlayIndex + 1) % 3; $('#side')?.style.setProperty('--oh', [36, 58, 88][overlayIndex] + '%'); },
    undo, redo,
    panel: () => setPanelOpen(!panelOpen),
    close: () => setPanelOpen(false),
    set: () => { if ($('#set')) $('#set').hidden = false; },
    setx: () => { if ($('#set')) $('#set').hidden = true; },
    tab: (b: any) => {
      if (panelOpen && currentTab === b.dataset.t && !document.body.classList.contains('wide')) setPanelOpen(false);
      else { currentTab = b.dataset.t; setPanelOpen(true); showTab(currentTab); }
    },
    play: async () => {
      if (!files.length && !audioPlayer.buffer) {
        toast('Select or import an audio file to start playing', 'ok');
        showTab('lib');
        return;
      }
      if (!initAudio()) return;
      await audioCtx!.resume();
      if (audioPlayer.buffer) audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
      else loadTrack(Math.max(currentIndex, 0));
    },
    prev: () => nextTrack(-1),
    next: () => nextTrack(1),
    shuf: () => { S.sh = S.sh ? 0 : 1; save(); syncButtons(); },
    rpt: () => { S.rp = { off: 'all', all: 'one', one: 'off' }[S.rp as 'off' | 'all' | 'one']; save(); syncButtons(); },
    qsel: (b: any) => loadTrack(+b.dataset.i),
    qrm: (b: any) => {
      const i = +b.dataset.i;
      files.splice(i, 1);
      if (i === currentIndex) { audioPlayer.stop(); audioPlayer.buffer = null; currentIndex = -1; peaks = []; drawWaveform(); }
      else if (i < currentIndex) currentIndex--;
      renderQueue();
    },
    addlayer: () => { touch(); layers.push(makeLayer($('#ltype').value)); selected = layers.length - 1; renderLayers(); renderInspector(); },
    ldel: () => {
      if (layers[selected] && layers[selected].lock) return toast('Layer is locked. Unlock to delete', 'err');
      if (layers[selected]) { touch(); layers.splice(selected, 1); selected = clamp(selected, 0, layers.length - 1); renderLayers(); renderInspector(); }
    },
    ldup: () => {
      if (layers[selected]) { touch(); const c = normalizeLayer(clone(layers[selected])); c.name += ' copy'; layers.splice(selected + 1, 0, c); selected++; renderLayers(); renderInspector(); }
    },
    lup: () => {
      if (layers[selected] && layers[selected].lock) return toast('Layer is locked. Unlock to move', 'err');
      if (selected < layers.length - 1) { touch(); [layers[selected], layers[selected + 1]] = [layers[selected + 1], layers[selected]]; selected++; renderLayers(); }
    },
    ldn: () => {
      if (layers[selected] && layers[selected].lock) return toast('Layer is locked. Unlock to move', 'err');
      if (selected > 0) { touch(); [layers[selected], layers[selected - 1]] = [layers[selected - 1], layers[selected]]; selected--; renderLayers(); }
    },
    lsel: (b: any) => { selected = +b.dataset.i; renderLayers(); renderInspector(); },
    lvis: (b: any) => { touch(); layers[+b.dataset.i].vis ^= 1; renderLayers(); },
    llock: (b: any) => { touch(); layers[+b.dataset.i].lock ^= 1; renderLayers(); renderInspector(); },
    cpy: () => { copyBuffer = clone(layers[selected]); toast('Properties copied', 'ok'); },
    pst: () => {
      if (!copyBuffer || !layers[selected] || layers[selected].lock) return;
      touch(); const t = layers[selected];
      layers[selected] = normalizeLayer({ ...copyBuffer, type: t.type, name: t.name });
      renderInspector();
    },
    rstl: () => {
      const l = layers[selected];
      if (!l || l.lock) return;
      touch();
      layers[selected] = makeLayer(l.type, { name: l.name });
      renderInspector();
    },
    rsts: (b: any) => {
      const l = layers[selected];
      if (!l || l.lock) return;
      touch();
      FIELD_GROUPS.find((s: any) => s[0] === b.dataset.sec)[1].forEach((f: any) => { if (f[0] !== 'img') l[f[0]] = (LAYER_DEFAULTS as any)[f[0]]; });
      renderInspector();
    },
    addrule: () => {
      const l = layers[selected];
      if (!l || l.lock) return;
      touch();
      const [mn, mx] = PROP_RANGES.sy, o0 = l.sy;
      l.rules.push({ ...RULE_DEFAULTS, o0, o1: clamp(o0 + (mx - mn) * .2, mn, mx) });
      openSections.Reactive = 1;
      renderInspector();
    },
    delrule: (b: any) => { if (layers[selected] && layers[selected].lock) return; touch(); layers[selected].rules.splice(+b.dataset.i, 1); renderInspector(); },
    apply: (b: any) => {
      const p = allPresets()[+b.dataset.i];
      touch();
      setProject(clone(p.layers), p.scene);
      currentAveeTemplateName = p.name;
      renderAll();
      toast('Applied ' + p.name, 'ok');
    },
    fav: (b: any) => {
      const name = allPresets()[+b.dataset.i].name;
      favorites = favorites.includes(name) ? favorites.filter((x: any) => x !== name) : [...favorites, name];
      ls.set('av.favs', favorites);
      renderPresets();
    },
    delp: (b: any) => { userPresets.splice(+b.dataset.i, 1); ls.set('av.presets', userPresets); renderPresets(); },
    rand: () => {
      const a = allPresets(), p = a[Math.floor(Math.random() * a.length)];
      touch();
      setProject(clone(p.layers), p.scene);
      layers.forEach((l: any) => { if (l.type !== 'bg' && l.color !== '#ffffff') l.hue = Math.round(Math.random() * 120 - 60); });
      renderAll();
      toast('Random: ' + p.name, 'ok');
    },
    savep: () => {
      const n = ($('#pn') as HTMLInputElement).value.trim();
      if (!n) { $('#pn').focus(); return; }
      userPresets.push({ name: n, layers: clone(layers), scene: { ...scene } });
      ls.set('av.presets', userPresets);
      ($('#pn') as HTMLInputElement).value = '';
      renderPresets();
      toast('Saved preset', 'ok');
    },
    jshow: () => { ($('#js') as HTMLTextAreaElement).value = JSON.stringify({ app: 'AUDIOVIS', version: 3, layers: clone(layers), scene }, null, 1); },
    jload: () => {
      try {
        const o = JSON.parse(($('#js') as HTMLTextAreaElement).value);
        if (o.app !== 'AUDIOVIS' || !Array.isArray(o.layers)) throw Error('Not an AUDIOVIS project');
        touch();
        setProject(o.layers, o.scene);
        renderAll();
        toast('Loaded', 'ok');
      } catch (e: any) { toast('Import failed: ' + e.message, 'err'); }
    },
    jsave: () => saveBlob(new Blob([JSON.stringify({ app: 'AUDIOVIS', version: 3, layers: clone(layers), scene })], { type: 'application/json' }), 'audiovis-template.viz'),
    jsaveavee: exportAveeVizPackage,
    'apply-waveform-style': (b: any) => {
      const ws = b.dataset.ws || b.closest('[data-ws]')?.dataset.ws;
      if (ws) applyWaveformStyle(ws);
    },
    'pwa-install': () => triggerInstallPrompt(),
    mic: toggleMicrophone,
    eqrst: () => { S.eq = SETTINGS_DEFAULTS.eq.slice(); save(); applyAudioSettings(); showTab('aud'); },
    rsta: () => {
      ['vol', 'pre', 'bass', 'bal', 'speed', 'norm', 'rev', 'dly', 'dist', 'fft', 'smooth', 'floor', 'beat'].forEach(k => S[k] = (SETTINGS_DEFAULTS as any)[k]);
      S.eq = SETTINGS_DEFAULTS.eq.slice();
      save(); applyAudioSettings(); showTab('aud');
    },
    rstsc: () => { touch(); scene = { ...SCENE_DEFAULTS }; showTab('scn'); },
    rec: startRecording,
    rcancel: cancelRecording,
    rpause: (b: any) => {
      if (!recorder) return;
      recorderPaused = !recorderPaused;
      if (recorderPaused) { recorder.pause(); audioPlayer.pause(); b.textContent = 'Resume'; }
      else { recorder.resume(); audioPlayer.play(); b.textContent = 'Pause'; }
    },
    still: () => cv.toBlob(b => b && saveBlob(b, 'audiovis-still.png'), 'image/png'),
    saveout: () => outputBlob && saveBlob(outputBlob, outputName),
    rstset: () => {
      Object.assign(S, { ...SETTINGS_DEFAULTS, eq: SETTINGS_DEFAULTS.eq.slice() });
      save(); applyAudioSettings(); applyTheme(S.theme); syncSettings(); layout(); sizeCanvas();
      toast('Settings reset', 'ok');
    },
    clr: () => {
      ls.del('av.proj'); ls.del('av.presets'); userPresets = []; undoStack = []; redoStack = [];
      setProject(PRESETS[0][2]); renderAll();
      toast('Saved projects cleared', 'ok');
    }
  };

  // Click listener
  $('#app')?.addEventListener('click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest('[data-act]') as HTMLElement;
    if (!b) return;
    e.preventDefault();
    const act = b.dataset.act;
    if (act && ACTIONS[act]) ACTIONS[act](b);
  });

  // Input listener
  function setProperty(layer: any, key: string, val: any) {
    layer[key] = val;
    if (key === 'font' && document.fonts) document.fonts.load('20px "' + val + '"');
    if (key === 'uni' || (key === 'sx' && layer.uni)) { if (layer.uni) layer.sy = layer.sx; }
    if (key === 'band' && val !== 'custom') {
      const range = val === 'all' ? [30, 16000] : FREQ_BANDS[val];
      layer.f0 = range[0]; layer.f1 = range[1];
    }
  }

  $('#app')?.addEventListener('input', (e: any) => {
    const t = e.target;
    let v = t.type === 'checkbox' ? t.checked : (t.type === 'range' || t.type === 'number') ? +t.value : t.value;
    if (t.type === 'number' && t.min !== '') { if (!isFinite(v)) return; v = clamp(v, +t.min, +t.max); }
    const rangeRow = t.closest('.rg');

    if (t.dataset.k !== undefined) {
      const l = layers[selected];
      if (!l || l.lock) return;
      if (t.classList.contains('hx')) {
        if (!/^#[0-9a-f]{6}$/i.test(v)) return;
        t.closest('.cr').querySelector('input[type=color]').value = v;
      } else if (t.type === 'color') {
        const hex = t.closest('.cr')?.querySelector('.hx');
        if (hex) hex.value = v;
      }
      touch();
      setProperty(l, t.dataset.k, t.type === 'checkbox' ? (v ? 1 : 0) : v);
      if (rangeRow) rangeRow.querySelectorAll('input').forEach((i: any) => { if (i !== t) i.value = v; });
      if (t.dataset.k === 'name') renderLayers();
      if (t.dataset.k === 'sx' && l.uni) $$('#insp [data-k="sy"]').forEach(i => i.value = l.sy);
      if (t.dataset.k === 'uni' || t.dataset.k === 'band' || t.dataset.k === 'grad') renderInspector();
    } else if (t.dataset.r !== undefined) {
      const l = layers[selected];
      if (!l || l.lock) return;
      touch();
      const r = l.rules[+t.dataset.r], k = t.dataset.rk;
      r[k] = t.type === 'checkbox' ? (v ? 1 : 0) : v;
      if (k === 'prop') {
        const [mn, mx] = PROP_RANGES[v], o0 = l[v];
        r.o0 = o0;
        r.o1 = clamp(o0 + (mx - mn) * .2, mn, mx);
        renderInspector();
      }
    } else if (t.dataset.s !== undefined) {
      const k = t.dataset.s;
      S[k] = t.dataset.n ? +v : v;
      if (rangeRow) rangeRow.querySelectorAll('input').forEach((i: any) => { if (i !== t) i.value = v; });
      save();
      applyAudioSettings();
      if (k === 'rot') layout();
      if (['pq', 'res', 'ratio', 'cw', 'ch', 'xfps', 'mbps', 'abr', 't0', 't1'].includes(k)) {
        sizeCanvas();
        if (k === 'ratio') showTab('exp');
      }
      if (k === 'ratio' && currentTab !== 'exp') sizeCanvas();
    } else if (t.dataset.eq !== undefined) {
      const i = +t.dataset.eq;
      S.eq[i] = v;
      if (rangeRow) rangeRow.querySelectorAll('input').forEach((x: any) => { if (x !== t) x.value = v; });
      save();
      if (eqFilters[i]) eqFilters[i].gain.value = v;
    } else if (t.dataset.c !== undefined) {
      touch();
      (scene as any)[t.dataset.c] = v;
      if (rangeRow) rangeRow.querySelectorAll('input').forEach((i: any) => { if (i !== t) i.value = v; });
    } else if (t.id === 'proj-name-inp') {
      S.projectName = v;
      save();
      if ($('#proj-badge')) $('#proj-badge').textContent = v;
    } else if (t.id === 'inp-bpm') {
      const num = clamp(+v, 40, 260);
      S.beat = num;
      currentBpm = num;
      save();
      if ($('#hud-bpm')) $('#hud-bpm').textContent = String(num);
    } else if (t.id === 'qs') renderQueue();
    else if (t.id === 'ps') renderPresets();
    else if (t.id === 'pc') { presetFilter = t.value; renderPresets(); }
    else if (t.id === 'slp') {
      clearTimeout(sleepTimer);
      const m = +t.value;
      if (m) sleepTimer = setTimeout(() => { audioPlayer.pause(); toast('Sleep timer: paused'); }, m * 60000);
    } else if (t.id === 'eqp' && EQ_PRESETS[t.value]) {
      S.eq = EQ_PRESETS[t.value].slice();
      save(); applyAudioSettings(); showTab('aud');
    }
  });

  $('#app')?.addEventListener('change', (e: any) => {
    const t = e.target;
    if (t.id === 'fi' || t.id === 'fdr') {
      const arr = [...t.files];
      const bufs = arr.map(f => f.arrayBuffer().catch(() => null));
      t.value = '';
      initAudio();
      if (audioCtx) audioCtx.resume();
      addFiles(arr, bufs);
    } else if (t.id === 'vzi') {
      const f = t.files[0];
      t.value = '';
      if (f) inspectVizFile(f);
    } else if (t.dataset.img) {
      const f = t.files[0], l = layers[selected];
      if (!f || !l) return;
      const im = new Image();
      im.onload = () => { l._img = im; toast('Image loaded', 'ok'); };
      im.onerror = () => toast('Could not read image', 'err');
      im.src = URL.createObjectURL(f);
    }
  });

  function syncSettings() {
    $$('[data-s]').forEach(el => {
      const v = S[el.dataset.s];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'range' || el.type === 'number') el.value = v;
      else el.value = v;
    });
    if ($('#theme')) $('#theme').value = S.theme;
  }

  $('#set')?.addEventListener('change', (e: any) => {
    const t = e.target;
    if (t.id === 'theme') applyTheme(t.value);
    else if (t.dataset.s) {
      S[t.dataset.s] = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.dataset.n ? +t.value : t.value;
      save();
      if (t.dataset.s === 'rot') layout();
      if (t.dataset.s === 'pq') sizeCanvas();
    }
  });

  function syncButtons() {
    $('#bsh')?.classList.toggle('on', !!S.sh);
    $('#brp')?.classList.toggle('on', S.rp !== 'off');
    if ($('#brp')) $('#brp').innerHTML = icon('repeat') + (S.rp === 'one' ? '1' : '');
  }

  $('#app')?.addEventListener('toggle', (e: any) => {
    const d = e.target;
    if (d.dataset && d.dataset.sec) openSections[d.dataset.sec] = d.open;
  }, true);

  // Canvas Drag & Waveform Seek
  let dragState: any = null;
  cv.addEventListener('pointerdown', (e: PointerEvent) => {
    const l = layers[selected];
    if (recorder || !l || l.lock || l.type === 'bg') return;
    const rect = cv.getBoundingClientRect();
    const scale = Math.min(rect.width / cv.width, rect.height / cv.height);
    dragState = {
      ox: rect.left + (rect.width - cv.width * scale) / 2,
      oy: rect.top + (rect.height - cv.height * scale) / 2,
      w: cv.width * scale, h: cv.height * scale,
      sx: e.clientX, sy: e.clientY, x: l.x, y: l.y
    };
    cv.setPointerCapture(e.pointerId);
    touch();
  });
  cv.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragState) return;
    const l = layers[selected];
    l.x = clamp(dragState.x + (e.clientX - dragState.sx) / dragState.w * 100, 0, 100);
    l.y = clamp(dragState.y + (e.clientY - dragState.sy) / dragState.h * 100, 0, 100);
    touch();
  });
  const endDrag = () => { if (dragState) { dragState = null; renderInspector(); } };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  let seeking = false;
  const seekTo = (e: MouseEvent) => {
    const rect = $('#wfw')?.getBoundingClientRect();
    if (rect && audioPlayer.duration) audioPlayer.currentTime = clamp((e.clientX - rect.left) / rect.width, 0, 1) * audioPlayer.duration;
  };
  $('#wfw')?.addEventListener('pointerdown', (e: PointerEvent) => { seeking = true; $('#wfw')?.setPointerCapture(e.pointerId); seekTo(e); });
  $('#wfw')?.addEventListener('pointermove', (e: PointerEvent) => { if (seeking) seekTo(e); });
  $('#wfw')?.addEventListener('pointerup', () => seeking = false);

  // Layout & Rotation
  function layout() {
    const pw = window.innerWidth, ph = window.innerHeight, portrait = ph > pw;
    let rotation = 0;
    if (S.rot === 'portrait' && !portrait) rotation = -90;
    if (S.rot === 'landscape' && portrait) rotation = 90;
    const app = $('#app');
    if (app) {
      app.style.cssText = rotation === 90
        ? `inset:auto;top:0;left:${pw}px;width:${ph}px;height:${pw}px;transform:rotate(90deg);transform-origin:0 0`
        : rotation === -90
        ? `inset:auto;top:${ph}px;left:0;width:${ph}px;height:${pw}px;transform:rotate(-90deg);transform-origin:0 0`
        : '';
    }
    const w = rotation ? ph : pw;
    const wasWide = document.body.classList.contains('wide'), isWide = w >= 820;
    document.body.classList.toggle('wide', isWide);
    if (isWide && !wasWide && !panelOpen) setPanelOpen(true);
    setTimeout(drawWaveform, 60);
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);

  // Frame Loop
  let lastFrameTime = 0, frameCount = 0, fpsStartTime = 0;
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!recorder && now - lastFrameTime < 1000 / S.fps - 2) return;
    lastFrameTime = now;

    if (recorder && !recorderPaused) {
      if (lastRecFrameTime && now - lastRecFrameTime > 2500 / S.xfps) droppedFrames++;
      lastRecFrameTime = now;
    } else lastRecFrameTime = 0;

    analyse(now);
    render(now / 1000);

    if (recorder && S.t1 > 0 && audioPlayer.currentTime >= Math.min(S.t1, audioPlayer.duration)) finishRecording();

    const dur = audioPlayer.duration;
    if (dur) {
      const p = audioPlayer.currentTime / dur;
      if ($('#ph')) $('#ph').style.left = p * 100 + '%';
      if ($('#tc')) $('#tc').textContent = fmt(audioPlayer.currentTime) + ' / ' + fmt(dur);
      if (recorder) {
        const start = S.t0, end = S.t1 > 0 ? Math.min(S.t1, dur) : dur;
        const progress = clamp((audioPlayer.currentTime - start) / Math.max(1, end - start), 0, 1);
        const xp = $('#xp'); if (xp) xp.value = progress;
        const xs = $('#xs');
        if (xs && !recorderPaused) xs.textContent = `Recording ${(progress * 100).toFixed(0)}%, about ${fmt((end - audioPlayer.currentTime) / audioPlayer.rate)} left`;
      }
    }

    frameCount++;
    if (now - fpsStartTime > 500) {
      if (S.showFps) { if ($('#fps')) $('#fps').textContent = Math.round(frameCount * 1000 / (now - fpsStartTime)) + ' FPS'; }
      else { if ($('#fps')) $('#fps').textContent = ''; }
      frameCount = 0;
      fpsStartTime = now;
    }

    const mon = $('#mon') as HTMLCanvasElement;
    if (mon) {
      const r = { width: mon.clientWidth || 300 };
      if (mon.width !== r.width) mon.width = r.width;
      if (mon.height !== 90) mon.height = 90;
      const x = mon.getContext('2d')!, W = mon.width;
      x.clearRect(0, 0, W, 90);
      const N = 64;

      // Draw FFT spectrum bars
      for (let i = 0; i < N; i++) {
        const v = bandAverage(freqPosition({ f0: S.lowerHz || 20, f1: S.higherHz || 16000, fsc: 'log' }, i / N), freqPosition({ f0: S.lowerHz || 20, f1: S.higherHz || 16000, fsc: 'log' }, (i + 1) / N));
        const inBeatRange = i >= (S.beatBarFirst || 1) && i <= (S.beatBarLast || 14);
        x.fillStyle = inBeatRange && v >= (S.beatValLower || 0.15) ? '#00e5c0' : (inBeatRange ? '#458575' : '#6a6a75');
        x.fillRect(i * W / N, 56 - v * 54, W / N - 1, v * 54);
      }

      // Draw Avee Beat Range Box
      const b0 = Math.max(0, Math.min(N - 1, S.beatBarFirst || 1));
      const b1 = Math.max(b0, Math.min(N - 1, S.beatBarLast || 14));
      const x0 = b0 * W / N;
      const x1 = (b1 + 1) * W / N;
      const boxW = Math.max(4, x1 - x0);
      const yBottom = 56 - (S.beatValLower !== undefined ? S.beatValLower : 0.15) * 54;
      const yTop = 56 - (S.beatValHigher !== undefined ? S.beatValHigher : 0.75) * 54;
      const boxH = Math.max(2, yBottom - yTop);

      x.strokeStyle = beatNow ? '#00e5c0' : '#d97757';
      x.lineWidth = 1.5;
      x.fillStyle = beatNow ? 'rgba(0,229,192,0.18)' : 'rgba(217,119,87,0.08)';
      x.fillRect(x0, yTop, boxW, boxH);
      x.strokeRect(x0, yTop, boxW, boxH);

      // Label inside monitor
      x.font = '8px Inter, system-ui';
      x.fillStyle = beatNow ? '#00e5c0' : '#ffffff';
      x.fillText(beatNow ? '★ BEAT ACTIVE' : 'BEAT BOX', x0 + 3, Math.max(10, yTop + 10));

      // Draw bottom source analysis
      ANALYSIS_SOURCES.forEach((k, i) => {
        const v = smoothValues[k] || 0;
        x.fillStyle = k === 'beat' && beatNow ? '#00e5c0' : '#8e8e93';
        x.fillRect(i * W / ANALYSIS_SOURCES.length, 90 - v * 28, W / ANALYSIS_SOURCES.length - 2, v * 28);
      });
    }
  }

  // Init
  initAutosave();
  if ($('#proj-badge')) $('#proj-badge').textContent = S.projectName || 'My Visualizer Project';
  cv.addEventListener('click', () => {
    if (document.body.classList.contains('fullscreen-mode')) {
      document.body.classList.remove('fullscreen-mode');
      sizeCanvas();
      toast('Exited fullscreen', 'ok');
    }
  });
  applyTheme(S.theme);
  syncSettings();
  syncButtons();
  layout();
  sizeCanvas();
  showTab('lib');
  requestAnimationFrame(frame);

  const applyCapCutLook = () => document.body.classList.toggle('cc', S.cc === undefined || !!S.cc);
  applyCapCutLook();
  $('#set')?.addEventListener('change', (e: any) => { if (e.target.dataset && e.target.dataset.s === 'cc') applyCapCutLook(); });
  applyTheme(S.theme);

  // PWA Installation handling
  let deferredPrompt: any = null;
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#btn-install');
    if (btn) btn.style.display = 'inline-flex';
    const status = $('#pwa-status');
    if (status) status.textContent = 'App ready to install to your home screen.';
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const btn = $('#btn-install');
    if (btn) btn.style.display = 'none';
    const status = $('#pwa-status');
    if (status) status.textContent = 'Installed as Native PWA.';
    toast('App installed successfully!', 'ok');
  });

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  if (isStandalone) {
    const status = $('#pwa-status');
    if (status) status.textContent = 'Running in standalone native app mode.';
  }

  async function triggerInstallPrompt() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        toast('Installing AUDIOVIS to your home screen...', 'ok');
      }
      deferredPrompt = null;
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        toast('To install on iOS: tap Share (⎋) then "Add to Home Screen" (+)', 'ok');
      } else if (isStandalone) {
        toast('App is already installed and running native!', 'ok');
      } else {
        toast('To install: click browser menu (⋮) and select "Install app" or "Add to Home screen"', 'ok');
      }
    }
  }
}
