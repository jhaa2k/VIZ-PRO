# Android Music Visualizer & Video Maker

## Android-First Product Specification and Implementation Blueprint

**Product type:** Native Android application\
**Product goal:** A professional, layer-based, audio-reactive visualizer
and music-video maker inspired by the workflow of Avee Player.\
**Primary device:** Android phone; tablet layouts are supported as an
enhancement.\
**Design principle:** Mobile-first, touch-friendly, performant, and
genuinely functional. Do not copy desktop workflows that are awkward or
unreliable on phones.

------------------------------------------------------------------------

# 0. Android Feasibility Rules

Every feature in this specification belongs to one of these
implementation classes:

-   **ANDROID CORE:** Achievable with standard Android APIs and a
    well-designed native implementation.
-   **ANDROID GPU:** Achievable using OpenGL ES or Vulkan, but needs
    device testing and performance fallbacks.
-   **LIBRARY / CODEC DEPENDENT:** Achievable when a suitable Android
    library or device codec is available.
-   **OS RESTRICTED:** Possible only within Android's permissions and
    background-execution rules.
-   **OPTIONAL ADVANCED:** Useful but should not block the first stable
    release.

Do not promise that every Android device supports every codec, frame
rate, resolution, GPU effect, or background task. Detect device
capabilities and show only valid choices.

## 0.1 Recommended Android technology architecture

-   **Language:** Kotlin.
-   **UI:** Jetpack Compose for application screens, menus, settings,
    and mobile panels.
-   **Rendering:** OpenGL ES 3.0 as the broad practical GPU baseline;
    consider Vulkan only as an optional advanced renderer after device
    coverage is proven.
-   **Audio playback:** AndroidX Media3 ExoPlayer for local audio
    playback and media-session integration.
-   **Audio analysis:** Analyze decoded PCM from the application's own
    playback pipeline. Use FFT processing for spectrum data and
    time-domain processing for waveform/transient data.
-   **Audio DSP:** Kotlin/Java for control and orchestration; optimized
    native C/C++ through the NDK only if profiling proves it necessary.
-   **Video export:** MediaCodec and MediaMuxer for hardware-accelerated
    encoding and audio/video muxing, with supported codec fallback
    paths.
-   **Storage:** Storage Access Framework (SAF), MediaStore, and
    app-specific storage. Avoid broad storage permissions when not
    needed.
-   **Background work:** Foreground service only for user-visible
    playback or long-running work that meets Android's current service
    rules; WorkManager for deferrable background tasks.
-   **Project data:** Versioned JSON or another documented structured
    format, with asset references and optional packaged project
    archives.
-   **Preferences:** DataStore.
-   **Crash diagnostics:** Local error logs and optional opt-in
    diagnostics.

**Compatibility baseline recommendation:** Build and test around Android
10 (API 29) or newer for a practical modern baseline, then validate the
chosen minimum SDK against required libraries and target-device
coverage. Always compile and target the current Play policy-required
Android SDK at release time. Do not hard-code assumptions that every
phone has the same GPU, encoder, memory, or audio behavior.

------------------------------------------------------------------------

# 1. Android App Navigation and Workspace

## 1.1 Main navigation --- ANDROID CORE

Use a mobile navigation structure rather than a desktop menu bar.

-   Home / Projects.
-   Editor.
-   Presets.
-   Assets.
-   Export Queue.
-   Settings.
-   Help and Tutorials.

The Editor should open a project directly and provide a compact
workspace. Avoid showing every advanced control simultaneously.

## 1.2 Home / project browser --- ANDROID CORE

-   Create project.
-   Open recent project.
-   Import project.
-   Duplicate project.
-   Rename project.
-   Delete project with confirmation.
-   Search projects.
-   Sort by recent, name, and date modified.
-   Project thumbnail.
-   Project resolution and aspect ratio.
-   Last saved time.
-   Autosave recovery entry.
-   Starter templates.
-   Empty-state instructions.
-   Import audio and start a project quickly.

## 1.3 Mobile editor layout --- ANDROID CORE

-   **Preview canvas:** largest visible region.
-   **Bottom tool dock:** Add, Layers, Audio, Effects, Text, and Export.
-   **Contextual properties sheet:** opens for the selected element.
-   **Layer drawer:** bottom sheet or side panel on larger screens.
-   **Timeline drawer:** collapsible bottom panel.
-   **Playback strip:** play, pause, stop, seek, and loop.
-   **Top bar:** back, project name, undo, redo, save state, and
    overflow menu.

### Mobile interaction requirements

-   Touch targets should generally be at least 48dp.
-   Support pinch-to-zoom on the preview.
-   Support one-finger canvas pan when the pan tool is active.
-   Use drag handles for resize and rotation.
-   Provide numeric fields for precise positioning.
-   Use bottom sheets for property groups.
-   Keep the preview visible when editing properties where practical.
-   Do not make essential controls depend on hover.
-   Support portrait and landscape editor orientations.
-   On tablets, use a wider multi-panel layout.
-   Respect display cutouts, gesture navigation, and system insets.

## 1.4 Editing modes --- ANDROID CORE

