import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { TrackManager } from '../core/track-manager';
import { EventEmitter } from '../events/event-emitter';
import { LoadStatus } from '../types';
/**
 * Handles loading and caching of audio buffers.
 */
export declare class AudioLoader {
    private readonly context;
    private readonly tracks;
    private readonly logger;
    constructor(context: ContextManager, tracks: TrackManager, _events: EventEmitter, logger: Logger);
    /**
     * Loads an audio buffer from a URL.
     */
    loadBuffer(path: string): Promise<AudioBuffer>;
    /**
     * Checks if all tracks for a key are fully loaded.
     */
    isLoaded(key: string): boolean;
    /**
     * Gets detailed loading status for a key.
     */
    getLoadStatus(key: string): LoadStatus;
    /**
     * Preloads audio tracks into memory.
     */
    preload(keys: string[]): Promise<void>;
    /**
     * Loads a single track's buffer on demand if not already loaded.
     */
    loadTrackIfNeeded(key: string, path: string): Promise<AudioBuffer | null>;
}
//# sourceMappingURL=audio-loader.d.ts.map