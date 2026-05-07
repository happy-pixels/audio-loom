import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/audio-manager';
import { mockFetch } from './setup';

describe('AudioManager', () => {
    let audioManager: AudioManager;

    beforeEach(() => {
        audioManager = new AudioManager();
        vi.clearAllMocks();
    });

    afterEach(() => {
        audioManager.destroy();
    });

    describe('Track Management', () => {
        it('should add an audio track', () => {
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');

            const status = audioManager.getLoadStatus('explosion');
            expect(status.total).toBe(1);
            expect(status.loaded).toBe(0);
            expect(status.ready).toBe(false);
        });

        it('should add multiple tracks with the same key', () => {
            audioManager.addAudioTrack('footstep', 'sfx', '/sounds/footstep1.wav');
            audioManager.addAudioTrack('footstep', 'sfx', '/sounds/footstep2.wav');
            audioManager.addAudioTrack('footstep', 'sfx', '/sounds/footstep3.wav');

            const status = audioManager.getLoadStatus('footstep');
            expect(status.total).toBe(3);
        });

        it('should return empty status for non-existent key', () => {
            const status = audioManager.getLoadStatus('nonexistent');
            expect(status.total).toBe(0);
            expect(status.loaded).toBe(0);
            expect(status.ready).toBe(false);
        });

        it('should report isLoaded as false before preloading', () => {
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
            expect(audioManager.isLoaded('explosion')).toBe(false);
        });

        it('should preload audio tracks', async () => {
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');

            await audioManager.preload(['explosion']);

            expect(mockFetch).toHaveBeenCalledWith('/sounds/explosion.wav');
            expect(audioManager.isLoaded('explosion')).toBe(true);
        });

        it('should handle preload of non-existent key gracefully', async () => {
            await expect(audioManager.preload(['nonexistent'])).resolves.not.toThrow();
        });
    });

    describe('AudioContext Management', () => {
        it('should initialize audio context', async () => {
            await audioManager.initAudio();
            expect(audioManager.isAudioReady()).toBe(true);
        });

        it('should report not ready before initialization', () => {
            expect(audioManager.isAudioReady()).toBe(false);
        });

        it('should resume audio context', async () => {
            await audioManager.resumeAudioContext();
            expect(audioManager.isAudioReady()).toBe(true);
        });

        it('should suspend audio context', async () => {
            await audioManager.initAudio();
            await audioManager.suspendAudioContext();
            expect(audioManager.isAudioReady()).toBe(false);
        });
    });

    describe('Master Volume', () => {
        it('should set master volume', () => {
            audioManager.setMasterVolume(0.5);
            expect(audioManager.getMasterVolume()).toBe(0.5);
        });

        it('should clamp master volume to 0-1 range', () => {
            audioManager.setMasterVolume(-0.5);
            expect(audioManager.getMasterVolume()).toBe(0);

            audioManager.setMasterVolume(1.5);
            expect(audioManager.getMasterVolume()).toBe(1);
        });

        it('should default to volume 1', () => {
            expect(audioManager.getMasterVolume()).toBe(1);
        });
    });

    describe('Group Settings', () => {
        it('should enable/disable audio groups', () => {
            audioManager.setAudioEnabled('sfx', false);
            // Group is disabled, playback should be skipped
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');

            // No error should be thrown
            audioManager.playAudioTrack('explosion');
        });

        it('should set group volume', () => {
            audioManager.setAudioVolume('music', 0.7);
            // Volume is set internally, verified through playback behavior
        });
    });

    describe('Pool Configuration', () => {
        it('should set group pool size', () => {
            audioManager.setGroupPoolSize('sfx', 4);

            const stats = audioManager.getPoolStats('sfx') as { maxConcurrent: number };
            expect(stats.maxConcurrent).toBe(4);
        });

        it('should get pool stats for a specific group', () => {
            audioManager.setGroupPoolSize('sfx', 8);

            const stats = audioManager.getPoolStats('sfx') as {
                group: string;
                maxConcurrent: number;
                totalPooled: number;
                inUse: number;
                available: number;
            };

            expect(stats.group).toBe('sfx');
            expect(stats.maxConcurrent).toBe(8);
            expect(stats.inUse).toBe(0);
        });

        it('should get pool stats for all groups', () => {
            audioManager.setGroupPoolSize('sfx', 8);
            audioManager.setGroupPoolSize('ui', 4);

            const stats = audioManager.getPoolStats() as Array<{ group: string }>;
            expect(Array.isArray(stats)).toBe(true);
            expect(stats.length).toBe(2);
        });

        it('should default to max concurrent of 8', () => {
            const stats = audioManager.getPoolStats('newgroup') as { maxConcurrent: number };
            expect(stats.maxConcurrent).toBe(8);
        });
    });

    describe('One-Shot Playback', () => {
        it('should play audio track when preloaded', async () => {
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
            await audioManager.preload(['explosion']);

            // Should not throw
            audioManager.playAudioTrack('explosion');
        });

        it('should skip playback when group is disabled', async () => {
            audioManager.addAudioTrack('explosion', 'sfx', '/sounds/explosion.wav');
            await audioManager.preload(['explosion']);
            audioManager.setAudioEnabled('sfx', false);

            // Should not throw, just skip
            audioManager.playAudioTrack('explosion');
        });

        it('should warn when playing non-existent track', () => {
            audioManager.loggingEnabled = true;
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            audioManager.playAudioTrack('nonexistent');

            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });

    describe('Continuous Playback', () => {
        beforeEach(() => {
            audioManager.addAudioTrack('bgmusic', 'music', '/sounds/music.mp3');
        });

        it('should start continuous playback', () => {
            audioManager.playContinuous('bgmusic');

            // Wait for async loadedmetadata event
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const info = audioManager.getChannelInfo();
                    expect(info).not.toBeNull();
                    expect(info?.key).toBe('bgmusic');
                    resolve();
                }, 10);
            });
        });

        it('should stop continuous playback', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.stopContinuous();
                    const info = audioManager.getChannelInfo();
                    expect(info).toBeNull();
                    resolve();
                }, 10);
            });
        });

        it('should pause and resume continuous playback', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.pauseContinuous();
                    let info = audioManager.getChannelInfo();
                    expect(info?.isPaused).toBe(true);
                    expect(info?.isPlaying).toBe(false);

                    audioManager.resumeContinuous();
                    info = audioManager.getChannelInfo();
                    expect(info?.isPaused).toBe(false);
                    expect(info?.isPlaying).toBe(true);
                    resolve();
                }, 10);
            });
        });

        it('should support multiple channels', () => {
            audioManager.addAudioTrack('ambient', 'ambient', '/sounds/ambient.mp3');

            audioManager.playContinuous('bgmusic', 'music');
            audioManager.playContinuous('ambient', 'ambient');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const channels = audioManager.getActiveChannels();
                    expect(Object.keys(channels)).toContain('music');
                    expect(Object.keys(channels)).toContain('ambient');
                    resolve();
                }, 10);
            });
        });

        it('should stop all continuous playback', () => {
            audioManager.addAudioTrack('ambient', 'ambient', '/sounds/ambient.mp3');

            audioManager.playContinuous('bgmusic', 'music');
            audioManager.playContinuous('ambient', 'ambient');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.stopAllContinuous();
                    const channels = audioManager.getActiveChannels();
                    expect(Object.keys(channels).length).toBe(0);
                    resolve();
                }, 10);
            });
        });
    });

    describe('Playback Controls', () => {
        beforeEach(() => {
            audioManager.addAudioTrack('bgmusic', 'music', '/sounds/music.mp3');
        });

        it('should set playback rate', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.setPlaybackRate(1.5);
                    const rate = audioManager.getPlaybackRate();
                    expect(rate).toBe(1.5);
                    resolve();
                }, 10);
            });
        });

        it('should clamp playback rate to valid range', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.setPlaybackRate(10);
                    expect(audioManager.getPlaybackRate()).toBe(4.0);

                    audioManager.setPlaybackRate(0.1);
                    expect(audioManager.getPlaybackRate()).toBe(0.25);
                    resolve();
                }, 10);
            });
        });

        it('should seek within track', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.seek(30);
                    const time = audioManager.getCurrentTime();
                    expect(time).toBe(30);
                    resolve();
                }, 10);
            });
        });

        it('should get playback info', () => {
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const info = audioManager.getPlaybackInfo();
                    expect(info).not.toBeNull();
                    expect(info?.key).toBe('bgmusic');
                    expect(typeof info?.currentTime).toBe('number');
                    expect(typeof info?.duration).toBe('number');
                    resolve();
                }, 10);
            });
        });
    });

    describe('Event System', () => {
        it('should emit trackStart event', () => {
            audioManager.addAudioTrack('bgmusic', 'music', '/sounds/music.mp3');

            return new Promise<void>((resolve) => {
                const subscription = audioManager.onTrackStart$.subscribe((event) => {
                    expect(event.key).toBe('bgmusic');
                    expect(event.group).toBe('music');
                    subscription.unsubscribe();
                    resolve();
                });

                audioManager.playContinuous('bgmusic');
            });
        });

        it('should emit loadComplete event', () => {
            audioManager.addAudioTrack('bgmusic', 'music', '/sounds/music.mp3');

            return new Promise<void>((resolve) => {
                const subscription = audioManager.onLoadComplete$.subscribe((event) => {
                    expect(event.key).toBe('bgmusic');
                    expect(typeof event.duration).toBe('number');
                    subscription.unsubscribe();
                    resolve();
                });

                audioManager.playContinuous('bgmusic');
            });
        });
    });

    describe('Logging', () => {
        it('should enable/disable logging', () => {
            expect(audioManager.loggingEnabled).toBe(false);

            audioManager.loggingEnabled = true;
            expect(audioManager.loggingEnabled).toBe(true);

            audioManager.loggingEnabled = false;
            expect(audioManager.loggingEnabled).toBe(false);
        });
    });

    describe('Cleanup', () => {
        it('should destroy all resources', () => {
            audioManager.addAudioTrack('bgmusic', 'music', '/sounds/music.mp3');
            audioManager.playContinuous('bgmusic');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    audioManager.destroy();

                    const channels = audioManager.getActiveChannels();
                    expect(Object.keys(channels).length).toBe(0);
                    expect(audioManager.isAudioReady()).toBe(false);
                    resolve();
                }, 10);
            });
        });
    });
});