-   **Beginner mode:** simplified controls and sensible presets.
-   **Advanced mode:** full properties and signal routing.
-   **Preview mode:** hides editing controls.
-   **Full-screen preview:** immersive playback.
-   **Selection mode:** select, move, resize, and rotate elements.

------------------------------------------------------------------------

# 2. Project, Composition, and Layer System

## 2.1 Project setup --- ANDROID CORE

-   Project name.
-   Canvas width and height.
-   Aspect ratio presets: 16:9, 9:16, 1:1, 4:5, and custom.
-   Frame rate presets based on device encoder support.
-   Background color or transparency where supported.
-   Audio track selection.
-   Project duration.
-   Preview quality.
-   Project thumbnail.
-   Save and Save As.
-   Autosave and crash recovery.
-   Project version and compatibility checks.

## 2.2 Composition --- ANDROID CORE

A composition groups multiple visual elements into one rendered scene.
Non-final compositions can be used as inputs to effects or other
compositions. The Final Composition is the scene rendered to the preview
and export.

### Core composition properties

-   Intro blend mode.
-   Intro fade duration.
-   Outro fade duration.
-   Intro fade color.
-   Canvas size.
-   Frame rate.
-   Duration.
-   Background.
-   Opacity.
-   Blend mode.
-   Visibility.
-   Preview selected composition.

### Composition management

-   Create, rename, duplicate, and delete.
-   Select Final Composition.
-   Reorder compositions.
-   Use a composition as an effect input.
-   Show dependencies.
-   Warn before deleting a referenced composition.
-   Detect circular references.
-   Avoid unlimited nested composition depth on mobile; define and
    validate a safe nesting limit.

## 2.3 Layer and element management --- ANDROID CORE

-   Add, duplicate, rename, delete.
-   Drag to reorder.
-   Hide/show.
-   Lock/unlock.
-   Solo selected layer.
-   Multi-select.
-   Group/ungroup.
-   Copy/paste.
-   Copy/paste style.
-   Align and distribute.
-   Collapse groups.
-   Show element type and status.
-   Undo and redo every supported edit.

## 2.4 Transform controls --- ANDROID CORE

-   Position X/Y.
-   Width/height.
-   Scale X/Y.
-   Uniform scale.
-   Rotation.
-   Anchor point.
-   Flip horizontal/vertical.
-   Center horizontally/vertically.
-   Fit to canvas.
-   Fill canvas.
-   Reset transform.
-   Maintain aspect ratio.
-   Crop.
-   Snap to center and guides.
-   Numeric editing.
-   Percentage-based positioning for aspect-ratio adaptation.

------------------------------------------------------------------------

# 3. Android Audio Import, Playback, and Media Session

## 3.1 Audio import --- ANDROID CORE

-   Pick one audio file using Android's system file picker.
-   Pick multiple audio files for asset management.
-   Import from supported locations exposed by the system picker.
-   Read metadata when available: title, artist, album, duration,
    artwork.
-   Display unsupported or unreadable file errors.
-   Allow relinking when a file is moved or removed.
-   Do not assume an arbitrary file path is permanently accessible;
    retain SAF URI permissions where appropriate.
-   Copy media into app-specific project storage when the user chooses a
    portable project package.

## 3.2 Playback engine --- ANDROID CORE / LIBRARY DEPENDENT

Use AndroidX Media3 ExoPlayer for reliable local playback.

-   Play.
-   Pause.
-   Stop.
-   Seek.
-   Restart.
-   Loop full track.
-   Loop selected range.
-   Playback position and duration.
-   Volume and mute.
-   Playback speed for preview.
-   Audio track replacement.
-   Start/end trim points.
-   Fade in/out.
-   Audio offset.
-   Track metadata.
-   Artwork fallback.
-   Handle audio focus changes.
-   Handle headphone/Bluetooth route changes.
-   Handle phone calls and interruptions.
-   Restore or stop playback appropriately when the app is backgrounded.
-   Expose a media notification only when appropriate for an ongoing
    user-visible playback session.

## 3.3 Android background playback --- OS RESTRICTED

-   Use a MediaSession and foreground playback service only when
    playback is intended to continue outside the app.
-   Follow current Android foreground-service type, permission,
    notification, and start restrictions.
-   Do not keep a hidden service alive solely to avoid Android process
    management.
-   If the app is closed or the process is killed, recover project state
    on next launch.
-   Clearly explain when export or playback must remain active in the
    foreground.

## 3.4 Audio input limitations --- IMPORTANT

The reliable default is to analyze audio that the app itself is playing
or decoding.

Do not promise universal capture of audio from Spotify, YouTube, games,
calls, or other applications. Android playback capture is permission-
and policy-limited, and some apps prohibit capture. Microphone capture
is a separate feature requiring runtime permission and user-visible
recording behavior.

Optional microphone mode: - Explicit permission request. - Clear
recording indicator. - Start/stop control. - Input level meter. - No
recording unless the user starts it. - Respect microphone privacy
indicators and Android restrictions.

------------------------------------------------------------------------

# 4. Audio Provider and Signal Analysis

## 4.1 Audio Provider --- ANDROID CORE

The Audio Provider processes PCM audio and supplies data to visual
elements. A project may contain multiple providers, each with its own
analysis settings.

