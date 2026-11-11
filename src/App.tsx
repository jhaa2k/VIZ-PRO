import React, { useEffect } from 'react';
import JSZip from 'jszip';
import { initAppletEngine } from './appletEngine.ts';

export default function App() {
  useEffect(() => {
    (window as any).JSZip = JSZip;
    initAppletEngine();
  }, []);

  return <div id="app-root" className="w-full h-full" dangerouslySetInnerHTML={{ __html: APP_HTML }} />;
}

// Below is the exact HTML structure and complete script with Avee features implanted
const APP_HTML = `
<!-- SVG ICON DEFINITIONS (hidden) -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></symbol>
<symbol id="i-prev" viewBox="0 0 24 24"><path d="M6 5v14M19 5L8 12l11 7z"/></symbol>
<symbol id="i-next" viewBox="0 0 24 24"><path d="M18 5v14M5 5l11 7L5 19z"/></symbol>
<symbol id="i-shuffle" viewBox="0 0 24 24"><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/></symbol>
<symbol id="i-repeat" viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3"/></symbol>
<symbol id="i-lib" viewBox="0 0 24 24"><path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z"/></symbol>
<symbol id="i-lay" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/></symbol>
<symbol id="i-pre" viewBox="0 0 24 24"><path d="M12 20.5s-8.5-5.2-8.5-11.1A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 2.8c0 5.9-8.5 11.1-8.5 11.1z"/></symbol>
<symbol id="i-aud" viewBox="0 0 24 24"><path d="M4 16V8M8 20V4M12 14V10M16 18V6M20 15V9"/></symbol>
<symbol id="i-scn" viewBox="0 0 24 24"><path d="M3 4h18v16H3zM3 16l5-4 4 3 4-5 5 5"/></symbol>
<symbol id="i-exp" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></symbol>
<symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></symbol>
<symbol id="i-redo" viewBox="0 0 24 24"><path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/></symbol>
<symbol id="i-panel" viewBox="0 0 24 24"><path d="M3 4h18v16H3zM15 4v16"/></symbol>
<symbol id="i-set" viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2M14 4v4h4V4zM6 10v4h4v-4zM14 16v4h4v-4z"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.1 4M6.2 6.2A18.6 18.6 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.1-.8"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
<symbol id="i-unlock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></symbol>
<symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></symbol>
<symbol id="i-dup" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></symbol>
<symbol id="i-paste" viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/></symbol>
<symbol id="i-reset" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>
<symbol id="i-fullscreen" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></symbol>
<symbol id="i-aspect" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></symbol>
<symbol id="i-tap" viewBox="0 0 24 24"><path d="M12 2v6m-4-2l4-4 4 4"/><circle cx="12" cy="15" r="5"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></symbol>
</defs></svg>

<!-- APP STRUCTURE -->
<div id="app">
  <!-- HEADER -->
  <header>
    <div style="display:flex;align-items:center;gap:6px;overflow:hidden">
      <span class="logo">AUDIOVIS</span>
      <span id="proj-badge" style="font-size:10px;padding:2px 6px;border-radius:var(--r);background:var(--p2);color:var(--dm);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis">Project</span>
    </div>
    <span class="sp"></span>
    <button class="btn-java-convert" data-act="java-convert" title="Convert to Android Java App">☕ Java App</button>
    <button class="btn-pwa-install" id="btn-install" data-act="pwa-install" style="display:none;margin-right:2px">📥 Install</button>
    <button class="ib" data-act="help" aria-label="Help & Gestures"><svg class="i"><use href="#i-help"/></svg></button>
    <button class="ib" data-act="undo" aria-label="Undo"><svg class="i"><use href="#i-undo"/></svg></button>
    <button class="ib" data-act="redo" aria-label="Redo"><svg class="i"><use href="#i-redo"/></svg></button>
    <button class="ib" data-act="panel" aria-label="Panel"><svg class="i"><use href="#i-panel"/></svg></button>
    <button class="ib" data-act="set" aria-label="Settings"><svg class="i"><use href="#i-set"/></svg></button>
  </header>

  <!-- MAIN CONTENT -->
  <main id="mn">
    <!-- STAGE: Canvas & Transport -->
    <section class="stage">
      <div class="cvw">
        <canvas id="cv" width="960" height="540"></canvas>
        <div class="hud">
          <span id="bdg">PREVIEW</span>
          <span id="hud-beat" style="display:inline-flex;align-items:center;gap:4px">BPM <b id="hud-bpm">--</b><i id="hud-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--dm);transition:all .1s"></i></span>
          <span id="res"></span>
          <span id="fps"></span>
          <button id="btn-fs" data-act="fullscreen" class="ib" style="width:24px;height:24px;min-height:0;padding:0;background:rgba(0,0,0,0.6);border-radius:var(--r);color:#fff" aria-label="Fullscreen"><svg class="i" style="width:14px;height:14px"><use href="#i-fullscreen"/></svg></button>
        </div>
      </div>
      <div class="tp">
        <div class="tr1">
          <span id="tt">No Track Loaded</span>
          <span id="tc">0:00 / 0:00</span>
        </div>
        <div class="tr2">
          <button id="bsh" data-act="shuf" aria-label="Shuffle"><svg class="i"><use href="#i-shuffle"/></svg></button>
          <button data-act="prev" aria-label="Previous"><svg class="i"><use href="#i-prev"/></svg></button>
          <button id="pl" class="pri" data-act="play" aria-label="Play or pause"><svg class="i"><use href="#i-play"/></svg></button>
          <button data-act="next" aria-label="Next"><svg class="i"><use href="#i-next"/></svg></button>
          <button id="brp" data-act="rpt" aria-label="Repeat"><svg class="i"><use href="#i-repeat"/></svg></button>
        </div>
        <div class="wfw" id="wfw">
          <canvas id="wf"></canvas>
          <div id="ph"></div>
        </div>
      </div>
    </section>

    <!-- SIDE PANEL (Inspector/Library/etc) -->
    <aside id="side">
      <div class="sh">
        <span id="st"></span>
        <span class="hb">
          <button class="ib" id="pl2" data-act="play" aria-label="Play or pause"><svg class="i"><use href="#i-play"/></svg></button>
          <button class="ib" id="oszb" data-act="osz" aria-label="Panel size"><svg class="i"><use href="#i-chev"/></svg></button>
          <button class="ib" data-act="close" aria-label="Close"><svg class="i"><use href="#i-close"/></svg></button>
        </span>
      </div>
      <div id="sb"></div>
    </aside>
  </main>

  <!-- BOTTOM NAVIGATION -->
  <nav id="nav">
    <button data-act="tab" data-t="lib"><svg class="i"><use href="#i-lib"/></svg>Media</button>
    <button data-act="tab" data-t="lay"><svg class="i"><use href="#i-lay"/></svg>Layers</button>
    <button data-act="tab" data-t="pre"><svg class="i"><use href="#i-pre"/></svg>Presets</button>
    <button data-act="tab" data-t="aud"><svg class="i"><use href="#i-aud"/></svg>Audio</button>
    <button data-act="tab" data-t="scn"><svg class="i"><use href="#i-scn"/></svg>Scene</button>
    <button data-act="tab" data-t="exp"><svg class="i"><use href="#i-exp"/></svg>Export</button>
  </nav>

  <!-- SETTINGS OVERLAY -->
  <div id="set" hidden>
    <div class="sh">
      <span>Settings & Performance</span>
      <button class="pri" data-act="setx">Close</button>
    </div>
    <div class="bd">
      <label class="f">Theme<select id="theme"></select></label>
      <label class="f">Rotation<select data-s="rot"><option value="auto">Auto (device)</option><option value="portrait">Manual portrait</option><option value="landscape">Manual landscape</option></select></label>
      <div class="dm">Manual rotation turns the app itself, so it works with the phone's rotation lock on.</div>
      <label class="f">Preview quality<select data-s="pq" data-n="1"><option value="40">Low 40% (Battery Saver)</option><option value="60">Medium 60%</option><option value="75">High 75%</option><option value="100">Full 100% (High End)</option></select></label>
      <label class="f">Frame limit<select data-s="fps" data-n="1"><option value="24">24 fps</option><option value="30">30 fps (low power)</option><option value="60">60 fps (smooth)</option></select></label>
      <label class="f">Mode<select data-s="advMode"><option value="0">Beginner (Streamlined)</option><option value="1">Advanced (Full DSP & Avee)</option></select></label>
      <label class="f">Rounded CapCut look<input type="checkbox" data-s="cc"></label>
      <label class="f">Show FPS<input type="checkbox" data-s="showFps"></label>
      <label class="f">Guides<input type="checkbox" data-s="guides"></label>
      <label class="f">Haptic Feedback<input type="checkbox" data-s="haptics"></label>
      <div class="dm">Guides show centre lines, thirds and a 90% safe area in preview. Drag on canvas to move selected layer.</div>
      <div class="sec">Native Android PWA</div>
      <div class="row"><button class="pri" data-act="pwa-install" id="btn-pwa-action" style="flex:1">📲 Install App to Android / Home Screen</button></div>
      <div id="pwa-status" class="dm">Fast offline access, full-screen display & zero browser chrome.</div>
      <div class="row"><button data-act="help">📖 Mobile Gestures & Avee Guide</button></div>
      <div class="row"><button data-act="rstset">Reset settings</button><button class="dg" data-act="clr">Clear saved projects</button></div>
    </div>
  </div>

  <!-- HELP & GESTURES MODAL -->
  <div id="help-modal" hidden style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(16px);z-index:25;display:flex;flex-direction:column;padding:env(safe-area-inset-top,10px) 16px 20px">
    <div class="sh" style="padding:10px 0;border-bottom:1px solid var(--ln)">
      <span style="font-weight:800;font-size:16px;color:var(--tx)">Mobile Visualizer Guide</span>
      <button class="pri" data-act="helpx">Got it</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:12px 0;display:flex;flex-direction:column;gap:12px;font-size:12px;line-height:1.5;color:var(--tx)">
      <div style="background:var(--p2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
        <div style="font-weight:700;color:var(--ac);margin-bottom:4px">👆 Touch Gestures on Preview</div>
        <div>• <b>1-Finger Drag:</b> Touch and drag anywhere on the canvas to move the currently selected layer.</div>
        <div>• <b>Pinch to Zoom:</b> Use 2 fingers to zoom or scale on mobile screen.</div>
        <div>• <b>Guides:</b> Turn on 'Guides' in Settings to view 90% action safe margins and center lines.</div>
      </div>
      <div style="background:var(--p2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
        <div style="font-weight:700;color:var(--ac);margin-bottom:4px">📦 Avee Player .viz Templates</div>
        <div>• <b>Read / Import:</b> Go to <i>Presets</i> tab → Tap <i>Import Avee .viz</i>. Supports .viz ZIP archives with scene.json and bundled artwork.</div>
        <div>• <b>Export .viz:</b> Tap <i>Save Avee .viz (ZIP)</i> to generate a real Avee-compatible archive ready for mobile players.</div>
      </div>
      <div style="background:var(--p2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
        <div style="font-weight:700;color:var(--ac);margin-bottom:4px">🥁 Beat Range Box & DSP</div>
        <div>• <b>Audio Tab:</b> Monitor the live frequency spectrum with an overlaid <b>Beat Range Box</b>.</div>
        <div>• <b>Tap Tempo:</b> Tap rhythmically to lock in track BPM for synchronized pulses and camera shakes.</div>
      </div>
      <div style="background:var(--p2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
        <div style="font-weight:700;color:var(--ac);margin-bottom:4px">🎬 Social Export Presets</div>
        <div>• <b>Export Tab:</b> Select YouTube (16:9), Shorts / TikTok (9:16), or Instagram (1:1 / 4:5) for optimal aspect ratio and bitrate.</div>
        <div>• <b>Still PNG:</b> Capture full-resolution single frame for YouTube thumbnails or album art.</div>
      </div>
    </div>
  </div>

  <!-- ANDROID JAVA CODE & APP CONVERTER MODAL -->
  <div id="java-modal" hidden>
    <div class="sh" style="padding:10px 0;border-bottom:1px solid var(--ln);display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;font-size:15px;color:var(--tx)">☕ Android Java App & Code Converter</span>
        <span style="font-size:10px;padding:2px 6px;border-radius:var(--rp);background:#18e08a22;color:#18e08a;font-weight:700">Native APK Ready</span>
      </div>
      <button class="pri" data-act="javax">Close</button>
    </div>

    <!-- Quick Actions Bar -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;padding:10px 0;align-items:center">
      <button class="pri" data-act="java-download-zip" style="display:flex;align-items:center;gap:6px;font-size:12px;background:#00e5c0;color:#000;font-weight:800">
        📦 Download Android Studio Project (.zip)
      </button>
      <button data-act="java-copy-code" style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--p2);border:1px solid var(--ln)">
        📋 Copy Current Code
      </button>
      <button class="btn-pwa-install" data-act="pwa-install" style="font-size:12px">
        📲 Install App Directly on Android
      </button>
    </div>

    <!-- Tab bar for file navigation -->
    <div class="java-tab-bar" id="java-tabs">
      <button class="java-tab-btn active" data-act="java-tab" data-f="MainActivity.java">MainActivity.java</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="VisualizerView.java">VisualizerView.java</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="AudioEngine.java">AudioEngine.java</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="AveeVizParser.java">AveeVizParser.java</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="activity_main.xml">activity_main.xml</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="AndroidManifest.xml">AndroidManifest.xml</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="build.gradle">build.gradle</button>
      <button class="java-tab-btn" data-act="java-tab" data-f="README.md">README.md (Guide)</button>
    </div>

    <!-- Code Display -->
    <pre class="java-code-pre"><code id="java-code-display">// Loading Java Android Source Code...</code></pre>

    <!-- Quick Android Studio Instruction Card -->
    <div style="background:var(--p2);border-radius:var(--r);padding:10px 12px;margin-top:8px;border:1px solid var(--ln);font-size:11px;line-height:1.4">
      <b style="color:var(--ac)">💡 Android Phone me APK kaise banayein (How to Build APK):</b>
      <div>1. <b>Download .zip</b> par click karein aur file extract karein.</div>
      <div>2. <b>Android Studio</b> me <i>Open Project</i> select karein.</div>
      <div>3. Top menu me <b>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</b> par tap karein.</div>
      <div style="color:var(--dm);margin-top:2px">Directly runs on any Android phone (Android 7.0 to Android 14+), with 60 FPS hardware-accelerated Canvas & Avee .viz support.</div>
    </div>
  </div>

  <div id="toast"></div>
</div>
`;
