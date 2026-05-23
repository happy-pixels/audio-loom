import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { LoadStatus } from '../types';

/**
 * Handles loading and caching of audio buffers.
 */
export class AudioLoader {
    constructor(
        private readonly context: ContextManager,
        private readonly tracks: TrackManager,
        _events: EventEmitter,
        private readonly logger: Logger
    ) {}

    /**
     * Loads an audio buffer from a URL.
     */
    async loadBuffer(path: string): Promise<AudioBuffer> {
        const ctx = this.context.ensureContext();
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    }

    /**
     * Checks if all tracks for a key are fully loaded.
     */
    isLoaded(key: string): boolean {
        const bufferEntries = this.tracks.getBufferEntries(key);
        if (!bufferEntries || bufferEntries.length === 0) {
            return false;
        }
        return bufferEntries.every(entry => entry.loadState === 'loaded' && entry.buffer !== null);
    }

    /**
     * Gets detailed loading status for a key.
     */
    getLoadStatus(key: string): LoadStatus {
        const bufferEntries = this.tracks.getBufferEntries(key);
        if (!bufferEntries || bufferEntries.length === 0) {
            return { total: 0, loaded: 0, ready: false };
        }
        const total = bufferEntries.length;
        const loaded = bufferEntries.filter(entry => entry.loadState === 'loaded').length;
        return { total, loaded, ready: loaded === total };
    }

    /**
     * Preloads audio tracks into memory.
     */
    async preload(keys: string[]): Promise<void> {
        const loadPromises: Promise<void>[] = [];

        for (const key of keys) {
            const bufferEntries = this.tracks.getBufferEntries(key);
            if (!bufferEntries) {
                this.logger.warn(`No tracks found for key "${key}" during preload`);
                continue;
            }

            for (const entry of bufferEntries) {
                if (entry.loadState === 'loaded' && entry.buffer !== null) {
                    continue;
                }

                this.tracks.markBufferLoading(key, entry.path);

                const loadPromise = this.loadBuffer(entry.path)
                    .then(buffer => {
                        this.tracks.updateBuffer(key, entry.path, buffer);
                        this.logger.log(`Preloaded audio buffer: ${entry.path}`);
                    })
                    .catch(error => {
                        this.tracks.markBufferError(key, entry.path);
                        this.logger.error(`Failed to preload audio buffer: ${entry.path}`, error);
                        throw error;
                    });

                loadPromises.push(loadPromise);
            }
        }

        if (loadPromises.length === 0) {
            this.logger.warn('No tracks to preload');
            return;
        }

        await Promise.all(loadPromises);
        this.logger.log(`Preloaded ${loadPromises.length} audio buffers`);
    }

    /**
     * Loads a single track's buffer on demand if not already loaded.
     */
    async loadTrackIfNeeded(key: string, path: string): Promise<AudioBuffer | null> {
        const entry = this.tracks.findBufferEntry(key, path);
        if (!entry) {
            return null;
        }

        if (entry.loadState === 'loaded' && entry.buffer) {
            return entry.buffer;
        }

        this.tracks.markBufferLoading(key, path);

        try {
            const buffer = await this.loadBuffer(path);
            this.tracks.updateBuffer(key, path, buffer);
            this.logger.log(`Loaded audio buffer on demand: ${path}`);
            return buffer;
        } catch (error) {
            this.tracks.markBufferError(key, path);
            this.logger.error(`Failed to load audio buffer: ${path}`, error);
            throw error;
        }
    }
}
