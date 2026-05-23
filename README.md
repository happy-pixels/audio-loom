# Audio Loom

Audio Loom is a framework-agnostic audio management library built on the **Web Audio API**. It provides centralized control for organizing, playing, and managing audio assets in games and interactive applications.

Works seamlessly with Phaser, Three.js, React, Angular, and other JavaScript frameworks.

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

## 3D Spatial Audio

Audio Loom provides a complete 3D spatial audio system using the Web Audio API's PannerNode and AudioListener.

### Listener Setup

Position your listener (usually the player/camera) in 3D space:

```typescript
// Set listener position
audio.setListenerPosition({ x: 0, y: 1.7, z: 0 }); // Player at origin, ear height

// Set listener orientation (forward and up vectors)
audio.setListenerOrientation(
  { x: 0, y: 0, z: -1 },  // Looking forward (-Z)
  { x: 0, y: 1, z: 0 }    // Y is up
);

// Convenience: use vec3 helper
import { vec3 } from '@happy-pixels/audio-loom';
audio.setListenerPosition(vec3(10, 0, -5));
```

### 3D One-Shot Sounds

Play positioned sound effects:

```typescript
audio.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
await audio.preload(['explosion']);

// Play at position
const instanceId = audio.play3D('explosion', { x: 10, y: 0, z: -5 });

// With options
const id = audio.play3D('explosion', { x: 10, y: 0, z: -5 }, {
  volume: 0.8,
  spatialConfig: {
    maxDistance: 100,
    rolloffFactor: 1.5,
    distanceModel: 'inverse'
  }
});

// Update position for moving sounds
audio.updateSoundPosition(instanceId, { x: 12, y: 0, z: -3 });
```

### 3D Continuous Sounds

Play positioned looping audio:

```typescript
audio.addAudioTrack('fire', 'ambient', '/sounds/fire.wav');

// Play at position with channel ID
await audio.playContinuous3D('fire', { x: 5, y: 0, z: -10 }, 'campfire');

// Update position
audio.updateChannelPosition('campfire', { x: 6, y: 0, z: -10 });

// Check if channel is 3D
if (audio.is3DChannel('campfire')) {
  const pos = audio.getChannelPosition('campfire');
}
```

### Spatial Configuration

Configure default spatial settings:

```typescript
import { SPATIAL_PRESET_INDOOR, SPATIAL_PRESET_OUTDOOR } from '@happy-pixels/audio-loom';

// Set defaults for all 3D sounds
audio.setSpatialDefaults({
  distanceModel: 'inverse',  // 'linear', 'inverse', 'exponential'
  panningModel: 'HRTF',      // 'HRTF' for headphones, 'equalpower' for speakers
  refDistance: 1,
  maxDistance: 100,
  rolloffFactor: 1
});

// Use presets
audio.setSpatialDefaults(SPATIAL_PRESET_INDOOR);  // Smaller space
audio.setSpatialDefaults(SPATIAL_PRESET_OUTDOOR); // Larger space
```

### Directional Audio

Create cone-shaped sound sources (speakers, spotlights):

```typescript
const id = audio.play3D('announcement', { x: 0, y: 2, z: 5 }, {
  orientation: { x: 0, y: 0, z: -1 },  // Pointing forward
  spatialConfig: {
    cone: {
      innerAngle: 60,    // Full volume cone
      outerAngle: 120,   // Attenuated cone
      outerGain: 0.2     // Volume outside outer cone
    }
  }
});

// Update orientation
audio.setSoundOrientation(id, { x: 1, y: 0, z: 0 }); // Point right
```

### Stereo Panning (2D Alternative)

Lightweight left/right panning without full 3D:

```typescript
// Play with stereo pan (-1 = left, 0 = center, 1 = right)
const id = audio.play2DPanned('footstep', { pan: -0.5, volume: 0.8 });

// Update pan position
audio.setPan(id, 0.3);

// Check pan value
const pan = audio.getSoundPan(id); // Returns -0.5
```

### Distance Callbacks

React when sounds cross distance thresholds (useful for LOD audio):

```typescript
const id = audio.play3D('enemy', { x: 100, y: 0, z: 0 });

audio.registerDistanceCallback(id, {
  thresholds: [10, 25, 50],
  onThresholdCross: (instanceId, distance, threshold, direction) => {
    console.log(`Sound ${instanceId} ${direction} ${threshold}m threshold`);
    if (threshold === 10 && direction === 'entering') {
      // Enemy is close! Play alert
    }
  },
  checkInterval: 100 // ms between checks
});

// Unregister when done
audio.unregisterDistanceCallback(id);
```

## Environment Effects

Apply reverb and filtering effects to simulate acoustic environments.

### Effects Bus Setup

The effects bus creates parallel wet/dry signal paths:

```typescript
// Register impulse response files for reverb
audio.addImpulseResponse('hall', '/impulses/hall.wav');
audio.addImpulseResponse('cave', '/impulses/cave.wav');

// Preload impulse responses
await audio.preloadImpulses(['hall', 'cave']);

// Apply reverb
await audio.setEffectsReverb('hall');

// Set wet/dry mix (0 = dry, 1 = fully wet)
audio.setEffectsMix(0.3);

// Apply filters
audio.setEffectsLowPass(4000, 1);   // Frequency, Q
audio.setEffectsHighPass(200, 1);
```

### Environment Presets

Use built-in presets or create custom environments:

