# Audio Loom

## Project Purpose

Audio Loom is a framework-agnostic audio management library built with TypeScript and RxJS. It provides centralized audio control for JavaScript applications, particularly suited for games and interactive UIs.

The library works seamlessly with frameworks like Phaser, Three.js, React, Angular, and others, offering a unified API for managing audio assets without being tied to any specific framework or game engine.

### Core Features

- Audio organization by groups (SFX, music, ambient, UI, dialog)
- Per-group volume and mute controls
- One-shot and continuous looping playback
- Random track selection with shuffle variation for natural sound repetition
- Clean, minimal API surface

### Tech Stack

- TypeScript
- RxJS for reactive event handling
- Web Audio API for advanced audio control (AudioContext, GainNode, AudioBufferSourceNode)
- HTMLAudioElement + MediaElementAudioSourceNode for streaming audio

---

## Improvement Roadmap

### High Priority

1. - [x] **Error Handling & Logging** - Add try-catch around audio operations, provide optional debug/logging mode, handle audio load failures gracefully with fallbacks or events
2. - [x] **Audio Loading States** - Add `isLoaded(key)` to check if all tracks for a key are ready, add `getLoadStatus(key)` returning `{ total, loaded, ready }` for granular progress, implement `preload(keys[])` that loads all tracks for each key and returns a promise when complete
3. - [x] **Pause/Resume Support** - Add `pause()` and `resume()` methods for continuous playback, track paused state internally
4. - [x] **Fade In/Out Transitions** - Add `fadeIn(key, duration)` and `fadeOut(duration)` for smooth music transitions, cross-fade between tracks for seamless background music changes

### Medium Priority

5. - [x] **Multiple Continuous Tracks** - Support multiple concurrent continuous playbacks (e.g., ambient + music), use unique identifiers to control each independently
6. - [x] **Playback Controls** - Add `setPlaybackRate(key, rate)` for pitch/speed control, add `seek(key, time)` for seeking within a track, add `getCurrentTime()` / `getDuration()` getters
7. - [x] **Event System** - Expose observables or callbacks for: `onTrackStart`, `onTrackEnd`, `onLoadComplete`, `onError`, allow external subscribers to react to audio events
8. - [x] **Audio Pool/Recycling** - Reuse HTMLAudioElement instances to reduce memory churn, cap maximum concurrent sounds per group

### Polish & Nice-to-Have

9. - [x] **Web Audio API Support** - Consider migrating to Web Audio API for advanced features (effects, spatial audio, precise timing), could be an optional "enhanced" mode
10. - [x] **Master Volume** - Add a global `setMasterVolume(volume)` that scales all groups
11. - [x] **Persistence** - ~~Optional localStorage integration to remember user volume/mute preferences~~ SKIPPED: Handled by consuming project (localStorage/SQLite/Backend)
12. - [x] **Testing Suite** - Add unit tests for core functionality (track selection, volume, enable/disable), add integration tests for playback scenarios
13. - [x] **Documentation** - Add JSDoc comments to public methods, include usage examples in README for each feature, add a simple demo page
14. - [x] **TypeScript Strictness** - Enable `strict: true` in tsconfig for better type safety, add explicit return types to all methods
15. - [x] **Bundle Size Optimization** - ~~Consider making RxJS optional or tree-shakeable, offer a "lite" build without RxJS for simple use cases~~ SKIPPED: RxJS is a core dependency and already tree-shakeable by modern bundlers
16. - [~] **API Documentation Site** - Generate API docs from JSDoc using TypeDoc, host via GitHub Pages from `docs/` folder

---

## 3D Audio Roadmap

### Phase 1: Global Effects Bus

Foundation for environment-wide audio effects. Creates a parallel wet/dry routing system between Master Gain and Destination.

1.1. - [x] **Effects Bus Architecture** - Create parallel wet/dry signal path after Master Gain, add output gain node before destination, implement dry gain and wet gain controls
1.2. - [x] **ConvolverNode Integration** - Add ConvolverNode to wet path for reverb effects, implement impulse response loading and caching, add `preloadImpulses(keys[])` method
1.3. - [x] **BiquadFilterNode Integration** - Add low-pass filter node to effects chain, add high-pass filter node to effects chain, expose frequency and Q controls
1.4. - [x] **Effects Mix Control** - Implement wet/dry mix ratio (0-1), add `setEffectsMix(wet: number)` method, ensure smooth gain transitions to avoid clicks