-   Provider name.
-   Provider type.
-   Audio track/source.
-   Channel mode.
-   Enabled/disabled.
-   Output routing.
-   Analysis preview.
-   Provider index/reference.

## 4.2 Spectrum analyzer --- ANDROID CORE

-   Sample output count.
-   Mirror samples.
-   Repeat samples.
-   Start and end gap.
-   Smoothing.
-   Pre-smoothing.
-   Filter radius.
-   Filter strength.
-   A-weighting or bass attenuation control.
-   Output multiplier.
-   Lower frequency.
-   Higher frequency.
-   Frequency distribution factor.
-   Frequency shift.
-   FFT size as a power of two.
-   Minimum noise floor.
-   Normalization.
-   Per-band gain.
-   Attack and release.
-   Peak hold and decay.
-   Linear/logarithmic frequency scale.
-   Bass, low-mid, high-mid, and treble ranges.
-   Left, right, mono, and combined channel analysis where available.

### Spectrum implementation behavior

-   Analyze decoded PCM from the app's playback pipeline.
-   Use windowing before FFT to reduce spectral leakage.
-   Avoid running FFT work on the UI thread.
-   Reuse buffers to reduce garbage collection.
-   Use a bounded analysis rate appropriate to preview frame rate.
-   Smooth data between audio-analysis updates and render frames.
-   Avoid allocating arrays every frame.
-   Keep spectrum values normalized and predictable.

## 4.3 Waveform analyzer --- ANDROID CORE

-   Sample output count.
-   Input sample size.
-   Amplitude scale.
-   Center line.
-   Smoothing.
-   Stereo split.
-   Mirrored waveform.
-   Filled waveform.
-   Line waveform.
-   Waveform color and gradient.
-   Waveform thickness.
-   Audio offset.
-   Sample density.
-   Static waveform overview for timeline.

## 4.4 Beat and BPM detection --- ANDROID CORE, ACCURACY VARIES

-   Beat smoothing.
-   Beat range first/last spectrum index.
-   Beat value lower/upper thresholds.
-   Sensitivity.
-   Minimum beat interval.
-   Transient detection.
-   Bass/kick emphasis.
-   Snare/midrange emphasis.
-   Treble activity.
-   Beat pulse strength.
-   Beat decay.
-   BPM estimate.
-   Half-time/double-time interpretation.
-   Manual BPM entry.
-   Tap tempo.
-   Beat offset.
-   Beat and bar grid.
-   Downbeat markers.
-   Manual beat markers.
-   Beat event preview.

**Accuracy note:** automatic BPM and beat detection are estimates.
Provide manual correction and do not claim perfect detection for every
genre or recording.

------------------------------------------------------------------------

# 5. Image, Album Art, and Media Elements

## 5.1 Image element --- ANDROID CORE

-   Import image using system picker.
-   Album art from available metadata.
-   Generated placeholder when artwork is missing.
-   Custom image.
-   GIF support only when the chosen decoder and rendering path support
    it reliably.
-   Animation speed.
-   Contain, cover/crop, stretch, and original-size modes.
-   Blurred border fill.
-   Shape clipping.
-   Image mask.
-   Mask mode.
-   Tint color.
-   Color-to color blend.
-   Color blend measurement.
-   Color-key transparency.
-   Optional border-color auto-detection.
-   Transparency strength.
-   Opacity strength.
-   Blur enable.
-   Blur amount.
-   Generated-art hue shift.
-   Generated-art hide text.
-   Force generated artwork.
-   Generated-art background color.

## 5.2 Image editing controls --- ANDROID CORE / ANDROID GPU

-   Crop editor.
-   Rotate.
-   Flip.
-   Scale and position.
-   Brightness.
-   Contrast.
-   Saturation.
-   Hue.
-   Exposure.
-   Sharpening where supported.
-   Blur.
-   Opacity.
-   Border.
-   Shadow.
-   Glow.
-   Blend mode.
-   Replace image while preserving transforms.
-   Relink missing image.
-   Preview transparency.

## 5.3 Album-art fallback --- ANDROID CORE

-   Prefer embedded artwork.
-   Allow custom artwork.
-   Generate a fallback card if no artwork exists.
-   Artist/title text toggles.
-   Font and alignment.
-   Background color or gradient.
-   Blurred artwork background.
-   Cache generated artwork.
-   Handle missing metadata without breaking the layout.

------------------------------------------------------------------------

# 6. Segments, Bars, Lines, and Spectrum Renderers

## 6.1 Segments/Bars --- ANDROID GPU

-   Flip input.
-   Height scale.
-   Minimum height.
-   Shape path.
-   Color blend offset.
-   Segment 1 renderer.
-   Segment 2 renderer.
-   Softness.
-   Reaction delay.
-   Accumulated reaction delay.
-   Audio Provider selection.
-   Segment count from provider output or explicit controlled override.

## 6.2 Shape paths --- ANDROID GPU

-   Horizontal line.
-   Vertical line.
-   Circle.
-   Adjustable arc.
-   Ellipse.
-   Polygon.
-   Configurable polygon side count.
-   Letter/number path where text shaping is supported.
-   Spiral as an optional advanced path.
-   Custom vector path as an optional advanced feature.

