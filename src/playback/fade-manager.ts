import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlayer } from './continuous-player';
import { FadeState } from '../types';

const DEFAULT_CHANNEL = 'default';

/**
 * Handles fade in/out/crossfade operations.
 */
export class FadeManager {
    private fadeStates: { [channelId: string]: FadeState } = {};

    constructor(
        private readonly context: ContextManager,
        private readonly groups: GroupManager,
        private readonly tracks: TrackManager,
        private readonly continuous: ContinuousPlayer,
        private readonly events: EventEmitter,
        private readonly logger: Logger
    ) {}

    /**
     * Cancels any active fade on a channel.
     */
    cancelFade(channelId: string = DEFAULT_CHANNEL): void {
        const fadeState = this.fadeStates[channelId];
        if (fadeState) {
            const ctx = this.context.getContext();
            if (ctx) {
                fadeState.gainNode.gain.cancelScheduledValues(ctx.currentTime);
            }
            delete this.fadeStates[channelId];
        }
    }

    /**
     * Starts playback with a gradual volume fade-in effect.
     */
    fadeIn(key: string, duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.tracks.hasTracks(key)) {
                this.logger.warn(`No tracks found for key "${key}"`);
                reject(new Error(`No tracks found for key "${key}"`));
                return;
            }

            this.cancelFade(channelId);
            this.continuous.stop(channelId);

            const track = this.tracks.selectRandomTrack(key);
            if (!track) {
                this.logger.warn(`Failed to select track for key "${key}"`);
                reject(new Error(`Failed to select track for key "${key}"`));
                return;
            }

            const ctx = this.context.ensureContext();
            const masterGain = this.context.getMasterGain();
            if (!masterGain) {
                reject(new Error('Master gain not available'));
                return;
            }

            const groupGain = this.groups.ensureGroupGain(track.group, masterGain);

            const mediaElement = new Audio(track.path);
            mediaElement.preload = 'auto';

            const channelSubject = this.continuous.createChannelSubject(channelId);

