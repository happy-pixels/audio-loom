import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { ImpulseResponseEntry } from '../types';
/**
 * Handles loading and caching of impulse response buffers for convolution reverb.
 */
export declare class ImpulseLoader {
    private readonly context;
    private readonly logger;
    private impulseResponses;
    constructor(context: ContextManager, logger: Logger);
    /**
     * Registers an impulse response for later loading.
     */
    addImpulseResponse(key: string, path: string): void;
    /**
     * Gets an impulse response entry by key.
     */
    getEntry(key: string): ImpulseResponseEntry | null;
    /**
     * Gets all registered impulse response keys.
     */
    getRegisteredKeys(): string[];
    /**
     * Checks if an impulse response is loaded and ready.
     */
    isLoaded(key: string): boolean;
    /**
     * Loads an impulse response buffer from a URL.
     */
    private loadBuffer;
    /**
     * Preloads impulse responses into memory.
     */
    preload(keys: string[]): Promise<void>;
    /**
     * Loads an impulse response on demand if not already loaded.
     */
    loadIfNeeded(key: string): Promise<AudioBuffer>;
    /**
     * Clears all impulse responses.
     */
    destroy(): void;
}
//# sourceMappingURL=impulse-loader.d.ts.map