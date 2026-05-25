import { Observable } from 'rxjs';
import { LoadStatus, ChannelInfo, PlaybackInfo, TrackStartEvent, TrackEndEvent, LoadCompleteEvent, AudioErrorEvent, PositionUpdateEvent, OrientationUpdateEvent, DistanceThresholdEvent, PoolStats, FilterConfig, EnvironmentPreset, EnvironmentConfig, Vector3, SpatialConfig, Play3DOptions, Play2DPannedOptions, DistanceCallbackConfig } from './types';
/**
 * AudioManager is a framework-agnostic audio management system built on the Web Audio API.
 * It provides centralized control for organizing, playing, and managing audio assets in
 * games and interactive applications.
 *
 * @example
 * ```typescript
 * const audio = new AudioManager();
 *
 * // Initialize on user interaction (required by browsers)
 * button.onclick = async () => {
 *   await audio.resumeAudioContext();
 * };
 *
 * // Add and play sounds
 * audio.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
 * await audio.preload(['explosion']);
 * audio.playAudioTrack('explosion');
 *
 * // Play background music with fade
 * audio.addAudioTrack('music', 'music', '/sounds/track.mp3');
 * await audio.fadeIn('music', 2000);
 * ```
 */
export declare class AudioManager {
    private readonly logger;
    private readonly events;
    private readonly contextManager;
    private readonly groupManager;
    private readonly trackManager;
    private readonly audioLoader;
    private readonly impulseLoader;
    private readonly oneShotPlayer;
    private readonly continuousPlayer;
    private readonly fadeManager;
    private readonly playbackControls;
    private readonly effectsBus;
    private readonly environmentManager;
    private readonly listenerManager;
    private readonly pannerFactory;
    private readonly spatialPlayer;
    private readonly stereoPanner;
    /**
     * Observable that emits when a track starts playing.
     */
    readonly onTrackStart$: Observable<TrackStartEvent>;
    /**
     * Observable that emits when a track finishes playing.
     */
    readonly onTrackEnd$: Observable<TrackEndEvent>;
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     */
    readonly onLoadComplete$: Observable<LoadCompleteEvent>;
    /**
     * Observable that emits when an audio error occurs.
     */
    readonly onError$: Observable<AudioErrorEvent>;
    /**
     * Observable that emits when a 3D sound's position is updated.
     */
    readonly onPositionUpdate$: Observable<PositionUpdateEvent>;
    /**
     * Observable that emits when a 3D sound's orientation is updated.
     */
    readonly onOrientationUpdate$: Observable<OrientationUpdateEvent>;
    /**
     * Observable that emits when a 3D sound crosses a distance threshold.
     */
    readonly onDistanceThreshold$: Observable<DistanceThresholdEvent>;
    /**
     * Gets or sets whether debug logging is enabled.
     */
    get loggingEnabled(): boolean;
    set loggingEnabled(value: boolean);
    /**
     * Creates a new AudioManager instance.
     */
    constructor();
    /**
     * Initializes the AudioContext and resumes it if suspended.
     */
    initAudio(): Promise<void>;
    /**
     * Resumes a suspended AudioContext.
     */
    resumeAudioContext(): Promise<void>;
    /**
     * Suspends the AudioContext to save resources.
     */
    suspendAudioContext(): Promise<void>;
    /**
     * Checks if the AudioContext is initialized and running.
     */
    isAudioReady(): boolean;
    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume: number): void;
    /**
     * Gets the current master volume level.
     */
    getMasterVolume(): number;
    /**
     * Enables or disables audio playback for a specific group.
     */
    setAudioEnabled(group: string, enabled: boolean): void;
    /**
     * Sets the volume for a specific audio group.
     */
    setAudioVolume(group: string, volume: number): void;
    /**
     * Sets the maximum number of concurrent sounds for a group.
     */
    setGroupPoolSize(group: string, maxConcurrent: number): void;
    /**
     * Gets statistics about the audio pool for one or all groups.
     */
    getPoolStats(group?: string): PoolStats | PoolStats[];
    /**
     * Checks if all tracks for a key are fully loaded and ready to play.
     */
    isLoaded(key: string): boolean;
    /**
     * Gets detailed loading status for a specific audio key.
     */
    getLoadStatus(key: string): LoadStatus;
    /**
     * Preloads audio tracks into memory for low-latency playback.
     */
    preload(keys: string[]): Promise<void>;
    /**
     * Registers an audio track with the manager.
     */
    addAudioTrack(key: string, group: string, path: string): void;
    /**
     * Plays a one-shot sound effect.
     */
    playAudioTrack(key: string): void;
    /**
     * Starts continuous playback on a channel.
     */
    playContinuous(key: string, channelId?: string): void;
    /**
     * Stops continuous playback on a channel.
     */
    stopContinuous(channelId?: string): void;
    /**
     * Pauses continuous playback on a channel.
     */
    pauseContinuous(channelId?: string): void;
    /**
     * Resumes paused continuous playback on a channel.
     */
    resumeContinuous(channelId?: string): void;
    /**
     * Starts playback with a gradual volume fade-in effect.
     */
    fadeIn(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Gradually fades out and stops the current playback on a channel.
     */
    fadeOut(duration: number, channelId?: string): Promise<void>;
    /**
     * Cross-fades from the current track to a new track.
     */
    crossFade(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Gets information about all active continuous playback channels.
     */
    getActiveChannels(): {
        [channelId: string]: ChannelInfo;
    };
    /**
     * Gets information about a specific playback channel.
     */
    getChannelInfo(channelId?: string): ChannelInfo | null;
    /**
     * Stops all continuous playback on all channels.
     */
    stopAllContinuous(): void;
    /**
     * Pauses all continuous playback on all channels.
     */
    pauseAllContinuous(): void;
    /**
     * Resumes all paused continuous playback on all channels.
     */
    resumeAllContinuous(): void;
    /**
     * Sets the playback speed/rate for a channel.
     */
    setPlaybackRate(rate: number, channelId?: string): void;
    /**
     * Gets the current playback rate for a channel.
     */
    getPlaybackRate(channelId?: string): number | null;
    /**
     * Seeks to a specific time position in the current track.
     */
    seek(time: number, channelId?: string): void;
    /**
     * Gets the current playback time in seconds.
     */
    getCurrentTime(channelId?: string): number | null;
    /**
     * Gets the total duration of the current track in seconds.
     */
    getDuration(channelId?: string): number | null;
    /**
     * Gets comprehensive playback information for a channel.
     */
    getPlaybackInfo(channelId?: string): PlaybackInfo | null;
    /**
     * Registers an impulse response for use with convolution reverb.
     */
    addImpulseResponse(key: string, path: string): void;
    /**
     * Preloads impulse response files into memory.
     */
    preloadImpulses(keys: string[]): Promise<void>;
    /**
     * Checks if an impulse response is fully loaded and ready for use.
     */
    isImpulseLoaded(key: string): boolean;
    /**
     * Sets the wet/dry mix for the effects bus.
     */
    setEffectsMix(wet: number): void;
    /**
     * Gets the current wet/dry mix for the effects bus.
     */
    getEffectsMix(): number;
    /**
     * Applies a reverb effect using a loaded impulse response.
     */
    setEffectsReverb(key: string | null): Promise<void>;
    /**
     * Gets the key of the currently active reverb impulse response.
     */
    getActiveReverb(): string | null;
    /**
     * Sets the low-pass filter parameters for the effects bus.
     */
    setEffectsLowPass(frequency: number, Q?: number): void;
    /**
     * Gets the current low-pass filter configuration.
     */
    getEffectsLowPass(): FilterConfig | null;
    /**
     * Sets the high-pass filter parameters for the effects bus.
     */
    setEffectsHighPass(frequency: number, Q?: number): void;
    /**
     * Gets the current high-pass filter configuration.
     */
    getEffectsHighPass(): FilterConfig | null;
    /**
     * Checks if the effects bus has been initialized.
     */
    isEffectsBusInitialized(): boolean;
    /**
     * Gets comprehensive state information about the effects bus.
     */
    getEffectsBusState(): {
        initialized: boolean;
        wetMix: number;
        activeReverb: string | null;
        lowPass: FilterConfig | null;
        highPass: FilterConfig | null;
        registeredImpulses: string[];
    };
    /**
     * Applies an environment configuration or preset.
     */
    setEnvironment(config: EnvironmentConfig | EnvironmentPreset | null): Promise<void>;
    /**
     * Gets the currently active environment configuration.
     */
    getEnvironment(): EnvironmentConfig | null;
    /**
     * Smoothly transitions to a new environment over time.
     */
    transitionToEnvironment(config: EnvironmentConfig | EnvironmentPreset | null, duration: number): Promise<void>;
    /**
     * Sets whether a group should bypass the effects bus.
     */
    setGroupBypassEffects(group: string, bypass: boolean): void;
    /**
     * Checks if a group is currently bypassing the effects bus.
     */
    isGroupBypassingEffects(group: string): boolean;
    /**
     * Gets a list of all groups that are currently bypassing effects.
     */
    getBypassedGroups(): string[];
    /**
     * Sets the position of the audio listener.
     */
    setListenerPosition(position: Vector3): void;
    /**
     * Gets the current listener position.
     */
    getListenerPosition(): Vector3;
    /**
     * Sets the orientation of the audio listener.
     */
    setListenerOrientation(forward: Vector3, up: Vector3): void;
    /**
     * Gets the current listener orientation.
     */
    getListenerOrientation(): {
        forward: Vector3;
        up: Vector3;
    };
    /**
     * Sets the default spatial configuration used for new 3D sounds.
     */
    setSpatialDefaults(config: Partial<SpatialConfig>): void;
    /**
     * Gets the current default spatial configuration.
     */
    getSpatialDefaults(): SpatialConfig;
    /**
     * Gets comprehensive state information about the spatial audio system.
     */
    getSpatialState(): {
        listenerPosition: Vector3;
        listenerOrientation: {
            forward: Vector3;
            up: Vector3;
        };
        defaults: SpatialConfig;
    };
    /**
     * Plays a one-shot sound at a specific position in 3D space.
     */
    play3D(key: string, position: Vector3, options?: Play3DOptions): string | null;
    /**
     * Plays continuous audio at a specific position in 3D space.
     */
    playContinuous3D(key: string, position: Vector3, channelId?: string, options?: Play3DOptions): Promise<void>;
    /**
     * Updates the position of a playing 3D sound (one-shot).
     */
    updateSoundPosition(instanceId: string, position: Vector3): boolean;
    /**
     * Updates the position of a continuous 3D channel.
     */
    updateChannelPosition(channelId: string, position: Vector3): boolean;
    /**
     * Checks if a sound instance is a 3D positioned sound.
     */
    is3DSound(instanceId: string): boolean;
    /**
     * Checks if a channel is a 3D positioned channel.
     */
    is3DChannel(channelId: string): boolean;
    /**
     * Gets the current position of a 3D sound.
     */
    getSoundPosition(instanceId: string): Vector3 | null;
    /**
     * Gets the current position of a 3D channel.
     */
    getChannelPosition(channelId: string): Vector3 | null;
    /**
     * Sets the orientation of a playing 3D sound (one-shot).
     */
    setSoundOrientation(instanceId: string, orientation: Vector3): boolean;
    /**
     * Sets the orientation of a continuous 3D channel.
     */
    setChannelOrientation(channelId: string, orientation: Vector3): boolean;
    /**
     * Gets the current orientation of a 3D sound.
     */
    getSoundOrientation(instanceId: string): Vector3 | null;
    /**
     * Gets the current orientation of a 3D channel.
     */
    getChannelOrientation(channelId: string): Vector3 | null;
    /**
     * Plays a one-shot sound with stereo panning.
     */
    play2DPanned(key: string, options?: Play2DPannedOptions): string | null;
    /**
     * Updates the stereo pan position of a playing 2D panned sound.
     */
    setPan(instanceId: string, pan: number): boolean;
    /**
     * Gets the current pan position of a 2D panned sound.
     */
    getSoundPan(instanceId: string): number | null;
    /**
     * Checks if a sound instance is a 2D panned sound.
     */
    is2DPannedSound(instanceId: string): boolean;
    /**
     * Registers distance callbacks for a 3D sound.
     */
    registerDistanceCallback(instanceId: string, config: DistanceCallbackConfig): boolean;
    /**
     * Unregisters distance callbacks for a sound.
     */
    unregisterDistanceCallback(instanceId: string): boolean;
    /**
     * Stops all active one-shot sounds in a specific group.
     */
    stopAudioGroup(group: string): void;
    /**
     * Destroys the AudioManager and releases all resources.
     */
    destroy(): void;
}
//# sourceMappingURL=audio-manager.d.ts.map