import { DEFAULT_AUDIO_SETTINGS, DEFAULT_POOL_CONFIG } from '../types.js';
/**
 * Manages audio groups, their settings, gain nodes, and sound pools.
 */
export class GroupManager {
    context;
    logger;
    settings = {};
    groupGains = {};
    poolConfigs = {};
    activeSounds = {};
    pannedSounds = {};
    // For effects bypass routing
    groupBypassEffects = {};
    groupDirectGains = {};
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }
    /**
     * Ensures settings exist for a group, creating defaults if needed.
     */
    ensureSettings(group) {
        if (!this.settings[group]) {
            this.settings[group] = { ...DEFAULT_AUDIO_SETTINGS };
        }
        return this.settings[group];
    }
    /**
     * Gets settings for a group, or null if not configured.
     */
    getSettings(group) {
        return this.settings[group] || null;
    }
    /**
     * Gets or creates a gain node for a group.
     */
    ensureGroupGain(group, masterGain) {
        if (!this.groupGains[group]) {
            const ctx = this.context.ensureContext();
            const gainNode = ctx.createGain();
            const groupSettings = this.settings[group] || DEFAULT_AUDIO_SETTINGS;
            gainNode.gain.value = groupSettings.enabled ? groupSettings.volume : 0;
            gainNode.connect(masterGain);
            this.groupGains[group] = gainNode;
            this.logger.log(`Created group gain node for "${group}"`);
        }
        return this.groupGains[group];
    }
    /**
     * Gets the gain node for a group, or null if not created.
     */
    getGroupGain(group) {
        return this.groupGains[group] || null;
    }
    /**
     * Enables or disables audio playback for a group.
     */
    setEnabled(group, enabled) {
        this.settings[group] = this.ensureSettings(group);
        this.settings[group].enabled = enabled;
        const groupGain = this.groupGains[group];
        if (groupGain) {
            const ctx = this.context.getContext();
            if (ctx) {
                const currentTime = ctx.currentTime;
                groupGain.gain.cancelScheduledValues(currentTime);
                groupGain.gain.setValueAtTime(enabled ? this.settings[group].volume : 0, currentTime);
            }
        }
    }
    /**
     * Checks if a group is enabled.
     */
    isEnabled(group) {
        const settings = this.settings[group] || DEFAULT_AUDIO_SETTINGS;
        return settings.enabled;
    }
    /**
     * Sets the volume for a group.
     */
    setVolume(group, volume) {
        this.settings[group] = this.ensureSettings(group);
        this.settings[group].volume = Math.max(0, Math.min(1, volume));
        const groupGain = this.groupGains[group];
        if (groupGain && this.settings[group].enabled) {
            const ctx = this.context.getContext();
            if (ctx) {
                groupGain.gain.cancelScheduledValues(ctx.currentTime);
                groupGain.gain.setValueAtTime(this.settings[group].volume, ctx.currentTime);
            }
        }
    }
    /**
     * Gets the volume for a group.
     */
    getVolume(group) {
        const settings = this.settings[group] || DEFAULT_AUDIO_SETTINGS;
        return settings.volume;
    }
    /**
     * Sets the pool size for a group.
     */
    setPoolSize(group, maxConcurrent) {
        this.poolConfigs[group] = { maxConcurrent: Math.max(1, maxConcurrent) };
        this.logger.log(`Set pool size for group "${group}" to ${maxConcurrent}`);
    }
    /**
     * Gets the pool config for a group.
     */
    getPoolConfig(group) {
        return this.poolConfigs[group] || DEFAULT_POOL_CONFIG;
    }
    /**
     * Gets statistics for a group's pool.
     */
    getPoolStats(group) {
        if (group) {
            return this.getGroupPoolStats(group);
        }
        const allGroups = new Set([
            ...Object.keys(this.activeSounds),
            ...Object.keys(this.poolConfigs)
        ]);
        return Array.from(allGroups).map(g => this.getGroupPoolStats(g));
    }
    getGroupPoolStats(group) {
        const active = this.activeSounds[group] || [];
        const panned = this.pannedSounds[group] || [];
        const config = this.poolConfigs[group] || DEFAULT_POOL_CONFIG;
        const totalInUse = active.length + panned.length;
        return {
            group,
            maxConcurrent: config.maxConcurrent,
            totalPooled: totalInUse,
            inUse: totalInUse,
            available: Math.max(0, config.maxConcurrent - totalInUse)
        };
    }
    /**
     * Checks if the pool limit is reached for a group.
     */
    isPoolLimitReached(group) {
        const config = this.getPoolConfig(group);
        const activeCount = (this.activeSounds[group] || []).length;
        const pannedCount = (this.pannedSounds[group] || []).length;
        return (activeCount + pannedCount) >= config.maxConcurrent;
    }
    /**
     * Gets the active sounds array for a group, creating if needed.
     */
    getActiveSounds(group) {
        if (!this.activeSounds[group]) {
            this.activeSounds[group] = [];
        }
        return this.activeSounds[group];
    }
    /**
     * Gets the panned sounds array for a group, creating if needed.
     */
    getPannedSounds(group) {
        if (!this.pannedSounds[group]) {
            this.pannedSounds[group] = [];
        }
        return this.pannedSounds[group];
    }
    /**
     * Adds an active sound instance to a group.
     */
    addActiveSound(group, instance) {
        this.getActiveSounds(group).push(instance);
    }
    /**
     * Removes an active sound instance from a group.
     */
    removeActiveSound(group, instanceId) {
        const sounds = this.activeSounds[group];
        if (sounds) {
            const index = sounds.findIndex(s => s.id === instanceId);
            if (index !== -1) {
                sounds.splice(index, 1);
            }
        }
    }
    /**
     * Finds an active sound instance by ID across all groups.
     */
    findActiveSound(instanceId) {
        for (const group of Object.keys(this.activeSounds)) {
            const instance = this.activeSounds[group]?.find(s => s.id === instanceId);
            if (instance) {
                return { instance, group };
            }
        }
        return null;
    }
    /**
     * Adds a panned sound instance to a group.
     */
    addPannedSound(group, instance) {
        this.getPannedSounds(group).push(instance);
    }
    /**
     * Removes a panned sound instance from a group.
     */
    removePannedSound(group, instanceId) {
        const sounds = this.pannedSounds[group];
        if (sounds) {
            const index = sounds.findIndex(s => s.id === instanceId);
            if (index !== -1) {
                sounds.splice(index, 1);
            }
        }
    }
    /**
     * Finds a panned sound instance by ID across all groups.
     */
    findPannedSound(instanceId) {
        for (const group of Object.keys(this.pannedSounds)) {
            const instance = this.pannedSounds[group]?.find(s => s.id === instanceId);
            if (instance) {
                return { instance, group };
            }
        }
        return null;
    }
    /**
     * Stops all sounds in a specific group.
     */
    stopGroup(group) {
        const instances = this.activeSounds[group];
        if (instances && instances.length > 0) {
            for (const instance of instances) {
                try {
                    instance.sourceNode.stop();
                    instance.sourceNode.disconnect();
                    instance.gainNode.disconnect();
                    if (instance.pannerNode) {
                        instance.pannerNode.disconnect();
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to stop sound "${instance.id}" in group "${group}"`, error);
                }
            }
            this.activeSounds[group] = [];
        }
        // Also stop panned sounds
        const pannedInstances = this.pannedSounds[group];
        if (pannedInstances && pannedInstances.length > 0) {
            for (const instance of pannedInstances) {
                try {
                    instance.sourceNode.stop();
                    instance.sourceNode.disconnect();
                    instance.gainNode.disconnect();
                    instance.pannerNode.disconnect();
                }
                catch (error) {
                    this.logger.error(`Failed to stop panned sound "${instance.id}" in group "${group}"`, error);
                }
            }
            this.pannedSounds[group] = [];
        }
    }
    /**
     * Sets whether a group should bypass the effects bus.
     */
    setBypassEffects(group, bypass, masterGain, outputGain) {
        const wasEnabled = this.groupBypassEffects[group] || false;
        this.groupBypassEffects[group] = bypass;
        if (wasEnabled === bypass) {
            return;
        }
        const groupGain = this.groupGains[group];
        if (!groupGain || !masterGain) {
            return;
        }
        const ctx = this.context.ensureContext();
        if (bypass) {
            // Create direct gain node if needed
            if (!this.groupDirectGains[group]) {
                const directGain = ctx.createGain();
                directGain.gain.value = 1.0;
                directGain.connect(outputGain || ctx.destination);
                this.groupDirectGains[group] = directGain;
            }
            // Disconnect from master gain and connect to direct output
            try {
                groupGain.disconnect(masterGain);
            }
            catch {
                // May not be connected
            }
            groupGain.connect(this.groupDirectGains[group]);
            this.logger.log(`Group "${group}" now bypasses effects`);
        }
        else {
            // Disconnect from direct output and reconnect to master gain
            const directGain = this.groupDirectGains[group];
            if (directGain) {
                try {
                    groupGain.disconnect(directGain);
                }
                catch {
                    // May not be connected
                }
            }
            groupGain.connect(masterGain);
            this.logger.log(`Group "${group}" now uses effects`);
        }
    }
    /**
     * Checks if a group is bypassing effects.
     */
    isBypassingEffects(group) {
        return this.groupBypassEffects[group] || false;
    }
    /**
     * Gets all groups that are bypassing effects.
     */
    getBypassedGroups() {
        return Object.entries(this.groupBypassEffects)
            .filter(([_, bypass]) => bypass)
            .map(([group]) => group);
    }
    /**
     * Gets all group names.
     */
    getAllGroups() {
        return Object.keys(this.groupGains);
    }
    /**
     * Destroys all resources.
     */
    destroy() {
        // Stop all active sounds
        for (const group of Object.keys(this.activeSounds)) {
            this.stopGroup(group);
        }
        // Disconnect group direct gains
        for (const group of Object.keys(this.groupDirectGains)) {
            try {
                this.groupDirectGains[group].disconnect();
            }
            catch (error) {
                this.logger.error(`Failed to disconnect direct gain for "${group}"`, error);
            }
        }
        this.groupDirectGains = {};
        this.groupBypassEffects = {};
        // Disconnect group gains
        for (const group of Object.keys(this.groupGains)) {
            try {
                this.groupGains[group].disconnect();
            }
            catch (error) {
                this.logger.error(`Failed to disconnect group gain for "${group}"`, error);
            }
        }
        this.groupGains = {};
        this.settings = {};
        this.poolConfigs = {};
        this.activeSounds = {};
        this.pannedSounds = {};
    }
}
//# sourceMappingURL=group-manager.js.map