## 6.3 Bars renderer --- ANDROID GPU

-   Width.
-   Height multiplier.
-   Spacing.
-   Minimum and maximum height.
-   Direction: inward, outward, centered, one-sided.
-   Fill color.
-   Gradient.
-   Outline.
-   Shadow.
-   Glow.
-   Square or rounded ends.
-   Per-bar color.
-   Peak caps.
-   Peak hold.
-   Peak decay.
-   Mirroring.
-   Grouping.
-   Normalization.

## 6.4 Line renderer --- ANDROID GPU

-   Stroke width.
-   Stroke color.
-   Gradient.
-   Fill under line.
-   Glow.
-   Shadow.
-   Smoothing.
-   Interpolation.
-   Point markers.
-   Point size.
-   Opacity.
-   Sample density.
-   Open or closed path.

## 6.5 Additional renderers --- ANDROID GPU

-   Dots.
-   Rings.
-   Radial bars.
-   Circular spectrum.
-   Dual-sided bars.
-   Filled waveform.
-   Oscilloscope.
-   Equalizer columns.
-   Stacked spectrum.
-   Segmented ring.
-   Mirrored waveform.

------------------------------------------------------------------------

# 7. Particle System

## 7.1 Core particle properties --- ANDROID GPU

-   Particle count limit.
-   Mirror X/Y.
-   2D mode.
-   Optional 3D depth mode.
-   Perspective field of view.
-   Spawn area.
-   Spawn direction.
-   Random direction.
-   Vector angle.
-   Z direction for 3D mode.
-   Custom particle image.
-   Particle scale.
-   Trail length.
-   Color from/to.
-   Fade-in/fade-out.
-   Velocity alignment.
-   Size aspect ratio.
-   Start size.
-   Fade size.
-   End size.
-   Random size.
-   Spawn interval.
-   Overall speed measurement.
-   Base speed.
-   Random speed.
-   Lifetime.
-   Gravity.
-   Side sine-wave frequency.
-   Random frequency.
-   Sine-wave magnitude.
-   Random magnitude.
-   Force field.

## 7.2 Recommended mobile particle additions --- ANDROID GPU

-   Point, line, rectangle, circle, and ellipse spawn areas.
-   Particle shape presets.
-   Rotation and rotation speed.
-   Opacity stages.
-   Wind.
-   Drag/friction.
-   Turbulence.
-   Attraction and repulsion.
-   Beat-triggered bursts.
-   Audio-reactive spawn rate.
-   Audio-reactive size, speed, and color.
-   Particle pooling.
-   Maximum simulation quality.
-   Reset simulation.
-   Deterministic seed for repeatable previews.

## 7.3 Mobile performance rules

-   Default to a conservative particle count.
-   Provide Low, Balanced, and High quality.
-   Reduce particle count on weaker devices.
-   Avoid one object allocation per particle per frame.
-   Use GPU instancing or batched rendering where practical.
-   Pause or reduce simulation when preview is not visible.
-   Warn when a project exceeds the device's recommended render budget.

------------------------------------------------------------------------

# 8. Audio-Reactive Measurement and Modulation

## 8.1 Measurement source --- ANDROID CORE

-   Select Audio Provider.
-   Select spectrum band/index.
-   Select waveform amplitude.
-   Select beat.
-   Select BPM or overall energy.
-   Define input minimum/maximum.
-   Define output minimum/maximum.
-   Invert.
-   Offset.
-   Multiplier.
-   Clamp.
-   Normalize.
-   Threshold/dead zone.
-   Smoothing.
-   Attack and release.
-   Response curve: linear, ease, exponential, logarithmic, or custom
    where supported.
-   Preview signal.

## 8.2 Reactive targets --- ANDROID CORE / ANDROID GPU

Audio signals can control: - Position. - Scale. - Rotation. - Opacity. -
Color/hue. - Blur. - Glow. - Bar height. - Line thickness. - Ring
radius. - Particle count. - Particle speed. - Particle size. - Image
zoom. - Text scale. - Background brightness. - Camera movement.

## 8.3 Modulation routing --- OPTIONAL ADVANCED

-   Connect one signal to multiple properties.
-   Combine signals using add, multiply, average, min, and max.
-   Clamp combined values.
-   Save reusable measurement presets.
-   Display a simple connection graph.
-   Detect broken or unused links.

------------------------------------------------------------------------

# 9. Text, Typography, and Metadata

## 9.1 Text element --- ANDROID CORE

-   Add and edit text.
-   Static and metadata-driven text.
-   Song title.
-   Artist.
-   Album.
-   Duration.
-   Custom text.
-   Font family and weight.
-   Font size.
-   Letter spacing.
-   Line spacing.
-   Alignment.
-   Color and gradient.
-   Stroke.
-   Shadow.
-   Glow.
-   Background panel.
-   Text box size.
-   Wrapping.
-   Auto-fit.
-   Position, scale, rotation, opacity.
-   Blend mode.
-   Fade and reveal.
-   Scrolling text.
-   Character animation as an optional advanced feature.
-   Missing-font fallback.

## 9.2 Android font handling

