/**
 * Full Avee Player .viz Reader, Editor & Exporter
 * Supports ZIP archives containing scene.json & embedded images, as well as direct JSON .viz files.
 */

import JSZip from 'jszip';
import {
  AveeScene,
  AveeElement,
  AveeTemplateMeta,
  VisualizerLayer,
  SceneSettings,
  BlendMode,
} from '../types/avee';

export const DEFAULT_LAYER: Omit<VisualizerLayer, 'id' | 'type' | 'name'> = {
  vis: true,
  lock: false,
  x: 50,
  y: 50,
  sx: 100,
  sy: 100,
  uni: false,
  rot: 0,
  spin: 0,
  op: 100,
  blend: 'source-over',
  n: 48,
  thick: 70,
  round: 0,
  maxH: 100,
  r0: 60,
  a0: -90,
  a1: 270,
  rings: 3,
  seg: 8,
  dir: 'up',
  odir: 'out',
  mir: 'none',
  ws: 'line',
  wfill: false,
  shape: 'circle',
  sides: 5,
  text: 'AUDIOVIS',
  fz: 12,
  font: 'Plus Jakarta Sans',
  fw: 800,
  fi: false,
  up: false,
  ls: 0,
  al: 'center',
  sw: 0,
  sc: '#ffffff',
  mask: 'none',
  band: 'all',
  f0: 30,
  f1: 16000,
  fsc: 'log',
  sens: 100,
  att: 60,
  rel: 15,
  color: '#00e5c0',
  color2: '#6d8cff',
  color3: '#ff6a3d',
  three: false,
  grad: 'linear',
  gAng: 90,
  gAnim: 0,
  glow: 0,
  shOff: 0,
  blur: 0,
  hue: 0,
  bright: 100,
  contr: 100,
  sat: 100,
  anim: 'none',
  as: 1,
  aa: 30,
  rules: [],
};

export const DEFAULT_SCENE: SceneSettings = {
  bg: '#0a0b0e',
  cam: 0,
  vig: 20,
  scan: 0,
  grain: 0,
  flash: 0,
  rgbSplit: 0,
};

let layerCounter = 1;

