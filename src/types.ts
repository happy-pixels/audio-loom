/**
 * Settings for an audio group (SFX, music, ambient, etc.).
 */
export interface AudioSettings {
    /** Whether the group is enabled. When false, sounds in this group are muted. */
    enabled: boolean;
    /** Volume level for the group (0.0 to 1.0). */
    volume: number;
};

/**
 * Represents a registered audio track.
 */
export interface AudioTrack {
    /** Unique identifier for this sound (e.g., 'explosion', 'footstep'). */
    key: string;
    /** Audio group for volume/mute control (e.g., 'sfx', 'music'). */
    group: string;
    /** URL or path to the audio file. */
    path: string;
    /** Decoded audio buffer for one-shot playback (populated after preload). */
    buffer?: AudioBuffer;
    /** @deprecated Use path instead. Will be removed in next major version. */
    audio?: HTMLAudioElement;
}

/**
 * Internal tracking for audio buffer loading state.
 */
export interface AudioBufferEntry {
    /** Audio key this buffer belongs to. */
    key: string;
    /** Audio group this buffer belongs to. */
    group: string;
    /** URL or path to the audio file. */
    path: string;
    /** Decoded audio buffer, or null if not yet loaded. */
    buffer: AudioBuffer | null;
    /** Current loading state. */
    loadState: 'pending' | 'loading' | 'loaded' | 'error';
}

/**
 * Represents an active one-shot sound instance.
 * Used internally to track playing sounds for pool management.
 */
export interface ActiveSoundInstance {
    /** Unique instance identifier. */
    id: string;
    /** Audio key being played. */
    key: string;
    /** Audio group this sound belongs to. */
    group: string;
    /** Web Audio source node for this sound. */
    sourceNode: AudioBufferSourceNode;
    /** Individual gain node for this sound instance. */
    gainNode: GainNode;
    /** AudioContext time when playback started. */
    startTime: number;
    /** PannerNode for 3D positioned sounds. Only present for 3D sounds. */
    pannerNode?: PannerNode;
    /** Current position in 3D space. Only present for 3D sounds. */
    position?: Vector3;
}

/**
 * Represents active continuous playback using Web Audio API.
 * Used internally to track music/ambient playback channels.
 */
export interface ContinuousPlaybackWebAudio {
    /** Audio key being played. */
    key: string;
    /** The track being played. */
    track: AudioTrack;
    /** HTML audio element for streaming playback. */
    mediaElement: HTMLAudioElement;
    /** Web Audio source node connected to the media element. */
    sourceNode: MediaElementAudioSourceNode;
    /** Individual gain node for this channel. */
    gainNode: GainNode;
    /** Whether the track is currently playing. */
    isPlaying: boolean;
    /** Whether the track is paused. */
    isPaused: boolean;
    /** PannerNode for 3D positioned sounds. Only present for 3D channels. */
    pannerNode?: PannerNode;
    /** Current position in 3D space. Only present for 3D channels. */
    position?: Vector3;
}

/**
 * Loading status for an audio key.
 * Returned by {@link AudioManager.getLoadStatus}.
 */
export interface LoadStatus {
    /** Total number of tracks registered under this key. */
    total: number;
    /** Number of tracks that have been loaded. */
    loaded: number;
    /** True if all tracks are loaded and ready. */
    ready: boolean;
}

/**
 * Internal state for active fade operations.
 */
export interface FadeState {
    /** AudioContext time when fade started. */
    startTime: number;
    /** Volume at the start of the fade. */
    startVolume: number;
    /** Target volume at the end of the fade. */
    targetVolume: number;
    /** Fade duration in milliseconds. */
    duration: number;
    /** Gain node being faded. */
    gainNode: GainNode;
    /** Callback when fade completes. */
    onComplete?: () => void;
}

/**
 * @deprecated Use ContinuousPlaybackWebAudio instead. Will be removed in next major version.
 */
export interface ContinuousPlayback {
    key: string;
    track: AudioTrack;
    isPlaying: boolean;
    isPaused: boolean;
}

/**
 * Basic information about a playback channel.
 * Returned by {@link AudioManager.getChannelInfo} and {@link AudioManager.getActiveChannels}.
 */
export interface ChannelInfo {
    /** Audio key currently playing on this channel. */
    key: string;
    /** Whether the channel is currently playing. */
    isPlaying: boolean;
    /** Whether the channel is paused. */
    isPaused: boolean;
}

