import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { AudioLoader } from '../loading/audio-loader';
import { EventEmitter } from '../events/event-emitter';
/**
 * Handles one-shot sound effect playback.
 */
export declare class OneShotPlayer {
    private readonly context;
    private readonly groups;
    private readonly tracks;
    private readonly loader;
    private readonly events;
    private readonly logger;
    constructor(context: ContextManager, groups: GroupManager, tracks: TrackManager, loader: AudioLoader, events: EventEmitter, logger: Logger);
    /**
     * Plays a one-shot sound effect.
     */
    play(key: string): void;
    private loadAndPlay;
    private playWithBuffer;
}
//# sourceMappingURL=one-shot-player.d.ts.map