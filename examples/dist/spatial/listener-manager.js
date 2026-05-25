import { DEFAULT_SPATIAL_CONFIG, VECTOR3_ZERO, VECTOR3_FORWARD, VECTOR3_UP } from '../types.js';
/**
 * Manages the audio listener position, orientation, and spatial defaults.
 */
export class ListenerManager {
    context;
    logger;
    position = { ...VECTOR3_ZERO };
    forward = { ...VECTOR3_FORWARD };
    up = { ...VECTOR3_UP };
    spatialDefaults = { ...DEFAULT_SPATIAL_CONFIG };
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }
    /**
     * Sets the position of the audio listener.
     */
    setPosition(position) {
        this.position = { ...position };
        const ctx = this.context.getContext();
        if (!ctx) {
            return;
        }
        const listener = ctx.listener;
        if (listener.positionX) {
            const currentTime = ctx.currentTime;
            listener.positionX.setValueAtTime(position.x, currentTime);
            listener.positionY.setValueAtTime(position.y, currentTime);
            listener.positionZ.setValueAtTime(position.z, currentTime);
        }
        else if (listener.setPosition) {
            listener.setPosition(position.x, position.y, position.z);
        }
        this.logger.log(`Listener position set to (${position.x}, ${position.y}, ${position.z})`);
    }
    /**
     * Gets the current listener position.
     */
    getPosition() {
        return { ...this.position };
    }
    /**
     * Sets the orientation of the audio listener.
     */
    setOrientation(forward, up) {
        this.forward = { ...forward };
        this.up = { ...up };
        const ctx = this.context.getContext();
        if (!ctx) {
            return;
        }
        const listener = ctx.listener;
        if (listener.forwardX) {
            const currentTime = ctx.currentTime;
            listener.forwardX.setValueAtTime(forward.x, currentTime);
            listener.forwardY.setValueAtTime(forward.y, currentTime);
            listener.forwardZ.setValueAtTime(forward.z, currentTime);
            listener.upX.setValueAtTime(up.x, currentTime);
            listener.upY.setValueAtTime(up.y, currentTime);
            listener.upZ.setValueAtTime(up.z, currentTime);
        }
        else if (listener.setOrientation) {
            listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        }
        this.logger.log(`Listener orientation set: forward=(${forward.x}, ${forward.y}, ${forward.z}), up=(${up.x}, ${up.y}, ${up.z})`);
    }
    /**
     * Gets the current listener orientation.
     */
    getOrientation() {
        return {
            forward: { ...this.forward },
            up: { ...this.up }
        };
    }
    /**
     * Sets the default spatial configuration.
     */
    setSpatialDefaults(config) {
        this.spatialDefaults = {
            ...this.spatialDefaults,
            ...config,
            cone: 'cone' in config
                ? config.cone
                : this.spatialDefaults.cone
        };
        this.logger.log('Spatial defaults updated:', this.spatialDefaults);
    }
    /**
     * Gets the current default spatial configuration.
     */
    getSpatialDefaults() {
        return {
            ...this.spatialDefaults,
            cone: this.spatialDefaults.cone ? { ...this.spatialDefaults.cone } : undefined
        };
    }
    /**
     * Gets comprehensive spatial state information.
     */
    getState() {
        return {
            listenerPosition: this.getPosition(),
            listenerOrientation: this.getOrientation(),
            defaults: this.getSpatialDefaults()
        };
    }
    /**
     * Calculates the distance between two points.
     */
    calculateDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    /**
     * Resets the listener to default position and orientation.
     */
    reset() {
        this.position = { ...VECTOR3_ZERO };
        this.forward = { ...VECTOR3_FORWARD };
        this.up = { ...VECTOR3_UP };
        this.spatialDefaults = { ...DEFAULT_SPATIAL_CONFIG };
    }
}
//# sourceMappingURL=listener-manager.js.map