/**
 * Detailed playback information for a channel.
 * Returned by {@link AudioManager.getPlaybackInfo}.
 */
export interface PlaybackInfo {
    /** Audio key currently playing. */
    key: string;
    /** Whether the channel is currently playing. */
    isPlaying: boolean;
    /** Whether the channel is paused. */
    isPaused: boolean;
    /** Current playback position in seconds. */
    currentTime: number;
    /** Total track duration in seconds, or null if unknown. */
    duration: number | null;
    /** Current playback rate (1.0 = normal). */
    playbackRate: number;
    /** Current volume level (0.0 to 1.0). */
    volume: number;
}

/**
 * Event emitted when a track starts playing.
 * Subscribe via {@link AudioManager.onTrackStart$}.
 */
export interface TrackStartEvent {
    /** Audio key that started playing. */
    key: string;
    /** Channel or instance ID. */
    channelId: string;
    /** Audio group of the track. */
    group: string;
    /** Source URL of the track. */
    src: string;
}

/**
 * Event emitted when a track finishes playing.
 * Subscribe via {@link AudioManager.onTrackEnd$}.
 */
export interface TrackEndEvent {
    /** Audio key that finished playing. */
    key: string;
    /** Channel or instance ID. */
    channelId: string;
    /** Audio group of the track. */
    group: string;
    /** Source URL of the track. */
    src: string;
}

/**
 * Event emitted when a track's metadata is loaded.
 * Subscribe via {@link AudioManager.onLoadComplete$}.
 */
export interface LoadCompleteEvent {
    /** Audio key that was loaded. */
    key: string;
    /** Channel the track was loaded on. */
    channelId: string;
    /** Audio group of the track. */
    group: string;
    /** Source URL of the track. */
    src: string;
    /** Track duration in seconds. */
    duration: number;
}

/**
 * Event emitted when an audio error occurs.
 * Subscribe via {@link AudioManager.onError$}.
 */
export interface AudioErrorEvent {
    /** Audio key that caused the error. */
    key: string;
    /** Channel ID, or null if not applicable. */
    channelId: string | null;
    /** Audio group, or null if not applicable. */
    group: string | null;
    /** Source URL, or null if not applicable. */
    src: string | null;
    /** The error that occurred. */
    error: Error | Event | unknown;
    /** Human-readable error message. */
    message: string;
}

/**
 * @deprecated Use ActiveSoundInstance instead. Will be removed in next major version.
 */
export interface PooledAudio {
    audio: HTMLAudioElement;
    src: string;
    inUse: boolean;
}

/**
 * Configuration for an audio group's sound pool.
 */
export interface PoolConfig {
    /** Maximum number of simultaneous sounds allowed in this group. */
    maxConcurrent: number;
}

/**
 * Statistics about an audio group's sound pool.
 * Returned by {@link AudioManager.getPoolStats}.
 */
export interface PoolStats {
    /** The audio group name. */
    group: string;
    /** Maximum concurrent sounds allowed. */
    maxConcurrent: number;
    /** Total number of sounds currently tracked. */
    totalPooled: number;
    /** Number of sounds currently playing. */
    inUse: number;
    /** Number of available slots. */
    available: number;
}

/**
 * Default pool configuration.
 * Allows up to 8 concurrent sounds per group.
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
    maxConcurrent: 8
};

/**
 * Default audio settings for new groups.
 * Groups start enabled at full volume.
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
    enabled: true,
    volume: 1.0,
};

// ==================== Effects Bus Types ====================

/**
 * Represents an impulse response entry for convolution reverb.
 * Follows the same pattern as AudioBufferEntry.
 */
export interface ImpulseResponseEntry {
    /** Unique identifier for this impulse response. */
    key: string;
    /** URL or path to the impulse response audio file. */
    path: string;
    /** Decoded audio buffer, or null if not yet loaded. */
    buffer: AudioBuffer | null;
    /** Current loading state. */
    loadState: 'pending' | 'loading' | 'loaded' | 'error';
}

/**
 * Configuration for a biquad filter (low-pass or high-pass).
 */
export interface FilterConfig {
    /** Cutoff frequency in Hz. */
    frequency: number;
    /** Q factor (resonance). Higher values create a peak at the cutoff frequency. */
    Q: number;
}

