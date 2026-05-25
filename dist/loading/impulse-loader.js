/**
 * Handles loading and caching of impulse response buffers for convolution reverb.
 */
export class ImpulseLoader {
    context;
    logger;
    impulseResponses = {};
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
    }
    /**
     * Registers an impulse response for later loading.
     */
    addImpulseResponse(key, path) {
        this.impulseResponses[key] = {
            key,
            path,
            buffer: null,
            loadState: 'pending'
        };
        this.logger.log(`Added impulse response "${key}": ${path}`);
    }
    /**
     * Gets an impulse response entry by key.
     */
    getEntry(key) {
        return this.impulseResponses[key] || null;
    }
    /**
     * Gets all registered impulse response keys.
     */
    getRegisteredKeys() {
        return Object.keys(this.impulseResponses);
    }
    /**
     * Checks if an impulse response is loaded and ready.
     */
    isLoaded(key) {
        const entry = this.impulseResponses[key];
        return entry !== undefined && entry.loadState === 'loaded' && entry.buffer !== null;
    }
    /**
     * Loads an impulse response buffer from a URL.
     */
    async loadBuffer(path) {
        const ctx = this.context.ensureContext();
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch impulse response: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    }
    /**
     * Preloads impulse responses into memory.
     */
    async preload(keys) {
        const loadPromises = [];
        for (const key of keys) {
            const entry = this.impulseResponses[key];
            if (!entry) {
                this.logger.warn(`No impulse response found for key "${key}" during preload`);
                continue;
            }
            if (entry.loadState === 'loaded' && entry.buffer !== null) {
                continue;
            }
            entry.loadState = 'loading';
            const loadPromise = this.loadBuffer(entry.path)
                .then(buffer => {
                entry.buffer = buffer;
                entry.loadState = 'loaded';
                this.logger.log(`Preloaded impulse response: ${entry.path}`);
            })
                .catch(error => {
                entry.loadState = 'error';
                this.logger.error(`Failed to preload impulse response: ${entry.path}`, error);
                throw error;
            });
            loadPromises.push(loadPromise);
        }
        if (loadPromises.length === 0) {
            this.logger.warn('No impulse responses to preload');
            return;
        }
        await Promise.all(loadPromises);
        this.logger.log(`Preloaded ${loadPromises.length} impulse responses`);
    }
    /**
     * Loads an impulse response on demand if not already loaded.
     */
    async loadIfNeeded(key) {
        const entry = this.impulseResponses[key];
        if (!entry) {
            throw new Error(`Impulse response "${key}" not registered. Call addImpulseResponse first.`);
        }
        if (entry.loadState === 'loaded' && entry.buffer) {
            return entry.buffer;
        }
        entry.loadState = 'loading';
        try {
            entry.buffer = await this.loadBuffer(entry.path);
            entry.loadState = 'loaded';
            this.logger.log(`Loaded impulse response on demand: ${entry.path}`);
            return entry.buffer;
        }
        catch (error) {
            entry.loadState = 'error';
            this.logger.error(`Failed to load impulse response: ${entry.path}`, error);
            throw error;
        }
    }
    /**
     * Clears all impulse responses.
     */
    destroy() {
        this.impulseResponses = {};
    }
}
//# sourceMappingURL=impulse-loader.js.map