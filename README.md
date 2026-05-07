# Audio Loom

Audio Loom is a framework-agnostic audio management library built on the **Web Audio API**. It provides centralized control for organizing, playing, and managing audio assets in games and interactive applications.

Works seamlessly with Phaser, Three.js, React, Angular, and other JavaScript frameworks.

> **NOTICE:** This is not a production-ready library. There may be bugs, and breaking changes could occur in future updates. Use at your own risk.

## Installation

```bash
npm install @happy-pixels/audio-loom
# or
pnpm add @happy-pixels/audio-loom
```

## Quick Start

```typescript
import { AudioManager } from '@happy-pixels/audio-loom';

const audio = new AudioManager();

// Initialize on user interaction (required by browsers)
document.getElementById('startButton')!.onclick = async () => {
  await audio.resumeAudioContext();

  // Now audio is ready to play!
  audio.playAudioTrack('click');
};

// Register sounds
audio.addAudioTrack('click', 'ui', '/sounds/click.wav');
audio.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
audio.addAudioTrack('music', 'music', '/music/theme.mp3');

// Preload for instant playback
await audio.preload(['click', 'explosion']);

// Play one-shot sound effects
audio.playAudioTrack('explosion');

// Play continuous background music
audio.playContinuous('music');
```

## Features

### Audio Grouping

Organize sounds into logical groups for independent volume and mute control:

```typescript
// Register tracks in different groups
audio.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep.wav');
audio.addAudioTrack('music', 'music', '/music/theme.mp3');
audio.addAudioTrack('rain', 'ambient', '/sounds/rain.mp3');

// Control groups independently
audio.setAudioVolume('sfx', 0.8);      // SFX at 80%
audio.setAudioVolume('music', 0.5);    // Music at 50%
audio.setAudioEnabled('ambient', false); // Mute ambient sounds
```

### Master Volume

Control overall audio output:

```typescript
audio.setMasterVolume(0.7);  // Set master to 70%
const volume = audio.getMasterVolume();
```

### Sound Variations

Register multiple tracks under the same key for natural variation:

```typescript
// Add multiple footstep sounds
audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep1.wav');
audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep2.wav');
audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep3.wav');

// Each play selects randomly (shuffled, no repeats until all played)
audio.playAudioTrack('footstep');
```

### Preloading

Preload audio for instant, low-latency playback:

```typescript
// Check loading status
const status = audio.getLoadStatus('explosion');
console.log(`Loaded ${status.loaded}/${status.total}`);

// Preload specific keys
await audio.preload(['explosion', 'gunshot', 'footstep']);

// Check if ready
if (audio.isLoaded('explosion')) {
  audio.playAudioTrack('explosion');
}
```

### One-Shot Playback (SFX)

Play sound effects that run to completion:

```typescript
audio.playAudioTrack('explosion');
audio.playAudioTrack('gunshot');

// Pool limits prevent too many concurrent sounds
audio.setGroupPoolSize('sfx', 8);  // Max 8 simultaneous SFX
```

### Continuous Playback (Music/Ambient)

Play looping audio with full control:

```typescript
// Start background music
audio.playContinuous('music');

// Pause/resume
audio.pauseContinuous();
audio.resumeContinuous();

// Stop
audio.stopContinuous();

// Multiple channels for layered audio
audio.playContinuous('music', 'music-channel');
audio.playContinuous('rain', 'ambient-channel');

// Control channels independently
audio.pauseContinuous('ambient-channel');
audio.setPlaybackRate(0.8, 'music-channel');
```

### Fading

Smooth volume transitions using Web Audio API:

```typescript
// Fade in new music over 2 seconds
await audio.fadeIn('battle-music', 2000);

// Fade out over 1.5 seconds
await audio.fadeOut(1500);

// Cross-fade to new track (simultaneous fade out/in)
await audio.crossFade('victory-music', 2000);
```

### Playback Controls

Fine-grained control over continuous playback:

```typescript
// Playback rate (speed/pitch)
audio.setPlaybackRate(1.5);  // 1.5x speed
audio.setPlaybackRate(0.5);  // Half speed

// Seeking
audio.seek(30);  // Jump to 30 seconds
const currentTime = audio.getCurrentTime();
const duration = audio.getDuration();

// Get full playback info
const info = audio.getPlaybackInfo();
console.log(`${info.currentTime}/${info.duration}s at ${info.playbackRate}x`);
```

