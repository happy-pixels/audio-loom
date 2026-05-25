import { DEFAULT_AUDIO_SETTINGS } from '../types';
/**
 * Generates unique instance IDs.
 */
function generateInstanceId(key) {
    return `${key}_2d_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Handles stereo panning and distance callback features.
 */
export class StereoPanner {
    context;
    groups;
    tracks;
    continuous;
    listener;
    events;
    logger;
    distanceCallbacks = new Map();
    constructor(context, groups, tracks, continuous, listener, events, logger) {
        this.context = context;
        this.groups = groups;
        this.tracks = tracks;
        this.continuous = continuous;
        this.listener = listener;
        this.events = events;
        this.logger = logger;
    }
    /**
     * Plays a one-shot sound with stereo panning.
     */
    play2DPanned(key, options) {
        const trackList = this.tracks.getTracks(key);
        if (!trackList || trackList.length === 0) {
            this.logger.warn(`No tracks found for key "${key}"`);
            return null;
        }
        const track = this.tracks.selectRandomTrack(key);
        if (!track) {
            this.logger.warn(`Could not select track for key "${key}"`);
            return null;
        }
        const group = track.group;
        const groupSettings = this.groups.getSettings(group) || DEFAULT_AUDIO_SETTINGS;
        if (!groupSettings.enabled) {
            this.logger.log(`Group "${group}" is disabled, skipping 2D panned play for "${key}"`);
            return null;
        }
        const bufferEntry = this.tracks.findBufferEntry(key, track.path);
        if (!bufferEntry || !bufferEntry.buffer) {
            this.logger.warn(`Audio buffer not loaded for "${track.path}". Call preload() first.`);
            return null;
        }
        if (this.groups.isPoolLimitReached(group)) {
            const config = this.groups.getPoolConfig(group);
            this.logger.log(`Pool limit reached for group "${group}" (${config.maxConcurrent}), skipping 2D panned play`);
            return null;
        }
        const ctx = this.context.ensureContext();
        const masterGain = this.context.getMasterGain();
        if (!masterGain)
            return null;
        // Create source node
        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = bufferEntry.buffer;
        // Create gain node for volume control
        const gainNode = ctx.createGain();
        const volume = options?.volume ?? 1;
        gainNode.gain.value = volume * groupSettings.volume;
        // Create stereo panner node
        const pannerNode = ctx.createStereoPanner();
        const pan = Math.max(-1, Math.min(1, options?.pan ?? 0));
        pannerNode.pan.value = pan;
        // Connect: source -> gain -> panner -> group gain
        const groupGain = this.groups.ensureGroupGain(group, masterGain);
        sourceNode.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(groupGain);
        const instanceId = generateInstanceId(key);
        const instance = {
            id: instanceId,
            key,
            group,
            sourceNode,
            gainNode,
            pannerNode,
            startTime: ctx.currentTime,
            pan
        };
        this.groups.addPannedSound(group, instance);
        // Handle sound end
        sourceNode.onended = () => {
            this.groups.removePannedSound(group, instanceId);
            try {
                sourceNode.disconnect();
                gainNode.disconnect();
                pannerNode.disconnect();
            }
            catch {
                // May already be disconnected
            }
            this.events.emitTrackEnd({
                key,
                group,
                channelId: instanceId,
                src: track.path
            });
        };
        sourceNode.start();
        this.events.emitTrackStart({
            key,
            group,
            channelId: instanceId,
            src: track.path
        });
        this.logger.log(`Playing 2D panned sound "${key}" with pan=${pan}, id=${instanceId}`);
        return instanceId;
    }
    /**
     * Updates the stereo pan position of a playing 2D panned sound.
     */
    setPan(instanceId, pan) {
        const result = this.groups.findPannedSound(instanceId);
        if (result) {
            const clampedPan = Math.max(-1, Math.min(1, pan));
            result.instance.pannerNode.pan.value = clampedPan;
            result.instance.pan = clampedPan;
            this.logger.log(`Updated 2D pan: ${instanceId} -> ${clampedPan}`);
            return true;
        }
        this.logger.warn(`2D panned sound not found: ${instanceId}`);
        return false;
    }
    /**
     * Gets the current pan position of a 2D panned sound.
     */
    getSoundPan(instanceId) {
        const result = this.groups.findPannedSound(instanceId);
        if (result) {
            return result.instance.pan;
        }
        return null;
    }
    /**
     * Checks if a sound instance is a 2D panned sound.
     */
    is2DPannedSound(instanceId) {
        return this.groups.findPannedSound(instanceId) !== null;
    }
    /**
     * Registers distance callbacks for a 3D sound.
     */
    registerDistanceCallback(instanceId, config) {
        // Verify the sound exists and is a 3D sound
        let found = false;
        let soundPosition = null;
        const activeSound = this.groups.findActiveSound(instanceId);
        if (activeSound && activeSound.instance.pannerNode && activeSound.instance.position) {
            found = true;
            soundPosition = activeSound.instance.position;
        }
        if (!found) {
            const channel = this.continuous.getChannel(instanceId);
            if (channel && channel.pannerNode && channel.position) {
                found = true;
                soundPosition = channel.position;
            }
        }
        if (!found || !soundPosition) {
            this.logger.warn(`Cannot register distance callback: ${instanceId} is not a valid 3D sound`);
            return false;
        }
        // Calculate initial distances
        const listenerPosition = this.listener.getPosition();
        const lastDistances = new Map();
        const currentDistance = this.listener.calculateDistance(soundPosition, listenerPosition);
        for (const threshold of config.thresholds) {
            lastDistances.set(threshold, currentDistance <= threshold);
        }
        // Set up interval for checking distances
        const checkInterval = config.checkInterval ?? 100;
        const intervalId = setInterval(() => {
            this.checkDistanceThresholds(instanceId, config);
        }, checkInterval);
        this.distanceCallbacks.set(instanceId, {
            config,
            lastDistances,
            intervalId
        });
        this.logger.log(`Registered distance callbacks for ${instanceId} with thresholds: ${config.thresholds.join(', ')}`);
        return true;
    }
    /**
     * Unregisters distance callbacks for a sound.
     */
    unregisterDistanceCallback(instanceId) {
        const entry = this.distanceCallbacks.get(instanceId);
        if (!entry) {
            return false;
        }
        if (entry.intervalId) {
            clearInterval(entry.intervalId);
        }
        this.distanceCallbacks.delete(instanceId);
        this.logger.log(`Unregistered distance callbacks for ${instanceId}`);
        return true;
    }
    checkDistanceThresholds(instanceId, config) {
        const entry = this.distanceCallbacks.get(instanceId);
        if (!entry)
            return;
        // Get current sound position
        let soundPosition = null;
        let key = '';
        let group = '';
        const activeSound = this.groups.findActiveSound(instanceId);
        if (activeSound && activeSound.instance.position) {
            soundPosition = activeSound.instance.position;
            key = activeSound.instance.key;
            group = activeSound.instance.group;
        }
        if (!soundPosition) {
            const channel = this.continuous.getChannel(instanceId);
            if (channel && channel.position) {
                soundPosition = channel.position;
                key = channel.key;
                group = channel.track.group;
            }
        }
        if (!soundPosition) {
            // Sound no longer exists, clean up
            this.unregisterDistanceCallback(instanceId);
            return;
        }
        const listenerPosition = this.listener.getPosition();
        const currentDistance = this.listener.calculateDistance(soundPosition, listenerPosition);
        for (const threshold of config.thresholds) {
            const wasInside = entry.lastDistances.get(threshold) ?? false;
            const isInside = currentDistance <= threshold;
            if (wasInside !== isInside) {
                const direction = isInside ? 'entering' : 'leaving';
                // Call the callback
                config.onThresholdCross(instanceId, currentDistance, threshold, direction);
                // Emit event
                this.events.emitDistanceThreshold({
                    instanceId,
                    key,
                    group,
                    threshold,
                    distance: currentDistance,
                    direction
                });
                entry.lastDistances.set(threshold, isInside);
            }
        }
    }
    /**
     * Destroys all resources.
     */
    destroy() {
        for (const entry of this.distanceCallbacks.values()) {
            if (entry.intervalId) {
                clearInterval(entry.intervalId);
            }
        }
        this.distanceCallbacks.clear();
    }
}
//# sourceMappingURL=stereo-panner.js.map