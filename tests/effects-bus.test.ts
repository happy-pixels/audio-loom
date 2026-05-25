import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/audio-manager';
import { mockFetch, MockConvolverNode, MockBiquadFilterNode } from './setup';

describe('Effects Bus', () => {
    let audioManager: AudioManager;

    beforeEach(() => {
        audioManager = new AudioManager();
        vi.clearAllMocks();
    });

    afterEach(() => {
        audioManager.destroy();
    });

    describe('Initialization', () => {
        it('should not be initialized by default', () => {
            expect(audioManager.isEffectsBusInitialized()).toBe(false);
        });

        it('should initialize lazily when setEffectsMix is called', () => {
            audioManager.setEffectsMix(0.5);
            expect(audioManager.isEffectsBusInitialized()).toBe(true);
        });

        it('should initialize lazily when setEffectsLowPass is called', () => {
            audioManager.setEffectsLowPass(2000);
            expect(audioManager.isEffectsBusInitialized()).toBe(true);
        });

        it('should initialize lazily when setEffectsHighPass is called', () => {
            audioManager.setEffectsHighPass(200);
            expect(audioManager.isEffectsBusInitialized()).toBe(true);
        });

        it('should initialize lazily when setEffectsReverb is called', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.setEffectsReverb('hall');
            expect(audioManager.isEffectsBusInitialized()).toBe(true);
        });
    });

    describe('Impulse Response Management', () => {
        it('should add an impulse response', () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            const state = audioManager.getEffectsBusState();
            expect(state.registeredImpulses).toContain('hall');
        });

        it('should add multiple impulse responses', () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            audioManager.addImpulseResponse('cave', '/impulses/cave.wav');
            audioManager.addImpulseResponse('room', '/impulses/room.wav');

            const state = audioManager.getEffectsBusState();
            expect(state.registeredImpulses).toHaveLength(3);
            expect(state.registeredImpulses).toContain('hall');
            expect(state.registeredImpulses).toContain('cave');
            expect(state.registeredImpulses).toContain('room');
        });

        it('should report isImpulseLoaded as false before preloading', () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            expect(audioManager.isImpulseLoaded('hall')).toBe(false);
        });

        it('should report isImpulseLoaded as false for non-existent key', () => {
            expect(audioManager.isImpulseLoaded('nonexistent')).toBe(false);
        });

        it('should preload impulse responses', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');

            await audioManager.preloadImpulses(['hall']);

            expect(mockFetch).toHaveBeenCalledWith('/impulses/hall.wav');
            expect(audioManager.isImpulseLoaded('hall')).toBe(true);
        });

        it('should preload multiple impulse responses', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            audioManager.addImpulseResponse('cave', '/impulses/cave.wav');

            await audioManager.preloadImpulses(['hall', 'cave']);

            expect(mockFetch).toHaveBeenCalledWith('/impulses/hall.wav');
            expect(mockFetch).toHaveBeenCalledWith('/impulses/cave.wav');
            expect(audioManager.isImpulseLoaded('hall')).toBe(true);
            expect(audioManager.isImpulseLoaded('cave')).toBe(true);
        });

        it('should skip already loaded impulse responses during preload', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');

            await audioManager.preloadImpulses(['hall']);
            vi.clearAllMocks();
            await audioManager.preloadImpulses(['hall']);

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle preload of non-existent key gracefully', async () => {
            await expect(audioManager.preloadImpulses(['nonexistent'])).resolves.not.toThrow();
        });
    });

    describe('Wet/Dry Mix Control', () => {
        it('should start with wet mix of 0', () => {
            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should set wet/dry mix', () => {
            audioManager.setEffectsMix(0.5);
            expect(audioManager.getEffectsMix()).toBe(0.5);
        });

        it('should clamp wet mix to 0', () => {
            audioManager.setEffectsMix(-0.5);
            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should clamp wet mix to 1', () => {
            audioManager.setEffectsMix(1.5);
            expect(audioManager.getEffectsMix()).toBe(1);
        });

        it('should reflect mix in state', () => {
            audioManager.setEffectsMix(0.3);
            const state = audioManager.getEffectsBusState();
            expect(state.wetMix).toBe(0.3);
        });
    });

    describe('Reverb Control', () => {
        it('should have no active reverb by default', () => {
            expect(audioManager.getActiveReverb()).toBeNull();
        });

        it('should apply reverb on demand (not preloaded)', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');

            await audioManager.setEffectsReverb('hall');

            expect(mockFetch).toHaveBeenCalledWith('/impulses/hall.wav');
            expect(audioManager.getActiveReverb()).toBe('hall');
            expect(audioManager.isImpulseLoaded('hall')).toBe(true);
        });

        it('should apply preloaded reverb without additional fetch', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.preloadImpulses(['hall']);
            vi.clearAllMocks();

            await audioManager.setEffectsReverb('hall');

            expect(mockFetch).not.toHaveBeenCalled();
            expect(audioManager.getActiveReverb()).toBe('hall');
        });

        it('should disable reverb when set to null', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.setEffectsReverb('hall');

            await audioManager.setEffectsReverb(null);

            expect(audioManager.getActiveReverb()).toBeNull();
        });

        it('should throw when applying non-registered reverb', async () => {
            await expect(audioManager.setEffectsReverb('nonexistent'))
                .rejects.toThrow('Impulse response "nonexistent" not registered');
        });

        it('should reflect active reverb in state', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.setEffectsReverb('hall');

            const state = audioManager.getEffectsBusState();
            expect(state.activeReverb).toBe('hall');
        });
    });

    describe('Low-Pass Filter', () => {
        it('should return null before initialization', () => {
            expect(audioManager.getEffectsLowPass()).toBeNull();
        });

        it('should set low-pass filter frequency', () => {
            audioManager.setEffectsLowPass(2000);

            const config = audioManager.getEffectsLowPass();
            expect(config).not.toBeNull();
            expect(config!.frequency).toBe(2000);
        });

        it('should set low-pass filter Q', () => {
            audioManager.setEffectsLowPass(2000, 2);

            const config = audioManager.getEffectsLowPass();
            expect(config).not.toBeNull();
            expect(config!.Q).toBe(2);
        });

        it('should clamp frequency to valid range (min)', () => {
            audioManager.setEffectsLowPass(10);

            const config = audioManager.getEffectsLowPass();
            expect(config!.frequency).toBe(20);
        });

        it('should clamp frequency to valid range (max)', () => {
            audioManager.setEffectsLowPass(25000);

            const config = audioManager.getEffectsLowPass();
            expect(config!.frequency).toBe(20000);
        });

        it('should reflect low-pass in state', () => {
            audioManager.setEffectsLowPass(4000, 1.5);

            const state = audioManager.getEffectsBusState();
            expect(state.lowPass).not.toBeNull();
            expect(state.lowPass!.frequency).toBe(4000);
            expect(state.lowPass!.Q).toBe(1.5);
        });
    });

    describe('High-Pass Filter', () => {
        it('should return null before initialization', () => {
            expect(audioManager.getEffectsHighPass()).toBeNull();
        });

        it('should set high-pass filter frequency', () => {
            audioManager.setEffectsHighPass(200);

            const config = audioManager.getEffectsHighPass();
            expect(config).not.toBeNull();
            expect(config!.frequency).toBe(200);
        });

        it('should set high-pass filter Q', () => {
            audioManager.setEffectsHighPass(200, 1.5);

            const config = audioManager.getEffectsHighPass();
            expect(config).not.toBeNull();
            expect(config!.Q).toBe(1.5);
        });

        it('should clamp frequency to valid range (min)', () => {
            audioManager.setEffectsHighPass(10);

            const config = audioManager.getEffectsHighPass();
            expect(config!.frequency).toBe(20);
        });

        it('should clamp frequency to valid range (max)', () => {
            audioManager.setEffectsHighPass(25000);

            const config = audioManager.getEffectsHighPass();
            expect(config!.frequency).toBe(20000);
        });

        it('should reflect high-pass in state', () => {
            audioManager.setEffectsHighPass(500, 2);

            const state = audioManager.getEffectsBusState();
            expect(state.highPass).not.toBeNull();
            expect(state.highPass!.frequency).toBe(500);
            expect(state.highPass!.Q).toBe(2);
        });
    });

    describe('State Queries', () => {
        it('should return complete state before initialization', () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');

            const state = audioManager.getEffectsBusState();

            expect(state.initialized).toBe(false);
            expect(state.wetMix).toBe(0);
            expect(state.activeReverb).toBeNull();
            expect(state.lowPass).toBeNull();
            expect(state.highPass).toBeNull();
            expect(state.registeredImpulses).toContain('hall');
        });

        it('should return complete state after initialization', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.setEffectsReverb('hall');
            audioManager.setEffectsMix(0.3);
            audioManager.setEffectsLowPass(4000);
            audioManager.setEffectsHighPass(200);

            const state = audioManager.getEffectsBusState();

            expect(state.initialized).toBe(true);
            expect(state.wetMix).toBe(0.3);
            expect(state.activeReverb).toBe('hall');
            expect(state.lowPass).not.toBeNull();
            expect(state.highPass).not.toBeNull();
        });
    });

    describe('Cleanup', () => {
        it('should reset state on destroy', async () => {
            audioManager.addImpulseResponse('hall', '/impulses/hall.wav');
            await audioManager.setEffectsReverb('hall');
            audioManager.setEffectsMix(0.5);

            audioManager.destroy();

            // Create a new instance to verify state is cleared
            const newManager = new AudioManager();
            expect(newManager.isEffectsBusInitialized()).toBe(false);
            expect(newManager.getEffectsMix()).toBe(0);
            expect(newManager.getActiveReverb()).toBeNull();
            expect(newManager.getEffectsBusState().registeredImpulses).toHaveLength(0);
            newManager.destroy();
        });

        it('should not throw when destroying uninitialized effects bus', () => {
            expect(() => audioManager.destroy()).not.toThrow();
        });

        it('should be able to reinitialize after destroy', () => {
            audioManager.setEffectsMix(0.5);
            audioManager.destroy();

            audioManager = new AudioManager();
            audioManager.setEffectsMix(0.3);

            expect(audioManager.isEffectsBusInitialized()).toBe(true);
            expect(audioManager.getEffectsMix()).toBe(0.3);
        });
    });
});