/**
 * Default low-pass filter configuration.
 * Passes all audible frequencies (20kHz cutoff).
 */
export const DEFAULT_LOW_PASS_CONFIG: FilterConfig = {
    frequency: 20000,
    Q: 1
};

/**
 * Default high-pass filter configuration.
 * Passes all audible frequencies (20Hz cutoff).
 */
export const DEFAULT_HIGH_PASS_CONFIG: FilterConfig = {
    frequency: 20,
    Q: 1
};

// ==================== Environment System Types ====================

/**
 * Available built-in environment preset names.
 */
export type EnvironmentPreset =
    | 'none'
    | 'cave'
    | 'forest'
    | 'underwater'
    | 'indoor'
    | 'metal_corridor'
    | 'bathroom'
    | 'arena';

/**
 * Configuration for an audio environment.
 * Defines reverb and filter settings for environmental audio effects.
 */
export interface EnvironmentConfig {
    /**
     * Impulse response key for reverb effect.
     * Must be registered via addImpulseResponse() before use.
     * Set to null for no reverb.
     */
    reverb: string | null;

    /**
     * Wet/dry mix for the effects bus (0.0 to 1.0).
     * 0 = fully dry (no effects), 1 = fully wet (maximum effects).
     */
    wetMix: number;

    /**
     * Low-pass filter configuration for the wet signal.
     * Set to null to use default (20kHz, no filtering).
     */
    lowPass: FilterConfig | null;

    /**
     * High-pass filter configuration for the wet signal.
     * Set to null to use default (20Hz, no filtering).
     */
    highPass: FilterConfig | null;
}

/**
 * Partial environment configuration for updates.
 * All fields are optional, allowing selective updates.
 */
export type PartialEnvironmentConfig = Partial<EnvironmentConfig>;

/**
 * Built-in environment presets.
 * These provide common acoustic environments out of the box.
 * Note: Reverb impulse responses must be registered separately.
 */
export const ENVIRONMENT_PRESETS: Record<EnvironmentPreset, EnvironmentConfig> = {
    /** No effects - completely dry signal */
    none: {
        reverb: null,
        wetMix: 0,
        lowPass: null,
        highPass: null
    },

    /** Cave environment - long reverb, slight low-pass for dampening */
    cave: {
        reverb: 'cave',
        wetMix: 0.4,
        lowPass: { frequency: 8000, Q: 0.7 },
        highPass: { frequency: 80, Q: 0.7 }
    },

    /** Forest environment - subtle reverb, natural filtering */
    forest: {
        reverb: 'forest',
        wetMix: 0.2,
        lowPass: { frequency: 12000, Q: 0.5 },
        highPass: { frequency: 40, Q: 0.5 }
    },

    /** Underwater environment - heavy low-pass, muffled sound */
    underwater: {
        reverb: 'underwater',
        wetMix: 0.5,
        lowPass: { frequency: 1500, Q: 1.0 },
        highPass: { frequency: 60, Q: 0.7 }
    },

    /** Indoor environment - moderate room reverb */
    indoor: {
        reverb: 'indoor',
        wetMix: 0.25,
        lowPass: { frequency: 16000, Q: 0.5 },
        highPass: { frequency: 30, Q: 0.5 }
    },

    /** Metal corridor - bright, resonant reverb */
    metal_corridor: {
        reverb: 'metal_corridor',
        wetMix: 0.35,
        lowPass: { frequency: 18000, Q: 1.2 },
        highPass: { frequency: 100, Q: 1.0 }
    },

    /** Bathroom environment - short, bright reverb */
    bathroom: {
        reverb: 'bathroom',
        wetMix: 0.3,
        lowPass: { frequency: 14000, Q: 0.8 },
        highPass: { frequency: 50, Q: 0.6 }
    },

    /** Arena/stadium environment - large space reverb */
    arena: {
        reverb: 'arena',
        wetMix: 0.45,
        lowPass: { frequency: 10000, Q: 0.6 },
        highPass: { frequency: 60, Q: 0.7 }
    }
};

// ==================== Spatial Audio Types ====================

/**
 * Platform-agnostic 3D vector for spatial audio positioning.
 * Uses a right-handed coordinate system where:
 * - X is right (positive) / left (negative)
 * - Y is up (positive) / down (negative)
 * - Z is forward (negative) / backward (positive) in WebAudio's default
 *
 * Note: WebAudio uses a right-handed coordinate system where negative Z is "forward".
 */
