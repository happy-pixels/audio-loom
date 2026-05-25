import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlayer } from '../playback/continuous-player';
import { ListenerManager } from './listener-manager';
import { Play2DPannedOptions, DistanceCallbackConfig } from '../types';
/**
 * Handles stereo panning and distance callback features.
 */
export declare class StereoPanner {
    private readonly context;
    private readonly groups;
    private readonly tracks;
    private readonly continuous;
    private readonly listener;
    private readonly events;
    private readonly logger;
    private distanceCallbacks;
    constructor(context: ContextManager, groups: GroupManager, tracks: TrackManager, continuous: ContinuousPlayer, listener: ListenerManager, events: EventEmitter, logger: Logger);
    /**
     * Plays a one-shot sound with stereo panning.
     */
    play2DPanned(key: string, options?: Play2DPannedOptions): string | null;
    /**
     * Updates the stereo pan position of a playing 2D panned sound.
     */
    setPan(instanceId: string, pan: number): boolean;
    /**
     * Gets the current pan position of a 2D panned sound.
     */
    getSoundPan(instanceId: string): number | null;
    /**
     * Checks if a sound instance is a 2D panned sound.
     */
    is2DPannedSound(instanceId: string): boolean;
    /**
     * Registers distance callbacks for a 3D sound.
     */
    registerDistanceCallback(instanceId: string, config: DistanceCallbackConfig): boolean;
    /**
     * Unregisters distance callbacks for a sound.
     */
    unregisterDistanceCallback(instanceId: string): boolean;
    private checkDistanceThresholds;
    /**
     * Destroys all resources.
     */
    destroy(): void;
}
//# sourceMappingURL=stereo-panner.d.ts.map