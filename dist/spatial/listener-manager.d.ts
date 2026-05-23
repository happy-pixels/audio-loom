import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { Vector3, SpatialConfig } from '../types';
/**
 * Manages the audio listener position, orientation, and spatial defaults.
 */
export declare class ListenerManager {
    private readonly context;
    private readonly logger;
    private position;
    private forward;
    private up;
    private spatialDefaults;
    constructor(context: ContextManager, logger: Logger);
    /**
     * Sets the position of the audio listener.
     */
    setPosition(position: Vector3): void;
    /**
     * Gets the current listener position.
     */
    getPosition(): Vector3;
    /**
     * Sets the orientation of the audio listener.
     */
    setOrientation(forward: Vector3, up: Vector3): void;
    /**
     * Gets the current listener orientation.
     */
    getOrientation(): {
        forward: Vector3;
        up: Vector3;
    };
    /**
     * Sets the default spatial configuration.
     */
    setSpatialDefaults(config: Partial<SpatialConfig>): void;
    /**
     * Gets the current default spatial configuration.
     */
    getSpatialDefaults(): SpatialConfig;
    /**
     * Gets comprehensive spatial state information.
     */
    getState(): {
        listenerPosition: Vector3;
        listenerOrientation: {
            forward: Vector3;
            up: Vector3;
        };
        defaults: SpatialConfig;
    };
    /**
     * Calculates the distance between two points.
     */
    calculateDistance(a: Vector3, b: Vector3): number;
    /**
     * Resets the listener to default position and orientation.
     */
    reset(): void;
}
//# sourceMappingURL=listener-manager.d.ts.map