export interface Vector3 {
    /** X coordinate (horizontal: right is positive) */
    x: number;
    /** Y coordinate (vertical: up is positive) */
    y: number;
    /** Z coordinate (depth: backward is positive in WebAudio) */
    z: number;
}

/**
 * Creates a Vector3 from individual components.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z coordinate
 * @returns A new Vector3 object
 */
export function vec3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}

/**
 * A zero vector (origin point).
 */
export const VECTOR3_ZERO: Vector3 = { x: 0, y: 0, z: 0 };

/**
 * Forward direction in WebAudio's coordinate system (negative Z).
 */
export const VECTOR3_FORWARD: Vector3 = { x: 0, y: 0, z: -1 };

/**
 * Up direction (positive Y).
 */
export const VECTOR3_UP: Vector3 = { x: 0, y: 1, z: 0 };

/**
 * Right direction (positive X).
 */
export const VECTOR3_RIGHT: Vector3 = { x: 1, y: 0, z: 0 };

/**
 * Distance model for spatial audio attenuation.
 * Determines how sound volume decreases with distance.
 *
 * - 'linear': Linear decrease between refDistance and maxDistance
 * - 'inverse': Realistic inverse distance attenuation (default)
 * - 'exponential': Exponential distance attenuation
 */
export type DistanceModel = 'linear' | 'inverse' | 'exponential';

/**
 * Panning model for spatial audio.
 *
 * - 'equalpower': Simple left/right panning (good for most cases)
 * - 'HRTF': Head-Related Transfer Function for realistic headphone spatialization
 */
export type PanningModel = 'equalpower' | 'HRTF';

/**
 * Configuration for directional audio (sound cones).
 * Defines how sound is projected in a specific direction.
 */
export interface ConeConfig {
    /**
     * Inner cone angle in degrees (0-360).
     * Sound at full volume within this angle from the source's orientation.
     * @default 360 (omnidirectional)
     */
    innerAngle: number;

    /**
     * Outer cone angle in degrees (0-360).
     * Sound attenuated outside this angle.
     * @default 360 (omnidirectional)
     */
    outerAngle: number;

    /**
     * Gain (volume) outside the outer cone (0-1).
     * @default 0 (silent outside cone)
     */
    outerGain: number;
}

/**
 * Configuration for spatial audio behavior.
 * Controls how 3D sounds are positioned and attenuated.
 */
export interface SpatialConfig {
    /**
     * Distance model for attenuation calculation.
     * @default 'inverse'
     */
    distanceModel: DistanceModel;

    /**
     * Panning algorithm to use.
     * @default 'HRTF'
     */
    panningModel: PanningModel;

    /**
     * Distance at which volume starts to decrease.
     * Sound is at full volume within this distance.
     * @default 1
     */
    refDistance: number;

    /**
     * Maximum distance for sound attenuation.
     * For 'linear' model, sound is silent beyond this distance.
     * @default 10000
     */
    maxDistance: number;

    /**
     * How quickly the sound attenuates with distance.
     * Higher values = faster volume decrease.
     * @default 1
     */
    rolloffFactor: number;

    /**
     * Optional cone configuration for directional audio.
     * If not provided, sound is omnidirectional.
     */
    cone?: ConeConfig;
}

/**
 * Partial spatial configuration for selective updates.
 */
export type PartialSpatialConfig = Partial<SpatialConfig>;

/**
 * Default spatial audio configuration.
 * Provides reasonable defaults for most 3D audio scenarios.
 */
export const DEFAULT_SPATIAL_CONFIG: SpatialConfig = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1
};

/**
 * Spatial configuration preset for small indoor spaces.
 */
export const SPATIAL_PRESET_INDOOR: SpatialConfig = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 50,
    rolloffFactor: 1.5
};

/**
 * Spatial configuration preset for large outdoor spaces.
 */
export const SPATIAL_PRESET_OUTDOOR: SpatialConfig = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 2,
    maxDistance: 500,
    rolloffFactor: 0.5
};

/**
 * Spatial configuration preset for realistic simulation.
 */
export const SPATIAL_PRESET_REALISTIC: SpatialConfig = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1
};

// ==================== 3D Playback Types ====================

/**
 * Options for 3D sound playback.
 */
