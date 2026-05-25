import { DEFAULT_LOW_PASS_CONFIG, DEFAULT_HIGH_PASS_CONFIG } from '../types.js';
/**
 * Manages the effects bus with wet/dry routing, convolution reverb, and filters.
 */
export class EffectsBus {
    context;
    impulseLoader;
    logger;
    outputGain = null;
    dryGain = null;
    wetGain = null;
    convolverNode = null;
    lowPassFilter = null;
    highPassFilter = null;
    initialized = false;
    wetMix = 0;
    activeImpulseKey = null;
    constructor(context, impulseLoader, logger) {
        this.context = context;
        this.impulseLoader = impulseLoader;
        this.logger = logger;
    }
    /**
     * Gets the output gain node.
     */
    getOutputGain() {
        return this.outputGain;
    }
    /**
     * Checks if the effects bus is initialized.
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Lazily initializes the effects bus.
     */
    ensureInitialized() {
        if (this.initialized) {
            return;
        }
        const ctx = this.context.ensureContext();
        // Create output gain (final stage before destination)
        this.outputGain = ctx.createGain();
        this.outputGain.gain.value = 1.0;
        this.outputGain.connect(ctx.destination);
        // Create dry path gain
        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 1.0;
        this.dryGain.connect(this.outputGain);
        // Create wet path gain
        this.wetGain = ctx.createGain();
        this.wetGain.gain.value = 0;
        // Create convolver for reverb
        this.convolverNode = ctx.createConvolver();
        // Create filters
        this.lowPassFilter = ctx.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = DEFAULT_LOW_PASS_CONFIG.frequency;
        this.lowPassFilter.Q.value = DEFAULT_LOW_PASS_CONFIG.Q;
        this.highPassFilter = ctx.createBiquadFilter();
        this.highPassFilter.type = 'highpass';
        this.highPassFilter.frequency.value = DEFAULT_HIGH_PASS_CONFIG.frequency;
        this.highPassFilter.Q.value = DEFAULT_HIGH_PASS_CONFIG.Q;
        // Connect wet path: wetGain -> convolver -> lowPass -> highPass -> outputGain
        this.wetGain.connect(this.convolverNode);
        this.convolverNode.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.highPassFilter);
        this.highPassFilter.connect(this.outputGain);
        // Disconnect masterGain from destination and reconnect through effects bus
        this.context.disconnectMasterFromDestination();
        this.context.connectMasterTo(this.dryGain);
        this.context.connectMasterTo(this.wetGain);
        this.initialized = true;
        this.wetMix = 0;
        this.logger.log('Effects bus initialized');
    }
    /**
     * Sets the wet/dry mix for the effects bus.
     */
    setMix(wet) {
        this.ensureInitialized();
        const clampedWet = Math.max(0, Math.min(1, wet));
        if (clampedWet !== wet) {
            this.logger.warn(`Effects mix clamped from ${wet} to ${clampedWet}`);
        }
        const ctx = this.context.ensureContext();
        const currentTime = ctx.currentTime;
        const transitionTime = 0.05; // 50ms transition
        this.wetGain.gain.cancelScheduledValues(currentTime);
        this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, currentTime);
        this.wetGain.gain.linearRampToValueAtTime(clampedWet, currentTime + transitionTime);
        this.dryGain.gain.cancelScheduledValues(currentTime);
        this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, currentTime);
        this.dryGain.gain.linearRampToValueAtTime(1 - clampedWet, currentTime + transitionTime);
        this.wetMix = clampedWet;
        this.logger.log(`Set effects mix: wet=${clampedWet}, dry=${1 - clampedWet}`);
    }
    /**
     * Gets the current wet/dry mix.
     */
    getMix() {
        return this.wetMix;
    }
    /**
     * Applies a reverb effect using a loaded impulse response.
     */
    async setReverb(key) {
        this.ensureInitialized();
        if (key === null) {
            this.convolverNode.buffer = null;
            this.activeImpulseKey = null;
            this.logger.log('Reverb disabled');
            return;
        }
        const buffer = await this.impulseLoader.loadIfNeeded(key);
        this.convolverNode.buffer = buffer;
        this.activeImpulseKey = key;
        this.logger.log(`Applied reverb: "${key}"`);
    }
    /**
     * Gets the key of the currently active reverb.
     */
    getActiveReverb() {
        return this.activeImpulseKey;
    }
    /**
     * Sets the low-pass filter parameters.
     */
    setLowPass(frequency, Q = 1) {
        this.ensureInitialized();
        const ctx = this.context.ensureContext();
        const currentTime = ctx.currentTime;
        const transitionTime = 0.05;
        const clampedFreq = Math.max(20, Math.min(20000, frequency));
        const clampedQ = Math.max(0.001, Math.min(1000, Q));
        this.lowPassFilter.frequency.cancelScheduledValues(currentTime);
        this.lowPassFilter.frequency.setValueAtTime(this.lowPassFilter.frequency.value, currentTime);
        this.lowPassFilter.frequency.linearRampToValueAtTime(clampedFreq, currentTime + transitionTime);
        this.lowPassFilter.Q.cancelScheduledValues(currentTime);
        this.lowPassFilter.Q.setValueAtTime(this.lowPassFilter.Q.value, currentTime);
        this.lowPassFilter.Q.linearRampToValueAtTime(clampedQ, currentTime + transitionTime);
        this.logger.log(`Set low-pass filter: frequency=${clampedFreq}Hz, Q=${clampedQ}`);
    }
    /**
     * Gets the current low-pass filter configuration.
     */
    getLowPass() {
        if (!this.initialized || !this.lowPassFilter) {
            return null;
        }
        return {
            frequency: this.lowPassFilter.frequency.value,
            Q: this.lowPassFilter.Q.value
        };
    }
    /**
     * Sets the high-pass filter parameters.
     */
    setHighPass(frequency, Q = 1) {
        this.ensureInitialized();
        const ctx = this.context.ensureContext();
        const currentTime = ctx.currentTime;
        const transitionTime = 0.05;
        const clampedFreq = Math.max(20, Math.min(20000, frequency));
        const clampedQ = Math.max(0.001, Math.min(1000, Q));
        this.highPassFilter.frequency.cancelScheduledValues(currentTime);
        this.highPassFilter.frequency.setValueAtTime(this.highPassFilter.frequency.value, currentTime);
        this.highPassFilter.frequency.linearRampToValueAtTime(clampedFreq, currentTime + transitionTime);
        this.highPassFilter.Q.cancelScheduledValues(currentTime);
        this.highPassFilter.Q.setValueAtTime(this.highPassFilter.Q.value, currentTime);
        this.highPassFilter.Q.linearRampToValueAtTime(clampedQ, currentTime + transitionTime);
        this.logger.log(`Set high-pass filter: frequency=${clampedFreq}Hz, Q=${clampedQ}`);
    }
    /**
     * Gets the current high-pass filter configuration.
     */
    getHighPass() {
        if (!this.initialized || !this.highPassFilter) {
            return null;
        }
        return {
            frequency: this.highPassFilter.frequency.value,
            Q: this.highPassFilter.Q.value
        };
    }
    /**
     * Gets comprehensive state information.
     */
    getState() {
        return {
            initialized: this.initialized,
            wetMix: this.wetMix,
            activeReverb: this.activeImpulseKey,
            lowPass: this.getLowPass(),
            highPass: this.getHighPass(),
            registeredImpulses: this.impulseLoader.getRegisteredKeys()
        };
    }
    /**
     * Transitions wet/dry mix and filter values over time.
     * Used by environment transitions.
     */
    transitionTo(wetMix, lowPass, highPass, durationSeconds) {
        if (!this.initialized) {
            return;
        }
        const ctx = this.context.ensureContext();
        const currentTime = ctx.currentTime;
        // Transition wet/dry mix
        if (this.wetGain && this.dryGain) {
            this.wetGain.gain.cancelScheduledValues(currentTime);
            this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, currentTime);
            this.wetGain.gain.linearRampToValueAtTime(wetMix, currentTime + durationSeconds);
            this.dryGain.gain.cancelScheduledValues(currentTime);
            this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, currentTime);
            this.dryGain.gain.linearRampToValueAtTime(1 - wetMix, currentTime + durationSeconds);
        }
        // Transition filters
        if (this.lowPassFilter) {
            this.lowPassFilter.frequency.cancelScheduledValues(currentTime);
            this.lowPassFilter.frequency.setValueAtTime(this.lowPassFilter.frequency.value, currentTime);
            this.lowPassFilter.frequency.linearRampToValueAtTime(lowPass.frequency, currentTime + durationSeconds);
            this.lowPassFilter.Q.cancelScheduledValues(currentTime);
            this.lowPassFilter.Q.setValueAtTime(this.lowPassFilter.Q.value, currentTime);
            this.lowPassFilter.Q.linearRampToValueAtTime(lowPass.Q, currentTime + durationSeconds);
        }
        if (this.highPassFilter) {
            this.highPassFilter.frequency.cancelScheduledValues(currentTime);
            this.highPassFilter.frequency.setValueAtTime(this.highPassFilter.frequency.value, currentTime);
            this.highPassFilter.frequency.linearRampToValueAtTime(highPass.frequency, currentTime + durationSeconds);
            this.highPassFilter.Q.cancelScheduledValues(currentTime);
            this.highPassFilter.Q.setValueAtTime(this.highPassFilter.Q.value, currentTime);
            this.highPassFilter.Q.linearRampToValueAtTime(highPass.Q, currentTime + durationSeconds);
        }
    }
    /**
     * Gets the convolver node for direct impulse response changes.
     */
    getConvolverNode() {
        return this.convolverNode;
    }
    /**
     * Sets the active impulse key (for tracking).
     */
    setActiveImpulseKey(key) {
        this.activeImpulseKey = key;
    }
    /**
     * Updates the wet mix value (for tracking after transition).
     */
    updateWetMix(value) {
        this.wetMix = value;
    }
    /**
     * Destroys the effects bus.
     */
    destroy() {
        if (!this.initialized) {
            return;
        }
        try {
            if (this.highPassFilter) {
                this.highPassFilter.disconnect();
                this.highPassFilter = null;
            }
            if (this.lowPassFilter) {
                this.lowPassFilter.disconnect();
                this.lowPassFilter = null;
            }
            if (this.convolverNode) {
                this.convolverNode.disconnect();
                this.convolverNode = null;
            }
            if (this.wetGain) {
                this.wetGain.disconnect();
                this.wetGain = null;
            }
            if (this.dryGain) {
                this.dryGain.disconnect();
                this.dryGain = null;
            }
            if (this.outputGain) {
                this.outputGain.disconnect();
                this.outputGain = null;
            }
        }
        catch (error) {
            this.logger.error('Failed to disconnect effects bus nodes', error);
        }
        this.initialized = false;
        this.wetMix = 0;
        this.activeImpulseKey = null;
    }
}
//# sourceMappingURL=effects-bus.js.map