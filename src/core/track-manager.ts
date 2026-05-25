import { Logger } from '../logger';
import { GroupManager } from './group-manager';
import { AudioTrack, AudioBufferEntry } from '../types';

/**
 * Manages audio track registration and random selection.
 */
export class TrackManager {
    private tracks: { [key: string]: AudioTrack[] } = {};
    private trackSelector: { [key: string]: AudioTrack[] } = {};
    private audioBuffers: { [key: string]: AudioBufferEntry[] } = {};

    constructor(
        private readonly groups: GroupManager,
        private readonly logger: Logger
    ) {}

    /**
     * Registers an audio track.
     * Multiple tracks can be registered under the same key for variation.
     */
    addTrack(key: string, group: string, path: string): void {
        try {
            this.groups.ensureSettings(group);
            this.tracks[key] = this.tracks[key] || [];

            const track: AudioTrack = { key, group, path };
            this.tracks[key].push(track);

            // Initialize audio buffer entry
            this.audioBuffers[key] = this.audioBuffers[key] || [];
            this.audioBuffers[key].push({
                key,
                group,
                path,
                buffer: null,
                loadState: 'pending'
            });

            this.logger.log(`Added audio track "${key}" in group "${group}": ${path}`);
        } catch (error) {
            this.logger.error(`Failed to add audio track "${key}" from path "${path}"`, error);
        }
    }

    /**
     * Gets all tracks registered under a key.
     */
    getTracks(key: string): AudioTrack[] | null {
        return this.tracks[key] || null;
    }

    /**
     * Checks if any tracks are registered under a key.
     */
    hasTracks(key: string): boolean {
        const tracks = this.tracks[key];
        return tracks !== undefined && tracks.length > 0;
    }

    /**
     * Selects a random track from the registered tracks for a key.
     * Uses a shuffle-bag algorithm to avoid repetition.
     */
    selectRandomTrack(key: string): AudioTrack | null {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            return null;
        }

        // Refill the selector if empty
        if (!this.trackSelector[key] || this.trackSelector[key].length === 0) {
            this.trackSelector[key] = [...this.tracks[key]];
        }

        // Select and remove a random track
        const index = Math.floor(Math.random() * this.trackSelector[key].length);
        return this.trackSelector[key].splice(index, 1)[0] || null;
    }

    /**
     * Resets the track selector for a key.
     */
    resetSelector(key: string): void {
        if (this.tracks[key]) {
            this.trackSelector[key] = [...this.tracks[key]];
        }
    }

    /**
     * Gets all buffer entries for a key.
     */
    getBufferEntries(key: string): AudioBufferEntry[] | null {
        return this.audioBuffers[key] || null;
    }

    /**
     * Finds a buffer entry by key and path.
     */
    findBufferEntry(key: string, path: string): AudioBufferEntry | null {
        const entries = this.audioBuffers[key];
        if (!entries) return null;
        return entries.find(e => e.path === path) || null;
    }

    /**
     * Gets all registered keys.
     */
    getAllKeys(): string[] {
        return Object.keys(this.tracks);
    }

    /**
     * Updates a buffer entry with loaded data.
     */
    updateBuffer(key: string, path: string, buffer: AudioBuffer): void {
        const entry = this.findBufferEntry(key, path);
        if (entry) {
            entry.buffer = buffer;
            entry.loadState = 'loaded';
        }

        // Also update the track's buffer
        const tracks = this.tracks[key];
        if (tracks) {
            const track = tracks.find(t => t.path === path);
            if (track) {
                track.buffer = buffer;
            }
        }
    }

    /**
     * Marks a buffer entry as having an error.
     */
    markBufferError(key: string, path: string): void {
        const entry = this.findBufferEntry(key, path);
        if (entry) {
            entry.loadState = 'error';
        }
    }

    /**
     * Marks a buffer entry as loading.
     */
    markBufferLoading(key: string, path: string): void {
        const entry = this.findBufferEntry(key, path);
        if (entry) {
            entry.loadState = 'loading';
        }
    }

    /**
     * Clears all tracks and buffers.
     */
    destroy(): void {
        this.tracks = {};
        this.trackSelector = {};
        this.audioBuffers = {};
    }
}
