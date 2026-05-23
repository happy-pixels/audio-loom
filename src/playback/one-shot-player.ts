import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { AudioLoader } from '../loading/audio-loader';
import { EventEmitter } from '../events/event-emitter';
import { AudioTrack, ActiveSoundInstance } from '../types';

/**
 * Generates unique instance IDs.
 */
function generateInstanceId(key: string): string {
    return `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles one-shot sound effect playback.
 */
export class OneShotPlayer {
    constructor(
        private readonly context: ContextManager,
        private readonly groups: GroupManager,
        private readonly tracks: TrackManager,
        private readonly loader: AudioLoader,
        private readonly events: EventEmitter,
        private readonly logger: Logger
    ) {}

    /**
     * Plays a one-shot sound effect.
     */
    play(key: string): void {
        if (!this.tracks.hasTracks(key)) {
            this.logger.warn(`No tracks found for key "${key}"`);
            return;
        }

        const track = this.tracks.selectRandomTrack(key);
        if (!track) {
            this.logger.warn(`Failed to select track for key "${key}"`);
            return;
        }

        if (!this.groups.isEnabled(track.group)) {
            this.logger.log(`Audio group "${track.group}" is disabled, skipping playback`);
            return;
        }

        if (this.groups.isPoolLimitReached(track.group)) {
            const config = this.groups.getPoolConfig(track.group);
            this.logger.warn(`Pool limit reached for group "${track.group}" (${config.maxConcurrent} concurrent)`);
            return;
        }

        // Check if buffer is loaded
        const bufferEntry = this.tracks.findBufferEntry(key, track.path);
        if (!bufferEntry || bufferEntry.loadState !== 'loaded' || !bufferEntry.buffer) {
            // Load and play asynchronously
            this.loadAndPlay(track, key);
            return;
        }

        this.playWithBuffer(track, bufferEntry.buffer, key);
    }

    private async loadAndPlay(track: AudioTrack, key: string): Promise<void> {
        try {
            const buffer = await this.loader.loadTrackIfNeeded(key, track.path);
            if (buffer) {
                this.playWithBuffer(track, buffer, key);
            }
        } catch (error) {
            this.logger.error(`Failed to load and play track "${key}"`, error);
            this.events.emitError({
                key,
                channelId: null,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to load and play track "${key}"`
            });
        }
    }

    private playWithBuffer(track: AudioTrack, buffer: AudioBuffer, key: string): void {
        try {
            const ctx = this.context.ensureContext();
            const masterGain = this.context.getMasterGain();
            if (!masterGain) return;

            const groupGain = this.groups.ensureGroupGain(track.group, masterGain);

            // Create source node
            const sourceNode = ctx.createBufferSource();
            sourceNode.buffer = buffer;

            // Create individual gain node for this sound
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;

            // Connect: source -> individual gain -> group gain
            sourceNode.connect(gainNode);
            gainNode.connect(groupGain);

            const instanceId = generateInstanceId(key);
            const instance: ActiveSoundInstance = {
                id: instanceId,
                key,
                group: track.group,
                sourceNode,
                gainNode,
                startTime: ctx.currentTime
            };

            this.groups.addActiveSound(track.group, instance);

            // Clean up when ended
            sourceNode.onended = () => {
                this.groups.removeActiveSound(track.group, instanceId);
                this.events.emitTrackEnd({
                    key,
                    channelId: instanceId,
                    group: track.group,
                    src: track.path
                });
            };

            sourceNode.start();

            this.events.emitTrackStart({
                key,
                channelId: instanceId,
                group: track.group,
                src: track.path
            });

            this.logger.log(`Playing one-shot "${key}" (instance: ${instanceId})`);
        } catch (error) {
            this.logger.error(`Failed to play track "${key}"`, error);
            this.events.emitError({
                key,
                channelId: null,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to play track "${key}"`
            });
        }
    }
}
