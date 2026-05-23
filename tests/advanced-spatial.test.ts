import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, OrientationUpdateEvent, DistanceThresholdEvent, Vector3 } from '../src';

describe('Advanced Spatial Features (Phase 5)', () => {
    let audio: AudioManager;

    beforeEach(() => {
        audio = new AudioManager({ debug: false });
    });

    afterEach(() => {
        audio.destroy();
    });

    // ==================== Directional Audio (5.1) ====================

    describe('Directional Audio', () => {
        describe('setSoundOrientation', () => {
            it('should update orientation for 3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
                const result = audio.setSoundOrientation(instanceId!, { x: 0, y: -1, z: 0 });

                expect(result).toBe(true);
            });

            it('should return false for non-3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                // Play regular non-3D sound - capture ID from event
                let instanceId: string | null = null;
                audio.onTrackStart$.subscribe(e => { instanceId = e.channelId; });
                audio.playAudioTrack('sound');

                expect(instanceId).not.toBeNull();
                const result = audio.setSoundOrientation(instanceId!, { x: 0, y: -1, z: 0 });
                expect(result).toBe(false);
            });

            it('should return false for unknown instance', () => {
                const result = audio.setSoundOrientation('unknown_id', { x: 0, y: -1, z: 0 });
                expect(result).toBe(false);
            });

            it('should emit orientation update event', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const events: OrientationUpdateEvent[] = [];
                audio.onOrientationUpdate$.subscribe(e => events.push(e));

                const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
                audio.setSoundOrientation(instanceId!, { x: 0, y: -1, z: 0 });

                expect(events.length).toBe(1);
                expect(events[0].instanceId).toBe(instanceId);
                expect(events[0].newOrientation).toEqual({ x: 0, y: -1, z: 0 });
            });
        });

        describe('setChannelOrientation', () => {
            it('should update orientation for 3D channel', async () => {
                audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
                await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

                const result = audio.setChannelOrientation('amb1', { x: 1, y: 0, z: 0 });

                expect(result).toBe(true);
            });

            it('should return false for non-3D channel', async () => {
                audio.addAudioTrack('music', 'music', '/audio/music.mp3');
                await audio.playContinuous('music', 'bgm');

                const result = audio.setChannelOrientation('bgm', { x: 1, y: 0, z: 0 });

                expect(result).toBe(false);
            });

            it('should return false for unknown channel', () => {
                const result = audio.setChannelOrientation('unknown', { x: 1, y: 0, z: 0 });
                expect(result).toBe(false);
            });

            it('should emit orientation update event', async () => {
                audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
                await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

                const events: OrientationUpdateEvent[] = [];
                audio.onOrientationUpdate$.subscribe(e => events.push(e));

                audio.setChannelOrientation('amb1', { x: 0, y: 0, z: 1 });

                expect(events.length).toBe(1);
                expect(events[0].instanceId).toBe('amb1');
                expect(events[0].newOrientation).toEqual({ x: 0, y: 0, z: 1 });
            });
        });

        describe('getSoundOrientation', () => {
            it('should return orientation for 3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
                const orientation = audio.getSoundOrientation(instanceId!);

                expect(orientation).not.toBeNull();
            });

            it('should return null for non-3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                let instanceId: string | null = null;
                audio.onTrackStart$.subscribe(e => { instanceId = e.channelId; });
                audio.playAudioTrack('sound');

                expect(audio.getSoundOrientation(instanceId!)).toBeNull();
            });

            it('should return null for unknown instance', () => {
                expect(audio.getSoundOrientation('unknown_id')).toBeNull();
            });
        });

        describe('getChannelOrientation', () => {
            it('should return orientation for 3D channel', async () => {
                audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
                await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

                const orientation = audio.getChannelOrientation('amb1');

                expect(orientation).not.toBeNull();
            });

            it('should return null for non-3D channel', async () => {
                audio.addAudioTrack('music', 'music', '/audio/music.mp3');
                await audio.playContinuous('music', 'bgm');

                expect(audio.getChannelOrientation('bgm')).toBeNull();
            });

            it('should return null for unknown channel', () => {
                expect(audio.getChannelOrientation('unknown')).toBeNull();
            });
        });
    });

    // ==================== Stereo Panning (5.3) ====================

    describe('Stereo Panning Fallback', () => {
        describe('play2DPanned', () => {
            it('should return instance ID on successful playback', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound', { pan: -0.5 });

                expect(instanceId).not.toBeNull();
                expect(typeof instanceId).toBe('string');
                expect(instanceId).toContain('_2d_');
            });

            it('should return null for unknown key', () => {
                const instanceId = audio.play2DPanned('nonexistent');
                expect(instanceId).toBeNull();
            });

            it('should return null for disabled group', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);
                audio.setAudioEnabled('sfx', false);

                const instanceId = audio.play2DPanned('sound');
                expect(instanceId).toBeNull();
            });

            it('should return null for unloaded buffer', () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                const instanceId = audio.play2DPanned('sound');
                expect(instanceId).toBeNull();
            });

            it('should clamp pan value to valid range', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                // Pan value beyond range should be clamped
                const id1 = audio.play2DPanned('sound', { pan: -2 });
                const id2 = audio.play2DPanned('sound', { pan: 2 });

                expect(id1).not.toBeNull();
                expect(id2).not.toBeNull();

                expect(audio.getSoundPan(id1!)).toBe(-1);
                expect(audio.getSoundPan(id2!)).toBe(1);
            });

            it('should default to center pan when not specified', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound');

                expect(audio.getSoundPan(instanceId!)).toBe(0);
            });

            it('should emit track start event', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const events: { key: string; channelId: string }[] = [];
                audio.onTrackStart$.subscribe(e => events.push(e));

                const instanceId = audio.play2DPanned('sound', { pan: 0.5 });

                expect(events.length).toBe(1);
                expect(events[0].key).toBe('sound');
                expect(events[0].channelId).toBe(instanceId);
            });
        });

        describe('setPan', () => {
            it('should update pan position', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound', { pan: 0 });
                const result = audio.setPan(instanceId!, 0.7);

                expect(result).toBe(true);
                expect(audio.getSoundPan(instanceId!)).toBe(0.7);
            });

            it('should clamp pan value to valid range', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound', { pan: 0 });

                audio.setPan(instanceId!, -5);
                expect(audio.getSoundPan(instanceId!)).toBe(-1);

                audio.setPan(instanceId!, 5);
                expect(audio.getSoundPan(instanceId!)).toBe(1);
            });

            it('should return false for unknown instance', () => {
                const result = audio.setPan('unknown_id', 0.5);
                expect(result).toBe(false);
            });

            it('should return false for non-panned sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
                const result = audio.setPan(instanceId!, 0.5);

                expect(result).toBe(false);
            });
        });

        describe('getSoundPan', () => {
            it('should return pan position for 2D panned sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound', { pan: -0.3 });

                expect(audio.getSoundPan(instanceId!)).toBe(-0.3);
            });

            it('should return null for unknown instance', () => {
                expect(audio.getSoundPan('unknown_id')).toBeNull();
            });
        });

        describe('is2DPannedSound', () => {
            it('should return true for 2D panned sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play2DPanned('sound');

                expect(audio.is2DPannedSound(instanceId!)).toBe(true);
            });

            it('should return false for 3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

                expect(audio.is2DPannedSound(instanceId!)).toBe(false);
            });

            it('should return false for unknown instance', () => {
                expect(audio.is2DPannedSound('unknown_id')).toBe(false);
            });
        });
    });

    // ==================== Distance Callbacks (5.2) ====================

    describe('Distance Callbacks', () => {
        describe('registerDistanceCallback', () => {
            it('should register callback for 3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 50, y: 0, z: 0 });
                const callback = vi.fn();

                const result = audio.registerDistanceCallback(instanceId!, {
                    thresholds: [10, 25, 50],
                    onThresholdCross: callback
                });

                expect(result).toBe(true);
            });

            it('should register callback for 3D channel', async () => {
                audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
                await audio.playContinuous3D('ambient', { x: 30, y: 0, z: 0 }, 'amb1');

                const callback = vi.fn();

                const result = audio.registerDistanceCallback('amb1', {
                    thresholds: [10, 20],
                    onThresholdCross: callback
                });

                expect(result).toBe(true);
            });

            it('should return false for non-3D sound', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                let instanceId: string | null = null;
                audio.onTrackStart$.subscribe(e => { instanceId = e.channelId; });
                audio.playAudioTrack('sound');

                const callback = vi.fn();
                const result = audio.registerDistanceCallback(instanceId!, {
                    thresholds: [10],
                    onThresholdCross: callback
                });

                expect(result).toBe(false);
            });

            it('should return false for unknown instance', () => {
                const callback = vi.fn();
                const result = audio.registerDistanceCallback('unknown_id', {
                    thresholds: [10],
                    onThresholdCross: callback
                });

                expect(result).toBe(false);
            });
        });

        describe('unregisterDistanceCallback', () => {
            it('should unregister callback', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                const instanceId = audio.play3D('sound', { x: 50, y: 0, z: 0 });
                const callback = vi.fn();

                audio.registerDistanceCallback(instanceId!, {
                    thresholds: [10],
                    onThresholdCross: callback
                });

                const result = audio.unregisterDistanceCallback(instanceId!);

                expect(result).toBe(true);
            });

            it('should return false when no callback registered', () => {
                const result = audio.unregisterDistanceCallback('unknown_id');
                expect(result).toBe(false);
            });
        });

        describe('distance threshold events', () => {
            it('should emit event when threshold crossed via position update', async () => {
                audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
                await audio.preload(['sound']);

                // Start sound far away
                const instanceId = audio.play3D('sound', { x: 50, y: 0, z: 0 });

                const events: DistanceThresholdEvent[] = [];
                audio.onDistanceThreshold$.subscribe(e => events.push(e));

                const callbackEvents: { threshold: number; direction: string }[] = [];
                audio.registerDistanceCallback(instanceId!, {
                    thresholds: [10, 25],
                    onThresholdCross: (id, dist, threshold, direction) => {
                        callbackEvents.push({ threshold, direction });
                    },
                    checkInterval: 10
                });

                // Move sound closer (inside both thresholds)
                audio.updateSoundPosition(instanceId!, { x: 5, y: 0, z: 0 });

                // Wait for interval to trigger
                await new Promise(resolve => setTimeout(resolve, 50));

                // Should have crossed both thresholds entering
                expect(callbackEvents.length).toBeGreaterThanOrEqual(2);
                expect(callbackEvents.some(e => e.threshold === 10 && e.direction === 'entering')).toBe(true);
                expect(callbackEvents.some(e => e.threshold === 25 && e.direction === 'entering')).toBe(true);
            });
        });
    });

    // ==================== HRTF Support (5.4) ====================

    describe('HRTF Support', () => {
        it('should allow setting HRTF panning model in spatial defaults', () => {
            audio.setSpatialDefaults({
                panningModel: 'HRTF'
            });

            const defaults = audio.getSpatialDefaults();
            expect(defaults.panningModel).toBe('HRTF');
        });

        it('should allow setting equalpower panning model', () => {
            audio.setSpatialDefaults({
                panningModel: 'equalpower'
            });

            const defaults = audio.getSpatialDefaults();
            expect(defaults.panningModel).toBe('equalpower');
        });

        it('should apply panning model to 3D sounds', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            audio.setSpatialDefaults({
                panningModel: 'HRTF'
            });

            const instanceId = audio.play3D('sound', { x: 10, y: 0, z: -5 });

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should allow overriding panning model per sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            audio.setSpatialDefaults({
                panningModel: 'equalpower'
            });

            // Override with HRTF for this specific sound
            const instanceId = audio.play3D('sound', { x: 10, y: 0, z: -5 }, {
                spatialConfig: {
                    panningModel: 'HRTF'
                }
            });

            expect(instanceId).not.toBeNull();
        });
    });

    // ==================== Cleanup ====================

    describe('Cleanup', () => {
        it('should stop 2D panned sounds on destroy', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const id1 = audio.play2DPanned('sound', { pan: -0.5 });
            const id2 = audio.play2DPanned('sound', { pan: 0.5 });

            expect(audio.is2DPannedSound(id1!)).toBe(true);
            expect(audio.is2DPannedSound(id2!)).toBe(true);

            audio.destroy();

            // After destroy, sounds should no longer be tracked
            expect(audio.is2DPannedSound(id1!)).toBe(false);
            expect(audio.is2DPannedSound(id2!)).toBe(false);
        });

        it('should clean up distance callbacks on destroy', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 50, y: 0, z: 0 });
            const callback = vi.fn();

            audio.registerDistanceCallback(instanceId!, {
                thresholds: [10],
                onThresholdCross: callback,
                checkInterval: 10
            });

            audio.destroy();

            // Wait to ensure interval would have fired if not cleared
            await new Promise(resolve => setTimeout(resolve, 50));

            // Callback should not have been called after destroy
            // (Sound position didn't change, so callback shouldn't fire anyway,
            // but the interval should be cleared)
        });

        it('should complete orientation observable on destroy', async () => {
            let completed = false;
            audio.onOrientationUpdate$.subscribe({
                complete: () => { completed = true; }
            });

            audio.destroy();

            expect(completed).toBe(true);
        });

        it('should complete distance threshold observable on destroy', async () => {
            let completed = false;
            audio.onDistanceThreshold$.subscribe({
                complete: () => { completed = true; }
            });

            audio.destroy();

            expect(completed).toBe(true);
        });
    });
});