-   Use bundled fonts or fonts the user has selected/imported.
-   Do not assume every desktop font exists on Android.
-   Preserve font references in projects.
-   Warn when a font is missing.
-   Provide a substitute-font choice.
-   Respect font licensing.

------------------------------------------------------------------------

# 10. Shapes, Backgrounds, and Graphic Elements

## 10.1 Shape library --- ANDROID CORE / ANDROID GPU

-   Rectangle.
-   Rounded rectangle.
-   Circle.
-   Ellipse.
-   Line.
-   Arrow.
-   Triangle.
-   Polygon.
-   Star.
-   Freeform path.
-   SVG import where supported.
-   Filled and outlined shapes.
-   Gradient fill.
-   Stroke.
-   Corner radius.
-   Shadow.
-   Glow.
-   Mask and clipping.

## 10.2 Background system --- ANDROID CORE / ANDROID GPU

-   Solid color.
-   Linear gradient.
-   Radial gradient.
-   Image.
-   Blurred album art.
-   Animated gradient.
-   Noise/grain texture.
-   Pattern/grid.
-   Transparent background where the export format supports it.
-   Audio-reactive brightness, hue, scale, and blur.
-   Intro/outro background transitions.

**Video background:** optional advanced feature. Add only after the core
image and audio pipeline is stable because decoding video while
rendering and exporting another video can substantially increase memory
and hardware-decoder pressure.

------------------------------------------------------------------------

# 11. Effects and GPU Processing

## 11.1 Practical first-release effects --- ANDROID GPU

-   Blur.
-   Glow/bloom.
-   Drop shadow.
-   Color correction.
-   Hue/saturation.
-   Brightness/contrast.
-   Vignette.
-   Sharpening.
-   Grain/noise.
-   Pixelation.
-   Mirror.
-   Simple distortion.
-   Gradient map.

## 11.2 Advanced effects --- OPTIONAL ADVANCED

-   Motion blur.
-   Chromatic aberration.
-   Displacement.
-   Wave distortion.
-   Kaleidoscope.
-   Echo/trails.
-   Feedback.
-   Radial blur.
-   Zoom blur.
-   Custom shader effects.

## 11.3 Effect stack --- ANDROID GPU

-   Add effect.
-   Reorder.
-   Enable/disable.
-   Duplicate.
-   Remove.
-   Copy/paste settings.
-   Save effect preset.
-   Reset.
-   Mask effect.
-   Animate effect parameters.
-   Show quality/performance cost.
-   Preview before/after.

**Implementation rule:** use GPU shaders for effects that are suitable
for GPU processing. Provide a simpler fallback or disable unsupported
effects rather than crashing on older devices.

------------------------------------------------------------------------

# 12. Timeline, Keyframes, and Animation

## 12.1 Mobile timeline --- ANDROID CORE

-   Horizontal timeline with pinch zoom.
-   Time ruler.
-   Frame ruler.
-   Audio waveform lane.
-   Element lanes.
-   Keyframe lanes.
-   Playhead.
-   Loop range.
-   Work-area start/end.
-   Markers.
-   Beat markers.
-   Snap to frame, beat, marker, and keyframe.
-   Drag and trim clips.
-   Multi-select where practical.
-   Timeline drawer that can expand to full height.

## 12.2 Keyframes --- ANDROID CORE

-   Add, move, duplicate, delete.
-   Hold interpolation.
-   Linear interpolation.
-   Smooth interpolation.
-   Bézier interpolation.
-   Easing presets.
-   Numeric values.
-   Multi-property animation.
-   Copy/paste keyframes.
-   Auto-key mode.
-   Loop and ping-pong.
-   Reset animation.
-   Audio-triggered animation events.

## 12.3 Animation presets --- ANDROID CORE

-   Fade.
-   Scale.
-   Slide.
-   Rotate.
-   Pulse.
-   Bounce.
-   Shake.
-   Wave.
-   Spin.
-   Zoom.
-   Beat pulse.
-   Bass pulse.
-   Spectrum follow.
-   Particle burst.
-   Intro/outro transition.

------------------------------------------------------------------------

# 13. Masks, Clipping, and Compositing

## 13.1 Masks --- ANDROID GPU

-   Image mask.
-   Composition mask.
-   Shape mask.
-   Text mask.
-   Alpha mask.
-   Luminance mask.
-   Color mask.
-   Invert.
-   Feather.
-   Opacity.
-   Position, scale, and rotation.
-   Animated mask properties.

## 13.2 Compositing --- ANDROID GPU

-   Normal.
-   Add.
-   Screen.
-   Multiply.
-   Overlay.
-   Other supported blend modes.
-   Element opacity.
-   Group opacity.
-   Alpha preservation.
-   Clipping groups.
-   Isolated group preview.
-   Transparent export where supported.

------------------------------------------------------------------------

# 14. 3D and Camera

## 14.1 Practical Android 3D --- OPTIONAL ADVANCED

-   Perspective depth.
-   Field of view.
-   Camera position.
-   Camera rotation.
-   Zoom.
-   Depth fade.
-   3D particles.
-   3D image planes.
-   3D rotation.
-   Audio-reactive camera movement.

## 14.2 Android 3D limitations