### Phase 2: Environment System

Preset-based environment effects with smooth transitions between environments.

2.1. - [x] **Environment Configuration Types** - Define `EnvironmentConfig` interface (reverb, lowpass, highpass, etc.), define preset names type, add environment-related types to types.ts
2.2. - [x] **Built-in Environment Presets** - Create presets: cave, forest, underwater, indoor, metal_corridor, bathroom, arena, add preset impulse response files or document required assets
2.3. - [x] **Environment Application** - Implement `setEnvironment(config | preset)` method, apply reverb impulse and filter settings, handle null/undefined to clear effects
2.4. - [x] **Environment Transitions** - Implement `transitionToEnvironment(config, durationMs)` method, crossfade wet/dry mix during transitions, crossfade between different impulse responses
2.5. - [x] **Per-Group Effect Bypass** - Add `setGroupBypassEffects(group, bypass)` method, route bypassed groups directly to destination, track bypass state per group

### Phase 3: Spatial Audio Core

Listener management and spatial audio configuration using Web Audio API's spatialization features.

3.1. - [x] **Vector3 Type** - Define platform-agnostic `Vector3` interface `{x, y, z}`, add helper functions for vector operations if needed
3.2. - [x] **AudioListener Management** - Expose `AudioContext.listener` controls, implement `setListenerPosition(position: Vector3)` method, implement `setListenerOrientation(forward: Vector3, up: Vector3)` method
3.3. - [x] **Spatial Configuration Types** - Define `SpatialConfig` interface (distanceModel, refDistance, maxDistance, rolloffFactor), define cone parameters for directional audio (innerAngle, outerAngle, outerGain), add defaults for common scenarios
3.4. - [x] **Default Spatial Settings** - Implement `setSpatialDefaults(config: Partial<SpatialConfig>)` method, store defaults for use when creating new 3D sounds

### Phase 4: 3D Playback API

Integration of PannerNode with existing playback systems for positioned audio.

4.1. - [x] **PannerNode Factory** - Create helper to instantiate configured PannerNode, apply spatial config (distance model, rolloff, cone), connect to appropriate point in audio graph
4.2. - [x] **One-Shot 3D Playback** - Implement `play3D(key, position, options?)` method returning instance ID, insert PannerNode between source gain and group gain, track panner in `ActiveSoundInstance`
4.3. - [x] **Continuous 3D Playback** - Implement `playContinuous3D(key, position, options?)` method, insert PannerNode in continuous playback chain, track panner in `ContinuousPlaybackWebAudio`
4.4. - [x] **Position Updates** - Implement `updateSoundPosition(instanceId, position)` method, update PannerNode position values, handle invalid/completed instance IDs gracefully
4.5. - [x] **3D Sound Events** - Emit events for 3D sound lifecycle (start, end, position update), integrate with existing RxJS event system

### Phase 5: Advanced Spatial Features

Additional spatial audio capabilities for more realistic 3D soundscapes.

5.1. - [x] **Directional Audio** - Support cone parameters for directional sounds (spotlights, speakers), implement `setSoundOrientation(instanceId, forward: Vector3)` method
5.2. - [x] **Distance Callbacks** - Optional callback when sound crosses distance thresholds, useful for LOD audio (switch to lower quality at distance)
5.3. - [x] **Stereo Panning Fallback** - Add `play2DPanned(key, pan)` for simple left/right positioning using StereoPannerNode, lighter weight alternative when full 3D not needed
5.4. - [x] **HRTF Support** - Document HRTF panning mode for realistic headphone spatialization, add option to choose between 'equalpower' and 'HRTF' panning models

### Phase 6: Testing & Documentation

Comprehensive testing and documentation for all 3D audio features.

6.1. - [x] **Effects Bus Unit Tests** - Test wet/dry routing, test impulse response loading, test filter parameter changes
6.2. - [x] **Environment System Tests** - Test preset application, test transitions between environments, test per-group bypass
6.3. - [x] **Spatial Audio Tests** - Test listener position/orientation, test 3D sound positioning, test distance attenuation
6.4. - [x] **Integration Tests** - Test 3D playback with effects, test multiple 3D sounds simultaneously, test environment changes during playback
6.5. - [x] **API Documentation** - Add JSDoc comments to all new public methods, update README with 3D audio examples, add impulse response asset guidelines
6.6. - [ ] **Demo Page** - Create interactive 3D audio demo, demonstrate environment transitions, show spatial positioning with visual feedback
