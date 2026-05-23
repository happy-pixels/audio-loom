import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlaybackWebAudio, ChannelInfo, PlaybackInfo, AudioTrack } from '../types';

const DEFAULT_CHANNEL = 'default';

/**
 * Handles continuous playback for music/ambient sounds.
 */
export class ContinuousPlayer {
    private channels: { [channelId: string]: ContinuousPlaybackWebAudio } = {};
    private channelSubjects: { [channelId: string]: Subject<void> } = {};

    constructor(
        private readonly context: ContextManager,
        private readonly groups: GroupManager,
        private readonly tracks: TrackManager,
        private readonly events: EventEmitter,
        private readonly logger: Logger
    ) {}

    /**
     * Gets a channel by ID.
     */
    getChannel(channelId: string): ContinuousPlaybackWebAudio | null {
        return this.channels[channelId] || null;
    }

    /**
     * Gets all active channels.
     */
    getAllChannels(): { [channelId: string]: ContinuousPlaybackWebAudio } {
        return this.channels;
    }

    /**
     * Gets channel info for all active channels.
     */
    getActiveChannels(): { [channelId: string]: ChannelInfo } {
        const result: { [channelId: string]: ChannelInfo } = {};
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
     * Gets channel info for a specific channel.
     */
    getChannelInfo(channelId: string = DEFAULT_CHANNEL): ChannelInfo | null {
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
     * Gets playback info for a channel.
     */
    getPlaybackInfo(channelId: string = DEFAULT_CHANNEL): PlaybackInfo | null {
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

    /**
     * Starts continuous playback on a channel.
     */
    play(key: string, channelId: string = DEFAULT_CHANNEL): void {
        if (!this.tracks.hasTracks(key)) {
            this.logger.warn(`No tracks found for key "${key}"`);
            return;
        }

        this.stop(channelId);

        const track = this.tracks.selectRandomTrack(key);
        if (!track) {
            this.logger.warn(`Failed to select track for key "${key}"`);
            return;
        }

        const ctx = this.context.ensureContext();
        const masterGain = this.context.getMasterGain();
        if (!masterGain) return;

        const groupGain = this.groups.ensureGroupGain(track.group, masterGain);

        // Create media element for streaming
        const mediaElement = new Audio(track.path);
        mediaElement.preload = 'auto';

        // Create a new subject for this channel
        this.channelSubjects[channelId] = new Subject<void>();
        const channelEnd$ = this.channelSubjects[channelId];

        this.setupMediaElementListeners(mediaElement, channelEnd$, channelId, key, track, groupGain, ctx);

        try {
            mediaElement.load();
        } catch (error) {
            this.logger.error(`Failed to load track "${key}"`, error);
            this.events.emitError({
                key,
                channelId,
                group: track.group,
                src: track.path,
                error,
                message: `Failed to load track "${key}"`
            });
        }
    }

    private setupMediaElementListeners(
        mediaElement: HTMLAudioElement,
        channelEnd$: Subject<void>,
        channelId: string,
        key: string,
        track: AudioTrack,
        groupGain: GainNode,
        ctx: AudioContext
    ): void {
        fromEvent(mediaElement, 'error')
            .pipe(takeUntil(channelEnd$))
            .subscribe((event) => {
                this.logger.error(`Failed to load track: ${track.path}`, event);
                this.events.emitError({
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

                let sourceNode: MediaElementAudioSourceNode;
                try {
                    sourceNode = ctx.createMediaElementSource(mediaElement);
                } catch (error) {
                    this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                    this.events.emitError({
                        key,
                        channelId,
                        group: track.group,
                        src: track.path,
                        error,
                        message: `Failed to create audio source for channel "${channelId}"`
                    });
                    return;
                }

                const gainNode = ctx.createGain();
                gainNode.gain.value = 1.0;

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

                this.events.emitLoadComplete({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    duration: mediaElement.duration
                });

                if (this.groups.isEnabled(track.group)) {
                    try {
                        mediaElement.play();
                        this.channels[channelId].isPlaying = true;

                        this.events.emitTrackStart({
                            key,
                            channelId,
                            group: track.group,
                            src: track.path
                        });
                    } catch (error) {
                        this.logger.error(`Failed to play continuous track "${key}" on channel "${channelId}"`, error);
                        this.events.emitError({
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
                this.events.emitTrackEnd({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path
                });
                this.onTrackEnded(channelId);
            });
    }

    /**
     * Stops continuous playback on a channel.
     */
    stop(channelId: string = DEFAULT_CHANNEL): void {
        const playback = this.channels[channelId];
        if (!playback) {
            return;
        }

        if (this.channelSubjects[channelId]) {
            this.channelSubjects[channelId].next();
            this.channelSubjects[channelId].complete();
            delete this.channelSubjects[channelId];
        }

        try {
            playback.mediaElement.pause();
            playback.mediaElement.currentTime = 0;
            playback.sourceNode.disconnect();
            playback.gainNode.disconnect();
            if (playback.pannerNode) {
                playback.pannerNode.disconnect();
            }
        } catch (error) {
            this.logger.error(`Failed to stop continuous playback on channel "${channelId}"`, error);
        }
        delete this.channels[channelId];
    }

    /**
     * Pauses continuous playback on a channel.
     */
    pause(channelId: string = DEFAULT_CHANNEL): void {
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
        } catch (error) {
            this.logger.error(`Failed to pause continuous playback on channel "${channelId}"`, error);
        }
    }

    /**
     * Resumes paused continuous playback on a channel.
     */
    resume(channelId: string = DEFAULT_CHANNEL): void {
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
        if (!this.groups.isEnabled(track.group)) {
            this.logger.warn(`Cannot resume on channel "${channelId}": audio group "${track.group}" is disabled`);
            return;
        }

        try {
            playback.mediaElement.play();
            playback.isPlaying = true;
            playback.isPaused = false;
            this.logger.log(`Resumed continuous playback on channel "${channelId}" from ${playback.mediaElement.currentTime}s`);
        } catch (error) {
            this.logger.error(`Failed to resume continuous playback on channel "${channelId}"`, error);
        }
    }

    /**
     * Stops all continuous playback.
     */
    stopAll(): void {
        for (const channelId of Object.keys(this.channels)) {
            this.stop(channelId);
        }
    }

    /**
     * Pauses all playing channels.
     */
    pauseAll(): void {
        for (const channelId of Object.keys(this.channels)) {
            if (this.channels[channelId]?.isPlaying) {
                this.pause(channelId);
            }
        }
    }

    /**
     * Resumes all paused channels.
     */
    resumeAll(): void {
        for (const channelId of Object.keys(this.channels)) {
            if (this.channels[channelId]?.isPaused) {
                this.resume(channelId);
            }
        }
    }

    /**
     * Handles group enable/disable state changes.
     */
    updateGroupState(group: string, enabled: boolean): void {
        for (const channelId of Object.keys(this.channels)) {
            const playback = this.channels[channelId];
            if (playback.track.group === group) {
                if (!enabled && playback.isPlaying) {
                    try {
                        playback.mediaElement.pause();
                        playback.isPlaying = false;
                    } catch (error) {
                        this.logger.error(`Failed to pause audio for group "${group}" on channel "${channelId}"`, error);
                    }
                } else if (enabled && !playback.isPlaying && !playback.isPaused) {
                    try {
                        playback.mediaElement.play();
                        playback.isPlaying = true;
                    } catch (error) {
                        this.logger.error(`Failed to play audio for group "${group}" on channel "${channelId}"`, error);
                    }
                }
            }
        }
    }

    /**
     * Handles track ended event for continuous playback.
     */
    private onTrackEnded(channelId: string): void {
        const playback = this.channels[channelId];
        if (!playback) {
            return;
        }

        if (this.channelSubjects[channelId]) {
            this.channelSubjects[channelId].next();
        }

        const { key } = playback;
        const nextTrack = this.tracks.selectRandomTrack(key);
        if (!nextTrack) {
            this.logger.warn(`No more tracks available for key "${key}" on channel "${channelId}"`);
            playback.isPlaying = false;
            return;
        }

        const ctx = this.context.getContext();
        if (!ctx) {
            this.logger.error(`AudioContext not available for continuous playback on channel "${channelId}"`);
            return;
        }

        const masterGain = this.context.getMasterGain();
        if (!masterGain) return;

        const groupGain = this.groups.ensureGroupGain(nextTrack.group, masterGain);

        try {
            playback.sourceNode.disconnect();
            playback.gainNode.disconnect();
        } catch (error) {
            this.logger.error(`Failed to disconnect old nodes on channel "${channelId}"`, error);
        }

        const mediaElement = new Audio(nextTrack.path);
        mediaElement.preload = 'auto';

        this.channelSubjects[channelId] = new Subject<void>();
        const channelEnd$ = this.channelSubjects[channelId];

        this.setupNextTrackListeners(mediaElement, channelEnd$, channelId, key, nextTrack, groupGain, ctx, playback);

        try {
            mediaElement.load();
            playback.isPlaying = false;
        } catch (error) {
            this.logger.error(`Failed to load next track "${key}" on channel "${channelId}"`, error);
            this.events.emitError({
                key,
                channelId,
                group: nextTrack.group,
                src: nextTrack.path,
                error,
                message: `Failed to load next track "${key}" on channel "${channelId}"`
            });
        }
    }

    private setupNextTrackListeners(
        mediaElement: HTMLAudioElement,
        channelEnd$: Subject<void>,
        channelId: string,
        key: string,
        track: AudioTrack,
        groupGain: GainNode,
        ctx: AudioContext,
        playback: ContinuousPlaybackWebAudio
    ): void {
        fromEvent(mediaElement, 'error')
            .pipe(takeUntil(channelEnd$))
            .subscribe((event) => {
                this.logger.error(`Failed to load track: ${track.path}`, event);
                this.events.emitError({
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
                mediaElement.currentTime = 0;

                let sourceNode: MediaElementAudioSourceNode;
                try {
                    sourceNode = ctx.createMediaElementSource(mediaElement);
                } catch (error) {
                    this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                    return;
                }

                const gainNode = ctx.createGain();
                gainNode.gain.value = 1.0;

                sourceNode.connect(gainNode);
                gainNode.connect(groupGain);

                this.events.emitLoadComplete({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path,
                    duration: mediaElement.duration
                });

                if (this.groups.isEnabled(track.group)) {
                    try {
                        this.channels[channelId] = {
                            key,
                            track,
                            mediaElement,
                            sourceNode,
                            gainNode,
                            isPlaying: false,
                            isPaused: false,
                            pannerNode: playback.pannerNode,
                            position: playback.position
                        };
                        mediaElement.play();
                        this.channels[channelId].isPlaying = true;

                        this.events.emitTrackStart({
                            key,
                            channelId,
                            group: track.group,
                            src: track.path
                        });
                    } catch (error) {
                        this.logger.error(`Failed to play next track "${key}" on channel "${channelId}"`, error);
                        this.events.emitError({
                            key,
                            channelId,
                            group: track.group,
                            src: track.path,
                            error,
                            message: `Failed to play next track "${key}" on channel "${channelId}"`
                        });
                    }
                }
            });

        fromEvent(mediaElement, 'ended')
            .pipe(takeUntil(channelEnd$))
            .subscribe(() => {
                this.logger.log(`Track ended: ${track.path}`);
                this.events.emitTrackEnd({
                    key,
                    channelId,
                    group: track.group,
                    src: track.path
                });
                this.onTrackEnded(channelId);
            });
    }

    /**
     * Gets the channel subject for a channel.
     */
    getChannelSubject(channelId: string): Subject<void> | null {
        return this.channelSubjects[channelId] || null;
    }

    /**
     * Creates a new channel subject.
     */
    createChannelSubject(channelId: string): Subject<void> {
        this.channelSubjects[channelId] = new Subject<void>();
        return this.channelSubjects[channelId];
    }

    /**
     * Sets a channel directly (used by fade manager).
     */
    setChannel(channelId: string, channel: ContinuousPlaybackWebAudio): void {
        this.channels[channelId] = channel;
    }

    /**
     * Destroys all channels.
     */
    destroy(): void {
        this.stopAll();
        this.channels = {};
        this.channelSubjects = {};
    }
}