-   3D support depends on GPU and driver quality.
-   Avoid requiring Vulkan for the app to start.
-   Keep a 2D renderer fallback.
-   Use low-cost geometry and shaders.
-   Limit simultaneous high-cost effects.
-   Test on low-, mid-, and high-tier phones.
-   Do not promise desktop-level 3D rendering on every phone.

------------------------------------------------------------------------

# 15. Presets, Templates, and Asset Library

## 15.1 Preset categories --- ANDROID CORE

-   Minimal spectrum.
-   Classic equalizer.
-   Circular spectrum.
-   Waveform.
-   Mirrored bars.
-   Neon/glow.
-   Album-art centered.
-   Typography visualizer.
-   Particle field.
-   3D space.
-   Cinematic background.
-   Bass reactive.
-   Vocal reactive.
-   Ambient.
-   EDM.
-   Hip-hop.
-   Lo-fi.
-   Podcast branding.

## 15.2 Preset operations --- ANDROID CORE

-   Preview.
-   Apply.
-   Replace scene.
-   Merge into current scene.
-   Favorite.
-   Search.
-   Filter by category.
-   Sort by name and recent.
-   Save current element.
-   Save composition.
-   Import/export preset.
-   Missing asset warning.
-   Compatibility warning.
-   Restore default presets.

## 15.3 Asset browser --- ANDROID CORE

-   Images.
-   Audio.
-   GIFs where supported.
-   Fonts.
-   SVGs where supported.
-   Textures.
-   Particle images.
-   Masks.
-   Color palettes.
-   Saved elements.
-   Effects.
-   Templates.
-   Search, tags, favorites, folders.
-   Relink missing files.
-   Thumbnail cache.

------------------------------------------------------------------------

# 16. Color and Appearance

## 16.1 Color tools --- ANDROID CORE

-   Color picker.
-   HEX input.
-   RGB input.
-   HSL input.
-   Alpha.
-   Eyedropper where supported by the editor.
-   Linear gradient.
-   Radial gradient.
-   Multi-stop gradient.
-   Gradient angle.
-   Recent colors.
-   Saved palettes.
-   Global project palette.
-   Random palette.
-   Audio-reactive color.

## 16.2 App interface themes --- ANDROID CORE

-   Default monochrome dark.
-   Light.
-   High contrast.
-   Black/white.
-   Custom accent colors.
-   Compact controls.
-   Sharp visual style if desired.
-   Scalable interface.
-   Theme switching without changing project artwork or colors.

------------------------------------------------------------------------

# 17. Preview and Device Performance

## 17.1 Preview controls --- ANDROID CORE

-   Play, pause, stop.
-   Seek.
-   Restart.
-   Loop.
-   Frame step where practical.
-   Full-screen preview.
-   Fit and fill.
-   Zoom.
-   Toggle guides.
-   Preview quality.
-   Show frame rate.
-   Show render time.
-   Show audio analysis.

## 17.2 Performance modes --- ANDROID CORE

-   Low.
-   Balanced.
-   High.
-   Custom.

### Adaptive behavior

-   Reduce preview resolution on weaker devices.
-   Reduce particle count.
-   Reduce effect quality.
-   Use texture-size limits based on device capability.
-   Avoid unnecessary redraws.
-   Cache unchanged layers.
-   Reuse buffers.
-   Limit background analysis work.
-   Monitor memory pressure.
-   Handle app pause/resume safely.
-   Recover from GPU context loss.
-   Warn before attempting a render likely to exceed available memory.

## 17.3 Thermal and battery management

-   Detect sustained performance degradation where platform APIs permit.
-   Offer a lower-quality preview when the device is hot.
-   Avoid unnecessary full-resolution real-time rendering while editing.
-   Do not keep the screen awake unless the user is previewing or
    rendering and the behavior is justified.
-   Provide an option to stop or pause long exports.
-   Preserve project state when the app is interrupted.

------------------------------------------------------------------------

# 18. Android Video Export and Rendering

## 18.1 Export formats --- LIBRARY / CODEC DEPENDENT

-   MP4 with H.264 as the broad compatibility target.
-   HEVC/H.265 only when the device encoder supports it and the user
    chooses it.
-   WebM only if a supported encoder path is implemented.
-   GIF through a dedicated encoder or frame-to-GIF pipeline.
-   PNG/JPEG still image.
-   PNG image sequence as an optional advanced output.
-   Transparent video only when a supported codec/container/device path
    exists; do not promise universal support.

## 18.2 Export settings --- ANDROID CORE / CODEC DEPENDENT

-   480p.
-   720p.
-   1080p.
-   1440p only if device capabilities and memory allow.
-   4K only on capable devices; do not expose it as a universal option.
-   Custom dimensions with validation.
-   16:9.
-   9:16.
-   1:1.
-   4:5.
-   Custom aspect ratio.
-   24/25/30/50/60 fps only when the selected encoder can support the
    requested mode.
-   Codec.
-   Quality/bitrate.
-   Audio inclusion.
-   Audio bitrate.
-   Start/end range.
-   File name.
-   Output folder.
-   Estimated file size where possible.
-   Render progress.
-   Cancel.
-   Export queue.
-   Share after export.

## 18.3 Android export implementation

