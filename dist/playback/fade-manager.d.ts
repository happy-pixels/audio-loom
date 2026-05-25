import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlayer } from './continuous-player';
/**
 * Handles fade in/out/crossfade operations.
 */
export declare class FadeManager {
    private readonly context;
    private readonly groups;
    private readonly tracks;
    private readonly continuous;
    private readonly events;
    private readonly logger;
    private fadeStates;
    constructor(context: ContextManager, groups: GroupManager, tracks: TrackManager, continuous: ContinuousPlayer, events: EventEmitter, logger: Logger);
    /**
     * Cancels any active fade on a channel.
     */
    cancelFade(channelId?: string): void;
    /**
     * Starts playback with a gradual volume fade-in effect.
     */
    fadeIn(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Gradually fades out and stops the current playback on a channel.
     */
    fadeOut(duration: number, channelId?: string): Promise<void>;
    /**
     * Cross-fades from the current track to a new track.
     */
    crossFade(key: string, duration: number, channelId?: string): Promise<void>;
    /**
     * Destroys all fade states.
     */
    destroy(): void;
}
//# sourceMappingURL=fade-manager.d.ts.map