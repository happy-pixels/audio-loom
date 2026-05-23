import { ContextManager } from '../core/context-manager';
import { ListenerManager } from './listener-manager';
import { Vector3, SpatialConfig } from '../types';
/**
 * Factory for creating and updating PannerNodes.
 */
export declare class PannerFactory {
    private readonly context;
    private readonly listener;
    constructor(context: ContextManager, listener: ListenerManager);
    /**
     * Creates and configures a PannerNode for 3D audio positioning.
     */
    createPanner(position: Vector3, config?: Partial<SpatialConfig>, orientation?: Vector3): PannerNode;
    /**
     * Updates the position of a PannerNode.
     */
    updatePosition(panner: PannerNode, position: Vector3): void;
    /**
     * Updates the orientation of a PannerNode.
     */
    updateOrientation(panner: PannerNode, orientation: Vector3): void;
    /**
     * Gets the current orientation of a PannerNode.
     */
    getOrientation(panner: PannerNode): Vector3;
}
//# sourceMappingURL=panner-factory.d.ts.map