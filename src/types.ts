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