export interface Play3DOptions {
    /**
     * Volume multiplier for this specific sound (0-1).
     * @default 1
     */
    volume?: number;

    /**
     * Spatial configuration override for this sound.
     * If not provided, uses the AudioManager's spatial defaults.
     */
    spatialConfig?: Partial<SpatialConfig>;

    /**
     * Optional orientation for directional sounds.
     * Only used if cone parameters are configured.
     */
    orientation?: Vector3;
}

/**
 * Event emitted when a 3D sound's position is updated.
 */
export interface PositionUpdateEvent {
    /** The instance ID of the sound. */
    instanceId: string;
    /** Audio key being played. */
    key: string;
    /** Audio group the sound belongs to. */
    group: string;
    /** Previous position in 3D space. */
    previousPosition: Vector3;
    /** New position in 3D space. */
    newPosition: Vector3;
}

/**
 * Extended track start event for 3D sounds.
 */
export interface TrackStart3DEvent extends TrackStartEvent {
    /** Position in 3D space where the sound is playing. */
    position: Vector3;
    /** Whether this is a 3D positioned sound. */
    is3D: true;
}

/**
 * Extended track end event for 3D sounds.
 */
export interface TrackEnd3DEvent extends TrackEndEvent {
    /** Final position in 3D space. */
    position: Vector3;
    /** Whether this was a 3D positioned sound. */
    is3D: true;
}

// ==================== Phase 5: Advanced Spatial Features ====================

/**
 * Callback function invoked when a sound crosses a distance threshold.
 * @param instanceId - The sound instance ID.
 * @param distance - The current distance from the listener.
 * @param threshold - The threshold that was crossed.
 * @param direction - 'entering' if moving closer, 'leaving' if moving away.
 */
export type DistanceCallback = (
    instanceId: string,
    distance: number,
    threshold: number,
    direction: 'entering' | 'leaving'
) => void;

/**
 * Configuration for distance-based callbacks on a 3D sound.
 */
export interface DistanceCallbackConfig {
    /**
     * Distance thresholds to monitor (in world units).
     * Callbacks are triggered when the sound crosses these distances.
     */
    thresholds: number[];

    /**
     * Callback function invoked when a threshold is crossed.
     */
    onThresholdCross: DistanceCallback;

    /**
     * How often to check distances (in milliseconds).
     * Lower values are more responsive but use more CPU.
     * @default 100
     */
    checkInterval?: number;
}

/**
 * Options for 2D panned audio playback.
 */
export interface Play2DPannedOptions {
    /**
     * Volume multiplier for this specific sound (0-1).
     * @default 1
     */
    volume?: number;

    /**
     * Stereo pan position (-1 = full left, 0 = center, 1 = full right).
     * @default 0
     */
    pan?: number;
}

/**
 * Event emitted when a sound's orientation is updated.
 */
export interface OrientationUpdateEvent {
    /** The instance or channel ID of the sound. */
    instanceId: string;
    /** Audio key being played. */
    key: string;
    /** Audio group the sound belongs to. */
    group: string;
    /** Previous orientation vector. */
    previousOrientation: Vector3;
    /** New orientation vector. */
    newOrientation: Vector3;
}

/**
 * Event emitted when a distance threshold is crossed.
 */
export interface DistanceThresholdEvent {
    /** The instance or channel ID of the sound. */
    instanceId: string;
    /** Audio key being played. */
    key: string;
    /** Audio group the sound belongs to. */
    group: string;
    /** The threshold that was crossed. */
    threshold: number;
    /** Current distance from the listener. */
    distance: number;
    /** Direction of crossing: 'entering' (getting closer) or 'leaving' (getting further). */
    direction: 'entering' | 'leaving';
}

/**
 * Tracked instance for 2D panned sounds.
 */
export interface PannedSoundInstance {
    /** Unique instance ID. */
    id: string;
    /** Audio key being played. */
    key: string;
    /** Audio group the sound belongs to. */
    group: string;
    /** The source node for this sound. */
    sourceNode: AudioBufferSourceNode;
    /** The gain node for volume control. */
    gainNode: GainNode;
    /** The stereo panner node for left/right positioning. */
    pannerNode: StereoPannerNode;
    /** When playback started (AudioContext time). */
    startTime: number;
    /** Current pan position (-1 to 1). */
    pan: number;
}
