import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DEFAULT_AUDIO_SETTINGS, DEFAULT_POOL_CONFIG } from './types';
import { Logger } from './logger';
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
    settings = {};
    tracks = {};
    trackSelector = {};
    logger = new Logger();
    // Web Audio API properties
    audioContext = null;
    masterGain = null;
    groupGains = {};
    audioBuffers = {};
    activeSounds = {};
    masterVolume = 1.0;
    // Continuous playback with Web Audio
    channels = {};
    channelSubjects = {};
    fadeStates = {};
    // Pool configuration (still used for limiting concurrent sounds)
    poolConfigs = {};
    // Event subjects
    trackStartSubject = new Subject();
    trackEndSubject = new Subject();
    loadCompleteSubject = new Subject();
    errorSubject = new Subject();
    /**
     * Observable that emits when a track starts playing.
     * @example
     * ```typescript
     * audio.onTrackStart$.subscribe(event => {
     *   console.log(`Playing: ${event.key} on channel ${event.channelId}`);
     * });
     * ```
     */
    onTrackStart$ = this.trackStartSubject.asObservable();
    /**
     * Observable that emits when a track finishes playing.
     * @example
     * ```typescript
     * audio.onTrackEnd$.subscribe(event => {
     *   console.log(`Finished: ${event.key}`);
     * });
     * ```
     */
    onTrackEnd$ = this.trackEndSubject.asObservable();
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     * @example
     * ```typescript
     * audio.onLoadComplete$.subscribe(event => {
     *   console.log(`Loaded: ${event.key}, duration: ${event.duration}s`);
     * });
     * ```
     */
    onLoadComplete$ = this.loadCompleteSubject.asObservable();
    /**
     * Observable that emits when an audio error occurs.
     * @example
     * ```typescript
     * audio.onError$.subscribe(event => {
     *   console.error(`Audio error: ${event.message}`, event.error);
     * });
     * ```
     */
    onError$ = this.errorSubject.asObservable();
    /**
     * Gets or sets whether debug logging is enabled.
     * When enabled, the AudioManager logs internal operations to the console.
     * @default false
     */
    get loggingEnabled() {
        return this.logger.enabled;
    }
    set loggingEnabled(value) {
        this.logger.enabled = value;
    }
    /**
     * Creates a new AudioManager instance.
     * The AudioContext is created lazily on first use or via {@link initAudio}.
     */
    constructor() {
        // No initialization needed - AudioContext created lazily or via initAudio()
    }
    // ==================== Web Audio API Context Management ====================
    ensureAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            this.logger.log('Created AudioContext and master gain node');
        }
        return this.audioContext;
    }
    ensureGroupGain(group) {
        this.ensureAudioContext();
        if (!this.groupGains[group]) {
            const gainNode = this.audioContext.createGain();
            const groupSettings = this.settings[group] || DEFAULT_AUDIO_SETTINGS;
            gainNode.gain.value = groupSettings.enabled ? groupSettings.volume : 0;
            gainNode.connect(this.masterGain);
            this.groupGains[group] = gainNode;
            this.logger.log(`Created group gain node for "${group}"`);
        }
        return this.groupGains[group];
    }
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
    async initAudio() {
        this.ensureAudioContext();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.logger.log('Audio initialized, context state:', this.audioContext.state);
    }
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
    async resumeAudioContext() {
        if (!this.audioContext) {
            this.ensureAudioContext();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.logger.log('AudioContext resumed');
        }
    }
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
    async suspendAudioContext() {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
            this.logger.log('AudioContext suspended');
        }
    }
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
    isAudioReady() {
        return this.audioContext !== null && this.audioContext.state === 'running';
    }
    // ==================== Master Volume ====================
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
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        this.logger.log(`Set master volume to ${this.masterVolume}`);
    }
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
    getMasterVolume() {
        return this.masterVolume;
    }
    // ==================== Group Settings ====================
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
    setAudioEnabled(group, enabled) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].enabled = enabled;
        // Update group gain node
        const groupGain = this.groupGains[group];
        if (groupGain) {
            const ctx = this.audioContext;
            if (ctx) {
                const currentTime = ctx.currentTime;
                groupGain.gain.cancelScheduledValues(currentTime);
                groupGain.gain.setValueAtTime(enabled ? this.settings[group].volume : 0, currentTime);
            }
        }
        // Update all channels belonging to this group
        for (const channelId of Object.keys(this.channels)) {
            const playback = this.channels[channelId];
            if (playback.track.group === group) {
                if (!enabled && playback.isPlaying) {
                    try {
                        playback.mediaElement.pause();
                        playback.isPlaying = false;
                    }
                    catch (error) {
                        this.logger.error(`Failed to pause audio for group "${group}" on channel "${channelId}"`, error);
                    }
                }
                else if (enabled && !playback.isPlaying && !playback.isPaused) {
                    try {
                        playback.mediaElement.play();
                        playback.isPlaying = true;
                    }
                    catch (error) {
                        this.logger.error(`Failed to play audio for group "${group}" on channel "${channelId}"`, error);
                    }
                }
            }
        }
    }
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
    setAudioVolume(group, volume) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].volume = Math.max(0, Math.min(1, volume));
        // Update group gain node if it exists and group is enabled
        const groupGain = this.groupGains[group];
        if (groupGain && this.settings[group].enabled) {
            const ctx = this.audioContext;
            if (ctx) {
                groupGain.gain.cancelScheduledValues(ctx.currentTime);
                groupGain.gain.setValueAtTime(this.settings[group].volume, ctx.currentTime);
            }
        }
    }
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
    setGroupPoolSize(group, maxConcurrent) {
        this.poolConfigs[group] = { maxConcurrent: Math.max(1, maxConcurrent) };
        this.logger.log(`Set pool size for group "${group}" to ${maxConcurrent}`);
    }
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
    getPoolStats(group) {
        if (group) {
            return this.getGroupPoolStats(group);
        }
        const allGroups = new Set([
            ...Object.keys(this.activeSounds),
            ...Object.keys(this.poolConfigs)
        ]);
        return Array.from(allGroups).map(g => this.getGroupPoolStats(g));
    }
    getGroupPoolStats(group) {
        const active = this.activeSounds[group] || [];
        const config = this.poolConfigs[group] || DEFAULT_POOL_CONFIG;
        return {
            group,
            maxConcurrent: config.maxConcurrent,
            totalPooled: active.length,
            inUse: active.length,
            available: Math.max(0, config.maxConcurrent - active.length)
        };
    }
    // ==================== Audio Buffer Loading ====================
    async loadAudioBuffer(path) {
        const ctx = this.ensureAudioContext();
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    }
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
    isLoaded(key) {
        const bufferEntries = this.audioBuffers[key];
        if (!bufferEntries || bufferEntries.length === 0) {
            return false;
        }
        return bufferEntries.every(entry => entry.loadState === 'loaded' && entry.buffer !== null);
    }
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
    getLoadStatus(key) {
        const bufferEntries = this.audioBuffers[key];
        if (!bufferEntries || bufferEntries.length === 0) {
            return { total: 0, loaded: 0, ready: false };
        }
        const total = bufferEntries.length;
        const loaded = bufferEntries.filter(entry => entry.loadState === 'loaded').length;
        return { total, loaded, ready: loaded === total };
    }
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
    async preload(keys) {
        const loadPromises = [];
        for (const key of keys) {
            const bufferEntries = this.audioBuffers[key];
            if (!bufferEntries) {
                this.logger.warn(`No tracks found for key "${key}" during preload`);
                continue;
            }
            for (const entry of bufferEntries) {
                if (entry.loadState === 'loaded' && entry.buffer !== null) {
                    continue;
                }
                entry.loadState = 'loading';
                const loadPromise = this.loadAudioBuffer(entry.path)
                    .then(buffer => {
                    entry.buffer = buffer;
                    entry.loadState = 'loaded';
                    this.logger.log(`Preloaded audio buffer: ${entry.path}`);
                    // Update the corresponding track's buffer
                    const tracks = this.tracks[key];
                    if (tracks) {
                        const track = tracks.find(t => t.path === entry.path);
                        if (track) {
                            track.buffer = buffer;
                        }
                    }
                })
                    .catch(error => {
                    entry.loadState = 'error';
                    this.logger.error(`Failed to preload audio buffer: ${entry.path}`, error);
                    throw error;
                });
                loadPromises.push(loadPromise);
            }
        }
        if (loadPromises.length === 0) {
            this.logger.warn('No tracks to preload');
            return;
        }
        await Promise.all(loadPromises);
        this.logger.log(`Preloaded ${loadPromises.length} audio buffers`);
    }
    // ==================== Track Management ====================
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
    addAudioTrack(key, group, path) {
        try {
            this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
            this.tracks[key] = this.tracks[key] || [];
            const track = { key, group, path };
            this.tracks[key].push(track);
            // Initialize audio buffer entry
            this.audioBuffers[key] = this.audioBuffers[key] || [];
            this.audioBuffers[key].push({
                key,
                group,
                path,
                buffer: null,
                loadState: 'pending'
            });
            this.logger.log(`Added audio track "${key}" in group "${group}": ${path}`);
        }
        catch (error) {
            this.logger.error(`Failed to add audio track "${key}" from path "${path}"`, error);
        }
    }
    // ==================== One-Shot Playback (SFX) ====================
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
    playAudioTrack(key) {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            this.logger.warn(`No tracks found for key "${key}"`);
            return;
        }
        // Select a random track
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        const track = this.selectRandomTrack(key);
        if (!track) {
            this.logger.warn(`Failed to select track for key "${key}"`);
            return;
        }
        if (!this.settings[track.group]?.enabled) {
            this.logger.log(`Audio group "${track.group}" is disabled, skipping playback`);
            return;
        }
        // Check concurrent limit
        const config = this.poolConfigs[track.group] || DEFAULT_POOL_CONFIG;
        this.activeSounds[track.group] = this.activeSounds[track.group] || [];
        const activeCount = this.activeSounds[track.group].length;
        if (activeCount >= config.maxConcurrent) {
            this.logger.warn(`Pool limit reached for group "${track.group}" (${config.maxConcurrent} concurrent)`);
            return;
        }
        // Check if buffer is loaded
        const bufferEntry = this.audioBuffers[key]?.find(e => e.path === track.path);
        if (!bufferEntry || bufferEntry.loadState !== 'loaded' || !bufferEntry.buffer) {
            // Load and play asynchronously
            this.loadAndPlayOneShot(track, key);
            return;
        }
        this.playOneShotWithBuffer(track, bufferEntry.buffer, key);
    }
    async loadAndPlayOneShot(track, key) {
        try {
            const buffer = await this.loadAudioBuffer(track.path);
            // Update buffer entry
            const bufferEntry = this.audioBuffers[key]?.find(e => e.path === track.path);
            if (bufferEntry) {
                bufferEntry.buffer = buffer;
                bufferEntry.loadState = 'loaded';
            }
            track.buffer = buffer;
            this.playOneShotWithBuffer(track, buffer, key);
        }
        catch (error) {
            this.logger.error(`Failed to load and play track "${key}"`, error);
            this.errorSubject.next({
                key,
                channelId: null,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to load and play track "${key}"`
            });
        }
    }
    playOneShotWithBuffer(track, buffer, key) {
        try {
            const ctx = this.ensureAudioContext();
            const groupGain = this.ensureGroupGain(track.group);
            // Create source node
            const sourceNode = ctx.createBufferSource();
            sourceNode.buffer = buffer;
            // Create individual gain node for this sound
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;
            // Connect: source -> individual gain -> group gain -> master -> destination
            sourceNode.connect(gainNode);
            gainNode.connect(groupGain);
            const instanceId = `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const instance = {
                id: instanceId,
                key,
                group: track.group,
                sourceNode,
                gainNode,
                startTime: ctx.currentTime
            };
            this.activeSounds[track.group].push(instance);
            // Clean up when ended
            sourceNode.onended = () => {
                const group = this.activeSounds[track.group];
                if (group) {
                    const index = group.findIndex(s => s.id === instanceId);
                    if (index !== -1) {
                        group.splice(index, 1);
                    }
                }
                this.trackEndSubject.next({
                    key,
                    channelId: instanceId,
                    group: track.group,
                    src: track.path
                });
            };
            sourceNode.start();
            this.trackStartSubject.next({
                key,
                channelId: instanceId,
                group: track.group,
                src: track.path
            });
            this.logger.log(`Playing one-shot "${key}" (instance: ${instanceId})`);
        }
        catch (error) {
            this.logger.error(`Failed to play track "${key}"`, error);
            this.errorSubject.next({
                key,
                channelId: null,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to play track "${key}"`
            });
        }
    }
    // ==================== Continuous Playback (Music/Ambient) ====================
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
    playContinuous(key, channelId = DEFAULT_CHANNEL) {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            this.logger.warn(`No tracks found for key "${key}"`);
            return;
        }
        this.stopContinuous(channelId);
        const track = this.selectRandomTrack(key);
        if (!track) {
            this.logger.warn(`Failed to select track for key "${key}"`);
            return;
        }
        const ctx = this.ensureAudioContext();
        const groupGain = this.ensureGroupGain(track.group);
        // Create media element for streaming
        const mediaElement = new Audio(track.path);
        mediaElement.preload = 'auto';
        // Create a new subject for this channel
        this.channelSubjects[channelId] = new Subject();
        const channelEnd$ = this.channelSubjects[channelId];
        fromEvent(mediaElement, 'error')
            .pipe(takeUntil(channelEnd$))
            .subscribe((event) => {
            this.logger.error(`Failed to load track: ${track.path}`, event);
            this.errorSubject.next({
                key,
                channelId,
                group: track.group,
                src: track.path,
                error: event,
                message: `Failed to load track: ${track.path}`
            });
        });
        fromEvent(mediaElement, 'loadedmetadata')
            .pipe(takeUntil(channelEnd$))
            .subscribe(() => {
            this.logger.log(`Loaded track for continuous playback on channel "${channelId}": ${track.path}`);
            mediaElement.currentTime = 0;
            // Create MediaElementAudioSourceNode
            let sourceNode;
            try {
                sourceNode = ctx.createMediaElementSource(mediaElement);
            }
            catch (error) {
                this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                this.errorSubject.next({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    error,
                    message: `Failed to create audio source for channel "${channelId}"`
                });
                return;
            }
            // Create individual gain node for this channel
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;
            // Connect: source -> channel gain -> group gain -> master -> destination
            sourceNode.connect(gainNode);
            gainNode.connect(groupGain);
            this.channels[channelId] = {
                key,
                track,
                mediaElement,
                sourceNode,
                gainNode,
                isPlaying: false,
                isPaused: false
            };
            this.loadCompleteSubject.next({
                key,
                channelId,
                group: track.group,
                src: track.path,
                duration: mediaElement.duration
            });
            if (this.settings[track.group]?.enabled) {
                try {
                    mediaElement.play();
                    this.channels[channelId].isPlaying = true;
                    this.trackStartSubject.next({
                        key,
                        channelId,
                        group: track.group,
                        src: track.path
                    });
                }
                catch (error) {
                    this.logger.error(`Failed to play continuous track "${key}" on channel "${channelId}"`, error);
                    this.errorSubject.next({
                        key,
                        channelId,
                        group: track.group,
                        src: track.path,
                        error,
                        message: `Failed to play continuous track "${key}" on channel "${channelId}"`
                    });
                }
            }
        });
        fromEvent(mediaElement, 'ended')
            .pipe(takeUntil(channelEnd$))
            .subscribe(() => {
            this.logger.log(`Track ended: ${track.path}`);
            this.trackEndSubject.next({
                key,
                channelId,
                group: track.group,
                src: track.path
            });
            this.onTrackEnded(channelId);
        });
        try {
            mediaElement.load();
        }
        catch (error) {
            this.logger.error(`Failed to load track "${key}"`, error);
            this.errorSubject.next({
                key,
                channelId,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to load track "${key}"`
            });
        }
    }
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
    stopContinuous(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return;
        }
        // Signal completion and clean up the subject
        if (this.channelSubjects[channelId]) {
            this.channelSubjects[channelId].next();
            this.channelSubjects[channelId].complete();
            delete this.channelSubjects[channelId];
        }
        // Cancel any active fade on this channel
        this.cancelFade(channelId);
        try {
            playback.mediaElement.pause();
            playback.mediaElement.currentTime = 0;
            playback.sourceNode.disconnect();
            playback.gainNode.disconnect();
        }
        catch (error) {
            this.logger.error(`Failed to stop continuous playback on channel "${channelId}"`, error);
        }
        delete this.channels[channelId];
    }
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
    pauseContinuous(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to pause`);
            return;
        }
        if (playback.isPaused) {
            this.logger.warn(`Continuous playback on channel "${channelId}" is already paused`);
            return;
        }
        try {
            playback.mediaElement.pause();
            playback.isPlaying = false;
            playback.isPaused = true;
            this.logger.log(`Paused continuous playback on channel "${channelId}" at ${playback.mediaElement.currentTime}s`);
        }
        catch (error) {
            this.logger.error(`Failed to pause continuous playback on channel "${channelId}"`, error);
        }
    }
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
    resumeContinuous(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to resume`);
            return;
        }
        if (!playback.isPaused) {
            this.logger.warn(`Continuous playback on channel "${channelId}" is not paused`);
            return;
        }
        const { track } = playback;
        if (!this.settings[track.group]?.enabled) {
            this.logger.warn(`Cannot resume on channel "${channelId}": audio group "${track.group}" is disabled`);
            return;
        }
        try {
            playback.mediaElement.play();
            playback.isPlaying = true;
            playback.isPaused = false;
            this.logger.log(`Resumed continuous playback on channel "${channelId}" from ${playback.mediaElement.currentTime}s`);
        }
        catch (error) {
            this.logger.error(`Failed to resume continuous playback on channel "${channelId}"`, error);
        }
    }
    // ==================== Fading with Web Audio API ====================
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
    fadeIn(key, duration, channelId = DEFAULT_CHANNEL) {
        return new Promise((resolve, reject) => {
            if (!this.tracks[key] || this.tracks[key].length === 0) {
                this.logger.warn(`No tracks found for key "${key}"`);
                reject(new Error(`No tracks found for key "${key}"`));
                return;
            }
            this.cancelFade(channelId);
            this.stopContinuous(channelId);
            const track = this.selectRandomTrack(key);
            if (!track) {
                this.logger.warn(`Failed to select track for key "${key}"`);
                reject(new Error(`Failed to select track for key "${key}"`));
                return;
            }
            const ctx = this.ensureAudioContext();
            const groupGain = this.ensureGroupGain(track.group);
            // Create media element for streaming
            const mediaElement = new Audio(track.path);
            mediaElement.preload = 'auto';
            // Create a new subject for this channel
            this.channelSubjects[channelId] = new Subject();
            const channelEnd$ = this.channelSubjects[channelId];
            fromEvent(mediaElement, 'error')
                .pipe(takeUntil(channelEnd$))
                .subscribe((event) => {
                this.logger.error(`Failed to load track: ${track.path}`, event);
                this.errorSubject.next({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    error: event,
                    message: `Failed to load track: ${track.path}`
                });
                reject(new Error(`Failed to load track: ${track.path}`));
            });
            fromEvent(mediaElement, 'loadedmetadata')
                .pipe(takeUntil(channelEnd$))
                .subscribe(() => {
                this.logger.log(`Loaded track for fade in on channel "${channelId}": ${track.path}`);
                mediaElement.currentTime = 0;
                let sourceNode;
                try {
                    sourceNode = ctx.createMediaElementSource(mediaElement);
                }
                catch (error) {
                    this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                    reject(error);
                    return;
                }
                // Create individual gain node for this channel
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                // Connect: source -> channel gain -> group gain -> master -> destination
                sourceNode.connect(gainNode);
                gainNode.connect(groupGain);
                this.channels[channelId] = {
                    key,
                    track,
                    mediaElement,
                    sourceNode,
                    gainNode,
                    isPlaying: false,
                    isPaused: false
                };
                this.loadCompleteSubject.next({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    duration: mediaElement.duration
                });
                if (this.settings[track.group]?.enabled) {
                    try {
                        mediaElement.play();
                        this.channels[channelId].isPlaying = true;
                        this.trackStartSubject.next({
                            key,
                            channelId,
                            group: track.group,
                            src: track.path
                        });
                        // Use Web Audio API for fade
                        const targetVolume = 1.0;
                        const durationSeconds = duration / 1000;
                        gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + durationSeconds);
                        // Track fade state
                        this.fadeStates[channelId] = {
                            startTime: ctx.currentTime,
                            startVolume: 0,
                            targetVolume,
                            duration,
                            gainNode,
                            onComplete: () => {
                                this.logger.log(`Fade in complete for "${key}" on channel "${channelId}"`);
                                resolve();
                            }
                        };
                        // Schedule completion callback
                        setTimeout(() => {
                            if (this.fadeStates[channelId]) {
                                this.fadeStates[channelId].onComplete?.();
                                delete this.fadeStates[channelId];
                            }
                        }, duration);
                    }
                    catch (error) {
                        this.logger.error(`Failed to play track for fade in "${key}" on channel "${channelId}"`, error);
                        this.errorSubject.next({
                            key,
                            channelId,
                            group: track.group,
                            src: track.path,
                            error,
                            message: `Failed to play track for fade in "${key}" on channel "${channelId}"`
                        });
                        reject(error);
                    }
                }
                else {
                    this.logger.warn(`Cannot fade in on channel "${channelId}": audio group "${track.group}" is disabled`);
                    resolve();
                }
            });
            fromEvent(mediaElement, 'ended')
                .pipe(takeUntil(channelEnd$))
                .subscribe(() => {
                this.logger.log(`Track ended: ${track.path}`);
                this.trackEndSubject.next({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path
                });
                this.onTrackEnded(channelId);
            });
            try {
                mediaElement.load();
            }
            catch (error) {
                this.logger.error(`Failed to load track "${key}"`, error);
                this.errorSubject.next({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    error,
                    message: `Failed to load track "${key}"`
                });
                reject(error);
            }
        });
    }
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
    fadeOut(duration, channelId = DEFAULT_CHANNEL) {
        return new Promise((resolve) => {
            const playback = this.channels[channelId];
            if (!playback) {
                this.logger.warn(`No continuous playback on channel "${channelId}" to fade out`);
                resolve();
                return;
            }
            if (!playback.isPlaying) {
                this.logger.warn(`Continuous playback on channel "${channelId}" is not playing`);
                this.stopContinuous(channelId);
                resolve();
                return;
            }
            this.cancelFade(channelId);
            const ctx = this.audioContext;
            if (!ctx) {
                this.stopContinuous(channelId);
                resolve();
                return;
            }
            const currentVolume = playback.gainNode.gain.value;
            this.logger.log(`Starting fade out on channel "${channelId}" from volume ${currentVolume} over ${duration}ms`);
            const durationSeconds = duration / 1000;
            playback.gainNode.gain.setValueAtTime(currentVolume, ctx.currentTime);
            playback.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSeconds);
            // Track fade state
            this.fadeStates[channelId] = {
                startTime: ctx.currentTime,
                startVolume: currentVolume,
                targetVolume: 0,
                duration,
                gainNode: playback.gainNode,
                onComplete: () => {
                    this.logger.log(`Fade out complete on channel "${channelId}"`);
                    this.stopContinuous(channelId);
                    resolve();
                }
            };
            // Schedule completion
            setTimeout(() => {
                if (this.fadeStates[channelId]) {
                    this.fadeStates[channelId].onComplete?.();
                    delete this.fadeStates[channelId];
                }
            }, duration);
        });
    }
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
    crossFade(key, duration, channelId = DEFAULT_CHANNEL) {
        return new Promise((resolve, reject) => {
            if (!this.tracks[key] || this.tracks[key].length === 0) {
                this.logger.warn(`No tracks found for key "${key}"`);
                reject(new Error(`No tracks found for key "${key}"`));
                return;
            }
            const oldPlayback = this.channels[channelId];
            const oldChannelEnd$ = this.channelSubjects[channelId];
            // Cancel any existing fade on this channel
            this.cancelFade(channelId);
            const ctx = this.ensureAudioContext();
            const newTrack = this.selectRandomTrack(key);
            if (!newTrack) {
                this.logger.warn(`Failed to select track for key "${key}"`);
                reject(new Error(`Failed to select track for key "${key}"`));
                return;
            }
            const groupGain = this.ensureGroupGain(newTrack.group);
            // Create new subject for new playback on this channel
            this.channelSubjects[channelId] = new Subject();
            const channelEnd$ = this.channelSubjects[channelId];
            const mediaElement = new Audio(newTrack.path);
            mediaElement.preload = 'auto';
            fromEvent(mediaElement, 'error')
                .pipe(takeUntil(channelEnd$))
                .subscribe((event) => {
                this.logger.error(`Failed to load track: ${newTrack.path}`, event);
                this.errorSubject.next({
                    key,
                    channelId,
                    group: newTrack.group,
                    src: newTrack.path,
                    error: event,
                    message: `Failed to load track: ${newTrack.path}`
                });
                reject(new Error(`Failed to load track: ${newTrack.path}`));
            });
            fromEvent(mediaElement, 'loadedmetadata')
                .pipe(takeUntil(channelEnd$))
                .subscribe(() => {
                this.logger.log(`Loaded track for cross-fade on channel "${channelId}": ${newTrack.path}`);
                mediaElement.currentTime = 0;
                let sourceNode;
                try {
                    sourceNode = ctx.createMediaElementSource(mediaElement);
                }
                catch (error) {
                    this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                    reject(error);
                    return;
                }
                // Create individual gain node for new track
                const gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                sourceNode.connect(gainNode);
                gainNode.connect(groupGain);
                this.channels[channelId] = {
                    key,
                    track: newTrack,
                    mediaElement,
                    sourceNode,
                    gainNode,
                    isPlaying: false,
                    isPaused: false
                };
                this.loadCompleteSubject.next({
                    key,
                    channelId,
                    group: newTrack.group,
                    src: newTrack.path,
                    duration: mediaElement.duration
                });
                if (this.settings[newTrack.group]?.enabled) {
                    try {
                        mediaElement.play();
                        this.channels[channelId].isPlaying = true;
                        this.trackStartSubject.next({
                            key,
                            channelId,
                            group: newTrack.group,
                            src: newTrack.path
                        });
                        const durationSeconds = duration / 1000;
                        const targetVolume = 1.0;
                        // Fade out old track if it exists and is playing
                        if (oldPlayback?.isPlaying) {
                            const oldVolume = oldPlayback.gainNode.gain.value;
                            this.trackEndSubject.next({
                                key: oldPlayback.key,
                                channelId,
                                group: oldPlayback.track.group,
                                src: oldPlayback.track.path
                            });
                            oldPlayback.gainNode.gain.setValueAtTime(oldVolume, ctx.currentTime);
                            oldPlayback.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSeconds);
                            // Clean up old playback after fade
                            setTimeout(() => {
                                if (oldChannelEnd$) {
                                    oldChannelEnd$.next();
                                    oldChannelEnd$.complete();
                                }
                                try {
                                    oldPlayback.mediaElement.pause();
                                    oldPlayback.mediaElement.currentTime = 0;
                                    oldPlayback.sourceNode.disconnect();
                                    oldPlayback.gainNode.disconnect();
                                }
                                catch (error) {
                                    this.logger.error(`Failed to stop old track after cross-fade on channel "${channelId}"`, error);
                                }
                            }, duration);
                        }
                        // Fade in new track
                        gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + durationSeconds);
                        // Track fade state
                        this.fadeStates[channelId] = {
                            startTime: ctx.currentTime,
                            startVolume: 0,
                            targetVolume,
                            duration,
                            gainNode,
                            onComplete: () => {
                                this.logger.log(`Cross-fade complete to "${key}" on channel "${channelId}"`);
                                resolve();
                            }
                        };
                        setTimeout(() => {
                            if (this.fadeStates[channelId]) {
                                this.fadeStates[channelId].onComplete?.();
                                delete this.fadeStates[channelId];
                            }
                        }, duration);
                    }
                    catch (error) {
                        this.logger.error(`Failed to play track for cross-fade "${key}" on channel "${channelId}"`, error);
                        this.errorSubject.next({
                            key,
                            channelId,
                            group: newTrack.group,
                            src: newTrack.path,
                            error,
                            message: `Failed to play track for cross-fade "${key}" on channel "${channelId}"`
                        });
                        reject(error);
                    }
                }
                else {
                    this.logger.warn(`Cannot cross-fade on channel "${channelId}": audio group "${newTrack.group}" is disabled`);
                    if (oldPlayback?.isPlaying) {
                        if (oldChannelEnd$) {
                            oldChannelEnd$.next();
                            oldChannelEnd$.complete();
                        }
                        try {
                            oldPlayback.mediaElement.pause();
                            oldPlayback.mediaElement.currentTime = 0;
                            oldPlayback.sourceNode.disconnect();
                            oldPlayback.gainNode.disconnect();
                        }
                        catch (error) {
                            this.logger.error(`Failed to stop old track on channel "${channelId}"`, error);
                        }
                    }
                    resolve();
                }
            });
            fromEvent(mediaElement, 'ended')
                .pipe(takeUntil(channelEnd$))
                .subscribe(() => {
                this.logger.log(`Track ended: ${newTrack.path}`);
                this.trackEndSubject.next({
                    key,
                    channelId,
                    group: newTrack.group,
                    src: newTrack.path
                });
                this.onTrackEnded(channelId);
            });
            try {
                mediaElement.load();
            }
            catch (error) {
                this.logger.error(`Failed to load track "${key}"`, error);
                this.errorSubject.next({
                    key,
                    channelId,
                    group: newTrack.group,
                    src: newTrack.path,
                    error,
                    message: `Failed to load track "${key}"`
                });
                reject(error);
            }
        });
    }
    // ==================== Channel Management ====================
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
    getActiveChannels() {
        const result = {};
        for (const channelId of Object.keys(this.channels)) {
            const playback = this.channels[channelId];
            result[channelId] = {
                key: playback.key,
                isPlaying: playback.isPlaying,
                isPaused: playback.isPaused
            };
        }
        return result;
    }
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
    getChannelInfo(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return null;
        }
        return {
            key: playback.key,
            isPlaying: playback.isPlaying,
            isPaused: playback.isPaused
        };
    }
    /**
     * Stops all continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Stop all music/ambient when leaving a scene
     * audio.stopAllContinuous();
     * ```
     */
    stopAllContinuous() {
        for (const channelId of Object.keys(this.channels)) {
            this.stopContinuous(channelId);
        }
    }
    /**
     * Pauses all continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Pause everything when game is paused
     * audio.pauseAllContinuous();
     * ```
     */
    pauseAllContinuous() {
        for (const channelId of Object.keys(this.channels)) {
            if (this.channels[channelId]?.isPlaying) {
                this.pauseContinuous(channelId);
            }
        }
    }
    /**
     * Resumes all paused continuous playback on all channels.
     *
     * @example
     * ```typescript
     * // Resume everything when game is unpaused
     * audio.resumeAllContinuous();
     * ```
     */
    resumeAllContinuous() {
        for (const channelId of Object.keys(this.channels)) {
            if (this.channels[channelId]?.isPaused) {
                this.resumeContinuous(channelId);
            }
        }
    }
    // ==================== Playback Controls ====================
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
    setPlaybackRate(rate, channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to set playback rate`);
            return;
        }
        // Clamp rate to valid range (0.25 to 4.0 is typical browser support)
        const clampedRate = Math.max(0.25, Math.min(4.0, rate));
        if (clampedRate !== rate) {
            this.logger.warn(`Playback rate clamped from ${rate} to ${clampedRate}`);
        }
        try {
            playback.mediaElement.playbackRate = clampedRate;
            this.logger.log(`Set playback rate to ${clampedRate} on channel "${channelId}"`);
        }
        catch (error) {
            this.logger.error(`Failed to set playback rate on channel "${channelId}"`, error);
        }
    }
    /**
     * Gets the current playback rate for a channel.
     *
     * @param channelId - The channel to query (default: 'default').
     * @returns The playback rate, or `null` if no playback on channel.
     */
    getPlaybackRate(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return null;
        }
        return playback.mediaElement.playbackRate;
    }
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
    seek(time, channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to seek`);
            return;
        }
        const duration = playback.mediaElement.duration;
        if (isNaN(duration)) {
            this.logger.warn(`Cannot seek on channel "${channelId}": track duration not available`);
            return;
        }
        // Clamp time to valid range
        const clampedTime = Math.max(0, Math.min(duration, time));
        if (clampedTime !== time) {
            this.logger.warn(`Seek time clamped from ${time} to ${clampedTime}`);
        }
        try {
            playback.mediaElement.currentTime = clampedTime;
            this.logger.log(`Seeked to ${clampedTime}s on channel "${channelId}"`);
        }
        catch (error) {
            this.logger.error(`Failed to seek on channel "${channelId}"`, error);
        }
    }
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
    getCurrentTime(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return null;
        }
        return playback.mediaElement.currentTime;
    }
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
    getDuration(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return null;
        }
        const duration = playback.mediaElement.duration;
        return isNaN(duration) ? null : duration;
    }
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
    getPlaybackInfo(channelId = DEFAULT_CHANNEL) {
        const playback = this.channels[channelId];
        if (!playback) {
            return null;
        }
        const mediaElement = playback.mediaElement;
        const duration = mediaElement.duration;
        return {
            key: playback.key,
            isPlaying: playback.isPlaying,
            isPaused: playback.isPaused,
            currentTime: mediaElement.currentTime,
            duration: isNaN(duration) ? null : duration,
            playbackRate: mediaElement.playbackRate,
            volume: playback.gainNode.gain.value
        };
    }
    // ==================== Private Helpers ====================
    cancelFade(channelId = DEFAULT_CHANNEL) {
        const fadeState = this.fadeStates[channelId];
        if (fadeState) {
            // Cancel the scheduled gain automation
            const ctx = this.audioContext;
            if (ctx) {
                fadeState.gainNode.gain.cancelScheduledValues(ctx.currentTime);
            }
            delete this.fadeStates[channelId];
        }
    }
    selectRandomTrack(key) {
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        return this.trackSelector[key].splice(Math.floor(Math.random() * this.trackSelector[key].length), 1)[0] || null;
    }
    onTrackEnded(channelId) {
        const playback = this.channels[channelId];
        if (!playback) {
            return;
        }
        // Signal the old subscription to complete
        if (this.channelSubjects[channelId]) {
            this.channelSubjects[channelId].next();
        }
        const { key } = playback;
        const nextTrack = this.selectRandomTrack(key);
        if (!nextTrack) {
            this.logger.warn(`No more tracks available for key "${key}" on channel "${channelId}"`);
            playback.isPlaying = false;
            return;
        }
        const ctx = this.audioContext;
        if (!ctx) {
            this.logger.error(`AudioContext not available for continuous playback on channel "${channelId}"`);
            return;
        }
        const groupGain = this.ensureGroupGain(nextTrack.group);
        // Disconnect old nodes
        try {
            playback.sourceNode.disconnect();
            playback.gainNode.disconnect();
        }
        catch (error) {
            this.logger.error(`Failed to disconnect old nodes on channel "${channelId}"`, error);
        }
        // Create new media element
        const mediaElement = new Audio(nextTrack.path);
        mediaElement.preload = 'auto';
        // Create a new subject for the next track
        this.channelSubjects[channelId] = new Subject();
        const channelEnd$ = this.channelSubjects[channelId];
        fromEvent(mediaElement, 'error')
            .pipe(takeUntil(channelEnd$))
            .subscribe((event) => {
            this.logger.error(`Failed to load track: ${nextTrack.path}`, event);
            this.errorSubject.next({
                key,
                channelId,
                group: nextTrack.group,
                src: nextTrack.path,
                error: event,
                message: `Failed to load track: ${nextTrack.path}`
            });
        });
        fromEvent(mediaElement, 'loadedmetadata')
            .pipe(takeUntil(channelEnd$))
            .subscribe(() => {
            mediaElement.currentTime = 0;
            let sourceNode;
            try {
                sourceNode = ctx.createMediaElementSource(mediaElement);
            }
            catch (error) {
                this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                return;
            }
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;
            sourceNode.connect(gainNode);
            gainNode.connect(groupGain);
            this.loadCompleteSubject.next({
                key,
                channelId,
                group: nextTrack.group,
                src: nextTrack.path,
                duration: mediaElement.duration
            });
            if (this.settings[nextTrack.group]?.enabled) {
                try {
                    this.channels[channelId] = {
                        key,
                        track: nextTrack,
                        mediaElement,
                        sourceNode,
                        gainNode,
                        isPlaying: false,
                        isPaused: false
                    };
                    mediaElement.play();
                    this.channels[channelId].isPlaying = true;
                    this.trackStartSubject.next({
                        key,
                        channelId,
                        group: nextTrack.group,
                        src: nextTrack.path
                    });
                }
                catch (error) {
                    this.logger.error(`Failed to play next track "${key}" on channel "${channelId}"`, error);
                    this.errorSubject.next({
                        key,
                        channelId,
                        group: nextTrack.group,
                        src: nextTrack.path,
                        error,
                        message: `Failed to play next track "${key}" on channel "${channelId}"`
                    });
                }
            }
        });
        fromEvent(mediaElement, 'ended')
            .pipe(takeUntil(channelEnd$))
            .subscribe(() => {
            this.logger.log(`Track ended: ${nextTrack.path}`);
            this.trackEndSubject.next({
                key,
                channelId,
                group: nextTrack.group,
                src: nextTrack.path
            });
            this.onTrackEnded(channelId);
        });
        try {
            mediaElement.load();
            playback.isPlaying = false;
        }
        catch (error) {
            this.logger.error(`Failed to load next track "${key}" on channel "${channelId}"`, error);
            this.errorSubject.next({
                key,
                channelId,
                group: nextTrack.group,
                src: nextTrack.path,
                error,
                message: `Failed to load next track "${key}" on channel "${channelId}"`
            });
        }
    }
    // ==================== Cleanup ====================
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
    destroy() {
        this.stopAllContinuous();
        // Stop all active one-shot sounds
        for (const group of Object.keys(this.activeSounds)) {
            for (const instance of this.activeSounds[group]) {
                try {
                    instance.sourceNode.stop();
                    instance.sourceNode.disconnect();
                    instance.gainNode.disconnect();
                }
                catch (error) {
                    this.logger.error(`Failed to stop active sound "${instance.id}"`, error);
                }
            }
            this.activeSounds[group] = [];
        }
        // Disconnect group gains
        for (const group of Object.keys(this.groupGains)) {
            try {
                this.groupGains[group].disconnect();
            }
            catch (error) {
                this.logger.error(`Failed to disconnect group gain for "${group}"`, error);
            }
        }
        this.groupGains = {};
        // Disconnect master gain
        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            }
            catch (error) {
                this.logger.error('Failed to disconnect master gain', error);
            }
            this.masterGain = null;
        }
        // Close AudioContext
        if (this.audioContext) {
            try {
                this.audioContext.close();
            }
            catch (error) {
                this.logger.error('Failed to close AudioContext', error);
            }
            this.audioContext = null;
        }
        this.trackStartSubject.complete();
        this.trackEndSubject.complete();
        this.loadCompleteSubject.complete();
        this.errorSubject.complete();
    }
}
//# sourceMappingURL=audio-manager.js.map