import { Logger } from '../logger';
import { GroupManager } from './group-manager';
import { AudioTrack, AudioBufferEntry } from '../types';
/**
 * Manages audio track registration and random selection.
 */
export declare class TrackManager {
    private readonly groups;
    private readonly logger;
    private tracks;
    private trackSelector;
    private audioBuffers;
    constructor(groups: GroupManager, logger: Logger);
    /**
     * Registers an audio track.
     * Multiple tracks can be registered under the same key for variation.
     */
    addTrack(key: string, group: string, path: string): void;
    /**
     * Gets all tracks registered under a key.
     */
    getTracks(key: string): AudioTrack[] | null;
    /**
     * Checks if any tracks are registered under a key.
     */
    hasTracks(key: string): boolean;
    /**
     * Selects a random track from the registered tracks for a key.
     * Uses a shuffle-bag algorithm to avoid repetition.
     */
    selectRandomTrack(key: string): AudioTrack | null;
    /**
     * Resets the track selector for a key.
     */
    resetSelector(key: string): void;
    /**
     * Gets all buffer entries for a key.
     */
    getBufferEntries(key: string): AudioBufferEntry[] | null;
    /**
     * Finds a buffer entry by key and path.
     */
    findBufferEntry(key: string, path: string): AudioBufferEntry | null;
    /**
     * Gets all registered keys.
     */
    getAllKeys(): string[];
    /**
     * Updates a buffer entry with loaded data.
     */
    updateBuffer(key: string, path: string, buffer: AudioBuffer): void;
    /**
     * Marks a buffer entry as having an error.
     */
    markBufferError(key: string, path: string): void;
    /**
     * Marks a buffer entry as loading.
     */
    markBufferLoading(key: string, path: string): void;
    /**
     * Clears all tracks and buffers.
     */
    destroy(): void;
}
//# sourceMappingURL=track-manager.d.ts.map