```typescript
import { ENVIRONMENT_PRESETS } from '@happy-pixels/audio-loom';

// Apply preset
await audio.setEnvironment('cave');    // Heavy reverb, muffled
await audio.setEnvironment('forest');  // Light reverb, natural
await audio.setEnvironment('underwater'); // Heavy low-pass
await audio.setEnvironment('indoor');
await audio.setEnvironment('none');    // Clear all effects

// Custom environment
await audio.setEnvironment({
  reverb: 'hall',           // Impulse response key
  wetMix: 0.4,
  lowPass: { frequency: 6000, Q: 1 },
  highPass: { frequency: 80, Q: 0.7 }
});
```

### Environment Transitions

Smoothly transition between environments:

```typescript
// Transition over 2 seconds
await audio.transitionToEnvironment('cave', 2000);

// Transition to no effects
await audio.transitionToEnvironment('none', 1000);
```

### Per-Group Bypass

Keep certain audio groups unaffected by effects:

```typescript
// UI sounds bypass reverb (stay crisp)
audio.setGroupBypassEffects('ui', true);

// Dialog stays clear
audio.setGroupBypassEffects('dialog', true);

// Check bypass status
const bypassed = audio.getBypassedGroups(); // ['ui', 'dialog']
```

### Impulse Response Guidelines

For best results with reverb:

1. **Format**: Use WAV or MP3 files (44.1kHz or 48kHz recommended)
2. **Length**: 1-5 seconds for typical rooms, longer for large spaces
3. **Sources**: Record real spaces or use convolution reverb IRs
4. **File Size**: Keep files small for fast loading (< 500KB ideal)

Free impulse response sources:
- [OpenAir](https://www.openair.hosted.york.ac.uk/)
- [EchoThief](http://www.echothief.com/)

## API Reference

### AudioManager

#### Core Methods

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

#### 3D Spatial Audio Methods

| Method | Description |
|--------|-------------|
| `setListenerPosition(position)` | Set listener position in 3D space |
| `getListenerPosition()` | Get current listener position |
| `setListenerOrientation(forward, up)` | Set listener direction |
| `getListenerOrientation()` | Get listener orientation vectors |
| `setSpatialDefaults(config)` | Set default spatial config |
| `getSpatialDefaults()` | Get current spatial defaults |
| `play3D(key, position, options?)` | Play 3D positioned sound |
| `playContinuous3D(key, position, channel?, options?)` | Play 3D looping sound |
| `updateSoundPosition(id, position)` | Update one-shot sound position |
| `updateChannelPosition(channel, position)` | Update channel position |
| `is3DSound(instanceId)` | Check if sound is 3D |
| `is3DChannel(channelId)` | Check if channel is 3D |
| `getSoundPosition(instanceId)` | Get sound position |
| `getChannelPosition(channelId)` | Get channel position |
| `setSoundOrientation(id, forward)` | Set directional sound orientation |
| `setChannelOrientation(channel, forward)` | Set channel orientation |
| `play2DPanned(key, options?)` | Play with stereo panning |
| `setPan(instanceId, pan)` | Update stereo pan (-1 to 1) |
| `getSoundPan(instanceId)` | Get current pan value |
| `registerDistanceCallback(id, config)` | Register distance threshold callback |
| `unregisterDistanceCallback(id)` | Remove distance callback |

#### Environment Effects Methods

| Method | Description |
|--------|-------------|
| `addImpulseResponse(key, path)` | Register impulse response file |
| `preloadImpulses(keys)` | Preload impulse responses |
| `isImpulseLoaded(key)` | Check if impulse is loaded |
| `setEffectsReverb(key)` | Apply reverb (or null to disable) |
| `getActiveReverb()` | Get current reverb key |
| `setEffectsMix(wet)` | Set wet/dry mix (0-1) |
| `getEffectsMix()` | Get current wet/dry mix |
| `setEffectsLowPass(frequency, Q?)` | Set low-pass filter |
| `getEffectsLowPass()` | Get low-pass settings |
| `setEffectsHighPass(frequency, Q?)` | Set high-pass filter |
| `getEffectsHighPass()` | Get high-pass settings |
| `setEnvironment(preset\|config)` | Apply environment preset or config |
| `getEnvironment()` | Get current environment |
| `transitionToEnvironment(preset, duration)` | Smooth environment transition |
| `setGroupBypassEffects(group, bypass)` | Bypass effects for group |
| `isGroupBypassingEffects(group)` | Check if group bypasses effects |
| `getBypassedGroups()` | Get list of bypassed groups |
| `getEffectsBusState()` | Get full effects bus state |

### Observables

| Observable | Event Type | Description |
|------------|------------|-------------|
| `onTrackStart$` | `TrackStartEvent` | Track started playing |
| `onTrackEnd$` | `TrackEndEvent` | Track finished |
| `onLoadComplete$` | `LoadCompleteEvent` | Track metadata loaded |
| `onError$` | `AudioErrorEvent` | Error occurred |
| `onPositionUpdate$` | `PositionUpdateEvent` | 3D sound position changed |
| `onOrientationUpdate$` | `OrientationUpdateEvent` | Sound orientation changed |
| `onDistanceThreshold$` | `DistanceThresholdEvent` | Distance threshold crossed |

## Documentation

Full API documentation is available at [https://happy-pixels.github.io/audio-loom/](https://happy-pixels.github.io/audio-loom/)

## Tech Stack

- **TypeScript** - Type-safe API
- **Web Audio API** - Low-latency audio with gain control
- **RxJS** - Reactive event handling

## License

ISC
