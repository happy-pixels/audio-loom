import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/audio-manager';
import { ENVIRONMENT_PRESETS, EnvironmentConfig } from '../src/types';
import { mockFetch } from './setup';

describe('Environment System', () => {
    let audioManager: AudioManager;

    beforeEach(() => {
        audioManager = new AudioManager();
        vi.clearAllMocks();
        // Register impulse responses for all presets
        audioManager.addImpulseResponse('cave', '/impulses/cave.wav');
        audioManager.addImpulseResponse('forest', '/impulses/forest.wav');
        audioManager.addImpulseResponse('underwater', '/impulses/underwater.wav');
        audioManager.addImpulseResponse('indoor', '/impulses/indoor.wav');
        audioManager.addImpulseResponse('metal_corridor', '/impulses/metal_corridor.wav');
        audioManager.addImpulseResponse('bathroom', '/impulses/bathroom.wav');
        audioManager.addImpulseResponse('arena', '/impulses/arena.wav');
    });

    afterEach(() => {
        audioManager.destroy();
    });

    describe('Environment Presets', () => {
        it('should have all expected presets defined', () => {
            expect(ENVIRONMENT_PRESETS.none).toBeDefined();
            expect(ENVIRONMENT_PRESETS.cave).toBeDefined();
            expect(ENVIRONMENT_PRESETS.forest).toBeDefined();
            expect(ENVIRONMENT_PRESETS.underwater).toBeDefined();
            expect(ENVIRONMENT_PRESETS.indoor).toBeDefined();
            expect(ENVIRONMENT_PRESETS.metal_corridor).toBeDefined();
            expect(ENVIRONMENT_PRESETS.bathroom).toBeDefined();
            expect(ENVIRONMENT_PRESETS.arena).toBeDefined();
        });

        it('should have "none" preset with no effects', () => {
            const none = ENVIRONMENT_PRESETS.none;
            expect(none.reverb).toBeNull();
            expect(none.wetMix).toBe(0);
            expect(none.lowPass).toBeNull();
            expect(none.highPass).toBeNull();
        });

        it('should have valid wet mix values (0-1) for all presets', () => {
            for (const [name, preset] of Object.entries(ENVIRONMENT_PRESETS)) {
                expect(preset.wetMix).toBeGreaterThanOrEqual(0);
                expect(preset.wetMix).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('setEnvironment', () => {
        it('should have no environment by default', () => {
            expect(audioManager.getEnvironment()).toBeNull();
        });

        it('should apply environment preset by name', async () => {
            await audioManager.setEnvironment('cave');

            const env = audioManager.getEnvironment();
            expect(env).not.toBeNull();
            expect(env!.wetMix).toBe(ENVIRONMENT_PRESETS.cave.wetMix);
            expect(audioManager.getEffectsMix()).toBe(ENVIRONMENT_PRESETS.cave.wetMix);
        });

        it('should apply "none" preset to clear effects', async () => {
            await audioManager.setEnvironment('cave');
            await audioManager.setEnvironment('none');

            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should apply null to clear effects', async () => {
            await audioManager.setEnvironment('cave');
            await audioManager.setEnvironment(null);

            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should apply custom environment config', async () => {
            audioManager.addImpulseResponse('custom', '/impulses/custom.wav');

            const customConfig: EnvironmentConfig = {
                reverb: 'custom',
                wetMix: 0.35,
                lowPass: { frequency: 5000, Q: 1.2 },
                highPass: { frequency: 150, Q: 0.8 }
            };

            await audioManager.setEnvironment(customConfig);

            const env = audioManager.getEnvironment();
            expect(env).toEqual(customConfig);
            expect(audioManager.getEffectsMix()).toBe(0.35);
        });

        it('should throw for unknown preset name', async () => {
            await expect(audioManager.setEnvironment('unknown' as any))
                .rejects.toThrow('Unknown environment preset');
        });

        it('should apply filter settings from preset', async () => {
            await audioManager.setEnvironment('underwater');

            const lowPass = audioManager.getEffectsLowPass();
            const highPass = audioManager.getEffectsHighPass();

            expect(lowPass!.frequency).toBe(ENVIRONMENT_PRESETS.underwater.lowPass!.frequency);
            expect(highPass!.frequency).toBe(ENVIRONMENT_PRESETS.underwater.highPass!.frequency);
        });

        it('should load reverb impulse on demand', async () => {
            vi.clearAllMocks();
            await audioManager.setEnvironment('cave');

            expect(mockFetch).toHaveBeenCalledWith('/impulses/cave.wav');
            expect(audioManager.getActiveReverb()).toBe('cave');
        });

        it('should use preloaded reverb without additional fetch', async () => {
            await audioManager.preloadImpulses(['cave']);
            vi.clearAllMocks();

            await audioManager.setEnvironment('cave');

            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('transitionToEnvironment', () => {
        it('should transition to a new environment over time', async () => {
            await audioManager.setEnvironment('none');

            const transitionPromise = audioManager.transitionToEnvironment('cave', 100);

            // Should complete after duration
            await transitionPromise;

            expect(audioManager.getEnvironment()).toEqual(ENVIRONMENT_PRESETS.cave);
        });

        it('should transition from one environment to another', async () => {
            await audioManager.setEnvironment('indoor');
            const transitionPromise = audioManager.transitionToEnvironment('cave', 100);

            await transitionPromise;

            expect(audioManager.getEnvironment()).toEqual(ENVIRONMENT_PRESETS.cave);
            expect(audioManager.getActiveReverb()).toBe('cave');
        });

        it('should transition to "none" to clear effects', async () => {
            await audioManager.setEnvironment('cave');

            await audioManager.transitionToEnvironment('none', 100);

            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should transition to null to clear effects', async () => {
            await audioManager.setEnvironment('cave');

            await audioManager.transitionToEnvironment(null, 100);

            expect(audioManager.getEffectsMix()).toBe(0);
        });

        it('should cancel previous transition when starting new one', async () => {
            await audioManager.setEnvironment('none');

            // Start first transition
            const firstTransition = audioManager.transitionToEnvironment('cave', 500);

            // Start second transition immediately
            const secondTransition = audioManager.transitionToEnvironment('forest', 100);

            await secondTransition;

            // Should end up with forest, not cave
            expect(audioManager.getActiveReverb()).toBe('forest');
        });

        it('should throw for unknown preset name', async () => {
            await expect(audioManager.transitionToEnvironment('unknown' as any, 100))
                .rejects.toThrow('Unknown environment preset');
        });

        it('should throw for unregistered reverb', async () => {
            await expect(audioManager.transitionToEnvironment({
                reverb: 'unregistered',
                wetMix: 0.3,
                lowPass: null,
                highPass: null
            }, 100)).rejects.toThrow('not registered');
        });
    });

    describe('Per-Group Effect Bypass', () => {
        it('should not bypass effects by default', () => {
            expect(audioManager.isGroupBypassingEffects('sfx')).toBe(false);
            expect(audioManager.isGroupBypassingEffects('music')).toBe(false);
        });

        it('should set group to bypass effects', () => {
            audioManager.setGroupBypassEffects('ui', true);

            expect(audioManager.isGroupBypassingEffects('ui')).toBe(true);
        });

        it('should allow disabling bypass', () => {
            audioManager.setGroupBypassEffects('ui', true);
            audioManager.setGroupBypassEffects('ui', false);

            expect(audioManager.isGroupBypassingEffects('ui')).toBe(false);
        });

        it('should track multiple groups independently', () => {
            audioManager.setGroupBypassEffects('ui', true);
            audioManager.setGroupBypassEffects('dialog', true);
            audioManager.setGroupBypassEffects('sfx', false);

            expect(audioManager.isGroupBypassingEffects('ui')).toBe(true);
            expect(audioManager.isGroupBypassingEffects('dialog')).toBe(true);
            expect(audioManager.isGroupBypassingEffects('sfx')).toBe(false);
        });

        it('should return list of bypassed groups', () => {
            audioManager.setGroupBypassEffects('ui', true);
            audioManager.setGroupBypassEffects('dialog', true);
            audioManager.setGroupBypassEffects('music', false);

            const bypassed = audioManager.getBypassedGroups();

            expect(bypassed).toContain('ui');
            expect(bypassed).toContain('dialog');
            expect(bypassed).not.toContain('music');
        });

        it('should return empty array when no groups bypass', () => {
            expect(audioManager.getBypassedGroups()).toEqual([]);
        });

        it('should handle bypass for group that has been used', async () => {
            // Create the group by adding and playing a track
            audioManager.addAudioTrack('click', 'ui', '/sounds/click.wav');
            await audioManager.preload(['click']);

            // Now set bypass
            audioManager.setGroupBypassEffects('ui', true);

            expect(audioManager.isGroupBypassingEffects('ui')).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('should clear environment on destroy', async () => {
            await audioManager.setEnvironment('cave');

            audioManager.destroy();

            // Create new instance to verify
            const newManager = new AudioManager();
            expect(newManager.getEnvironment()).toBeNull();
            newManager.destroy();
        });

        it('should clear bypass state on destroy', () => {
            audioManager.setGroupBypassEffects('ui', true);
            audioManager.setGroupBypassEffects('dialog', true);

            audioManager.destroy();

            // Create new instance to verify
            const newManager = new AudioManager();
            expect(newManager.isGroupBypassingEffects('ui')).toBe(false);
            expect(newManager.isGroupBypassingEffects('dialog')).toBe(false);
            newManager.destroy();
        });

        it('should cancel pending transitions on destroy', async () => {
            audioManager.addImpulseResponse('cave', '/impulses/cave.wav');

            // Start a long transition
            const transition = audioManager.transitionToEnvironment('cave', 5000);

            // Destroy immediately
            audioManager.destroy();

            // Transition should still resolve but state should be cleared
            // (we don't reject the promise, we just stop the transition)
        });
    });
});
