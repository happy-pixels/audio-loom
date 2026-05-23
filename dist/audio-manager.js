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
    logger;
    events;
    contextManager;
    groupManager;
    trackManager;
    // Loading managers
    audioLoader;
    impulseLoader;
    // Playback managers
    oneShotPlayer;
    continuousPlayer;
    fadeManager;
    playbackControls;
    // Effects managers
    effectsBus;
    environmentManager;
    // Spatial managers
    listenerManager;
    pannerFactory;
    spatialPlayer;
    stereoPanner;
    // ==================== Event Observables ====================
    /**
     * Observable that emits when a track starts playing.
     */
    onTrackStart$;
    /**
     * Observable that emits when a track finishes playing.
     */
    onTrackEnd$;
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     */
    onLoadComplete$;
    /**
     * Observable that emits when an audio error occurs.
     */
    onError$;
    /**
     * Observable that emits when a 3D sound's position is updated.
     */
    onPositionUpdate$;
    /**
     * Observable that emits when a 3D sound's orientation is updated.
     */
    onOrientationUpdate$;
    /**
     * Observable that emits when a 3D sound crosses a distance threshold.
     */
    onDistanceThreshold$;
    /**
     * Gets or sets whether debug logging is enabled.
     */
    get loggingEnabled() {
        return this.logger.enabled;
    }
    set loggingEnabled(value) {
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
    async initAudio() {
        return this.contextManager.initAudio();
    }
    /**
     * Resumes a suspended AudioContext.
     */
    async resumeAudioContext() {
        return this.contextManager.resumeContext();
    }
    /**
     * Suspends the AudioContext to save resources.
     */
    async suspendAudioContext() {
        return this.contextManager.suspendContext();
    }
    /**
     * Checks if the AudioContext is initialized and running.
     */
    isAudioReady() {
        return this.contextManager.isReady();
    }
    // ==================== Master Volume ====================
    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume) {
        this.contextManager.setMasterVolume(volume);
    }
    /**
     * Gets the current master volume level.
     */
    getMasterVolume() {
        return this.contextManager.getMasterVolume();
    }
    // ==================== Group Settings ====================
    /**
     * Enables or disables audio playback for a specific group.
     */
    setAudioEnabled(group, enabled) {
        this.groupManager.setEnabled(group, enabled);
        this.continuousPlayer.updateGroupState(group, enabled);
    }
    /**
     * Sets the volume for a specific audio group.
     */
    setAudioVolume(group, volume) {
        this.groupManager.setVolume(group, volume);
    }
    /**
     * Sets the maximum number of concurrent sounds for a group.
     */
    setGroupPoolSize(group, maxConcurrent) {
        this.groupManager.setPoolSize(group, maxConcurrent);
    }
    /**
     * Gets statistics about the audio pool for one or all groups.
     */
    getPoolStats(group) {
        return this.groupManager.getPoolStats(group);
    }
    // ==================== Audio Buffer Loading ====================
    /**
     * Checks if all tracks for a key are fully loaded and ready to play.
     */
    isLoaded(key) {
        return this.audioLoader.isLoaded(key);
    }
    /**
     * Gets detailed loading status for a specific audio key.
     */
    getLoadStatus(key) {
        return this.audioLoader.getLoadStatus(key);
    }
    /**
     * Preloads audio tracks into memory for low-latency playback.
     */
    async preload(keys) {
        return this.audioLoader.preload(keys);
    }
    // ==================== Track Management ====================
    /**
     * Registers an audio track with the manager.
     */
    addAudioTrack(key, group, path) {
        this.trackManager.addTrack(key, group, path);
    }
    // ==================== One-Shot Playback (SFX) ====================
    /**
     * Plays a one-shot sound effect.
     */
    playAudioTrack(key) {
        this.oneShotPlayer.play(key);
    }
    // ==================== Continuous Playback (Music/Ambient) ====================
    /**
     * Starts continuous playback on a channel.
     */
    playContinuous(key, channelId = DEFAULT_CHANNEL) {
        this.continuousPlayer.play(key, channelId);
    }
    /**
     * Stops continuous playback on a channel.
     */
    stopContinuous(channelId = DEFAULT_CHANNEL) {
        this.fadeManager.cancelFade(channelId);
        this.continuousPlayer.stop(channelId);
    }
    /**
     * Pauses continuous playback on a channel.
     */
    pauseContinuous(channelId = DEFAULT_CHANNEL) {
        this.continuousPlayer.pause(channelId);
    }
    /**
     * Resumes paused continuous playback on a channel.
     */
    resumeContinuous(channelId = DEFAULT_CHANNEL) {
        this.continuousPlayer.resume(channelId);
    }
    // ==================== Fading ====================
    /**
     * Starts playback with a gradual volume fade-in effect.
     */
    fadeIn(key, duration, channelId = DEFAULT_CHANNEL) {
        return this.fadeManager.fadeIn(key, duration, channelId);
    }
    /**
     * Gradually fades out and stops the current playback on a channel.
     */
    fadeOut(duration, channelId = DEFAULT_CHANNEL) {
        return this.fadeManager.fadeOut(duration, channelId);
    }
    /**
     * Cross-fades from the current track to a new track.
     */
    crossFade(key, duration, channelId = DEFAULT_CHANNEL) {
        return this.fadeManager.crossFade(key, duration, channelId);
    }
    // ==================== Channel Management ====================
    /**
     * Gets information about all active continuous playback channels.
     */
    getActiveChannels() {
        return this.continuousPlayer.getActiveChannels();
    }
    /**
     * Gets information about a specific playback channel.
     */
    getChannelInfo(channelId = DEFAULT_CHANNEL) {
        return this.continuousPlayer.getChannelInfo(channelId);
    }
    /**
     * Stops all continuous playback on all channels.
     */
    stopAllContinuous() {
        this.continuousPlayer.stopAll();
    }
    /**
     * Pauses all continuous playback on all channels.
     */
    pauseAllContinuous() {
        this.continuousPlayer.pauseAll();
    }
    /**
     * Resumes all paused continuous playback on all channels.
     */
    resumeAllContinuous() {
        this.continuousPlayer.resumeAll();
    }
    // ==================== Playback Controls ====================
    /**
     * Sets the playback speed/rate for a channel.
     */
    setPlaybackRate(rate, channelId = DEFAULT_CHANNEL) {
        this.playbackControls.setPlaybackRate(rate, channelId);
    }
    /**
     * Gets the current playback rate for a channel.
     */
    getPlaybackRate(channelId = DEFAULT_CHANNEL) {
        return this.playbackControls.getPlaybackRate(channelId);
    }
    /**
     * Seeks to a specific time position in the current track.
     */
    seek(time, channelId = DEFAULT_CHANNEL) {
        this.playbackControls.seek(time, channelId);
    }
    /**
     * Gets the current playback time in seconds.
     */
    getCurrentTime(channelId = DEFAULT_CHANNEL) {
        return this.playbackControls.getCurrentTime(channelId);
    }
    /**
     * Gets the total duration of the current track in seconds.
     */
    getDuration(channelId = DEFAULT_CHANNEL) {
        return this.playbackControls.getDuration(channelId);
    }
    /**
     * Gets comprehensive playback information for a channel.
     */
    getPlaybackInfo(channelId = DEFAULT_CHANNEL) {
        return this.continuousPlayer.getPlaybackInfo(channelId);
    }
    // ==================== Effects Bus ====================
    /**
     * Registers an impulse response for use with convolution reverb.
     */
    addImpulseResponse(key, path) {
        this.impulseLoader.addImpulseResponse(key, path);
    }
    /**
     * Preloads impulse response files into memory.
     */
    async preloadImpulses(keys) {
        return this.impulseLoader.preload(keys);
    }
    /**
     * Checks if an impulse response is fully loaded and ready for use.
     */
    isImpulseLoaded(key) {
        return this.impulseLoader.isLoaded(key);
    }
    /**
     * Sets the wet/dry mix for the effects bus.
     */
    setEffectsMix(wet) {
        this.effectsBus.setMix(wet);
    }
    /**
     * Gets the current wet/dry mix for the effects bus.
     */
    getEffectsMix() {
        return this.effectsBus.getMix();
    }
    /**
     * Applies a reverb effect using a loaded impulse response.
     */
    async setEffectsReverb(key) {
        return this.effectsBus.setReverb(key);
    }
    /**
     * Gets the key of the currently active reverb impulse response.
     */
    getActiveReverb() {
        return this.effectsBus.getActiveReverb();
    }
    /**
     * Sets the low-pass filter parameters for the effects bus.
     */
    setEffectsLowPass(frequency, Q = 1) {
        this.effectsBus.setLowPass(frequency, Q);
    }
    /**
     * Gets the current low-pass filter configuration.
     */
    getEffectsLowPass() {
        return this.effectsBus.getLowPass();
    }
    /**
     * Sets the high-pass filter parameters for the effects bus.
     */
    setEffectsHighPass(frequency, Q = 1) {
        this.effectsBus.setHighPass(frequency, Q);
    }
    /**
     * Gets the current high-pass filter configuration.
     */
    getEffectsHighPass() {
        return this.effectsBus.getHighPass();
    }
    /**
     * Checks if the effects bus has been initialized.
     */
    isEffectsBusInitialized() {
        return this.effectsBus.isInitialized();
    }
    /**
     * Gets comprehensive state information about the effects bus.
     */
    getEffectsBusState() {
        return this.effectsBus.getState();
    }
    // ==================== Environment System ====================
    /**
     * Applies an environment configuration or preset.
     */
    async setEnvironment(config) {
        return this.environmentManager.setEnvironment(config);
    }
    /**
     * Gets the currently active environment configuration.
     */
    getEnvironment() {
        return this.environmentManager.getEnvironment();
    }
    /**
     * Smoothly transitions to a new environment over time.
     */
    async transitionToEnvironment(config, duration) {
        return this.environmentManager.transitionToEnvironment(config, duration);
    }
    /**
     * Sets whether a group should bypass the effects bus.
     */
    setGroupBypassEffects(group, bypass) {
        const masterGain = this.contextManager.getMasterGain();
        const outputGain = this.effectsBus.getOutputGain();
        this.groupManager.setBypassEffects(group, bypass, masterGain, outputGain);
    }
    /**
     * Checks if a group is currently bypassing the effects bus.
     */
    isGroupBypassingEffects(group) {
        return this.groupManager.isBypassingEffects(group);
    }
    /**
     * Gets a list of all groups that are currently bypassing effects.
     */
    getBypassedGroups() {
        return this.groupManager.getBypassedGroups();
    }
    // ==================== Spatial Audio ====================
    /**
     * Sets the position of the audio listener.
     */
    setListenerPosition(position) {
        this.listenerManager.setPosition(position);
    }
    /**
     * Gets the current listener position.
     */
    getListenerPosition() {
        return this.listenerManager.getPosition();
    }
    /**
     * Sets the orientation of the audio listener.
     */
    setListenerOrientation(forward, up) {
        this.listenerManager.setOrientation(forward, up);
    }
    /**
     * Gets the current listener orientation.
     */
    getListenerOrientation() {
        return this.listenerManager.getOrientation();
    }
    /**
     * Sets the default spatial configuration used for new 3D sounds.
     */
    setSpatialDefaults(config) {
        this.listenerManager.setSpatialDefaults(config);
    }
    /**
     * Gets the current default spatial configuration.
     */
    getSpatialDefaults() {
        return this.listenerManager.getSpatialDefaults();
    }
    /**
     * Gets comprehensive state information about the spatial audio system.
     */
    getSpatialState() {
        return this.listenerManager.getState();
    }
    // ==================== 3D Playback ====================
    /**
     * Plays a one-shot sound at a specific position in 3D space.
     */
    play3D(key, position, options) {
        return this.spatialPlayer.play3D(key, position, options);
    }
    /**
     * Plays continuous audio at a specific position in 3D space.
     */
    async playContinuous3D(key, position, channelId = 'default_3d', options) {
        return this.spatialPlayer.playContinuous3D(key, position, channelId, options);
    }
    /**
     * Updates the position of a playing 3D sound (one-shot).
     */
    updateSoundPosition(instanceId, position) {
        return this.spatialPlayer.updateSoundPosition(instanceId, position);
    }
    /**
     * Updates the position of a continuous 3D channel.
     */
    updateChannelPosition(channelId, position) {
        return this.spatialPlayer.updateChannelPosition(channelId, position);
    }
    /**
     * Checks if a sound instance is a 3D positioned sound.
     */
    is3DSound(instanceId) {
        return this.spatialPlayer.is3DSound(instanceId);
    }
    /**
     * Checks if a channel is a 3D positioned channel.
     */
    is3DChannel(channelId) {
        return this.spatialPlayer.is3DChannel(channelId);
    }
    /**
     * Gets the current position of a 3D sound.
     */
    getSoundPosition(instanceId) {
        return this.spatialPlayer.getSoundPosition(instanceId);
    }
    /**
     * Gets the current position of a 3D channel.
     */
    getChannelPosition(channelId) {
        return this.spatialPlayer.getChannelPosition(channelId);
    }
    // ==================== Advanced Spatial Features ====================
    /**
     * Sets the orientation of a playing 3D sound (one-shot).
     */
    setSoundOrientation(instanceId, orientation) {
        return this.spatialPlayer.setSoundOrientation(instanceId, orientation);
    }
    /**
     * Sets the orientation of a continuous 3D channel.
     */
    setChannelOrientation(channelId, orientation) {
        return this.spatialPlayer.setChannelOrientation(channelId, orientation);
    }
    /**
     * Gets the current orientation of a 3D sound.
     */
    getSoundOrientation(instanceId) {
        return this.spatialPlayer.getSoundOrientation(instanceId);
    }
    /**
     * Gets the current orientation of a 3D channel.
     */
    getChannelOrientation(channelId) {
        return this.spatialPlayer.getChannelOrientation(channelId);
    }
    /**
     * Plays a one-shot sound with stereo panning.
     */
    play2DPanned(key, options) {
        return this.stereoPanner.play2DPanned(key, options);
    }
    /**
     * Updates the stereo pan position of a playing 2D panned sound.
     */
    setPan(instanceId, pan) {
        return this.stereoPanner.setPan(instanceId, pan);
    }
    /**
     * Gets the current pan position of a 2D panned sound.
     */
    getSoundPan(instanceId) {
        return this.stereoPanner.getSoundPan(instanceId);
    }
    /**
     * Checks if a sound instance is a 2D panned sound.
     */
    is2DPannedSound(instanceId) {
        return this.stereoPanner.is2DPannedSound(instanceId);
    }
    /**
     * Registers distance callbacks for a 3D sound.
     */
    registerDistanceCallback(instanceId, config) {
        return this.stereoPanner.registerDistanceCallback(instanceId, config);
    }
    /**
     * Unregisters distance callbacks for a sound.
     */
    unregisterDistanceCallback(instanceId) {
        return this.stereoPanner.unregisterDistanceCallback(instanceId);
    }
    // ==================== Cleanup ====================
    /**
     * Stops all active one-shot sounds in a specific group.
     */
    stopAudioGroup(group) {
        this.groupManager.stopGroup(group);
    }
    /**
     * Destroys the AudioManager and releases all resources.
     */
    destroy() {
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
//# sourceMappingURL=audio-manager.js.map