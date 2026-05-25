/**
 * Factory for creating and updating PannerNodes.
 */
export class PannerFactory {
    context;
    listener;
    constructor(context, listener) {
        this.context = context;
        this.listener = listener;
    }
    /**
     * Creates and configures a PannerNode for 3D audio positioning.
     */
    createPanner(position, config, orientation) {
        const ctx = this.context.ensureContext();
        const panner = ctx.createPanner();
        // Merge with defaults
        const defaults = this.listener.getSpatialDefaults();
        const spatialConfig = {
            ...defaults,
            ...config,
            cone: config?.cone !== undefined ? config.cone : defaults.cone
        };
        // Apply distance model settings
        panner.distanceModel = spatialConfig.distanceModel;
        panner.panningModel = spatialConfig.panningModel;
        panner.refDistance = spatialConfig.refDistance;
        panner.maxDistance = spatialConfig.maxDistance;
        panner.rolloffFactor = spatialConfig.rolloffFactor;
        // Apply cone settings if configured
        if (spatialConfig.cone) {
            panner.coneInnerAngle = spatialConfig.cone.innerAngle;
            panner.coneOuterAngle = spatialConfig.cone.outerAngle;
            panner.coneOuterGain = spatialConfig.cone.outerGain;
        }
        // Set position
        const currentTime = ctx.currentTime;
        if (panner.positionX) {
            panner.positionX.setValueAtTime(position.x, currentTime);
            panner.positionY.setValueAtTime(position.y, currentTime);
            panner.positionZ.setValueAtTime(position.z, currentTime);
        }
        else if (panner.setPosition) {
            panner.setPosition(position.x, position.y, position.z);
        }
        // Set orientation if provided
        if (orientation) {
            if (panner.orientationX) {
                panner.orientationX.setValueAtTime(orientation.x, currentTime);
                panner.orientationY.setValueAtTime(orientation.y, currentTime);
                panner.orientationZ.setValueAtTime(orientation.z, currentTime);
            }
            else if (panner.setOrientation) {
                panner.setOrientation(orientation.x, orientation.y, orientation.z);
            }
        }
        return panner;
    }
    /**
     * Updates the position of a PannerNode.
     */
    updatePosition(panner, position) {
        const ctx = this.context.getContext();
        if (!ctx)
            return;
        const currentTime = ctx.currentTime;
        if (panner.positionX) {
            panner.positionX.setValueAtTime(position.x, currentTime);
            panner.positionY.setValueAtTime(position.y, currentTime);
            panner.positionZ.setValueAtTime(position.z, currentTime);
        }
        else if (panner.setPosition) {
            panner.setPosition(position.x, position.y, position.z);
        }
    }
    /**
     * Updates the orientation of a PannerNode.
     */
    updateOrientation(panner, orientation) {
        const ctx = this.context.getContext();
        if (!ctx)
            return;
        const currentTime = ctx.currentTime;
        if (panner.orientationX) {
            panner.orientationX.setValueAtTime(orientation.x, currentTime);
            panner.orientationY.setValueAtTime(orientation.y, currentTime);
            panner.orientationZ.setValueAtTime(orientation.z, currentTime);
        }
        else if (panner.setOrientation) {
            panner.setOrientation(orientation.x, orientation.y, orientation.z);
        }
    }
    /**
     * Gets the current orientation of a PannerNode.
     */
    getOrientation(panner) {
        if (panner.orientationX) {
            return {
                x: panner.orientationX.value,
                y: panner.orientationY.value,
                z: panner.orientationZ.value
            };
        }
        // Fallback - return default forward direction
        return { x: 1, y: 0, z: 0 };
    }
}
//# sourceMappingURL=panner-factory.js.map