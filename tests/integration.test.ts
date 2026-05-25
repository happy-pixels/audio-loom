import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, EnvironmentConfig, Vector3 } from '../src';

describe('Integration Tests (Phase 6.4)', () => {
    let audio: AudioManager;

    beforeEach(() => {
        audio = new AudioManager({ debug: false });
        // Register impulse responses for environment testing
        audio.addImpulseResponse('cave', '/impulses/cave.wav');
        audio.addImpulseResponse('forest', '/impulses/forest.wav');
        audio.addImpulseResponse('indoor', '/impulses/indoor.wav');
        vi.clearAllMocks();
    });

    afterEach(() => {
        audio.destroy();
    });

    // ==================== 3D Playback with Effects ====================

    describe('3D Playback with Effects', () => {
        it('should play 3D sound with environment effects applied', async () => {
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            await audio.preload(['explosion']);

            // Apply cave environment
            await audio.setEnvironment('cave');

            // Play 3D sound
            const instanceId = audio.play3D('explosion', { x: 10, y: 0, z: -5 });

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(true);
            expect(audio.getEffectsMix()).toBeGreaterThan(0);
        });

        it('should play continuous 3D sound with environment effects', async () => {
            audio.addAudioTrack('fire', 'ambient', '/audio/fire.wav');

            // Apply forest environment
            await audio.setEnvironment('forest');

            // Play continuous 3D sound
            await audio.playContinuous3D('fire', { x: 5, y: 0, z: -10 }, 'campfire');

            expect(audio.is3DChannel('campfire')).toBe(true);
            expect(audio.getActiveReverb()).toBe('forest');
        });

        it('should allow bypassed group 3D sounds to skip effects', async () => {
            audio.addAudioTrack('ui_click', 'ui', '/audio/click.wav');
            await audio.preload(['ui_click']);

            // Apply environment and bypass UI group
            await audio.setEnvironment('cave');
            audio.setGroupBypassEffects('ui', true);

            // Play 3D UI sound (should bypass effects)
            const instanceId = audio.play3D('ui_click', { x: 0, y: 0, z: -1 });

            expect(instanceId).not.toBeNull();
            expect(audio.isGroupBypassingEffects('ui')).toBe(true);
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should apply filters to 3D sound output', async () => {
            audio.addAudioTrack('voice', 'dialog', '/audio/voice.wav');
            await audio.preload(['voice']);

            // Apply underwater-like filter settings
            audio.setEffectsLowPass(2000, 1);
            audio.setEffectsHighPass(100, 1);
            audio.setEffectsMix(0.5);

            const instanceId = audio.play3D('voice', { x: 3, y: 1, z: -2 });

            expect(instanceId).not.toBeNull();
            expect(audio.getEffectsLowPass()?.frequency).toBe(2000);
            expect(audio.getEffectsHighPass()?.frequency).toBe(100);
        });

        it('should combine spatial positioning with reverb', async () => {
            audio.addAudioTrack('footstep', 'sfx', '/audio/footstep.wav');
            await audio.preload(['footstep']);

            // Set up spatial defaults and environment
            audio.setSpatialDefaults({
                distanceModel: 'inverse',
                refDistance: 1,
                maxDistance: 100,
                rolloffFactor: 1
            });
            await audio.setEnvironment('indoor');

            // Play sound at various positions
            const id1 = audio.play3D('footstep', { x: 5, y: 0, z: 0 });
            const id2 = audio.play3D('footstep', { x: -5, y: 0, z: 0 });
            const id3 = audio.play3D('footstep', { x: 0, y: 0, z: 10 });

            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
            expect(id3).not.toBeNull();
            expect(audio.getSoundPosition(id1!)).toEqual({ x: 5, y: 0, z: 0 });
            expect(audio.getSoundPosition(id2!)).toEqual({ x: -5, y: 0, z: 0 });
            expect(audio.getSoundPosition(id3!)).toEqual({ x: 0, y: 0, z: 10 });
        });
    });

    // ==================== Multiple 3D Sounds Simultaneously ====================

    describe('Multiple 3D Sounds Simultaneously', () => {
        it('should play multiple 3D sounds at different positions', async () => {
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            audio.addAudioTrack('gunshot', 'sfx', '/audio/gunshot.wav');
            audio.addAudioTrack('footstep', 'sfx', '/audio/footstep.wav');
            await audio.preload(['explosion', 'gunshot', 'footstep']);

            const positions: Vector3[] = [
                { x: 10, y: 0, z: -5 },
                { x: -15, y: 2, z: 3 },
                { x: 0, y: 5, z: -20 }
            ];

            const id1 = audio.play3D('explosion', positions[0]);
            const id2 = audio.play3D('gunshot', positions[1]);
            const id3 = audio.play3D('footstep', positions[2]);

            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
            expect(id3).not.toBeNull();

            expect(audio.getSoundPosition(id1!)).toEqual(positions[0]);
            expect(audio.getSoundPosition(id2!)).toEqual(positions[1]);
            expect(audio.getSoundPosition(id3!)).toEqual(positions[2]);
        });

        it('should play multiple continuous 3D sounds on different channels', async () => {
            audio.addAudioTrack('ambient_wind', 'ambient', '/audio/wind.wav');
            audio.addAudioTrack('ambient_water', 'ambient', '/audio/water.wav');
            audio.addAudioTrack('music', 'music', '/audio/music.mp3');

            await audio.playContinuous3D('ambient_wind', { x: 50, y: 10, z: 0 }, 'wind');
            await audio.playContinuous3D('ambient_water', { x: -30, y: -5, z: 20 }, 'river');

            expect(audio.is3DChannel('wind')).toBe(true);
            expect(audio.is3DChannel('river')).toBe(true);

            expect(audio.getChannelPosition('wind')).toEqual({ x: 50, y: 10, z: 0 });
            expect(audio.getChannelPosition('river')).toEqual({ x: -30, y: -5, z: 20 });
        });

        it('should update positions of multiple sounds independently', async () => {
            audio.addAudioTrack('sound1', 'sfx', '/audio/sound1.wav');
            audio.addAudioTrack('sound2', 'sfx', '/audio/sound2.wav');
            await audio.preload(['sound1', 'sound2']);

            const id1 = audio.play3D('sound1', { x: 0, y: 0, z: 0 });
            const id2 = audio.play3D('sound2', { x: 10, y: 0, z: 0 });

            // Update positions independently
            audio.updateSoundPosition(id1!, { x: 5, y: 5, z: 5 });
            audio.updateSoundPosition(id2!, { x: 15, y: 2, z: -3 });

            expect(audio.getSoundPosition(id1!)).toEqual({ x: 5, y: 5, z: 5 });
            expect(audio.getSoundPosition(id2!)).toEqual({ x: 15, y: 2, z: -3 });
        });

        it('should handle mixed 3D and non-3D playback', async () => {
            audio.addAudioTrack('3d_sound', 'sfx', '/audio/3d.wav');
            audio.addAudioTrack('2d_sound', 'sfx', '/audio/2d.wav');
            audio.addAudioTrack('panned_sound', 'sfx', '/audio/panned.wav');
            audio.addAudioTrack('continuous', 'music', '/audio/music.mp3');
            await audio.preload(['3d_sound', '2d_sound', 'panned_sound']);

            // Play various types
            const id3D = audio.play3D('3d_sound', { x: 10, y: 0, z: -5 });
            const id2DPanned = audio.play2DPanned('panned_sound', { pan: 0.5 });
            await audio.playContinuous('continuous', 'bgm');

            expect(audio.is3DSound(id3D!)).toBe(true);
            expect(audio.is2DPannedSound(id2DPanned!)).toBe(true);
            expect(audio.is3DChannel('bgm')).toBe(false);
        });

        it('should track multiple sounds with different spatial configs', async () => {
            audio.addAudioTrack('near', 'sfx', '/audio/near.wav');
            audio.addAudioTrack('far', 'sfx', '/audio/far.wav');
            await audio.preload(['near', 'far']);

            // Near sound with quick rolloff
            const idNear = audio.play3D('near', { x: 5, y: 0, z: 0 }, {
                spatialConfig: {
                    maxDistance: 20,
                    rolloffFactor: 2
                }
            });

            // Far sound with slow rolloff
            const idFar = audio.play3D('far', { x: 100, y: 0, z: 0 }, {
                spatialConfig: {
                    maxDistance: 500,
                    rolloffFactor: 0.5
                }
            });

            expect(idNear).not.toBeNull();
            expect(idFar).not.toBeNull();
            expect(audio.is3DSound(idNear!)).toBe(true);
            expect(audio.is3DSound(idFar!)).toBe(true);
        });
    });

    // ==================== Environment Changes During Playback ====================

    describe('Environment Changes During Playback', () => {
        it('should allow environment change while 3D sound is playing', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: -10 }, 'amb');

            // Start with no environment
            expect(audio.getEnvironment()).toBeNull();

            // Apply environment while sound plays
            await audio.setEnvironment('cave');
            expect(audio.getActiveReverb()).toBe('cave');

            // Change environment
            await audio.setEnvironment('forest');
            expect(audio.getActiveReverb()).toBe('forest');

            // Sound should still be playing
            expect(audio.is3DChannel('amb')).toBe(true);
        });

        it('should transition environment while 3D sounds play', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Play sounds
            const id1 = audio.play3D('sound', { x: 5, y: 0, z: 0 });
            const id2 = audio.play3D('sound', { x: -5, y: 0, z: 0 });

            // Start transition
            await audio.setEnvironment('indoor');
            const transitionPromise = audio.transitionToEnvironment('cave', 100);

            // Sounds should continue during transition
            expect(audio.is3DSound(id1!)).toBe(true);
            expect(audio.is3DSound(id2!)).toBe(true);

            // Wait for transition
            await transitionPromise;

            expect(audio.getActiveReverb()).toBe('cave');
        });

        it('should clear environment while 3D sound is playing', async () => {
            audio.addAudioTrack('sound', 'ambient', '/audio/sound.wav');
            await audio.playContinuous3D('sound', { x: 10, y: 0, z: 0 }, 'channel1');

            // Apply then clear environment
            await audio.setEnvironment('cave');
            expect(audio.getActiveReverb()).toBe('cave');

            // Clear using 'none' preset to fully clear effects
            await audio.setEnvironment('none');
            expect(audio.getEffectsMix()).toBe(0);

            // Sound should still play
            expect(audio.is3DChannel('channel1')).toBe(true);
        });

        it('should handle rapid environment changes', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: -5 });

            // Rapid environment changes
            await audio.setEnvironment('cave');
            await audio.setEnvironment('forest');
            await audio.setEnvironment('indoor');
            await audio.setEnvironment('cave');

            expect(audio.getActiveReverb()).toBe('cave');
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should toggle group bypass during playback', async () => {
            audio.addAudioTrack('ui_sound', 'ui', '/audio/ui.wav');
            await audio.preload(['ui_sound']);

            await audio.setEnvironment('cave');

            // Play without bypass
            audio.setGroupBypassEffects('ui', false);
            const id1 = audio.play3D('ui_sound', { x: 0, y: 0, z: -1 });

            expect(audio.isGroupBypassingEffects('ui')).toBe(false);

            // Enable bypass while sound plays
            audio.setGroupBypassEffects('ui', true);
            expect(audio.isGroupBypassingEffects('ui')).toBe(true);

            // Play another sound with bypass now active
            const id2 = audio.play3D('ui_sound', { x: 1, y: 0, z: -1 });

            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
        });

        it('should handle listener movement during playback', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Start sound at fixed position
            const instanceId = audio.play3D('sound', { x: 10, y: 0, z: 0 });

            // Move listener
            audio.setListenerPosition({ x: 0, y: 0, z: 0 });
            audio.setListenerPosition({ x: 5, y: 0, z: 0 });
            audio.setListenerPosition({ x: 10, y: 0, z: 0 });

            // Change listener orientation
            audio.setListenerOrientation(
                { x: 1, y: 0, z: 0 },  // Looking right
                { x: 0, y: 1, z: 0 }
            );

            expect(audio.is3DSound(instanceId!)).toBe(true);
            expect(audio.getListenerPosition()).toEqual({ x: 10, y: 0, z: 0 });
        });
    });

    // ==================== Complex Scenarios ====================

    describe('Complex Scenarios', () => {
        it('should handle full game audio scenario', async () => {
            // Setup tracks
            audio.addAudioTrack('footstep', 'sfx', '/audio/footstep.wav');
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            audio.addAudioTrack('ambient_wind', 'ambient', '/audio/wind.wav');
            audio.addAudioTrack('music', 'music', '/audio/music.mp3');
            audio.addAudioTrack('ui_click', 'ui', '/audio/click.wav');
            await audio.preload(['footstep', 'explosion', 'ui_click']);

            // Configure spatial defaults
            audio.setSpatialDefaults({
                distanceModel: 'inverse',
                maxDistance: 100,
                rolloffFactor: 1,
                panningModel: 'HRTF'
            });

            // Start background music (non-3D)
            await audio.playContinuous('music', 'bgm');

            // Start 3D ambient
            await audio.playContinuous3D('ambient_wind', { x: 50, y: 10, z: 0 }, 'wind');

            // Apply environment
            await audio.setEnvironment('forest');

            // Bypass effects for UI
            audio.setGroupBypassEffects('ui', true);

            // Play various sounds
            const footstepId = audio.play3D('footstep', { x: 2, y: 0, z: -1 });
            const explosionId = audio.play3D('explosion', { x: 30, y: 0, z: -20 });
            const uiId = audio.play3D('ui_click', { x: 0, y: 0, z: -0.5 });

            // Verify state
            expect(audio.is3DChannel('bgm')).toBe(false);
            expect(audio.is3DChannel('wind')).toBe(true);
            expect(audio.is3DSound(footstepId!)).toBe(true);
            expect(audio.is3DSound(explosionId!)).toBe(true);
            expect(audio.is3DSound(uiId!)).toBe(true);
            expect(audio.isGroupBypassingEffects('ui')).toBe(true);
            expect(audio.getActiveReverb()).toBe('forest');
        });

        it('should handle directional 3D sounds with environment effects', async () => {
            audio.addAudioTrack('speaker', 'sfx', '/audio/speaker.wav');
            await audio.preload(['speaker']);

            // Apply environment
            await audio.setEnvironment('indoor');

            // Play directional sound (like a speaker pointing in a direction)
            const instanceId = audio.play3D('speaker', { x: 5, y: 2, z: 0 }, {
                orientation: { x: -1, y: 0, z: 0 },  // Pointing left
                spatialConfig: {
                    cone: {
                        innerAngle: 60,
                        outerAngle: 120,
                        outerGain: 0.2
                    }
                }
            });

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(true);

            // Update orientation
            const result = audio.setSoundOrientation(instanceId!, { x: 0, y: 0, z: -1 });
            expect(result).toBe(true);
        });

        it('should handle 2D panned sounds alongside 3D sounds', async () => {
            audio.addAudioTrack('3d_sound', 'sfx', '/audio/3d.wav');
            audio.addAudioTrack('panned_sound', 'ui', '/audio/panned.wav');
            await audio.preload(['3d_sound', 'panned_sound']);

            // Play 3D sound with effects
            await audio.setEnvironment('cave');
            const id3D = audio.play3D('3d_sound', { x: 10, y: 0, z: -5 });

            // Play 2D panned sound (bypassed UI)
            audio.setGroupBypassEffects('ui', true);
            const idPanned = audio.play2DPanned('panned_sound', { pan: 0.7, volume: 0.8 });

            expect(audio.is3DSound(id3D!)).toBe(true);
            expect(audio.is2DPannedSound(idPanned!)).toBe(true);
            expect(audio.getSoundPan(idPanned!)).toBe(0.7);

            // Update pan
            audio.setPan(idPanned!, -0.5);
            expect(audio.getSoundPan(idPanned!)).toBe(-0.5);
        });

        it('should handle distance callbacks with environment changes', async () => {
            audio.addAudioTrack('enemy', 'sfx', '/audio/enemy.wav');
            await audio.preload(['enemy']);

            // Start far away
            const instanceId = audio.play3D('enemy', { x: 100, y: 0, z: 0 });

            // Register distance callback
            const crossings: { threshold: number; direction: string }[] = [];
            audio.registerDistanceCallback(instanceId!, {
                thresholds: [10, 25, 50],
                onThresholdCross: (id, dist, threshold, direction) => {
                    crossings.push({ threshold, direction });
                },
                checkInterval: 10
            });

            // Apply environment while tracking distance
            await audio.setEnvironment('cave');

            // Move enemy closer
            audio.updateSoundPosition(instanceId!, { x: 5, y: 0, z: 0 });

            // Wait for callback checks
            await new Promise(resolve => setTimeout(resolve, 50));

            // Environment should still be active
            expect(audio.getActiveReverb()).toBe('cave');
            expect(crossings.length).toBeGreaterThan(0);
        });

        it('should handle cleanup correctly with complex state', async () => {
            // Set up complex state
            audio.addAudioTrack('sound1', 'sfx', '/audio/sound1.wav');
            audio.addAudioTrack('sound2', 'ambient', '/audio/sound2.wav');
            audio.addAudioTrack('sound3', 'ui', '/audio/sound3.wav');
            await audio.preload(['sound1', 'sound3']);

            // Configure everything
            audio.setSpatialDefaults({ maxDistance: 50 });
            audio.setListenerPosition({ x: 10, y: 5, z: -3 });
            audio.setListenerOrientation({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 });
            await audio.setEnvironment('cave');
            audio.setGroupBypassEffects('ui', true);

            // Play various sounds
            const id1 = audio.play3D('sound1', { x: 20, y: 0, z: 0 });
            await audio.playContinuous3D('sound2', { x: -10, y: 0, z: 10 }, 'amb');
            const id3 = audio.play2DPanned('sound3', { pan: -0.3 });

            // Register callback
            audio.registerDistanceCallback(id1!, {
                thresholds: [15],
                onThresholdCross: () => {},
                checkInterval: 10
            });

            // Verify complex state
            expect(audio.is3DSound(id1!)).toBe(true);
            expect(audio.is3DChannel('amb')).toBe(true);
            expect(audio.is2DPannedSound(id3!)).toBe(true);

            // Destroy and verify cleanup
            audio.destroy();

            // All should be cleaned up
            expect(audio.is3DSound(id1!)).toBe(false);
            expect(audio.is3DChannel('amb')).toBe(false);
            expect(audio.is2DPannedSound(id3!)).toBe(false);
        });
    });

    // ==================== Error Handling ====================

    describe('Error Handling', () => {
        it('should handle invalid environment preset gracefully', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

            // Try invalid environment
            await expect(audio.setEnvironment('invalid_preset' as any))
                .rejects.toThrow('Unknown environment preset');

            // Sound should still be valid
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should handle operations on destroyed manager', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            audio.destroy();

            // Operations should fail gracefully
            expect(audio.is3DSound(instanceId!)).toBe(false);
            expect(audio.getSoundPosition(instanceId!)).toBeNull();
            expect(audio.updateSoundPosition(instanceId!, { x: 1, y: 0, z: 0 })).toBe(false);
        });
    });
});
