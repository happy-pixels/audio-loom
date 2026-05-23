import { Observable } from 'rxjs';
import {
    LoadStatus,
    ChannelInfo,
    PlaybackInfo,
    TrackStartEvent,
    TrackEndEvent,
    LoadCompleteEvent,
    AudioErrorEvent,
    PositionUpdateEvent,
    OrientationUpdateEvent,
    DistanceThresholdEvent,
    PoolStats,
    FilterConfig,
    EnvironmentPreset,
    EnvironmentConfig,
    Vector3,
    SpatialConfig,
    Play3DOptions,
    Play2DPannedOptions,
    DistanceCallbackConfig
} from './types';

import { Logger } from './logger';
import { EventEmitter } from './events/event-emitter';
import { ContextManager } from './core/context-manager';
import { GroupManager } from './core/group-manager';
import { TrackManager } from './core/track-manager';
import { AudioLoader } from './loading/audio-loader';
import { ImpulseLoader } from './loading/impulse-loader';
import { OneShotPlayer } from './playback/one-shot-player';
import { ContinuousPlayer } from './playback/continuous-player';
import { FadeManager } from './playback/fade-manager';
import { PlaybackControls } from './playback/playback-controls';
import { EffectsBus } from './effects/effects-bus';
import { EnvironmentManager } from './effects/environment-manager';
import { ListenerManager } from './spatial/listener-manager';
import { PannerFactory } from './spatial/panner-factory';
import { SpatialPlayer } from './spatial/spatial-player';
import { StereoPanner } from './spatial/stereo-panner';

const DEFAULT_CHANNEL = 'default';

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
export class AudioManager {
    // Core managers
    private readonly logger: Logger;
    private readonly events: EventEmitter;
    private readonly contextManager: ContextManager;
    private readonly groupManager: GroupManager;
    private readonly trackManager: TrackManager;

    // Loading managers
    private readonly audioLoader: AudioLoader;
    private readonly impulseLoader: ImpulseLoader;

    // Playback managers
    private readonly oneShotPlayer: OneShotPlayer;
    private readonly continuousPlayer: ContinuousPlayer;
    private readonly fadeManager: FadeManager;
    private readonly playbackControls: PlaybackControls;

    // Effects managers
    private readonly effectsBus: EffectsBus;
    private readonly environmentManager: EnvironmentManager;

    // Spatial managers
    private readonly listenerManager: ListenerManager;
    private readonly pannerFactory: PannerFactory;
    private readonly spatialPlayer: SpatialPlayer;
    private readonly stereoPanner: StereoPanner;

    // ==================== Event Observables ====================

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
    get loggingEnabled(): boolean {
        return this.logger.enabled;
    }

    set loggingEnabled(value: boolean) {
        this.logger.enabled = value;
    }

    /**
     * Creates a new AudioManager instance.
     */
    constructor() {
        // Initialize core components
        this.logger = new Logger();
        this.events = new EventEmitter();
        this.contextManager = new ContextManager(this.logger);
        this.groupManager = new GroupManager(this.contextManager, this.logger);
        this.trackManager = new TrackManager(this.groupManager, this.logger);

        // Initialize loading components
        this.audioLoader = new AudioLoader(this.contextManager, this.trackManager, this.events, this.logger);
        this.impulseLoader = new ImpulseLoader(this.contextManager, this.logger);

        // Initialize playback components
        this.oneShotPlayer = new OneShotPlayer(this.contextManager, this.groupManager, this.trackManager, this.audioLoader, this.events, this.logger);
        this.continuousPlayer = new ContinuousPlayer(this.contextManager, this.groupManager, this.trackManager, this.events, this.logger);
        this.fadeManager = new FadeManager(this.contextManager, this.groupManager, this.trackManager, this.continuousPlayer, this.events, this.logger);
        this.playbackControls = new PlaybackControls(this.continuousPlayer, this.logger);

        // Initialize effects components
        this.effectsBus = new EffectsBus(this.contextManager, this.impulseLoader, this.logger);
        this.environmentManager = new EnvironmentManager(this.effectsBus, this.impulseLoader, this.logger);

        // Initialize spatial components
        this.listenerManager = new ListenerManager(this.contextManager, this.logger);
        this.pannerFactory = new PannerFactory(this.contextManager, this.listenerManager);
        this.spatialPlayer = new SpatialPlayer(this.contextManager, this.groupManager, this.trackManager, this.continuousPlayer, this.pannerFactory, this.listenerManager, this.events, this.logger);
        this.stereoPanner = new StereoPanner(this.contextManager, this.groupManager, this.trackManager, this.continuousPlayer, this.listenerManager, this.events, this.logger);

        // Expose event observables
        this.onTrackStart$ = this.events.onTrackStart$;
        this.onTrackEnd$ = this.events.onTrackEnd$;
        this.onLoadComplete$ = this.events.onLoadComplete$;
        this.onError$ = this.events.onError$;
        this.onPositionUpdate$ = this.events.onPositionUpdate$;
        this.onOrientationUpdate$ = this.events.onOrientationUpdate$;
        this.onDistanceThreshold$ = this.events.onDistanceThreshold$;
    }