-   Render frames at project timestamps.
-   Encode frames with MediaCodec where supported.
-   Encode or pass through audio using a compatible pipeline.
-   Mux tracks with MediaMuxer.
-   Maintain a single timeline clock for video and audio.
-   Handle encoder input/output buffer back-pressure.
-   Drain encoder output correctly.
-   Finalize muxer safely.
-   Release codec and GPU resources.
-   Handle storage-full errors.
-   Handle export cancellation.
-   Verify the output file before reporting success.

## 18.4 Background export --- OS RESTRICTED

-   Long exports may be interrupted by process death, battery
    restrictions, thermal throttling, or system resource pressure.
-   Use a user-visible foreground execution path only when allowed by
    the current Android version and app use case.
-   Show an ongoing notification when required.
-   Save render checkpoints if the architecture supports safe resume.
-   If reliable background rendering cannot be guaranteed, keep the
    export session visible and warn the user not to force-close the app.
-   Never claim an export succeeded until the output has been finalized
    and verified.

## 18.5 Social export presets --- ANDROID CORE

-   YouTube landscape.
-   YouTube Shorts.
-   Instagram Reels.
-   Instagram square.
-   Instagram Story.
-   Facebook landscape.
-   TikTok vertical.
-   Custom.
-   Safe margins.
-   Optional watermark.
-   Multiple aspect-ratio exports.

------------------------------------------------------------------------

# 19. Android Storage, File Access, and Project Portability

## 19.1 Storage --- ANDROID CORE

-   Use the Android system document picker for user-selected files.
-   Use MediaStore for media created by the app and saved to shared
    media collections.
-   Use app-specific storage for internal project data and caches.
-   Request only permissions actually needed.
-   Avoid broad all-files access unless there is a justified,
    policy-compliant need.
-   Handle revoked URI access.
-   Relink missing media.
-   Copy assets into a project package when the user wants portability.

## 19.2 Project package --- ANDROID CORE

A portable project package should include: - Versioned project data. -
Relative asset references. - Optional copied media assets. - Preview
thumbnail. - Project metadata. - Preset dependencies where permitted. -
Missing asset report. - Compatibility information.

## 19.3 Import/export project --- ANDROID CORE

-   Export editable project package.
-   Import package.
-   Validate package contents.
-   Detect missing or unsupported assets.
-   Avoid extracting unsafe paths.
-   Prevent zip-slip/path traversal.
-   Preserve layer order and settings.
-   Migrate older project versions carefully.

------------------------------------------------------------------------

# 20. App Settings and Quality of Life

## 20.1 Editor settings --- ANDROID CORE

-   Default canvas ratio.
-   Default frame rate.
-   Preview quality.
-   Autosave interval.
-   Default export location.
-   Default export quality.
-   Default audio behavior.
-   Grid and snapping.
-   Timeline zoom behavior.
-   Beginner/advanced mode.
-   Theme.
-   Haptic feedback toggle.
-   Sound effects toggle.

## 20.2 Productivity tools --- ANDROID CORE

-   Undo/redo.
-   Search properties.
-   Favorites.
-   Recent settings.
-   Reset property.
-   Reset element.
-   Duplicate.
-   Copy/paste style.
-   Batch edit.
-   Context menu.
-   Keyboard support for external keyboards.
-   Optional command search.
-   Tutorials and contextual help.

------------------------------------------------------------------------

# 21. Reliability, Security, and Recovery

## 21.1 Reliability --- ANDROID CORE

-   Autosave.
-   Crash recovery.
-   Versioned projects.
-   Backup copies.
-   Missing media detection.
-   Invalid property validation.
-   Broken reference detection.
-   Confirm destructive actions.
-   Safe defaults.
-   Save before major operations.
-   Handle app lifecycle events.
-   Restore editor state after rotation or process recreation.

## 21.2 Security and privacy --- ANDROID CORE

-   Do not request unnecessary permissions.
-   Keep imported media private unless the user exports or shares it.
-   Do not upload audio or images without explicit user action and clear
    disclosure.
-   Store project data in app-private storage by default.
-   Use secure handling for temporary files.
-   Clean up abandoned cache files.
-   Provide a clear delete-project action.
-   Do not record microphone input without explicit permission and
    visible user action.

## 21.3 Validation --- ANDROID CORE

-   Validate canvas dimensions.
-   Validate frame rate and codec compatibility.
-   Validate FFT size.
-   Validate sample count.
-   Validate composition references.
-   Validate Audio Provider references.
-   Validate output storage availability.
-   Validate media readability.
-   Validate memory-intensive render settings.
-   Explain errors with actionable steps.

------------------------------------------------------------------------

# 22. Accessibility and Android Platform Integration

## 22.1 Accessibility --- ANDROID CORE

-   TalkBack labels for controls.
-   Keyboard navigation where applicable.
-   Minimum touch target sizing.
-   Scalable text.
-   High-contrast mode.
-   Avoid communicating status only by color.
-   Reduced-motion UI setting.
-   Clear focus states.
-   Accessible dialogs and bottom sheets.

## 22.2 Android integration --- ANDROID CORE

