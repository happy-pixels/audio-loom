import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, PositionUpdateEvent, Vector3 } from '../src';

describe('3D Playback API', () => {
    let audio: AudioManager;

    beforeEach(() => {
        audio = new AudioManager({ debug: false });
    });

    afterEach(() => {
        audio.destroy();
    });

    // ==================== play3D ====================

    describe('play3D', () => {
        it('should return instance ID on successful playback', async () => {
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            await audio.preload(['explosion']);

            const instanceId = audio.play3D('explosion', { x: 10, y: 0, z: -5 });

            expect(instanceId).not.toBeNull();
            expect(typeof instanceId).toBe('string');
            expect(instanceId).toContain('explosion');
        });

        it('should return null for unknown key', () => {
            const instanceId = audio.play3D('nonexistent', { x: 0, y: 0, z: 0 });

            expect(instanceId).toBeNull();
        });

        it('should return null for disabled group', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);
            audio.setAudioEnabled('sfx', false);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

            expect(instanceId).toBeNull();
        });

        it('should return null for unloaded buffer', () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            // Note: preload not called

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

            expect(instanceId).toBeNull();
        });

        it('should respect pool limits', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);
            audio.setGroupPoolSize('sfx', 2);

            // Play first two sounds
            const id1 = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            const id2 = audio.play3D('sound', { x: 1, y: 0, z: 0 });
            // Third should be rejected
            const id3 = audio.play3D('sound', { x: 2, y: 0, z: 0 });

            expect(id1).not.toBeNull();
            expect(id2).not.toBeNull();
            expect(id3).toBeNull();
        });

        it('should use specified volume in options', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 }, { volume: 0.5 });

            expect(instanceId).not.toBeNull();
        });

        it('should apply custom spatial config', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 }, {
                spatialConfig: {
                    maxDistance: 50,
                    rolloffFactor: 2,
                    distanceModel: 'linear'
                }
            });

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should apply orientation when provided', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 }, {
                orientation: { x: 1, y: 0, z: 0 }
            });

            expect(instanceId).not.toBeNull();
        });

        it('should emit track start event', async () => {
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            await audio.preload(['explosion']);

            const events: { key: string; channelId: string }[] = [];
            audio.onTrackStart$.subscribe(e => events.push(e));

            const instanceId = audio.play3D('explosion', { x: 10, y: 0, z: -5 });

            expect(events.length).toBe(1);
            expect(events[0].key).toBe('explosion');
            expect(events[0].channelId).toBe(instanceId);
        });

        it('should track position in instance', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const position = { x: 10, y: 5, z: -3 };
            const instanceId = audio.play3D('sound', position);

            expect(instanceId).not.toBeNull();
            const storedPosition = audio.getSoundPosition(instanceId!);
            expect(storedPosition).toEqual(position);
        });
    });

    // ==================== playContinuous3D ====================

    describe('playContinuous3D', () => {
        it('should resolve when playback starts', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');

            await expect(
                audio.playContinuous3D('ambient', { x: 5, y: 0, z: -10 }, 'amb1')
            ).resolves.toBeUndefined();
        });

        it('should throw for unknown key', async () => {
            await expect(
                audio.playContinuous3D('nonexistent', { x: 0, y: 0, z: 0 })
            ).rejects.toThrow('No tracks found');
        });

        it('should use default channel ID when not specified', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');

            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 });

            expect(audio.is3DChannel('default_3d')).toBe(true);
        });

        it('should stop existing playback on same channel', async () => {
            audio.addAudioTrack('sound1', 'ambient', '/audio/sound1.wav');
            audio.addAudioTrack('sound2', 'ambient', '/audio/sound2.wav');

            await audio.playContinuous3D('sound1', { x: 0, y: 0, z: 0 }, 'channel1');
            await audio.playContinuous3D('sound2', { x: 1, y: 0, z: 0 }, 'channel1');

            // Only sound2 should be playing now
            const position = audio.getChannelPosition('channel1');
            expect(position).toEqual({ x: 1, y: 0, z: 0 });
        });

        it('should emit track start event', async () => {
            audio.addAudioTrack('fire', 'ambient', '/audio/fire.wav');

            const events: { key: string; channelId: string }[] = [];
            audio.onTrackStart$.subscribe(e => events.push(e));

            await audio.playContinuous3D('fire', { x: 5, y: 0, z: -10 }, 'campfire');

            expect(events.length).toBe(1);
            expect(events[0].key).toBe('fire');
            expect(events[0].channelId).toBe('campfire');
        });

        it('should track position in channel', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');

            const position = { x: 15, y: 3, z: -8 };
            await audio.playContinuous3D('ambient', position, 'amb1');

            const storedPosition = audio.getChannelPosition('amb1');
            expect(storedPosition).toEqual(position);
        });

        it('should apply custom spatial config', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');

            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1', {
                spatialConfig: {
                    distanceModel: 'exponential',
                    maxDistance: 100
                }
            });

            expect(audio.is3DChannel('amb1')).toBe(true);
        });
    });

    // ==================== updateSoundPosition ====================

    describe('updateSoundPosition', () => {
        it('should update position successfully', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            const result = audio.updateSoundPosition(instanceId!, { x: 10, y: 5, z: -3 });

            expect(result).toBe(true);
            expect(audio.getSoundPosition(instanceId!)).toEqual({ x: 10, y: 5, z: -3 });
        });

        it('should return false for unknown instance', () => {
            const result = audio.updateSoundPosition('unknown_id', { x: 0, y: 0, z: 0 });

            expect(result).toBe(false);
        });

        it('should emit position update event', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const events: PositionUpdateEvent[] = [];
            audio.onPositionUpdate$.subscribe(e => events.push(e));

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            audio.updateSoundPosition(instanceId!, { x: 10, y: 5, z: -3 });

            expect(events.length).toBe(1);
            expect(events[0].instanceId).toBe(instanceId);
            expect(events[0].previousPosition).toEqual({ x: 0, y: 0, z: 0 });
            expect(events[0].newPosition).toEqual({ x: 10, y: 5, z: -3 });
        });

        it('should include key and group in position update event', async () => {
            audio.addAudioTrack('explosion', 'sfx', '/audio/explosion.wav');
            await audio.preload(['explosion']);

            const events: PositionUpdateEvent[] = [];
            audio.onPositionUpdate$.subscribe(e => events.push(e));

            const instanceId = audio.play3D('explosion', { x: 0, y: 0, z: 0 });
            audio.updateSoundPosition(instanceId!, { x: 1, y: 0, z: 0 });

            expect(events[0].key).toBe('explosion');
            expect(events[0].group).toBe('sfx');
        });
    });

    // ==================== updateChannelPosition ====================

    describe('updateChannelPosition', () => {
        it('should update position successfully', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

            const result = audio.updateChannelPosition('amb1', { x: 20, y: 10, z: -5 });

            expect(result).toBe(true);
            expect(audio.getChannelPosition('amb1')).toEqual({ x: 20, y: 10, z: -5 });
        });

        it('should return false for unknown channel', () => {
            const result = audio.updateChannelPosition('unknown', { x: 0, y: 0, z: 0 });

            expect(result).toBe(false);
        });

        it('should return false for non-3D channel', async () => {
            audio.addAudioTrack('music', 'music', '/audio/music.mp3');
            // Play without 3D (regular playContinuous)
            await audio.playContinuous('music', 'bgm');

            const result = audio.updateChannelPosition('bgm', { x: 0, y: 0, z: 0 });

            expect(result).toBe(false);
        });

        it('should emit position update event', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

            const events: PositionUpdateEvent[] = [];
            audio.onPositionUpdate$.subscribe(e => events.push(e));

            audio.updateChannelPosition('amb1', { x: 15, y: 8, z: -2 });

            expect(events.length).toBe(1);
            expect(events[0].instanceId).toBe('amb1');
            expect(events[0].previousPosition).toEqual({ x: 0, y: 0, z: 0 });
            expect(events[0].newPosition).toEqual({ x: 15, y: 8, z: -2 });
        });
    });

    // ==================== is3DSound ====================

    describe('is3DSound', () => {
        it('should return true for 3D sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should return false for non-3D sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Capture instance ID from track start event since playAudioTrack returns void
            let instanceId: string | null = null;
            audio.onTrackStart$.subscribe(e => { instanceId = e.channelId; });
            audio.playAudioTrack('sound');

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(false);
        });

        it('should return false for unknown instance', () => {
            expect(audio.is3DSound('unknown_id')).toBe(false);
        });
    });

    // ==================== is3DChannel ====================

    describe('is3DChannel', () => {
        it('should return true for 3D channel', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

            expect(audio.is3DChannel('amb1')).toBe(true);
        });

        it('should return false for non-3D channel', async () => {
            audio.addAudioTrack('music', 'music', '/audio/music.mp3');
            await audio.playContinuous('music', 'bgm');

            expect(audio.is3DChannel('bgm')).toBe(false);
        });

        it('should return false for unknown channel', () => {
            expect(audio.is3DChannel('unknown')).toBe(false);
        });
    });

    // ==================== getSoundPosition ====================

    describe('getSoundPosition', () => {
        it('should return position for 3D sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const position = { x: 5, y: 10, z: -15 };
            const instanceId = audio.play3D('sound', position);

            expect(audio.getSoundPosition(instanceId!)).toEqual(position);
        });

        it('should return null for unknown instance', () => {
            expect(audio.getSoundPosition('unknown_id')).toBeNull();
        });

        it('should return null for non-3D sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Capture instance ID from track start event since playAudioTrack returns void
            let instanceId: string | null = null;
            audio.onTrackStart$.subscribe(e => { instanceId = e.channelId; });
            audio.playAudioTrack('sound');

            expect(instanceId).not.toBeNull();
            expect(audio.getSoundPosition(instanceId!)).toBeNull();
        });

        it('should return a copy of the position', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const instanceId = audio.play3D('sound', { x: 5, y: 0, z: 0 });
            const position1 = audio.getSoundPosition(instanceId!);
            const position2 = audio.getSoundPosition(instanceId!);

            // Should be equal but not the same object
            expect(position1).toEqual(position2);
            expect(position1).not.toBe(position2);
        });
    });

    // ==================== getChannelPosition ====================

    describe('getChannelPosition', () => {
        it('should return position for 3D channel', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');

            const position = { x: 20, y: 30, z: -40 };
            await audio.playContinuous3D('ambient', position, 'amb1');

            expect(audio.getChannelPosition('amb1')).toEqual(position);
        });

        it('should return null for unknown channel', () => {
            expect(audio.getChannelPosition('unknown')).toBeNull();
        });

        it('should return null for non-3D channel', async () => {
            audio.addAudioTrack('music', 'music', '/audio/music.mp3');
            await audio.playContinuous('music', 'bgm');

            expect(audio.getChannelPosition('bgm')).toBeNull();
        });

        it('should return a copy of the position', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 10, y: 0, z: 0 }, 'amb1');

            const position1 = audio.getChannelPosition('amb1');
            const position2 = audio.getChannelPosition('amb1');

            expect(position1).toEqual(position2);
            expect(position1).not.toBe(position2);
        });
    });

    // ==================== Position Update Tracking ====================

    describe('Position Update Tracking', () => {
        it('should track multiple position updates', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const events: PositionUpdateEvent[] = [];
            audio.onPositionUpdate$.subscribe(e => events.push(e));

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            audio.updateSoundPosition(instanceId!, { x: 1, y: 0, z: 0 });
            audio.updateSoundPosition(instanceId!, { x: 2, y: 0, z: 0 });
            audio.updateSoundPosition(instanceId!, { x: 3, y: 0, z: 0 });

            expect(events.length).toBe(3);
            expect(events[0].previousPosition).toEqual({ x: 0, y: 0, z: 0 });
            expect(events[0].newPosition).toEqual({ x: 1, y: 0, z: 0 });
            expect(events[1].previousPosition).toEqual({ x: 1, y: 0, z: 0 });
            expect(events[1].newPosition).toEqual({ x: 2, y: 0, z: 0 });
            expect(events[2].previousPosition).toEqual({ x: 2, y: 0, z: 0 });
            expect(events[2].newPosition).toEqual({ x: 3, y: 0, z: 0 });
        });

        it('should track updates from multiple sounds', async () => {
            audio.addAudioTrack('sound1', 'sfx', '/audio/sound1.wav');
            audio.addAudioTrack('sound2', 'sfx', '/audio/sound2.wav');
            await audio.preload(['sound1', 'sound2']);

            const events: PositionUpdateEvent[] = [];
            audio.onPositionUpdate$.subscribe(e => events.push(e));

            const id1 = audio.play3D('sound1', { x: 0, y: 0, z: 0 });
            const id2 = audio.play3D('sound2', { x: 10, y: 0, z: 0 });

            audio.updateSoundPosition(id1!, { x: 1, y: 0, z: 0 });
            audio.updateSoundPosition(id2!, { x: 11, y: 0, z: 0 });

            expect(events.length).toBe(2);
            expect(events[0].key).toBe('sound1');
            expect(events[1].key).toBe('sound2');
        });
    });

    // ==================== Integration with Spatial Defaults ====================

    describe('Integration with Spatial Defaults', () => {
        it('should use spatial defaults when no config provided', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Set custom defaults
            audio.setSpatialDefaults({
                distanceModel: 'linear',
                maxDistance: 50,
                rolloffFactor: 2
            });

            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 });

            expect(instanceId).not.toBeNull();
            expect(audio.is3DSound(instanceId!)).toBe(true);
        });

        it('should allow overriding spatial defaults per sound', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            // Set defaults
            audio.setSpatialDefaults({
                distanceModel: 'linear',
                maxDistance: 50
            });

            // Play with override
            const instanceId = audio.play3D('sound', { x: 0, y: 0, z: 0 }, {
                spatialConfig: {
                    distanceModel: 'exponential',
                    maxDistance: 100
                }
            });

            expect(instanceId).not.toBeNull();
        });
    });

    // ==================== Cleanup ====================

    describe('Cleanup', () => {
        it('should stop 3D sounds when stopAudioGroup is called', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            const id1 = audio.play3D('sound', { x: 0, y: 0, z: 0 });
            const id2 = audio.play3D('sound', { x: 10, y: 0, z: 0 });

            expect(audio.is3DSound(id1!)).toBe(true);
            expect(audio.is3DSound(id2!)).toBe(true);

            audio.stopAudioGroup('sfx');

            // Sounds should no longer be tracked
            expect(audio.is3DSound(id1!)).toBe(false);
            expect(audio.is3DSound(id2!)).toBe(false);
        });

        it('should stop 3D channels when stopContinuous is called', async () => {
            audio.addAudioTrack('ambient', 'ambient', '/audio/ambient.wav');
            await audio.playContinuous3D('ambient', { x: 0, y: 0, z: 0 }, 'amb1');

            expect(audio.is3DChannel('amb1')).toBe(true);

            await audio.stopContinuous('amb1');

            expect(audio.is3DChannel('amb1')).toBe(false);
        });

        it('should clean up position observable on destroy', async () => {
            audio.addAudioTrack('sound', 'sfx', '/audio/sound.wav');
            await audio.preload(['sound']);

            let completed = false;
            audio.onPositionUpdate$.subscribe({
                complete: () => { completed = true; }
            });

            audio.destroy();

            expect(completed).toBe(true);
        });
    });
});
