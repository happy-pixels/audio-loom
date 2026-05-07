import { Observable } from 'rxjs';
import { LoadStatus, ChannelInfo, PlaybackInfo, TrackStartEvent, TrackEndEvent, LoadCompleteEvent, AudioErrorEvent, PoolStats } from './types';
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
    private settings;
    private tracks;
    private trackSelector;
    private logger;
    private audioContext;
    private masterGain;
    private groupGains;
    private audioBuffers;
    private activeSounds;
    private masterVolume;
    private channels;
    private channelSubjects;
    private fadeStates;
    private poolConfigs;
    private trackStartSubject;
    private trackEndSubject;
    private loadCompleteSubject;
    private errorSubject;
    /**
     * Observable that emits when a track starts playing.
     * @example
     * ```typescript
     * audio.onTrackStart$.subscribe(event => {
     *   console.log(`Playing: ${event.key} on channel ${event.channelId}`);
     * });
     * ```
     */
    readonly onTrackStart$: Observable<TrackStartEvent>;
    /**
     * Observable that emits when a track finishes playing.
     * @example
     * ```typescript
     * audio.onTrackEnd$.subscribe(event => {
     *   console.log(`Finished: ${event.key}`);
     * });
     * ```
     */
    readonly onTrackEnd$: Observable<TrackEndEvent>;
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     * @example
     * ```typescript
     * audio.onLoadComplete$.subscribe(event => {
     *   console.log(`Loaded: ${event.key}, duration: ${event.duration}s`);
     * });
     * ```
     */
    readonly onLoadComplete$: Observable<LoadCompleteEvent>;
    /**
     * Observable that emits when an audio error occurs.
     * @example
     * ```typescript
     * audio.onError$.subscribe(event => {
     *   console.error(`Audio error: ${event.message}`, event.error);
     * });
     * ```
     */
    readonly onError$: Observable<AudioErrorEvent>;
    /**
     * Gets or sets whether debug logging is enabled.
     * When enabled, the AudioManager logs internal operations to the console.
     * @default false
     */
    get loggingEnabled(): boolean;
    set loggingEnabled(value: boolean);
    /**
     * Creates a new AudioManager instance.
     * The AudioContext is created lazily on first use or via {@link initAudio}.
     */
    constructor();
    private ensureAudioContext;
    private ensureGroupGain;
    /**
     * Initializes the AudioContext and resumes it if suspended.
     * Call this method on user interaction to ensure audio playback works in browsers.
     *
     * @returns A promise that resolves when the AudioContext is ready.
     * @example
     * ```typescript
     * document.getElementById('startButton').onclick = async () => {
     *   await audio.initAudio();
     *   console.log('Audio ready!');
     * };
     * ```
     */
    initAudio(): Promise<void>;
    /**
     * Resumes a suspended AudioContext.
     * Browsers require user interaction before allowing audio playback.
     * Call this method in response to a user gesture (click, touch, keypress).
     *
     * @returns A promise that resolves when the AudioContext is resumed.
     * @example
     * ```typescript
     * playButton.onclick = async () => {
     *   await audio.resumeAudioContext();
     *   audio.playAudioTrack('click');
     * };
     * ```
     */
    resumeAudioContext(): Promise<void>;
    /**
     * Suspends the AudioContext to save resources when audio is not needed.
     * Useful for pausing all audio when the application loses focus or enters background.
     *
     * @returns A promise that resolves when the AudioContext is suspended.
     * @example
     * ```typescript
     * document.addEventListener('visibilitychange', async () => {
     *   if (document.hidden) {
     *     await audio.suspendAudioContext();
     *   } else {
     *     await audio.resumeAudioContext();
     *   }
     * });
     * ```
     */
    suspendAudioContext(): Promise<void>;
    /**
     * Checks if the AudioContext is initialized and running.
     *
     * @returns `true` if the AudioContext is ready for playback, `false` otherwise.
     * @example
     * ```typescript
     * if (!audio.isAudioReady()) {
     *   showMessage('Click to enable audio');
     * }
     * ```
     */
    isAudioReady(): boolean;
    /**
     * Sets the master volume that affects all audio output.
     * The value is clamped to the range [0, 1].
     *
     * @param volume - The master volume level (0 = silent, 1 = full volume).
     * @example
     * ```typescript
     * // Set master volume to 50%
     * audio.setMasterVolume(0.5);
     *
     * // Mute all audio
     * audio.setMasterVolume(0);
     * ```
     */
    setMasterVolume(volume: number): void;
    /**
     * Gets the current master volume level.
     *
     * @returns The master volume level (0-1).
     * @example
     * ```typescript
     * const volume = audio.getMasterVolume();
     * volumeSlider.value = volume * 100;
     * ```
     */
    getMasterVolume(): number;
    /**
     * Enables or disables audio playback for a specific group.
     * When disabled, all sounds in the group are muted and continuous playback is paused.
     *
     * @param group - The audio group name (e.g., 'sfx', 'music', 'ambient').
     * @param enabled - Whether the group should be enabled.
     * @example
     * ```typescript
     * // Mute sound effects
     * audio.setAudioEnabled('sfx', false);
     *
     * // Re-enable sound effects
     * audio.setAudioEnabled('sfx', true);
     * ```
     */
    setAudioEnabled(group: string, enabled: boolean): void;
    /**
     * Sets the volume for a specific audio group.
     * The value is clamped to the range [0, 1].
     *
     * @param group - The audio group name (e.g., 'sfx', 'music', 'ambient').
     * @param volume - The volume level (0 = silent, 1 = full volume).
     * @example
     * ```typescript
     * // Set music volume to 70%
     * audio.setAudioVolume('music', 0.7);
     *
     * // Set SFX volume from a slider
     * audio.setAudioVolume('sfx', sfxSlider.value / 100);
     * ```
     */
    setAudioVolume(group: string, volume: number): void;
    /**
     * Sets the maximum number of concurrent sounds for a group.
     * When the limit is reached, new sounds in the group will not play.
     *
     * @param group - The audio group name.
     * @param maxConcurrent - Maximum number of simultaneous sounds (minimum: 1).
     * @example
     * ```typescript
     * // Allow up to 4 concurrent footstep sounds
     * audio.setGroupPoolSize('sfx', 4);
     *
     * // Allow more sounds for ambient group
     * audio.setGroupPoolSize('ambient', 16);
     * ```
     */
    setGroupPoolSize(group: string, maxConcurrent: number): void;
    /**
     * Gets statistics about the audio pool for one or all groups.
     *
     * @param group - Optional group name. If omitted, returns stats for all groups.
     * @returns Pool statistics for the specified group, or an array of stats for all groups.
     * @example
     * ```typescript
     * // Get stats for a specific group
     * const sfxStats = audio.getPoolStats('sfx');
     * console.log(`SFX: ${sfxStats.inUse}/${sfxStats.maxConcurrent} in use`);
     *
     * // Get stats for all groups
     * const allStats = audio.getPoolStats();
     * allStats.forEach(stats => console.log(stats.group, stats.inUse));
     * ```
     */
    getPoolStats(group?: string): PoolStats | PoolStats[];
    private getGroupPoolStats;
    private loadAudioBuffer;
    /**
     * Checks if all tracks for a key are fully loaded and ready to play.
     *
     * @param key - The audio key to check.
     * @returns `true` if all tracks for the key are loaded, `false` otherwise.
     * @example
     * ```typescript
     * if (audio.isLoaded('explosion')) {
     *   audio.playAudioTrack('explosion');
     * } else {
     *   await audio.preload(['explosion']);
     * }
     * ```
     */
    isLoaded(key: string): boolean;
    /**
     * Gets detailed loading status for a specific audio key.
     *
     * @param key - The audio key to check.
     * @returns An object with total tracks, loaded count, and ready status.
     * @example
     * ```typescript
     * const status = audio.getLoadStatus('footsteps');
     * console.log(`Loaded ${status.loaded}/${status.total} tracks`);
     * if (status.ready) {
     *   console.log('All footstep sounds ready!');
     * }
     * ```
     */
    getLoadStatus(key: string): LoadStatus;
    /**
     * Preloads audio tracks into memory for low-latency playback.
     * This is especially important for one-shot sounds (SFX) that need instant playback.
     *
     * @param keys - Array of audio keys to preload.
     * @returns A promise that resolves when all tracks are loaded.
     * @throws If any track fails to load.
     * @example
     * ```typescript
     * // Preload during a loading screen
     * async function loadGame() {
     *   showLoadingScreen();
     *   await audio.preload(['explosion', 'gunshot', 'footstep', 'jump']);
     *   hideLoadingScreen();
     * }
     *
     * // Track loading progress
     * audio.preload(['music1', 'music2']).then(() => {
     *   console.log('All music loaded');
     * });
     * ```
     */
    preload(keys: string[]): Promise<void>;
    /**
     * Registers an audio track with the manager.
     * Multiple tracks can be registered under the same key for random variation.
     *
     * @param key - Unique identifier for the sound (e.g., 'explosion', 'footstep').
     * @param group - Audio group for volume/mute control (e.g., 'sfx', 'music').
     * @param path - URL or path to the audio file.
     * @example
     * ```typescript
     * // Add a single sound effect
     * audio.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
     *
     * // Add multiple variations for the same key (random selection on play)
     * audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep1.wav');
     * audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep2.wav');
     * audio.addAudioTrack('footstep', 'sfx', '/sounds/footstep3.wav');
     *
     * // Add background music
     * audio.addAudioTrack('battle', 'music', '/music/battle-theme.mp3');
     * ```
     */
    addAudioTrack(key: string, group: string, path: string): void;
    /**
     * Plays a one-shot sound effect.
     * If multiple tracks are registered under the key, one is selected randomly.
     * The sound plays to completion and cannot be stopped or paused.
     *
     * @param key - The audio key to play.
     * @example
     * ```typescript
     * // Play a sound effect
     * audio.playAudioTrack('explosion');
     *
     * // Play footstep (random variation if multiple tracks registered)
     * audio.playAudioTrack('footstep');
     *
     * // Rapid fire - respects pool limits
     * for (let i = 0; i < 10; i++) {
     *   audio.playAudioTrack('gunshot');
     * }
     * ```
     */
    playAudioTrack(key: string): void;
    private loadAndPlayOneShot;
    private playOneShotWithBuffer;
    /**
     * Starts continuous playback on a channel.
     * When a track ends, the next track is automatically played (looping through all tracks).
     * Ideal for background music, ambient sounds, or any audio that should loop.
     *
     * @param key - The audio key to play.
     * @param channelId - Optional channel identifier (default: 'default').
     *                    Use different channels for simultaneous playback (e.g., music + ambient).
     * @example
     * ```typescript
     * // Play background music on default channel
     * audio.playContinuous('battle-music');
     *
     * // Play ambient sounds on a separate channel
     * audio.playContinuous('forest-ambient', 'ambient');
     *
     * // Both play simultaneously and can be controlled independently
     * audio.pauseContinuous('ambient');  // Pause only ambient
     * audio.stopContinuous();            // Stop only default channel
     * ```
     */
    playContinuous(key: string, channelId?: string): void;
    /**
     * Stops continuous playback on a channel and resets to the beginning.
     *
     * @param channelId - The channel to stop (default: 'default').
     * @example
     * ```typescript
     * // Stop the default channel
     * audio.stopContinuous();
     *
     * // Stop a specific channel
     * audio.stopContinuous('ambient');
     * ```
     */
    stopContinuous(channelId?: string): void;
    /**
     * Pauses continuous playback on a channel.
     * The playback position is preserved and can be resumed with {@link resumeContinuous}.
     *
     * @param channelId - The channel to pause (default: 'default').
     * @example
     * ```typescript
     * // Pause when game is paused
     * audio.pauseContinuous();
     *
     * // Pause ambient channel only
     * audio.pauseContinuous('ambient');
     * ```
     */
    pauseContinuous(channelId?: string): void;
    /**
     * Resumes paused continuous playback on a channel.
     *
     * @param channelId - The channel to resume (default: 'default').
     * @example
     * ```typescript
     * // Resume when game is unpaused
     * audio.resumeContinuous();
     *
     * // Resume ambient channel only
     * audio.resumeContinuous('ambient');
     * ```
     */
    resumeContinuous(channelId?: string): void;
    /**
     * Starts playback with a gradual volume fade-in effect.
     * Uses the Web Audio API's native gain automation for smooth transitions.
     *
     * @param key - The audio key to play.
     * @param duration - Fade duration in milliseconds.
     * @param channelId - The channel to use (default: 'default').
     * @returns A promise that resolves when the fade-in completes.
     * @example
     * ```typescript
     * // Fade in background music over 2 seconds
     * await audio.fadeIn('battle-music', 2000);
     *
     * // Fade in on a specific channel
     * await audio.fadeIn('ambient', 3000, 'ambient');
     * ```
     */
    fadeIn(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Gradually fades out and stops the current playback on a channel.
     * Uses the Web Audio API's native gain automation for smooth transitions.
     *
     * @param duration - Fade duration in milliseconds.
     * @param channelId - The channel to fade out (default: 'default').
     * @returns A promise that resolves when the fade-out completes and playback stops.
     * @example
     * ```typescript
     * // Fade out current music over 1.5 seconds
     * await audio.fadeOut(1500);
     *
     * // Fade out ambient sounds
     * await audio.fadeOut(2000, 'ambient');
     * ```
     */
    fadeOut(duration: number, channelId?: string): Promise<void>;
    /**
     * Cross-fades from the current track to a new track on the same channel.
     * The old track fades out while the new track fades in simultaneously.
     *
     * @param key - The audio key of the new track to play.
     * @param duration - Cross-fade duration in milliseconds.
     * @param channelId - The channel to cross-fade on (default: 'default').
     * @returns A promise that resolves when the cross-fade completes.
     * @example
     * ```typescript
     * // Cross-fade to a new music track
     * await audio.crossFade('boss-music', 2000);
     *
     * // Seamless transition between ambient tracks
     * await audio.crossFade('cave-ambient', 3000, 'ambient');
     * ```
     */
    crossFade(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Gets information about all active continuous playback channels.
     *
     * @returns An object mapping channel IDs to their playback info.
     * @example
     * ```typescript
     * const channels = audio.getActiveChannels();
     * Object.entries(channels).forEach(([id, info]) => {
     *   console.log(`Channel ${id}: ${info.key} (playing: ${info.isPlaying})`);
     * });
     * ```
     */
    getActiveChannels(): {
        [channelId: string]: ChannelInfo;
    };
    /**
     * Gets information about a specific playback channel.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns Channel info if active, or `null` if no playback on channel.
     * @example
     * ```typescript
     * const info = audio.getChannelInfo('music');
     * if (info?.isPlaying) {
     *   console.log(`Now playing: ${info.key}`);
     * }
     * ```
     */
    getChannelInfo(channelId?: string): ChannelInfo | null;
    /**
     * Stops all continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Stop all music/ambient when leaving a scene
     * audio.stopAllContinuous();
     * ```
     */
    stopAllContinuous(): void;
    /**
     * Pauses all continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Pause everything when game is paused
     * audio.pauseAllContinuous();
     * ```
     */
    pauseAllContinuous(): void;
    /**
     * Resumes all paused continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Resume everything when game is unpaused
     * audio.resumeAllContinuous();
     * ```
     */
    resumeAllContinuous(): void;
    /**
     * Sets the playback speed/rate for a channel.
     * The value is clamped to the range [0.25, 4.0].
     *
     * @param rate - Playback rate (1.0 = normal, 0.5 = half speed, 2.0 = double speed).
     * @param channelId - The channel to modify (default: 'default').
     * @example
     * ```typescript
     * // Slow motion music effect
     * audio.setPlaybackRate(0.5);
     *
     * // Fast forward
     * audio.setPlaybackRate(2.0);
     *
     * // Reset to normal
     * audio.setPlaybackRate(1.0);
     * ```
     */
    setPlaybackRate(rate: number, channelId?: string): void;
    /**
     * Gets the current playback rate for a channel.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns The playback rate, or `null` if no playback on channel.
     */
    getPlaybackRate(channelId?: string): number | null;
    /**
     * Seeks to a specific time position in the current track.
     *
     * @param time - Time position in seconds.
     * @param channelId - The channel to seek (default: 'default').
     * @example
     * ```typescript
     * // Skip to 1 minute into the track
     * audio.seek(60);
     *
     * // Restart from beginning
     * audio.seek(0);
     * ```
     */
    seek(time: number, channelId?: string): void;
    /**
     * Gets the current playback time in seconds.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns Current time in seconds, or `null` if no playback on channel.
     * @example
     * ```typescript
     * const time = audio.getCurrentTime();
     * if (time !== null) {
     *   progressBar.value = time;
     * }
     * ```
     */
    getCurrentTime(channelId?: string): number | null;
    /**
     * Gets the total duration of the current track in seconds.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns Duration in seconds, or `null` if unavailable.
     * @example
     * ```typescript
     * const duration = audio.getDuration();
     * if (duration !== null) {
     *   console.log(`Track length: ${duration}s`);
     * }
     * ```
     */
    getDuration(channelId?: string): number | null;
    /**
     * Gets comprehensive playback information for a channel.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns Playback info including time, duration, rate, and volume.
     * @example
     * ```typescript
     * const info = audio.getPlaybackInfo();
     * if (info) {
     *   console.log(`Playing: ${info.key}`);
     *   console.log(`Progress: ${info.currentTime}/${info.duration}s`);
     *   console.log(`Rate: ${info.playbackRate}x, Volume: ${info.volume}`);
     * }
     * ```
     */
    getPlaybackInfo(channelId?: string): PlaybackInfo | null;
    private cancelFade;
    private selectRandomTrack;
    private onTrackEnded;
    /**
     * Destroys the AudioManager and releases all resources.
     * Stops all playback, disconnects all audio nodes, and closes the AudioContext.
     * After calling destroy(), the AudioManager instance should not be used.
     *
     * @example
     * ```typescript
     * // Clean up when leaving a game or unmounting a component
     * audio.destroy();
     *
     * // React useEffect cleanup
     * useEffect(() => {
     *   const audio = new AudioManager();
     *   return () => audio.destroy();
     * }, []);
     * ```
     */
    destroy(): void;
}
//# sourceMappingURL=audio-manager.d.ts.map