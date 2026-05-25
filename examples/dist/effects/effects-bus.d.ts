import { Logger } from '../logger';
import { ContextManager } from '../core/context-manager';
import { ImpulseLoader } from '../loading/impulse-loader';
import { FilterConfig } from '../types';
/**
 * Manages the effects bus with wet/dry routing, convolution reverb, and filters.
 */
export declare class EffectsBus {
    private readonly context;
    private readonly impulseLoader;
    private readonly logger;
    private outputGain;
    private dryGain;
    private wetGain;
    private convolverNode;
    private lowPassFilter;
    private highPassFilter;
    private initialized;
    private wetMix;
    private activeImpulseKey;
    constructor(context: ContextManager, impulseLoader: ImpulseLoader, logger: Logger);
    /**
     * Gets the output gain node.
     */
    getOutputGain(): GainNode | null;
    /**
     * Checks if the effects bus is initialized.
     */
    isInitialized(): boolean;
    /**
     * Lazily initializes the effects bus.
     */
    ensureInitialized(): void;
    /**
     * Sets the wet/dry mix for the effects bus.
     */
    setMix(wet: number): void;
    /**
     * Gets the current wet/dry mix.
     */
    getMix(): number;
    /**
     * Applies a reverb effect using a loaded impulse response.
     */
    setReverb(key: string | null): Promise<void>;
    /**
     * Gets the key of the currently active reverb.
     */
    getActiveReverb(): string | null;
    /**
     * Sets the low-pass filter parameters.
     */
    setLowPass(frequency: number, Q?: number): void;
    /**
     * Gets the current low-pass filter configuration.
     */
    getLowPass(): FilterConfig | null;
    /**
     * Sets the high-pass filter parameters.
     */
    setHighPass(frequency: number, Q?: number): void;
    /**
     * Gets the current high-pass filter configuration.
     */
    getHighPass(): FilterConfig | null;
    /**
     * Gets comprehensive state information.
     */
    getState(): {
        initialized: boolean;
        wetMix: number;
        activeReverb: string | null;
        lowPass: FilterConfig | null;
        highPass: FilterConfig | null;
        registeredImpulses: string[];
    };
    /**
     * Transitions wet/dry mix and filter values over time.
     * Used by environment transitions.
     */
    transitionTo(wetMix: number, lowPass: FilterConfig, highPass: FilterConfig, durationSeconds: number): void;
    /**
     * Gets the convolver node for direct impulse response changes.
     */
    getConvolverNode(): ConvolverNode | null;
    /**
     * Sets the active impulse key (for tracking).
     */
    setActiveImpulseKey(key: string | null): void;
    /**
     * Updates the wet mix value (for tracking after transition).
     */
    updateWetMix(value: number): void;
    /**
     * Destroys the effects bus.
     */
    destroy(): void;
}
//# sourceMappingURL=effects-bus.d.ts.map