-   System file picker.
-   MediaStore.
-   Share sheet.
-   MediaSession.
-   Audio focus.
-   Notifications when justified.
-   App shortcuts where useful.
-   Deep links to projects only if safely implemented.
-   Tablet and foldable responsive layouts.
-   Predictive back support where appropriate.
-   Respect system theme if the user chooses it.

------------------------------------------------------------------------

# 23. Recommended Android Release Plan

## Phase 1 --- Stable mobile foundation

Must work before adding complex effects: - Kotlin Android app. -
Home/project browser. - Project create/open/save. - Compose-based editor
UI. - Audio import using system picker. - Media3 playback. - Spectrum
analyzer. - Waveform analyzer. - Composition and Final Composition. -
Image element. - Basic Bars and Line renderer. - Basic text and
background. - Touch transform controls. - Live preview. - MP4 H.264
export on supported devices. - Autosave and crash recovery.

## Phase 2 --- Core visualizer workflow

-   Beat detection and manual BPM.
-   Circular and polygon paths.
-   Segment 2.
-   Album-art fallback.
-   Blur.
-   Particle system.
-   Presets and templates.
-   More image controls.
-   Audio-reactive measurement routing.
-   Timeline and keyframes.
-   Better export controls.

## Phase 3 --- Advanced editor

-   Masks and blend modes.
-   Expanded effect stack.
-   Advanced particles and forces.
-   Custom paths.
-   More modulation options.
-   Advanced animation.
-   Optional 3D camera/depth.
-   GIF export.
-   Project packaging and portability.

## Phase 4 --- Optimization and ecosystem

-   Device-adaptive rendering.
-   Render queue improvements.
-   More codec support.
-   Preset import/export.
-   Tablet/foldable refinements.
-   Optional plugin architecture.
-   Optional cloud backup only with explicit user consent.
-   In-app tutorials and diagnostics.

------------------------------------------------------------------------

# 24. Features to Avoid in the First Android Release

These are not necessarily impossible; they are poor first-release
priorities or have substantial device/OS constraints.

-   Full desktop-style dockable multi-window workspace.
-   Unlimited nested compositions.
-   Heavy real-time 3D scenes.
-   Unlimited particle counts.
-   Multiple simultaneous video backgrounds.
-   Universal 4K/60fps export.
-   Universal transparent video export.
-   Guaranteed background rendering after the app is force-closed.
-   Capturing audio from every other Android app.
-   Unrestricted filesystem browsing.
-   Cloud synchronization without a backend and privacy design.
-   Huge effect stacks with no performance budget.
-   Per-frame allocation-heavy processing.
-   Requiring Vulkan or a specific GPU to launch the app.

------------------------------------------------------------------------

# 25. Android Acceptance Tests

A feature is not complete merely because its control appears in the UI.
Test the actual behavior.

## Audio

-   Import a local audio file through the system picker.
-   Play, pause, seek, and loop.
-   Confirm spectrum responds to bass and treble.
-   Confirm waveform reflects the selected track.
-   Confirm playback interruptions are handled.
-   Confirm no UI freeze during analysis.

## Visualizer

-   Add, move, resize, reorder, hide, and delete elements.
-   Confirm audio-reactive bars update smoothly.
-   Confirm image masks and blur do not crash.
-   Confirm particles respect the selected quality limit.
-   Confirm presets restore all expected settings.

## Project

-   Save and reopen.
-   Rotate device.
-   Background and return to app.
-   Revoke or remove an imported asset and confirm relinking works.
-   Recover after a simulated process interruption.
-   Confirm undo/redo does not corrupt the project.

## Export

-   Export a short 720p test.
-   Export a 1080p test on a capable device.
-   Confirm audio/video synchronization.
-   Confirm file is playable.
-   Cancel an export.
-   Test low-storage handling.
-   Test unsupported codec handling.
-   Test device thermal/performance degradation.
-   Verify that completion is reported only after finalization.

## Device matrix

Test at minimum: - Low-memory / entry-level phone. - Mid-range phone. -
High-performance phone. - Different screen sizes and aspect ratios. -
Different GPU vendors where possible. - Android versions supported by
the app.

------------------------------------------------------------------------

# 26. Final Android Product Definition

Build a **native Android, touch-first, layer-based audio visualizer and
music-video editor** with:

1.  Project and composition management.
2.  Local audio import and reliable playback.
3.  Spectrum, waveform, and beat analysis.
4.  Audio-reactive bars, lines, rings, and particles.
5.  Images, album art, text, shapes, and backgrounds.
6.  Effects, blur, masks, and compositing.
7.  Audio-to-property measurement routing.
8.  Timeline, keyframes, and animation.
9.  Presets, templates, and asset management.
10. Real-time GPU preview with adaptive quality.
11. Device-compatible MP4 rendering and export.
12. Android-safe storage, lifecycle, permissions, and recovery.

**Core product rule:** prioritize a reliable 2D audio-reactive editor
and synchronized MP4 export first. Add expensive GPU effects, 3D,
advanced particle systems, and extra codecs only after the core pipeline
is stable across real Android devices.

**Do not build a desktop UI inside a phone.** Build a mobile editor with
a large preview, contextual bottom sheets, touch-based layer
manipulation, compact timelines, and advanced settings that appear only
when needed.
