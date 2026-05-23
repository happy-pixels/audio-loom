import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { GroupManager } from '../core/group-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { ContinuousPlayer } from '../playback/continuous-player';
import { PannerFactory } from './panner-factory';
import { ListenerManager } from './listener-manager';
import { Vector3, Play3DOptions } from '../types';
/**
 * Handles 3D audio playback (one-shot and continuous).
 */
export declare class SpatialPlayer {
    private readonly context;
    private readonly groups;
    private readonly tracks;
    private readonly continuous;
    private readonly pannerFactory;
    private readonly events;
    private readonly logger;
    constructor(context: ContextManager, groups: GroupManager, tracks: TrackManager, continuous: ContinuousPlayer, pannerFactory: PannerFactory, _listener: ListenerManager, events: EventEmitter, logger: Logger);
    /**
     * Plays a one-shot sound at a specific position in 3D space.
     */
    play3D(key: string, position: Vector3, options?: Play3DOptions): string | null;
    /**
     * Plays continuous audio at a specific position in 3D space.
     */
    playContinuous3D(key: string, position: Vector3, channelId?: string, options?: Play3DOptions): Promise<void>;
    /**
     * Updates the position of a playing 3D sound (one-shot).
     */
    updateSoundPosition(instanceId: string, position: Vector3): boolean;
    /**
     * Updates the position of a continuous 3D channel.
     */
    updateChannelPosition(channelId: string, position: Vector3): boolean;
    /**
     * Sets the orientation of a playing 3D sound (one-shot).
     */
    setSoundOrientation(instanceId: string, orientation: Vector3): boolean;
    /**
     * Sets the orientation of a continuous 3D channel.
     */
    setChannelOrientation(channelId: string, orientation: Vector3): boolean;
    /**
     * Checks if a sound instance is a 3D positioned sound.
     */
    is3DSound(instanceId: string): boolean;
    /**
     * Checks if a channel is a 3D positioned channel.
     */
    is3DChannel(channelId: string): boolean;
    /**
     * Gets the current position of a 3D sound.
     */
    getSoundPosition(instanceId: string): Vector3 | null;
    /**
     * Gets the current position of a 3D channel.
     */
    getChannelPosition(channelId: string): Vector3 | null;
    /**
     * Gets the current orientation of a 3D sound.
     */
    getSoundOrientation(instanceId: string): Vector3 | null;
    /**
     * Gets the current orientation of a 3D channel.
     */
    getChannelOrientation(channelId: string): Vector3 | null;
}
//# sourceMappingURL=spatial-player.d.ts.map