            fromEvent(mediaElement, 'error')
                .pipe(takeUntil(channelSubject))
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
                    reject(new Error(`Failed to load track: ${track.path}`));
                });

            fromEvent(mediaElement, 'loadedmetadata')
                .pipe(takeUntil(channelSubject))
                .subscribe(() => {
                    this.logger.log(`Loaded track for fade in on channel "${channelId}": ${track.path}`);
                    mediaElement.currentTime = 0;

                    let sourceNode: MediaElementAudioSourceNode;
                    try {
                        sourceNode = ctx.createMediaElementSource(mediaElement);
                    } catch (error) {
                        this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                        reject(error);
                        return;
                    }

                    const gainNode = ctx.createGain();
                    gainNode.gain.setValueAtTime(0, ctx.currentTime);

                    sourceNode.connect(gainNode);
                    gainNode.connect(groupGain);

                    this.continuous.setChannel(channelId, {
                        key,
                        track,
                        mediaElement,
                        sourceNode,
                        gainNode,
                        isPlaying: false,
                        isPaused: false
                    });

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
                            const channel = this.continuous.getChannel(channelId);
                            if (channel) {
                                channel.isPlaying = true;
                            }

                            this.events.emitTrackStart({
                                key,
                                channelId,
                                group: track.group,
                                src: track.path
                            });

                            const targetVolume = 1.0;
                            const durationSeconds = duration / 1000;
                            gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + durationSeconds);

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

                            setTimeout(() => {
                                if (this.fadeStates[channelId]) {
                                    this.fadeStates[channelId].onComplete?.();
                                    delete this.fadeStates[channelId];
                                }
                            }, duration);
                        } catch (error) {
                            this.logger.error(`Failed to play track for fade in "${key}" on channel "${channelId}"`, error);
                            this.events.emitError({
                                key,
                                channelId,
                                group: track.group,
                                src: track.path,
                                error,
                                message: `Failed to play track for fade in "${key}" on channel "${channelId}"`
                            });
                            reject(error);
                        }
                    } else {
                        this.logger.warn(`Cannot fade in on channel "${channelId}": audio group "${track.group}" is disabled`);
                        resolve();
                    }
                });

            fromEvent(mediaElement, 'ended')
                .pipe(takeUntil(channelSubject))
                .subscribe(() => {
                    this.logger.log(`Track ended: ${track.path}`);
                    this.events.emitTrackEnd({
                        key,
                        channelId,
                        group: track.group,
                        src: track.path
                    });
                });

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
                reject(error);
            }
        });
    }

    /**
     * Gradually fades out and stops the current playback on a channel.
     */
    fadeOut(duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return new Promise((resolve) => {
            const playback = this.continuous.getChannel(channelId);
            if (!playback) {
                this.logger.warn(`No continuous playback on channel "${channelId}" to fade out`);
                resolve();
                return;
            }

            if (!playback.isPlaying) {
                this.logger.warn(`Continuous playback on channel "${channelId}" is not playing`);
                this.continuous.stop(channelId);
                resolve();
                return;
            }

            this.cancelFade(channelId);

            const ctx = this.context.getContext();
            if (!ctx) {
                this.continuous.stop(channelId);
                resolve();
                return;
            }

            const currentVolume = playback.gainNode.gain.value;
            this.logger.log(`Starting fade out on channel "${channelId}" from volume ${currentVolume} over ${duration}ms`);

            const durationSeconds = duration / 1000;
            playback.gainNode.gain.setValueAtTime(currentVolume, ctx.currentTime);
            playback.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSeconds);

            this.fadeStates[channelId] = {
                startTime: ctx.currentTime,
                startVolume: currentVolume,
                targetVolume: 0,
                duration,
                gainNode: playback.gainNode,
                onComplete: () => {
                    this.logger.log(`Fade out complete on channel "${channelId}"`);
                    this.continuous.stop(channelId);
                    resolve();
                }
            };

            setTimeout(() => {
                if (this.fadeStates[channelId]) {
                    this.fadeStates[channelId].onComplete?.();
                    delete this.fadeStates[channelId];
                }
            }, duration);
        });
    }

    /**
     * Cross-fades from the current track to a new track.
     */
    crossFade(key: string, duration: number, channelId: string = DEFAULT_CHANNEL): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.tracks.hasTracks(key)) {
                this.logger.warn(`No tracks found for key "${key}"`);
                reject(new Error(`No tracks found for key "${key}"`));
                return;
            }

            const oldPlayback = this.continuous.getChannel(channelId);
            const oldChannelEnd$ = this.continuous.getChannelSubject(channelId);

            this.cancelFade(channelId);

            const ctx = this.context.ensureContext();
            const newTrack = this.tracks.selectRandomTrack(key);
            if (!newTrack) {
                this.logger.warn(`Failed to select track for key "${key}"`);
                reject(new Error(`Failed to select track for key "${key}"`));
                return;
            }

            const masterGain = this.context.getMasterGain();
            if (!masterGain) {
                reject(new Error('Master gain not available'));
                return;
            }

            const groupGain = this.groups.ensureGroupGain(newTrack.group, masterGain);

            const channelSubject = this.continuous.createChannelSubject(channelId);

            const mediaElement = new Audio(newTrack.path);
            mediaElement.preload = 'auto';

            fromEvent(mediaElement, 'error')
                .pipe(takeUntil(channelSubject))
                .subscribe((event) => {
                    this.logger.error(`Failed to load track: ${newTrack.path}`, event);
                    this.events.emitError({
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
                .pipe(takeUntil(channelSubject))
                .subscribe(() => {
                    this.logger.log(`Loaded track for cross-fade on channel "${channelId}": ${newTrack.path}`);
                    mediaElement.currentTime = 0;

                    let sourceNode: MediaElementAudioSourceNode;
                    try {
                        sourceNode = ctx.createMediaElementSource(mediaElement);
                    } catch (error) {
                        this.logger.error(`Failed to create MediaElementAudioSourceNode for channel "${channelId}"`, error);
                        reject(error);
                        return;
                    }

                    const gainNode = ctx.createGain();
                    gainNode.gain.setValueAtTime(0, ctx.currentTime);

                    sourceNode.connect(gainNode);
                    gainNode.connect(groupGain);

                    this.continuous.setChannel(channelId, {
                        key,
                        track: newTrack,
                        mediaElement,
                        sourceNode,
                        gainNode,
                        isPlaying: false,
                        isPaused: false
                    });

                    this.events.emitLoadComplete({
                        key,
                        channelId,
                        group: newTrack.group,
                        src: newTrack.path,
                        duration: mediaElement.duration
                    });

                    if (this.groups.isEnabled(newTrack.group)) {
                        try {
                            mediaElement.play();
                            const channel = this.continuous.getChannel(channelId);
                            if (channel) {
                                channel.isPlaying = true;
                            }

                            this.events.emitTrackStart({
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
                                this.events.emitTrackEnd({
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
                                    } catch (error) {
                                        this.logger.error(`Failed to stop old track after cross-fade on channel "${channelId}"`, error);
                                    }
                                }, duration);
                            }

                            // Fade in new track
                            gainNode.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + durationSeconds);

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
                        } catch (error) {
                            this.logger.error(`Failed to play track for cross-fade "${key}" on channel "${channelId}"`, error);
                            this.events.emitError({
                                key,
                                channelId,
                                group: newTrack.group,
                                src: newTrack.path,
                                error,
                                message: `Failed to play track for cross-fade "${key}" on channel "${channelId}"`
                            });
                            reject(error);
                        }
                    } else {
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
                            } catch (error) {
                                this.logger.error(`Failed to stop old track on channel "${channelId}"`, error);
                            }
                        }
                        resolve();
                    }
                });

            fromEvent(mediaElement, 'ended')
                .pipe(takeUntil(channelSubject))
                .subscribe(() => {
                    this.logger.log(`Track ended: ${newTrack.path}`);
                    this.events.emitTrackEnd({
                        key,
                        channelId,
                        group: newTrack.group,
                        src: newTrack.path
                    });
                });

            try {
                mediaElement.load();
            } catch (error) {
                this.logger.error(`Failed to load track "${key}"`, error);
                this.events.emitError({
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

    /**
     * Destroys all fade states.
     */
    destroy(): void {
        for (const channelId of Object.keys(this.fadeStates)) {
            this.cancelFade(channelId);
        }
        this.fadeStates = {};
    }
}
