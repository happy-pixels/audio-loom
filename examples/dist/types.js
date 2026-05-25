;
/**
 * Default pool configuration.
 * Allows up to 8 concurrent sounds per group.
 */
export const DEFAULT_POOL_CONFIG = {
    maxConcurrent: 8
};
/**
 * Default audio settings for new groups.
 * Groups start enabled at full volume.
 */
export const DEFAULT_AUDIO_SETTINGS = {
    enabled: true,
    volume: 1.0,
};
/**
 * Default low-pass filter configuration.
 * Passes all audible frequencies (20kHz cutoff).
 */
export const DEFAULT_LOW_PASS_CONFIG = {
    frequency: 20000,
    Q: 1
};
/**
 * Default high-pass filter configuration.
 * Passes all audible frequencies (20Hz cutoff).
 */
export const DEFAULT_HIGH_PASS_CONFIG = {
    frequency: 20,
    Q: 1
};
/**
 * Built-in environment presets.
 * These provide common acoustic environments out of the box.
 * Note: Reverb impulse responses must be registered separately.
 */
export const ENVIRONMENT_PRESETS = {
    /** No effects - completely dry signal */
    none: {
        reverb: null,
        wetMix: 0,
        lowPass: null,
        highPass: null
    },
    /** Cave environment - long reverb, slight low-pass for dampening */
    cave: {
        reverb: 'cave',
        wetMix: 0.4,
        lowPass: { frequency: 8000, Q: 0.7 },
        highPass: { frequency: 80, Q: 0.7 }
    },
    /** Forest environment - subtle reverb, natural filtering */
    forest: {
        reverb: 'forest',
        wetMix: 0.2,
        lowPass: { frequency: 12000, Q: 0.5 },
        highPass: { frequency: 40, Q: 0.5 }
    },
    /** Underwater environment - heavy low-pass, muffled sound */
    underwater: {
        reverb: 'underwater',
        wetMix: 0.5,
        lowPass: { frequency: 1500, Q: 1.0 },
        highPass: { frequency: 60, Q: 0.7 }
    },
    /** Indoor environment - moderate room reverb */
    indoor: {
        reverb: 'indoor',
        wetMix: 0.25,
        lowPass: { frequency: 16000, Q: 0.5 },
        highPass: { frequency: 30, Q: 0.5 }
    },
    /** Metal corridor - bright, resonant reverb */
    metal_corridor: {
        reverb: 'metal_corridor',
        wetMix: 0.35,
        lowPass: { frequency: 18000, Q: 1.2 },
        highPass: { frequency: 100, Q: 1.0 }
    },
    /** Bathroom environment - short, bright reverb */
    bathroom: {
        reverb: 'bathroom',
        wetMix: 0.3,
        lowPass: { frequency: 14000, Q: 0.8 },
        highPass: { frequency: 50, Q: 0.6 }
    },
    /** Arena/stadium environment - large space reverb */
    arena: {
        reverb: 'arena',
        wetMix: 0.45,
        lowPass: { frequency: 10000, Q: 0.6 },
        highPass: { frequency: 60, Q: 0.7 }
    }
};
/**
 * Creates a Vector3 from individual components.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param z - Z coordinate
 * @returns A new Vector3 object
 */
export function vec3(x, y, z) {
    return { x, y, z };
}
/**
 * A zero vector (origin point).
 */
export const VECTOR3_ZERO = { x: 0, y: 0, z: 0 };
/**
 * Forward direction in WebAudio's coordinate system (negative Z).
 */
export const VECTOR3_FORWARD = { x: 0, y: 0, z: -1 };
/**
 * Up direction (positive Y).
 */
export const VECTOR3_UP = { x: 0, y: 1, z: 0 };
/**
 * Right direction (positive X).
 */
export const VECTOR3_RIGHT = { x: 1, y: 0, z: 0 };
/**
 * Default spatial audio configuration.
 * Provides reasonable defaults for most 3D audio scenarios.
 */
export const DEFAULT_SPATIAL_CONFIG = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1
};
/**
 * Spatial configuration preset for small indoor spaces.
 */
export const SPATIAL_PRESET_INDOOR = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 50,
    rolloffFactor: 1.5
};
/**
 * Spatial configuration preset for large outdoor spaces.
 */
export const SPATIAL_PRESET_OUTDOOR = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 2,
    maxDistance: 500,
    rolloffFactor: 0.5
};
/**
 * Spatial configuration preset for realistic simulation.
 */
export const SPATIAL_PRESET_REALISTIC = {
    distanceModel: 'inverse',
    panningModel: 'HRTF',
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1
};
//# sourceMappingURL=types.js.map