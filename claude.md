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
