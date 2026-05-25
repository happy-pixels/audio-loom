import { Subject } from 'rxjs';
import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlaybackWebAudio, ChannelInfo, PlaybackInfo } from '../types';
/**
 * Handles continuous playback for music/ambient sounds.
 */
export declare class ContinuousPlayer {
    private readonly context;
    private readonly groups;
    private readonly tracks;
    private readonly events;
    private readonly logger;
    private channels;
    private channelSubjects;
    constructor(context: ContextManager, groups: GroupManager, tracks: TrackManager, events: EventEmitter, logger: Logger);
    /**
     * Gets a channel by ID.
     */
    getChannel(channelId: string): ContinuousPlaybackWebAudio | null;
    /**
     * Gets all active channels.
     */
    getAllChannels(): {
        [channelId: string]: ContinuousPlaybackWebAudio;
    };
    /**
     * Gets channel info for all active channels.
     */
    getActiveChannels(): {
        [channelId: string]: ChannelInfo;
    };
    /**
     * Gets channel info for a specific channel.
     */
    getChannelInfo(channelId?: string): ChannelInfo | null;
    /**
     * Gets playback info for a channel.
     */
    getPlaybackInfo(channelId?: string): PlaybackInfo | null;
    /**
     * Starts continuous playback on a channel.
     */
    play(key: string, channelId?: string): void;
    private setupMediaElementListeners;
    /**
     * Stops continuous playback on a channel.
     */
    stop(channelId?: string): void;
    /**
     * Pauses continuous playback on a channel.
     */
    pause(channelId?: string): void;
    /**
     * Resumes paused continuous playback on a channel.
     */
    resume(channelId?: string): void;
    /**
     * Stops all continuous playback.
     */
    stopAll(): void;
    /**
     * Pauses all playing channels.
     */
    pauseAll(): void;
    /**
     * Resumes all paused channels.
     */
    resumeAll(): void;
    /**
     * Handles group enable/disable state changes.
     */
    updateGroupState(group: string, enabled: boolean): void;
    /**
     * Handles track ended event for continuous playback.
     */
    private onTrackEnded;
    private setupNextTrackListeners;
    /**
     * Gets the channel subject for a channel.
     */
    getChannelSubject(channelId: string): Subject<void> | null;
    /**
     * Creates a new channel subject.
     */
    createChannelSubject(channelId: string): Subject<void>;
    /**
     * Sets a channel directly (used by fade manager).
     */
    setChannel(channelId: string, channel: ContinuousPlaybackWebAudio): void;
    /**
     * Destroys all channels.
     */
    destroy(): void;
}
//# sourceMappingURL=continuous-player.d.ts.map