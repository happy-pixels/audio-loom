import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlayer } from '../playback/continuous-player';
import { PannerFactory } from './panner-factory';
import { ListenerManager } from './listener-manager';
import {
    Vector3,
    Play3DOptions,
    ActiveSoundInstance,
    ContinuousPlaybackWebAudio,
    DEFAULT_AUDIO_SETTINGS
} from '../types';

/**
 * Generates unique instance IDs.
 */
function generateInstanceId(key: string): string {
    return `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles 3D audio playback (one-shot and continuous).
 */
export class SpatialPlayer {
    constructor(
        private readonly context: ContextManager,
        private readonly groups: GroupManager,
        private readonly tracks: TrackManager,
        private readonly continuous: ContinuousPlayer,
        private readonly pannerFactory: PannerFactory,
        _listener: ListenerManager,
        private readonly events: EventEmitter,
        private readonly logger: Logger
    ) {}

    /**
     * Plays a one-shot sound at a specific position in 3D space.
     */
    play3D(key: string, position: Vector3, options?: Play3DOptions): string | null {
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
            this.logger.log(`Group "${group}" is disabled, skipping 3D play for "${key}"`);
            return null;
        }

        const bufferEntry = this.tracks.findBufferEntry(key, track.path);
        if (!bufferEntry || !bufferEntry.buffer) {
            this.logger.warn(`Audio buffer not loaded for "${track.path}". Call preload() first.`);
            return null;
        }

        if (this.groups.isPoolLimitReached(group)) {
            const config = this.groups.getPoolConfig(group);
            this.logger.log(`Pool limit reached for group "${group}" (${config.maxConcurrent}), skipping 3D play`);
            return null;
        }

        const ctx = this.context.ensureContext();
        const masterGain = this.context.getMasterGain();
        if (!masterGain) return null;

        // Create source node
        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = bufferEntry.buffer;

        // Create gain node for individual volume control
        const gainNode = ctx.createGain();
        const volume = options?.volume ?? 1;
        gainNode.gain.value = volume * groupSettings.volume;

        // Create panner node for 3D positioning
        const pannerNode = this.pannerFactory.createPanner(
            position,
            options?.spatialConfig,
            options?.orientation
        );

        // Connect: source -> gain -> panner -> group gain
        const groupGain = this.groups.ensureGroupGain(group, masterGain);
        sourceNode.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(groupGain);

        const instanceId = generateInstanceId(key);

        const instance: ActiveSoundInstance = {
            id: instanceId,
            key,
            group,
            sourceNode,
            gainNode,
            startTime: ctx.currentTime,
            pannerNode,
            position: { ...position }
        };

        this.groups.addActiveSound(group, instance);

        // Handle sound end
        sourceNode.onended = () => {
            this.groups.removeActiveSound(group, instanceId);

            try {
                sourceNode.disconnect();
                gainNode.disconnect();
                pannerNode.disconnect();
            } catch {
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

        this.logger.log(`Playing 3D sound "${key}" at (${position.x}, ${position.y}, ${position.z}), id=${instanceId}`);

        return instanceId;
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
        const trackList = this.tracks.getTracks(key);
        if (!trackList || trackList.length === 0) {
            throw new Error(`No tracks found for key "${key}"`);
        }

        const track = this.tracks.selectRandomTrack(key);
        if (!track) {
            throw new Error(`Could not select track for key "${key}"`);
        }
        const group = track.group;

        // Stop any existing playback on this channel
        const existingChannel = this.continuous.getChannel(channelId);
        if (existingChannel) {
            this.continuous.stop(channelId);
        }

        const ctx = this.context.ensureContext();
        const masterGain = this.context.getMasterGain();
        if (!masterGain) {
            throw new Error('Master gain not available');
        }

        const groupGain = this.groups.ensureGroupGain(group, masterGain);
        const groupSettings = this.groups.getSettings(group) || DEFAULT_AUDIO_SETTINGS;

        // Create audio element
        const mediaElement = new Audio(track.path);
        mediaElement.loop = true;
        mediaElement.preload = 'auto';

        // Create source node from media element
        const sourceNode = ctx.createMediaElementSource(mediaElement);

        // Create gain node
        const gainNode = ctx.createGain();
        const volume = options?.volume ?? 1;
        gainNode.gain.value = groupSettings.enabled ? volume * groupSettings.volume : 0;

        // Create panner node for 3D positioning
        const pannerNode = this.pannerFactory.createPanner(
            position,
            options?.spatialConfig,
            options?.orientation
        );

        // Connect: source -> gain -> panner -> group gain
        sourceNode.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(groupGain);

        // Create channel subject for cleanup
        this.continuous.createChannelSubject(channelId);

        // Track the channel
        const channel: ContinuousPlaybackWebAudio = {
            key,
            track,
            mediaElement,
            sourceNode,
            gainNode,
            isPlaying: false,
            isPaused: false,
            pannerNode,
            position: { ...position }
        };

        this.continuous.setChannel(channelId, channel);

        // Start playback
        try {
            await mediaElement.play();
            channel.isPlaying = true;

            this.events.emitTrackStart({
                key,
                group,
                channelId,
                src: track.path
            });

            this.logger.log(`Playing 3D continuous "${key}" at (${position.x}, ${position.y}, ${position.z}), channel=${channelId}`);
        } catch (error) {
            // Clean up on error
            this.continuous.stop(channelId);
            throw error;
        }
    }

    /**
     * Updates the position of a playing 3D sound (one-shot).
     */
    updateSoundPosition(instanceId: string, position: Vector3): boolean {
        const result = this.groups.findActiveSound(instanceId);

        if (result && result.instance.pannerNode) {
            const previousPosition = result.instance.position ? { ...result.instance.position } : { x: 0, y: 0, z: 0 };

            this.pannerFactory.updatePosition(result.instance.pannerNode, position);
            result.instance.position = { ...position };

            this.events.emitPositionUpdate({
                instanceId,
                key: result.instance.key,
                group: result.instance.group,
                previousPosition,
                newPosition: { ...position }
            });

            this.logger.log(`Updated 3D sound position: ${instanceId} -> (${position.x}, ${position.y}, ${position.z})`);
            return true;
        }

        this.logger.warn(`Sound instance not found or not a 3D sound: ${instanceId}`);
        return false;
    }

    /**
     * Updates the position of a continuous 3D channel.
     */
    updateChannelPosition(channelId: string, position: Vector3): boolean {
        const channel = this.continuous.getChannel(channelId);

        if (!channel || !channel.pannerNode) {
            this.logger.warn(`Channel not found or not a 3D channel: ${channelId}`);
            return false;
        }

        const previousPosition = channel.position ? { ...channel.position } : { x: 0, y: 0, z: 0 };

        this.pannerFactory.updatePosition(channel.pannerNode, position);
        channel.position = { ...position };

        this.events.emitPositionUpdate({
            instanceId: channelId,
            key: channel.key,
            group: channel.track.group,
            previousPosition,
            newPosition: { ...position }
        });

        this.logger.log(`Updated 3D channel position: ${channelId} -> (${position.x}, ${position.y}, ${position.z})`);
        return true;
    }

    /**
     * Sets the orientation of a playing 3D sound (one-shot).
     */
    setSoundOrientation(instanceId: string, orientation: Vector3): boolean {
        const result = this.groups.findActiveSound(instanceId);

        if (result && result.instance.pannerNode) {
            const previousOrientation = this.pannerFactory.getOrientation(result.instance.pannerNode);

            this.pannerFactory.updateOrientation(result.instance.pannerNode, orientation);

            this.events.emitOrientationUpdate({
                instanceId,
                key: result.instance.key,
                group: result.instance.group,
                previousOrientation,
                newOrientation: { ...orientation }
            });

            this.logger.log(`Updated 3D sound orientation: ${instanceId} -> (${orientation.x}, ${orientation.y}, ${orientation.z})`);
            return true;
        }

        this.logger.warn(`Sound instance not found or not a 3D sound: ${instanceId}`);
        return false;
    }

    /**
     * Sets the orientation of a continuous 3D channel.
     */
    setChannelOrientation(channelId: string, orientation: Vector3): boolean {
        const channel = this.continuous.getChannel(channelId);

        if (!channel || !channel.pannerNode) {
            this.logger.warn(`Channel not found or not a 3D channel: ${channelId}`);
            return false;
        }

        const previousOrientation = this.pannerFactory.getOrientation(channel.pannerNode);

        this.pannerFactory.updateOrientation(channel.pannerNode, orientation);

        this.events.emitOrientationUpdate({
            instanceId: channelId,
            key: channel.key,
            group: channel.track.group,
            previousOrientation,
            newOrientation: { ...orientation }
        });

        this.logger.log(`Updated 3D channel orientation: ${channelId} -> (${orientation.x}, ${orientation.y}, ${orientation.z})`);
        return true;
    }

    /**
     * Checks if a sound instance is a 3D positioned sound.
     */
    is3DSound(instanceId: string): boolean {
        const result = this.groups.findActiveSound(instanceId);
        return result !== null && result.instance.pannerNode !== undefined;
    }

    /**
     * Checks if a channel is a 3D positioned channel.
     */
    is3DChannel(channelId: string): boolean {
        const channel = this.continuous.getChannel(channelId);
        return channel != null && channel.pannerNode !== undefined;
    }

    /**
     * Gets the current position of a 3D sound.
     */
    getSoundPosition(instanceId: string): Vector3 | null {
        const result = this.groups.findActiveSound(instanceId);
        if (result && result.instance.position) {
            return { ...result.instance.position };
        }
        return null;
    }

    /**
     * Gets the current position of a 3D channel.
     */
    getChannelPosition(channelId: string): Vector3 | null {
        const channel = this.continuous.getChannel(channelId);
        if (channel && channel.position) {
            return { ...channel.position };
        }
        return null;
    }

    /**
     * Gets the current orientation of a 3D sound.
     */
    getSoundOrientation(instanceId: string): Vector3 | null {
        const result = this.groups.findActiveSound(instanceId);
        if (result && result.instance.pannerNode) {
            return this.pannerFactory.getOrientation(result.instance.pannerNode);
        }
        return null;
    }

    /**
     * Gets the current orientation of a 3D channel.
     */
    getChannelOrientation(channelId: string): Vector3 | null {
        const channel = this.continuous.getChannel(channelId);
        if (channel && channel.pannerNode) {
            return this.pannerFactory.getOrientation(channel.pannerNode);
        }
        return null;
    }
}
