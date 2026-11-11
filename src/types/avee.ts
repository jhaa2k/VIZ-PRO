/**
 * Types for Avee Player .viz format and AUDIOVIS visualizer engine
 */

export interface AveeRawProperty<T = any> {
  v: T;
  type?: string;
}

export interface AveeElement {
  objType: string;
  tag?: AveeRawProperty<string> | string;
  visible?: AveeRawProperty<boolean> | boolean;
  position?: AveeRawProperty<string> | string; // e.g. "0.5 0.5 0"
  scale?: AveeRawProperty<string> | string;    // e.g. "1 1 1"
  rotation?: AveeRawProperty<number> | number;
  color?: AveeRawProperty<string> | string;    // e.g. "1 1 1 1" or "#ffffff"
  color2?: AveeRawProperty<string> | string;
  blendMode?: AveeRawProperty<string> | string;
  customImage?: AveeRawProperty<string> | string; // "local:logo.png" or "internalres:white"
  sampleOutCount?: AveeRawProperty<number> | number;
  barCount?: AveeRawProperty<number> | number;
  lowerHz?: AveeRawProperty<number> | number;
  higherHz?: AveeRawProperty<number> | number;
  text?: AveeRawProperty<string> | string;
  fontSize?: AveeRawProperty<number> | number;
  particleCount?: AveeRawProperty<number> | number;
  radius?: AveeRawProperty<number> | number;
  [key: string]: any;
}

export interface AveeComposition {
  elements: AveeElement[];
  [key: string]: any;
}

export interface AveeScene {
  version: number;
  appVersion?: string;
  compositions: AveeComposition[];
  [key: string]: any;
}

export type LayerType =
  | 'bars'
  | 'barsh'
  | 'circle'
  | 'multiring'
  | 'concentric'
  | 'ring'
  | 'pulse'
  | 'wave'
  | 'wavec'
  | 'scope'
  | 'dots'
  | 'lines'
  | 'blocks'
  | 'grid'
  | 'particles'
  | 'shape'
  | 'text'
  | 'image'
  | 'bg';

export type BlendMode =
  | 'source-over'
  | 'lighter'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'color-dodge'
  | 'difference';

export type AudioAnalysisSource =
  | 'bass'
  | 'sub'
  | 'lowmid'
  | 'mid'
  | 'upmid'
  | 'presence'
  | 'brill'
  | 'volume'
  | 'peak'
  | 'beat'
  | 'kick'
  | 'snare'
  | 'flux'
  | 'left'
  | 'right';

export interface ReactiveRule {
  id: string;
  on: boolean;
  src: AudioAnalysisSource;
  prop: string;
  i0: number; // In min (0-1)
  i1: number; // In max (0-1)
  o0: number; // Out min
  o1: number; // Out max
  cv: 'linear' | 'ease_in' | 'ease_out' | 'smooth' | 'step';
  inv: boolean;
  att: number; // Attack smoothing (1-100)
  rel: number; // Release smoothing (1-100)
  _v?: number;
}

export interface VisualizerLayer {
  id: string;
  type: LayerType;
  name: string;
  vis: boolean;
  lock: boolean;
  // Transform
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  sx: number; // Scale X %
  sy: number; // Scale Y %
  uni: boolean;
  rot: number; // deg -180 to 180
  spin: number; // deg/sec
  op: number; // Opacity 0 - 100
  blend: BlendMode;
  // Geometry & Bars
  n: number; // count
  thick: number; // thickness %
  round: number; // corner round %
  maxH: number; // max length/size %
  r0: number; // inner radius %
  a0: number; // start angle deg
  a1: number; // end angle deg
  rings: number;
  seg: number;
  dir: 'up' | 'down' | 'both';
  odir: 'out' | 'in' | 'both';
  mir: 'none' | 'mirror' | 'sym';
  ws: 'line' | 'spiky';
  wfill: boolean;
  // Shape & Text
  shape: 'circle' | 'rect' | 'triangle' | 'star' | 'capsule';
  sides: number;
  text: string;
  fz: number; // font size
  font: string;
  fw: number; // font weight
  fi: boolean; // italic
  up: boolean; // uppercase
  ls: number; // letter spacing
  al: 'left' | 'center' | 'right';
  sw: number; // stroke width
  sc: string; // stroke color
  mask: 'none' | 'circle';
  // Audio Frequency
  band: string;
  f0: number; // min Hz
  f1: number; // max Hz
  fsc: 'log' | 'linear' | 'mel';
  sens: number; // sensitivity %
  att: number;
  rel: number;
  // Colors & Gradients
  color: string;
  color2: string;
  color3: string;
  three: boolean;
  grad: 'solid' | 'linear' | 'radial' | 'conic';
  gAng: number;
  gAnim: number;
  // Visual Effects
  glow: number;
  shOff: number;
  blur: number;
  hue: number;
  bright: number;
  contr: number;
  sat: number;
  // Animation
  anim: 'none' | 'pulse' | 'bounce' | 'sway' | 'fade';
  as: number;
  aa: number;
  // Reactive Rules
  rules: ReactiveRule[];
  // Image reference
  imageRef?: string; // e.g. "local:logo.png" or data URL
  _img?: HTMLImageElement | null;
  _smooth?: number[];
  _particles?: Array<{ x: number; y: number; vx: number; vy: number; l: number; size?: number; color?: string; r?: number; a?: number }>;
  _history?: number[][];
  _randomVals?: number[];
  // Avee Player metadata preservation
  aveeOriginalType?: string;
  aveeRawProps?: Record<string, any>;
}

export interface SceneSettings {
  bg: string;
  cam: number; // Camera bass bounce 0-30
  vig: number; // Vignette 0-100
  scan: number; // Scanlines 0-100
  grain: number; // Film grain 0-100
  flash: number; // Beat flash 0-100
  rgbSplit: number; // Chromatic aberration 0-20
}

export interface AudioSettings {
  vol: number;
  pre: number;
  bass: number;
  bal: number;
  speed: number;
  norm: boolean;
  rev: number;
  dly: number;
  dist: number;
  eq: number[];
  fft: number;
  smooth: number;
  floor: number;
  beat: number;
}

export interface AveeTemplateMeta {
  name: string;
  author?: string;
  version: number;
  elementsCount: number;
  embeddedAssets: Map<string, { blob: Blob; url: string; size: number }>;
  rawJson?: string;
}

export interface AudioTrackItem {
  id: string;
  name: string;
  artist: string;
  duration: number;
  file?: File;
  audioBuffer?: AudioBuffer | null;
}
