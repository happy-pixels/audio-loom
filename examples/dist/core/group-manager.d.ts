import { Logger } from '../logger';
import { ContextManager } from './context-manager';
import { AudioSettings, ActiveSoundInstance, PoolConfig, PoolStats, PannedSoundInstance } from '../types';
/**
 * Manages audio groups, their settings, gain nodes, and sound pools.
 */
export declare class GroupManager {
    private readonly context;
    private readonly logger;
    private settings;
    private groupGains;
    private poolConfigs;
    private activeSounds;
    private pannedSounds;
    private groupBypassEffects;
    private groupDirectGains;
    constructor(context: ContextManager, logger: Logger);
    /**
     * Ensures settings exist for a group, creating defaults if needed.
     */
    ensureSettings(group: string): AudioSettings;
    /**
     * Gets settings for a group, or null if not configured.
     */
    getSettings(group: string): AudioSettings | null;
    /**
     * Gets or creates a gain node for a group.
     */
    ensureGroupGain(group: string, masterGain: GainNode): GainNode;
    /**
     * Gets the gain node for a group, or null if not created.
     */
    getGroupGain(group: string): GainNode | null;
    /**
     * Enables or disables audio playback for a group.
     */
    setEnabled(group: string, enabled: boolean): void;
    /**
     * Checks if a group is enabled.
     */
    isEnabled(group: string): boolean;
    /**
     * Sets the volume for a group.
     */
    setVolume(group: string, volume: number): void;
    /**
     * Gets the volume for a group.
     */
    getVolume(group: string): number;
    /**
     * Sets the pool size for a group.
     */
    setPoolSize(group: string, maxConcurrent: number): void;
    /**
     * Gets the pool config for a group.
     */
    getPoolConfig(group: string): PoolConfig;
    /**
     * Gets statistics for a group's pool.
     */
    getPoolStats(group?: string): PoolStats | PoolStats[];
    private getGroupPoolStats;
    /**
     * Checks if the pool limit is reached for a group.
     */
    isPoolLimitReached(group: string): boolean;
    /**
     * Gets the active sounds array for a group, creating if needed.
     */
    getActiveSounds(group: string): ActiveSoundInstance[];
    /**
     * Gets the panned sounds array for a group, creating if needed.
     */
    getPannedSounds(group: string): PannedSoundInstance[];
    /**
     * Adds an active sound instance to a group.
     */
    addActiveSound(group: string, instance: ActiveSoundInstance): void;
    /**
     * Removes an active sound instance from a group.
     */
    removeActiveSound(group: string, instanceId: string): void;
    /**
     * Finds an active sound instance by ID across all groups.
     */
    findActiveSound(instanceId: string): {
        instance: ActiveSoundInstance;
        group: string;
    } | null;
    /**
     * Adds a panned sound instance to a group.
     */
    addPannedSound(group: string, instance: PannedSoundInstance): void;
    /**
     * Removes a panned sound instance from a group.
     */
    removePannedSound(group: string, instanceId: string): void;
    /**
     * Finds a panned sound instance by ID across all groups.
     */
    findPannedSound(instanceId: string): {
        instance: PannedSoundInstance;
        group: string;
    } | null;
    /**
     * Stops all sounds in a specific group.
     */
    stopGroup(group: string): void;
    /**
     * Sets whether a group should bypass the effects bus.
     */
    setBypassEffects(group: string, bypass: boolean, masterGain: GainNode | null, outputGain: GainNode | null): void;
    /**
     * Checks if a group is bypassing effects.
     */
    isBypassingEffects(group: string): boolean;
    /**
     * Gets all groups that are bypassing effects.
     */
    getBypassedGroups(): string[];
    /**
     * Gets all group names.
     */
    getAllGroups(): string[];
    /**
     * Destroys all resources.
     */
    destroy(): void;
}
//# sourceMappingURL=group-manager.d.ts.map