    // ==================== Web Audio API Context Management ====================

    /**
     * Initializes the AudioContext and resumes it if suspended.
     */
    async initAudio(): Promise<void> {
        return this.contextManager.initAudio();
    }

    /**
     * Resumes a suspended AudioContext.
     */
    async resumeAudioContext(): Promise<void> {
        return this.contextManager.resumeContext();
    }

    /**
     * Suspends the AudioContext to save resources.
     */
    async suspendAudioContext(): Promise<void> {
        return this.contextManager.suspendContext();
    }

    /**
     * Checks if the AudioContext is initialized and running.
     */
    isAudioReady(): boolean {
        return this.contextManager.isReady();
    }

    // ==================== Master Volume ====================

    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume: number): void {
        this.contextManager.setMasterVolume(volume);
    }

    /**
     * Gets the current master volume level.
     */
    getMasterVolume(): number {
        return this.contextManager.getMasterVolume();
    }

    // ==================== Group Settings ====================

    /**
     * Enables or disables audio playback for a specific group.
     */
    setAudioEnabled(group: string, enabled: boolean): void {
        this.groupManager.setEnabled(group, enabled);
        this.continuousPlayer.updateGroupState(group, enabled);
    }

    /**
     * Sets the volume for a specific audio group.
     */
    setAudioVolume(group: string, volume: number): void {
        this.groupManager.setVolume(group, volume);
    }

    /**
     * Sets the maximum number of concurrent sounds for a group.
     */
    setGroupPoolSize(group: string, maxConcurrent: number): void {
        this.groupManager.setPoolSize(group, maxConcurrent);
    }

    /**
     * Gets statistics about the audio pool for one or all groups.
     */
    getPoolStats(group?: string): PoolStats | PoolStats[] {
        return this.groupManager.getPoolStats(group);
    }

    // ==================== Audio Buffer Loading ====================

    /**
     * Checks if all tracks for a key are fully loaded and ready to play.
     */
    isLoaded(key: string): boolean {
        return this.audioLoader.isLoaded(key);
    }

    /**
     * Gets detailed loading status for a specific audio key.
     */
    getLoadStatus(key: string): LoadStatus {
        return this.audioLoader.getLoadStatus(key);
    }

    /**
     * Preloads audio tracks into memory for low-latency playback.
     */
    async preload(keys: string[]): Promise<void> {
        return this.audioLoader.preload(keys);
    }

    // ==================== Track Management ====================

    /**
     * Registers an audio track with the manager.
     */
    addAudioTrack(key: string, group: string, path: string): void {
        this.trackManager.addTrack(key, group, path);
    }

    // ==================== One-Shot Playback (SFX) ====================

    /**
     * Plays a one-shot sound effect.
     */
    playAudioTrack(key: string): void {
        this.oneShotPlayer.play(key);
    }

    // ==================== Continuous Playback (Music/Ambient) ====================

    /**
     * Starts continuous playback on a channel.
     */
    playContinuous(key: string, channelId: string = DEFAULT_CHANNEL): void {
        this.continuousPlayer.play(key, channelId);
    }

    /**
     * Stops continuous playback on a channel.
     */
    stopContinuous(channelId: string = DEFAULT_CHANNEL): void {
        this.fadeManager.cancelFade(channelId);
        this.continuousPlayer.stop(channelId);
    }

    /**
     * Pauses continuous playback on a channel.
     */
    pauseContinuous(channelId: string = DEFAULT_CHANNEL): void {
        this.continuousPlayer.pause(channelId);
    }

    /**
     * Resumes paused continuous playback on a channel.
     */
    resumeContinuous(channelId: string = DEFAULT_CHANNEL): void {
        this.continuousPlayer.resume(channelId);
    }

    // ==================== Fading ====================

    /**
     * Starts playback with a gradual volume fade-in effect.
     */
    fadeIn(key: string, duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return this.fadeManager.fadeIn(key, duration, channelId);
    }

    /**
     * Gradually fades out and stops the current playback on a channel.
     */
    fadeOut(duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return this.fadeManager.fadeOut(duration, channelId);
    }

    /**
     * Cross-fades from the current track to a new track.
     */
    crossFade(key: string, duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return this.fadeManager.crossFade(key, duration, channelId);
    }

    // ==================== Channel Management ====================

    /**
     * Gets information about all active continuous playback channels.
     */
    getActiveChannels(): { [channelId: string]: ChannelInfo } {
        return this.continuousPlayer.getActiveChannels();
    }

    /**
     * Gets information about a specific playback channel.
     */
    getChannelInfo(channelId: string = DEFAULT_CHANNEL): ChannelInfo | null {
        return this.continuousPlayer.getChannelInfo(channelId);
    }

    /**
     * Stops all continuous playback on all channels.
     */
    stopAllContinuous(): void {
        this.continuousPlayer.stopAll();
    }

    /**
     * Pauses all continuous playback on all channels.
     */
    pauseAllContinuous(): void {
        this.continuousPlayer.pauseAll();
    }

    /**
     * Resumes all paused continuous playback on all channels.
     */
    resumeAllContinuous(): void {
        this.continuousPlayer.resumeAll();
    }

    // ==================== Playback Controls ====================

    /**
     * Sets the playback speed/rate for a channel.
     */
    setPlaybackRate(rate: number, channelId: string = DEFAULT_CHANNEL): void {
        this.playbackControls.setPlaybackRate(rate, channelId);
    }

    /**
     * Gets the current playback rate for a channel.
     */
    getPlaybackRate(channelId: string = DEFAULT_CHANNEL): number | null {
        return this.playbackControls.getPlaybackRate(channelId);
    }

    /**
     * Seeks to a specific time position in the current track.
     */
    seek(time: number, channelId: string = DEFAULT_CHANNEL): void {
        this.playbackControls.seek(time, channelId);
    }

    /**
     * Gets the current playback time in seconds.
     */
    getCurrentTime(channelId: string = DEFAULT_CHANNEL): number | null {
        return this.playbackControls.getCurrentTime(channelId);
    }

    /**
     * Gets the total duration of the current track in seconds.
     */
    getDuration(channelId: string = DEFAULT_CHANNEL): number | null {
        return this.playbackControls.getDuration(channelId);
    }

    /**
     * Gets comprehensive playback information for a channel.
     */
    getPlaybackInfo(channelId: string = DEFAULT_CHANNEL): PlaybackInfo | null {
        return this.continuousPlayer.getPlaybackInfo(channelId);
    }

    // ==================== Effects Bus ====================

    /**
     * Registers an impulse response for use with convolution reverb.
     */
    addImpulseResponse(key: string, path: string): void {
        this.impulseLoader.addImpulseResponse(key, path);
    }

    /**
     * Preloads impulse response files into memory.
     */
    async preloadImpulses(keys: string[]): Promise<void> {
        return this.impulseLoader.preload(keys);
    }

    /**
     * Checks if an impulse response is fully loaded and ready for use.
     */
    isImpulseLoaded(key: string): boolean {
        return this.impulseLoader.isLoaded(key);
    }

    /**
     * Sets the wet/dry mix for the effects bus.
     */
    setEffectsMix(wet: number): void {
        this.effectsBus.setMix(wet);
    }

    /**
     * Gets the current wet/dry mix for the effects bus.
     */
    getEffectsMix(): number {
        return this.effectsBus.getMix();
    }

    /**
     * Applies a reverb effect using a loaded impulse response.
     */
    async setEffectsReverb(key: string | null): Promise<void> {
        return this.effectsBus.setReverb(key);
    }

    /**
     * Gets the key of the currently active reverb impulse response.
     */
    getActiveReverb(): string | null {
        return this.effectsBus.getActiveReverb();
    }

    /**
     * Sets the low-pass filter parameters for the effects bus.
     */
    setEffectsLowPass(frequency: number, Q: number = 1): void {
        this.effectsBus.setLowPass(frequency, Q);
    }

    /**
     * Gets the current low-pass filter configuration.
     */
    getEffectsLowPass(): FilterConfig | null {
        return this.effectsBus.getLowPass();
    }

    /**
     * Sets the high-pass filter parameters for the effects bus.
     */
    setEffectsHighPass(frequency: number, Q: number = 1): void {
        this.effectsBus.setHighPass(frequency, Q);
    }

    /**
     * Gets the current high-pass filter configuration.
     */
    getEffectsHighPass(): FilterConfig | null {
        return this.effectsBus.getHighPass();
    }

    /**
     * Checks if the effects bus has been initialized.
     */
    isEffectsBusInitialized(): boolean {
        return this.effectsBus.isInitialized();
    }

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
    } {
        return this.effectsBus.getState();
    }

    // ==================== Environment System ====================

    /**
     * Applies an environment configuration or preset.
     */
    async setEnvironment(config: EnvironmentConfig | EnvironmentPreset | null): Promise<void> {
        return this.environmentManager.setEnvironment(config);
    }

    /**
     * Gets the currently active environment configuration.
     */
    getEnvironment(): EnvironmentConfig | null {
        return this.environmentManager.getEnvironment();
    }

    /**
     * Smoothly transitions to a new environment over time.
     */
    async transitionToEnvironment(
        config: EnvironmentConfig | EnvironmentPreset | null,
        duration: number
    ): Promise<void> {
        return this.environmentManager.transitionToEnvironment(config, duration);
    }

    /**
     * Sets whether a group should bypass the effects bus.
     */
    setGroupBypassEffects(group: string, bypass: boolean): void {
        const masterGain = this.contextManager.getMasterGain();
        const outputGain = this.effectsBus.getOutputGain();
        this.groupManager.setBypassEffects(group, bypass, masterGain, outputGain);
    }

    /**
     * Checks if a group is currently bypassing the effects bus.
     */
    isGroupBypassingEffects(group: string): boolean {
        return this.groupManager.isBypassingEffects(group);
    }

    /**
     * Gets a list of all groups that are currently bypassing effects.
     */
    getBypassedGroups(): string[] {
        return this.groupManager.getBypassedGroups();
    }

    // ==================== Spatial Audio ====================

    /**
     * Sets the position of the audio listener.
     */
    setListenerPosition(position: Vector3): void {
        this.listenerManager.setPosition(position);
    }

    /**
     * Gets the current listener position.
     */
    getListenerPosition(): Vector3 {
        return this.listenerManager.getPosition();
    }

    /**
     * Sets the orientation of the audio listener.
     */
    setListenerOrientation(forward: Vector3, up: Vector3): void {
        this.listenerManager.setOrientation(forward, up);
    }

    /**
     * Gets the current listener orientation.
     */
    getListenerOrientation(): { forward: Vector3; up: Vector3 } {
        return this.listenerManager.getOrientation();
    }

    /**
     * Sets the default spatial configuration used for new 3D sounds.
     */
    setSpatialDefaults(config: Partial<SpatialConfig>): void {
        this.listenerManager.setSpatialDefaults(config);
    }

    /**
     * Gets the current default spatial configuration.
     */
    getSpatialDefaults(): SpatialConfig {
        return this.listenerManager.getSpatialDefaults();
    }

    /**
     * Gets comprehensive state information about the spatial audio system.
     */
    getSpatialState(): {
        listenerPosition: Vector3;
        listenerOrientation: { forward: Vector3; up: Vector3 };
        defaults: SpatialConfig;
    } {
        return this.listenerManager.getState();
    }

    // ==================== 3D Playback ====================

    /**
     * Plays a one-shot sound at a specific position in 3D space.
     */
    play3D(key: string, position: Vector3, options?: Play3DOptions): string | null {
        return this.spatialPlayer.play3D(key, position, options);
    }

    /**
     * Plays continuous audio at a specific position in 3D space.
     */
    async playContinuous3D(
        key: string,
        position: Vector3,
        channelId: string = 'default_3d',
        options?: Play3DOptions
    ): Promise<void> {
        return this.spatialPlayer.playContinuous3D(key, position, channelId, options);
    }

    /**
     * Updates the position of a playing 3D sound (one-shot).
     */
    updateSoundPosition(instanceId: string, position: Vector3): boolean {
        return this.spatialPlayer.updateSoundPosition(instanceId, position);
    }

    /**
     * Updates the position of a continuous 3D channel.
     */
    updateChannelPosition(channelId: string, position: Vector3): boolean {
        return this.spatialPlayer.updateChannelPosition(channelId, position);
    }

    /**
     * Checks if a sound instance is a 3D positioned sound.
     */
    is3DSound(instanceId: string): boolean {
        return this.spatialPlayer.is3DSound(instanceId);
    }

    /**
     * Checks if a channel is a 3D positioned channel.
     */
    is3DChannel(channelId: string): boolean {
        return this.spatialPlayer.is3DChannel(channelId);
    }

    /**
     * Gets the current position of a 3D sound.
     */
    getSoundPosition(instanceId: string): Vector3 | null {
        return this.spatialPlayer.getSoundPosition(instanceId);
    }

    /**
     * Gets the current position of a 3D channel.
     */
    getChannelPosition(channelId: string): Vector3 | null {
        return this.spatialPlayer.getChannelPosition(channelId);
    }

    // ==================== Advanced Spatial Features ====================

    /**
     * Sets the orientation of a playing 3D sound (one-shot).
     */
    setSoundOrientation(instanceId: string, orientation: Vector3): boolean {
        return this.spatialPlayer.setSoundOrientation(instanceId, orientation);
    }

    /**
     * Sets the orientation of a continuous 3D channel.
     */
    setChannelOrientation(channelId: string, orientation: Vector3): boolean {
        return this.spatialPlayer.setChannelOrientation(channelId, orientation);
    }

    /**
     * Gets the current orientation of a 3D sound.
     */
    getSoundOrientation(instanceId: string): Vector3 | null {
        return this.spatialPlayer.getSoundOrientation(instanceId);
    }

    /**
     * Gets the current orientation of a 3D channel.
     */
    getChannelOrientation(channelId: string): Vector3 | null {
        return this.spatialPlayer.getChannelOrientation(channelId);
    }

    /**
     * Plays a one-shot sound with stereo panning.
     */
    play2DPanned(key: string, options?: Play2DPannedOptions): string | null {
        return this.stereoPanner.play2DPanned(key, options);
    }

    /**
     * Updates the stereo pan position of a playing 2D panned sound.
     */
    setPan(instanceId: string, pan: number): boolean {
        return this.stereoPanner.setPan(instanceId, pan);
    }

    /**
     * Gets the current pan position of a 2D panned sound.
     */
    getSoundPan(instanceId: string): number | null {
        return this.stereoPanner.getSoundPan(instanceId);
    }

    /**
     * Checks if a sound instance is a 2D panned sound.
     */
    is2DPannedSound(instanceId: string): boolean {
        return this.stereoPanner.is2DPannedSound(instanceId);
    }

    /**
     * Registers distance callbacks for a 3D sound.
     */
    registerDistanceCallback(instanceId: string, config: DistanceCallbackConfig): boolean {
        return this.stereoPanner.registerDistanceCallback(instanceId, config);
    }

    /**
     * Unregisters distance callbacks for a sound.
     */
    unregisterDistanceCallback(instanceId: string): boolean {
        return this.stereoPanner.unregisterDistanceCallback(instanceId);
    }

    // ==================== Cleanup ====================

    /**
     * Stops all active one-shot sounds in a specific group.
     */
    stopAudioGroup(group: string): void {
        this.groupManager.stopGroup(group);
    }

    /**
     * Destroys the AudioManager and releases all resources.
     */
    destroy(): void {
        // Clean up in reverse order of dependencies
        this.stereoPanner.destroy();
        this.continuousPlayer.destroy();
        this.fadeManager.destroy();
        this.environmentManager.destroy();
        this.effectsBus.destroy();
        this.impulseLoader.destroy();
        this.groupManager.destroy();
        this.trackManager.destroy();
        this.listenerManager.reset();
        this.contextManager.destroy();
        this.events.destroy();
    }
}