export function createLayer(
  type: VisualizerLayer['type'],
  overrides: Partial<VisualizerLayer> = {}
): VisualizerLayer {
  return {
    ...DEFAULT_LAYER,
    id: `layer-${Date.now()}-${layerCounter++}`,
    type,
    name: overrides.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${layerCounter}`,
    rules: [],
    ...overrides,
  };
}

/**
 * Extracts a property value from Avee format (handles both `{ v: ... }` and raw values)
 */
function getAveeProp<T>(obj: any, key: string, fallback: T): T {
  if (!obj || obj[key] === undefined) return fallback;
  const val = obj[key];
  if (typeof val === 'object' && val !== null && 'v' in val) {
    return val.v !== undefined ? val.v : fallback;
  }
  return val;
}

/**
 * Parses vector string "0.5 0.5 0" into [x, y, z] numbers
 */
function parseVec(val: any, defaultVals: number[] = [0.5, 0.5, 0]): number[] {
  if (!val) return defaultVals;
  const str = typeof val === 'string' ? val : (val.v || '');
  const parts = String(str).trim().split(/\s+/).map(Number);
  return [
    isFinite(parts[0]) ? parts[0] : defaultVals[0],
    isFinite(parts[1]) ? parts[1] : defaultVals[1],
    isFinite(parts[2]) ? parts[2] : (defaultVals[2] || 0),
  ];
}

/**
 * Maps Avee color format "1 1 1 1" or "#rrggbb" into CSS hex / rgba
 */
function parseAveeColor(val: any, fallback = '#ffffff'): string {
  if (!val) return fallback;
  const raw = typeof val === 'string' ? val : (val.v || '');
  if (typeof raw === 'string' && raw.startsWith('#')) return raw;
  const parts = String(raw).trim().split(/\s+/).map(Number);
  if (parts.length >= 3 && isFinite(parts[0])) {
    const r = Math.round(clamp(parts[0], 0, 1) * 255);
    const g = Math.round(clamp(parts[1], 0, 1) * 255);
    const b = Math.round(clamp(parts[2], 0, 1) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return fallback;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Reads any .viz file (either Avee Player ZIP container or JSON)
 */
export async function readAveeVizFile(file: File): Promise<{
  layers: VisualizerLayer[];
  scene: SceneSettings;
  meta: AveeTemplateMeta;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const embeddedAssets = new Map<string, { blob: Blob; url: string; size: number }>();
  let sceneJson: AveeScene | null = null;
  let rawJsonText = '';

  // Check for ZIP magic number (PK\x03\x04 = 0x50 0x4B 0x03 0x04)
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (isZip) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Look for scene.json or composition.json
    let sceneFile = zip.file('scene.json') || zip.file('composition.json');
    if (!sceneFile) {
      // Find any json file in the root of the zip
      for (const [filename, fileObj] of Object.entries(zip.files)) {
        if (filename.endsWith('.json') && !fileObj.dir) {
          sceneFile = fileObj;
          break;
        }
      }
    }

    if (sceneFile) {
      rawJsonText = await sceneFile.async('text');
      try {
        sceneJson = JSON.parse(rawJsonText);
      } catch (err) {
        console.error('Failed to parse scene.json inside Avee .viz', err);
      }
    }

    // Extract all image assets
    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (fileObj.dir) continue;
      if (/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(filename)) {
        const blob = await fileObj.async('blob');
        const url = URL.createObjectURL(blob);
        embeddedAssets.set(filename, { blob, url, size: blob.size });
        // Also map without path or prefix
        const cleanName = filename.split('/').pop() || filename;
        embeddedAssets.set(`local:${cleanName}`, { blob, url, size: blob.size });
      }
    }
  } else {
    // Attempt parsing as direct JSON
    rawJsonText = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '').trim();
    try {
      sceneJson = JSON.parse(rawJsonText);
    } catch {
      throw new Error('Not a valid Avee Player .viz file (neither ZIP nor JSON).');
    }
  }

  if (!sceneJson) {
    throw new Error('Could not find scene definition inside .viz file.');
  }

  // Parse Avee elements
  const elements = sceneJson.compositions?.[0]?.elements || [];
  const parsedLayers: VisualizerLayer[] = [];
  const scene: SceneSettings = { ...DEFAULT_SCENE };

  // Audio provider configuration
  let audioProviderHz = { lower: 30, higher: 16000, bars: 64 };

  for (const el of elements) {
    const objType = el.objType || 'Element';
    const tag = String(getAveeProp(el, 'tag', objType)).slice(0, 48);
    const visible = Boolean(getAveeProp(el, 'visible', true));
    const [px, py] = parseVec(getAveeProp(el, 'position', '0.5 0.5 0'));
    const [sx, sy] = parseVec(getAveeProp(el, 'scale', '1 1 1'));
    const rot = Number(getAveeProp(el, 'rotation', 0)) || 0;
    const color = parseAveeColor(getAveeProp(el, 'color', null), '#00e5c0');
    const color2 = parseAveeColor(getAveeProp(el, 'color2', null), '#6d8cff');
    const blendRaw = String(getAveeProp(el, 'blendMode', 'Alpha'));

    let blend: BlendMode = 'source-over';
    if (/Screen/i.test(blendRaw)) blend = 'screen';
    else if (/Add|Lighter/i.test(blendRaw)) blend = 'lighter';
    else if (/Multiply/i.test(blendRaw)) blend = 'multiply';

    if (objType === 'AudioProvider') {
      audioProviderHz.lower = clamp(Number(getAveeProp(el, 'lowerHz', 30)), 20, 500);
      audioProviderHz.higher = clamp(Number(getAveeProp(el, 'higherHz', 16000)), 2000, 20000);
      audioProviderHz.bars = clamp(Number(getAveeProp(el, 'sampleOutCount', 64)), 16, 256);
      continue;
    }

    if (objType === 'Image') {
      const customImage = String(getAveeProp(el, 'customImage', ''));
      let imageObj: HTMLImageElement | null = null;
      let matchedRef: string | undefined = customImage;

      // Check if image is stored in embeddedAssets
      if (customImage.startsWith('local:')) {
        const localName = customImage.slice(6);
        const asset = embeddedAssets.get(customImage) || embeddedAssets.get(localName);
        if (asset) {
          const img = new Image();
          img.src = asset.url;
          imageObj = img;
        }
      } else if (customImage.startsWith('data:') || customImage.startsWith('blob:') || customImage.startsWith('http')) {
        const img = new Image();
        img.src = customImage;
        imageObj = img;
      }

      if (/internalres:(black|bg|dark)/i.test(customImage)) {
        parsedLayers.push(
          createLayer('bg', {
            name: tag || 'Background',
            color: '#08090c',
            color2: '#12141a',
            vis: visible,
          })
        );
      } else {
        parsedLayers.push(
          createLayer('image', {
            name: tag || 'Image',
            vis: visible,
            x: clamp(px * 100, 0, 100),
            y: clamp(py * 100, 0, 100),
            sx: clamp(sx * 100, 10, 400),
            sy: clamp(sy * 100, 10, 400),
            rot,
            blend,
            imageRef: matchedRef,
            _img: imageObj,
            mask: customImage.includes('circle') ? 'circle' : 'none',
            aveeOriginalType: objType,
            aveeRawProps: el,
          })
        );
      }
    } else if (/Spectrum|Bars|CircularSpectrum/i.test(objType)) {
      const isCircular = /Circular|Circle|Radial/i.test(objType) || /Circle/i.test(tag);
      const barCount = clamp(Number(getAveeProp(el, 'barCount', audioProviderHz.bars)), 16, 180);

      parsedLayers.push(
        createLayer(isCircular ? 'circle' : 'bars', {
          name: tag || (isCircular ? 'Circular Spectrum' : 'Bars Spectrum'),
          vis: visible,
          x: clamp(px * 100, 0, 100),
          y: clamp(py * 100, 0, 100),
          sx: clamp(sx * 100, 10, 300),
          sy: clamp(sy * 100, 10, 300),
          n: barCount,
          f0: audioProviderHz.lower,
          f1: audioProviderHz.higher,
          color,
          color2,
          rot,
          blend,
          aveeOriginalType: objType,
          aveeRawProps: el,
        })
      );
    } else if (/Wave|Waveform|Oscilloscope/i.test(objType)) {
      parsedLayers.push(
        createLayer('wave', {
          name: tag || 'Audio Waveform',
          vis: visible,
          x: clamp(px * 100, 0, 100),
          y: clamp(py * 100, 0, 100),
          color,
          color2,
          rot,
          blend,
          aveeOriginalType: objType,
          aveeRawProps: el,
        })
      );
    } else if (/Particles|Dust|Stars/i.test(objType)) {
      const count = clamp(Number(getAveeProp(el, 'particleCount', 90)), 20, 250);
      parsedLayers.push(
        createLayer('particles', {
          name: tag || 'Particles',
          vis: visible,
          n: count,
          color,
          color2,
          blend: 'lighter',
          aveeOriginalType: objType,
          aveeRawProps: el,
        })
      );
    } else if (/Text|Title|Artist/i.test(objType)) {
      const textVal = String(getAveeProp(el, 'text', '{ArtistOrTitle}'));
      parsedLayers.push(
        createLayer('text', {
          name: tag || 'Text',
          vis: visible,
          text: textVal,
          x: clamp(px * 100, 0, 100),
          y: clamp(py * 100, 0, 100),
          color,
          rot,
          blend,
          aveeOriginalType: objType,
          aveeRawProps: el,
        })
      );
    } else if (/Vignette/i.test(objType)) {
      scene.vig = 60;
    } else if (/RGB|Glitch/i.test(objType)) {
      scene.rgbSplit = 6;
    }
  }

  // If no visual layers were extracted, inject standard default visualizer
  if (parsedLayers.length === 0) {
    parsedLayers.push(
      createLayer('bg', { name: 'Dark Studio BG', color: '#090a0f', color2: '#161922' }),
      createLayer('circle', { name: 'Avee Bass Circle', n: 72, r0: 55, color: '#00e5c0', color2: '#6d8cff', glow: 12 }),
      createLayer('particles', { name: 'Floating Sparkles', n: 80, color: '#00e5c0' }),
      createLayer('text', { name: 'Track Title', text: '{ArtistOrTitle}', y: 50, fz: 14 })
    );
  }

  const meta: AveeTemplateMeta = {
    name: file.name.replace(/\.(viz|json)$/i, ''),
    author: String(sceneJson.author || 'Avee Creator'),
    version: Number(sceneJson.version || 1),
    elementsCount: elements.length || parsedLayers.length,
    embeddedAssets,
    rawJson: rawJsonText,
  };

  return { layers: parsedLayers, scene, meta };
}

/**
 * Builds a genuine Avee Player .viz file (ZIP container) or JSON
 */
export async function exportAveeVizFile(
  projectName: string,
  layers: VisualizerLayer[],
  scene: SceneSettings,
  embeddedAssets: Map<string, { blob: Blob; url: string; size: number }>
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Synthesize Avee compositions & elements
  const aveeElements: AveeElement[] = [];

  // Add AudioProvider as root element
  aveeElements.push({
    objType: 'AudioProvider',
    tag: { v: 'AudioProvider' },
    lowerHz: { v: 30 },
    higherHz: { v: 16000 },
    sampleOutCount: { v: 64 },
    beatDetection: { v: true },
  });

  // Convert each VisualizerLayer to corresponding Avee Player element
  for (const layer of layers) {
    const px = (layer.x / 100).toFixed(4);
    const py = (layer.y / 100).toFixed(4);
    const sx = (layer.sx / 100).toFixed(4);
    const sy = (layer.sy / 100).toFixed(4);

    let aveeColor = '1 1 1 1';
    if (layer.color.startsWith('#')) {
      const hex = layer.color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      aveeColor = `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} 1`;
    }

    const blendModeStr =
      layer.blend === 'screen' ? 'Screen' : layer.blend === 'lighter' ? 'Add' : 'Alpha';

    if (layer.type === 'bg') {
      aveeElements.push({
        objType: 'Image',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: '0.5 0.5 0' },
        scale: { v: '1 1 1' },
        color: { v: aveeColor },
        blendMode: { v: 'Alpha' },
        customImage: { v: 'internalres:black' },
      });
    } else if (layer.type === 'bars' || layer.type === 'barsh') {
      aveeElements.push({
        objType: 'Bars',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        scale: { v: `${sx} ${sy} 1` },
        rotation: { v: layer.rot },
        color: { v: aveeColor },
        blendMode: { v: blendModeStr },
        barCount: { v: layer.n },
        mirror: { v: layer.mir !== 'none' },
      });
    } else if (layer.type === 'circle' || layer.type === 'multiring') {
      aveeElements.push({
        objType: 'CircularSpectrum',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        scale: { v: `${sx} ${sy} 1` },
        rotation: { v: layer.rot },
        color: { v: aveeColor },
        blendMode: { v: blendModeStr },
        barCount: { v: layer.n },
        innerRadius: { v: layer.r0 / 100 },
      });
    } else if (layer.type === 'wave' || layer.type === 'wavec' || layer.type === 'scope') {
      aveeElements.push({
        objType: 'Waveform',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        scale: { v: `${sx} ${sy} 1` },
        color: { v: aveeColor },
        blendMode: { v: blendModeStr },
      });
    } else if (layer.type === 'particles') {
      aveeElements.push({
        objType: 'Particles',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        particleCount: { v: layer.n },
        color: { v: aveeColor },
        blendMode: { v: 'Add' },
      });
    } else if (layer.type === 'text') {
      aveeElements.push({
        objType: 'Text',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        text: { v: layer.text },
        fontSize: { v: layer.fz * 2 },
        color: { v: aveeColor },
        blendMode: { v: blendModeStr },
      });
    } else if (layer.type === 'image') {
      aveeElements.push({
        objType: 'Image',
        tag: { v: layer.name },
        visible: { v: layer.vis },
        position: { v: `${px} ${py} 0` },
        scale: { v: `${sx} ${sy} 1` },
        rotation: { v: layer.rot },
        color: { v: aveeColor },
        blendMode: { v: blendModeStr },
        customImage: { v: layer.imageRef || 'albumart' },
      });
    }
  }

  // Scene effects in Avee format
  if (scene.vig > 0) {
    aveeElements.push({
      objType: 'Vignette',
      tag: { v: 'Vignette' },
      intensity: { v: scene.vig / 100 },
    });
  }

  const aveeScene: AveeScene = {
    version: 1,
    appVersion: 'AUDIOVIS Avee Pro 3.0',
    title: projectName || 'AUDIOVIS Avee Template',
    author: 'AUDIOVIS Creator',
    compositions: [
      {
        elements: aveeElements,
      },
    ],
  };

  // 2. Put scene.json inside ZIP
  zip.file('scene.json', JSON.stringify(aveeScene, null, 2));

  // 3. Put all embedded image assets into the ZIP archive
  for (const [key, asset] of embeddedAssets.entries()) {
    const filename = key.replace(/^local:/, '');
    zip.file(filename, asset.blob);
  }

  // 4. Generate the ZIP blob
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/octet-stream',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
