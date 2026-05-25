import { Logger } from '../logger';
/**
 * Manages the Web Audio API AudioContext lifecycle.
 * Handles context creation, master gain, and suspend/resume.
 */
export declare class ContextManager {
    private readonly logger;
    private audioContext;
    private masterGain;
    private masterVolume;
    constructor(logger: Logger);
    /**
     * Gets or creates the AudioContext.
     * Creates the master gain node on first call.
     */
    ensureContext(): AudioContext;
    /**
     * Gets the current AudioContext, or null if not created.
     */
    getContext(): AudioContext | null;
    /**
     * Gets the master gain node, or null if context not created.
     */
    getMasterGain(): GainNode | null;
    /**
     * Gets the current master volume level.
     */
    getMasterVolume(): number;
    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume: number): void;
    /**
     * Initializes the AudioContext and resumes it if suspended.
     */
    initAudio(): Promise<void>;
    /**
     * Resumes a suspended AudioContext.
     */
    resumeContext(): Promise<void>;
    /**
     * Suspends the AudioContext to save resources.
     */
    suspendContext(): Promise<void>;
    /**
     * Checks if the AudioContext is initialized and running.
     */
    isReady(): boolean;
    /**
     * Gets the current time from the AudioContext.
     */
    getCurrentTime(): number;
    /**
     * Disconnects the master gain from destination.
     * Used when setting up effects bus routing.
     */
    disconnectMasterFromDestination(): void;
    /**
     * Connects the master gain to a target node.
     */
    connectMasterTo(target: AudioNode): void;
    /**
     * Destroys the context manager and releases resources.
     */
    destroy(): void;
}
//# sourceMappingURL=context-manager.d.ts.map