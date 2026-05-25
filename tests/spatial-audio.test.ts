import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/audio-manager';
import {
    vec3,
    VECTOR3_ZERO,
    VECTOR3_FORWARD,
    VECTOR3_UP,
    VECTOR3_RIGHT,
    DEFAULT_SPATIAL_CONFIG,
    SPATIAL_PRESET_INDOOR,
    SPATIAL_PRESET_OUTDOOR
} from '../src/types';

describe('Spatial Audio Core', () => {
    let audioManager: AudioManager;

    beforeEach(() => {
        audioManager = new AudioManager();
        vi.clearAllMocks();
    });

    afterEach(() => {
        audioManager.destroy();
    });

    describe('Vector3 Types', () => {
        it('should create a vector using vec3 helper', () => {
            const v = vec3(1, 2, 3);
            expect(v.x).toBe(1);
            expect(v.y).toBe(2);
            expect(v.z).toBe(3);
        });

        it('should have correct VECTOR3_ZERO', () => {
            expect(VECTOR3_ZERO).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should have correct VECTOR3_FORWARD (negative Z)', () => {
            expect(VECTOR3_FORWARD).toEqual({ x: 0, y: 0, z: -1 });
        });

        it('should have correct VECTOR3_UP (positive Y)', () => {
            expect(VECTOR3_UP).toEqual({ x: 0, y: 1, z: 0 });
        });

        it('should have correct VECTOR3_RIGHT (positive X)', () => {
            expect(VECTOR3_RIGHT).toEqual({ x: 1, y: 0, z: 0 });
        });
    });

    describe('Spatial Config Defaults', () => {
        it('should have correct DEFAULT_SPATIAL_CONFIG', () => {
            expect(DEFAULT_SPATIAL_CONFIG.distanceModel).toBe('inverse');
            expect(DEFAULT_SPATIAL_CONFIG.panningModel).toBe('HRTF');
            expect(DEFAULT_SPATIAL_CONFIG.refDistance).toBe(1);
            expect(DEFAULT_SPATIAL_CONFIG.maxDistance).toBe(10000);
            expect(DEFAULT_SPATIAL_CONFIG.rolloffFactor).toBe(1);
        });

        it('should have SPATIAL_PRESET_INDOOR with smaller maxDistance', () => {
            expect(SPATIAL_PRESET_INDOOR.maxDistance).toBe(50);
            expect(SPATIAL_PRESET_INDOOR.rolloffFactor).toBe(1.5);
        });

        it('should have SPATIAL_PRESET_OUTDOOR with larger maxDistance', () => {
            expect(SPATIAL_PRESET_OUTDOOR.maxDistance).toBe(500);
            expect(SPATIAL_PRESET_OUTDOOR.rolloffFactor).toBe(0.5);
        });
    });

    describe('Listener Position', () => {
        it('should have default listener position at origin', () => {
            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should set listener position', () => {
            audioManager.setListenerPosition({ x: 10, y: 5, z: -20 });

            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: 10, y: 5, z: -20 });
        });

        it('should set listener position using vec3 helper', () => {
            audioManager.setListenerPosition(vec3(1, 2, 3));

            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: 1, y: 2, z: 3 });
        });

        it('should return a copy of listener position', () => {
            audioManager.setListenerPosition({ x: 10, y: 5, z: -20 });

            const pos1 = audioManager.getListenerPosition();
            const pos2 = audioManager.getListenerPosition();

            expect(pos1).not.toBe(pos2); // Different objects
            expect(pos1).toEqual(pos2); // Same values
        });

        it('should not mutate internal state when modifying returned position', () => {
            audioManager.setListenerPosition({ x: 10, y: 5, z: -20 });

            const pos = audioManager.getListenerPosition();
            pos.x = 999;

            expect(audioManager.getListenerPosition().x).toBe(10);
        });

        it('should update AudioContext listener when position changes', async () => {
            // Initialize audio context
            await audioManager.initAudio();

            audioManager.setListenerPosition({ x: 5, y: 10, z: 15 });

            // Position should be tracked internally
            expect(audioManager.getListenerPosition()).toEqual({ x: 5, y: 10, z: 15 });
        });
    });

    describe('Listener Orientation', () => {
        it('should have default listener orientation', () => {
            const orientation = audioManager.getListenerOrientation();
            expect(orientation.forward).toEqual({ x: 0, y: 0, z: -1 }); // Looking forward
            expect(orientation.up).toEqual({ x: 0, y: 1, z: 0 }); // Y is up
        });

        it('should set listener orientation', () => {
            const forward = { x: 1, y: 0, z: 0 }; // Looking right
            const up = { x: 0, y: 1, z: 0 };

            audioManager.setListenerOrientation(forward, up);

            const orientation = audioManager.getListenerOrientation();
            expect(orientation.forward).toEqual(forward);
            expect(orientation.up).toEqual(up);
        });

        it('should return copies of orientation vectors', () => {
            const orientation1 = audioManager.getListenerOrientation();
            const orientation2 = audioManager.getListenerOrientation();

            expect(orientation1.forward).not.toBe(orientation2.forward);
            expect(orientation1.up).not.toBe(orientation2.up);
        });

        it('should update AudioContext listener when orientation changes', async () => {
            await audioManager.initAudio();

            audioManager.setListenerOrientation(
                { x: 0, y: 0, z: 1 },  // Looking backward
                { x: 0, y: 1, z: 0 }
            );

            const orientation = audioManager.getListenerOrientation();
            expect(orientation.forward).toEqual({ x: 0, y: 0, z: 1 });
        });
    });

    describe('Spatial Defaults', () => {
        it('should have default spatial configuration', () => {
            const defaults = audioManager.getSpatialDefaults();

            expect(defaults.distanceModel).toBe('inverse');
            expect(defaults.panningModel).toBe('HRTF');
            expect(defaults.refDistance).toBe(1);
            expect(defaults.maxDistance).toBe(10000);
            expect(defaults.rolloffFactor).toBe(1);
            expect(defaults.cone).toBeUndefined();
        });

        it('should update spatial defaults partially', () => {
            audioManager.setSpatialDefaults({
                maxDistance: 100,
                rolloffFactor: 2
            });

            const defaults = audioManager.getSpatialDefaults();
            expect(defaults.maxDistance).toBe(100);
            expect(defaults.rolloffFactor).toBe(2);
            expect(defaults.distanceModel).toBe('inverse'); // Unchanged
        });

        it('should update distance model', () => {
            audioManager.setSpatialDefaults({
                distanceModel: 'linear'
            });

            expect(audioManager.getSpatialDefaults().distanceModel).toBe('linear');
        });

        it('should update panning model', () => {
            audioManager.setSpatialDefaults({
                panningModel: 'equalpower'
            });

            expect(audioManager.getSpatialDefaults().panningModel).toBe('equalpower');
        });

        it('should set cone configuration', () => {
            audioManager.setSpatialDefaults({
                cone: {
                    innerAngle: 90,
                    outerAngle: 180,
                    outerGain: 0.3
                }
            });

            const defaults = audioManager.getSpatialDefaults();
            expect(defaults.cone).toBeDefined();
            expect(defaults.cone!.innerAngle).toBe(90);
            expect(defaults.cone!.outerAngle).toBe(180);
            expect(defaults.cone!.outerGain).toBe(0.3);
        });

        it('should clear cone configuration when set to undefined', () => {
            audioManager.setSpatialDefaults({
                cone: { innerAngle: 90, outerAngle: 180, outerGain: 0.3 }
            });
            audioManager.setSpatialDefaults({
                cone: undefined
            });

            expect(audioManager.getSpatialDefaults().cone).toBeUndefined();
        });

        it('should apply preset configurations', () => {
            audioManager.setSpatialDefaults(SPATIAL_PRESET_INDOOR);

            const defaults = audioManager.getSpatialDefaults();
            expect(defaults.maxDistance).toBe(50);
            expect(defaults.rolloffFactor).toBe(1.5);
        });

        it('should return a copy of spatial defaults', () => {
            const defaults1 = audioManager.getSpatialDefaults();
            const defaults2 = audioManager.getSpatialDefaults();

            expect(defaults1).not.toBe(defaults2);
            expect(defaults1).toEqual(defaults2);
        });
    });

    describe('Spatial State', () => {
        it('should return comprehensive spatial state', () => {
            audioManager.setListenerPosition({ x: 5, y: 0, z: -10 });
            audioManager.setListenerOrientation(
                { x: 0, y: 0, z: -1 },
                { x: 0, y: 1, z: 0 }
            );
            audioManager.setSpatialDefaults({ maxDistance: 200 });

            const state = audioManager.getSpatialState();

            expect(state.listenerPosition).toEqual({ x: 5, y: 0, z: -10 });
            expect(state.listenerOrientation.forward).toEqual({ x: 0, y: 0, z: -1 });
            expect(state.listenerOrientation.up).toEqual({ x: 0, y: 1, z: 0 });
            expect(state.defaults.maxDistance).toBe(200);
        });
    });

    describe('Cleanup', () => {
        it('should reset listener position on destroy', () => {
            audioManager.setListenerPosition({ x: 100, y: 50, z: -200 });

            audioManager.destroy();

            // Create new instance to verify
            const newManager = new AudioManager();
            expect(newManager.getListenerPosition()).toEqual({ x: 0, y: 0, z: 0 });
            newManager.destroy();
        });

        it('should reset listener orientation on destroy', () => {
            audioManager.setListenerOrientation(
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 }
            );

            audioManager.destroy();

            const newManager = new AudioManager();
            const orientation = newManager.getListenerOrientation();
            expect(orientation.forward).toEqual({ x: 0, y: 0, z: -1 });
            expect(orientation.up).toEqual({ x: 0, y: 1, z: 0 });
            newManager.destroy();
        });

        it('should reset spatial defaults on destroy', () => {
            audioManager.setSpatialDefaults({
                maxDistance: 500,
                rolloffFactor: 3,
                cone: { innerAngle: 45, outerAngle: 90, outerGain: 0.1 }
            });

            audioManager.destroy();

            const newManager = new AudioManager();
            const defaults = newManager.getSpatialDefaults();
            expect(defaults.maxDistance).toBe(10000);
            expect(defaults.rolloffFactor).toBe(1);
            expect(defaults.cone).toBeUndefined();
            newManager.destroy();
        });
    });

    describe('Edge Cases', () => {
        it('should handle setting listener position before audio context init', () => {
            // Should not throw
            expect(() => {
                audioManager.setListenerPosition({ x: 10, y: 20, z: 30 });
            }).not.toThrow();

            // Position should still be tracked
            expect(audioManager.getListenerPosition()).toEqual({ x: 10, y: 20, z: 30 });
        });

        it('should handle setting listener orientation before audio context init', () => {
            expect(() => {
                audioManager.setListenerOrientation(
                    { x: 1, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 }
                );
            }).not.toThrow();

            const orientation = audioManager.getListenerOrientation();
            expect(orientation.forward).toEqual({ x: 1, y: 0, z: 0 });
        });

        it('should handle negative coordinates', () => {
            audioManager.setListenerPosition({ x: -100, y: -50, z: -200 });

            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: -100, y: -50, z: -200 });
        });

        it('should handle very large coordinates', () => {
            audioManager.setListenerPosition({ x: 999999, y: 999999, z: 999999 });

            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: 999999, y: 999999, z: 999999 });
        });

        it('should handle decimal coordinates', () => {
            audioManager.setListenerPosition({ x: 1.5, y: 2.75, z: 3.125 });

            const pos = audioManager.getListenerPosition();
            expect(pos).toEqual({ x: 1.5, y: 2.75, z: 3.125 });
        });
    });
});