### Event System

React to audio events using RxJS observables:

```typescript
// Track starts
audio.onTrackStart$.subscribe(event => {
  console.log(`Playing: ${event.key} on ${event.channelId}`);
});

// Track ends
audio.onTrackEnd$.subscribe(event => {
  console.log(`Finished: ${event.key}`);
});

// Track loaded
audio.onLoadComplete$.subscribe(event => {
  console.log(`Loaded: ${event.key}, duration: ${event.duration}s`);
});

// Errors
audio.onError$.subscribe(event => {
  console.error(`Error: ${event.message}`, event.error);
});
```

### AudioContext Management

Handle browser autoplay restrictions:

```typescript
// Initialize on user interaction
button.onclick = async () => {
  await audio.resumeAudioContext();
};

// Check if ready
if (audio.isAudioReady()) {
  audio.playAudioTrack('click');
}

// Suspend when app is in background
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    await audio.suspendAudioContext();
  } else {
    await audio.resumeAudioContext();
  }
});
```

### Cleanup

Properly dispose of resources:

```typescript
// Stop all and release resources
audio.destroy();

// React example
useEffect(() => {
  const audio = new AudioManager();
  return () => audio.destroy();
}, []);
```

## API Reference

### AudioManager

| Method | Description |
|--------|-------------|
| `initAudio()` | Initialize AudioContext |
| `resumeAudioContext()` | Resume suspended context |
| `suspendAudioContext()` | Suspend context |
| `isAudioReady()` | Check if context is running |
| `setMasterVolume(volume)` | Set master volume (0-1) |
| `getMasterVolume()` | Get master volume |
| `setAudioEnabled(group, enabled)` | Enable/disable group |
| `setAudioVolume(group, volume)` | Set group volume |
| `setGroupPoolSize(group, max)` | Set concurrent sound limit |
| `addAudioTrack(key, group, path)` | Register a track |
| `preload(keys)` | Preload tracks |
| `isLoaded(key)` | Check if loaded |
| `getLoadStatus(key)` | Get loading progress |
| `playAudioTrack(key)` | Play one-shot sound |
| `playContinuous(key, channel?)` | Start continuous playback |
| `stopContinuous(channel?)` | Stop continuous playback |
| `pauseContinuous(channel?)` | Pause playback |
| `resumeContinuous(channel?)` | Resume playback |
| `fadeIn(key, duration, channel?)` | Fade in new track |
| `fadeOut(duration, channel?)` | Fade out current track |
| `crossFade(key, duration, channel?)` | Cross-fade to new track |
| `setPlaybackRate(rate, channel?)` | Set playback speed |
| `seek(time, channel?)` | Seek to position |
| `getCurrentTime(channel?)` | Get current position |
| `getDuration(channel?)` | Get track duration |
| `getPlaybackInfo(channel?)` | Get full playback info |
| `getActiveChannels()` | Get all active channels |
| `getChannelInfo(channel?)` | Get channel info |
| `stopAllContinuous()` | Stop all channels |
| `pauseAllContinuous()` | Pause all channels |
| `resumeAllContinuous()` | Resume all channels |
| `destroy()` | Clean up resources |

### Observables

| Observable | Event Type | Description |
|------------|------------|-------------|
| `onTrackStart$` | `TrackStartEvent` | Track started playing |
| `onTrackEnd$` | `TrackEndEvent` | Track finished |
| `onLoadComplete$` | `LoadCompleteEvent` | Track metadata loaded |
| `onError$` | `AudioErrorEvent` | Error occurred |

## Documentation

Full API documentation is available in the `docs/` folder and can be hosted via GitHub Pages.

**Generate documentation:**
```bash
pnpm docs
```

**Enable GitHub Pages:**
1. Push the repository to GitHub
2. Go to your repository on GitHub
3. Navigate to **Settings** → **Pages**
4. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs**
5. Click **Save**
6. After a few minutes, docs will be live at `https://[username].github.io/[repo-name]/`

## Tech Stack

- **TypeScript** - Type-safe API
- **Web Audio API** - Low-latency audio with gain control
- **RxJS** - Reactive event handling

## License

ISC
