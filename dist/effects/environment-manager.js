import { ENVIRONMENT_PRESETS, DEFAULT_LOW_PASS_CONFIG, DEFAULT_HIGH_PASS_CONFIG } from '../types';
/**
 * Manages audio environments with presets and smooth transitions.
 */
export class EnvironmentManager {
    effectsBus;
    impulseLoader;
    logger;
    currentEnvironment = null;
    transitionTimeout = null;
    constructor(effectsBus, impulseLoader, logger) {
        this.effectsBus = effectsBus;
        this.impulseLoader = impulseLoader;
        this.logger = logger;
    }
    /**
     * Gets the current environment configuration.
     */
    getEnvironment() {
        return this.currentEnvironment;
    }
    /**
     * Applies an environment configuration or preset.
     */
    async setEnvironment(config) {
        // Cancel any ongoing transition
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        // Resolve preset name to config
        let resolvedConfig;
        if (config === null) {
            resolvedConfig = null;
        }
        else if (typeof config === 'string') {
            resolvedConfig = ENVIRONMENT_PRESETS[config];
            if (!resolvedConfig) {
                throw new Error(`Unknown environment preset: "${config}"`);
            }
        }
        else {
            resolvedConfig = config;
        }
        // Apply the 'none' preset or null as clearing the environment
        if (!resolvedConfig || resolvedConfig.wetMix === 0) {
            this.effectsBus.setMix(0);
            this.currentEnvironment = resolvedConfig;
            this.logger.log('Environment cleared');
            return;
        }
        // Initialize effects bus if needed
        this.effectsBus.ensureInitialized();
        // Apply reverb if specified
        if (resolvedConfig.reverb !== null) {
            await this.effectsBus.setReverb(resolvedConfig.reverb);
        }
        else {
            await this.effectsBus.setReverb(null);
        }
        // Apply filters
        if (resolvedConfig.lowPass) {
            this.effectsBus.setLowPass(resolvedConfig.lowPass.frequency, resolvedConfig.lowPass.Q);
        }
        else {
            this.effectsBus.setLowPass(DEFAULT_LOW_PASS_CONFIG.frequency, DEFAULT_LOW_PASS_CONFIG.Q);
        }
        if (resolvedConfig.highPass) {
            this.effectsBus.setHighPass(resolvedConfig.highPass.frequency, resolvedConfig.highPass.Q);
        }
        else {
            this.effectsBus.setHighPass(DEFAULT_HIGH_PASS_CONFIG.frequency, DEFAULT_HIGH_PASS_CONFIG.Q);
        }
        // Apply wet/dry mix
        this.effectsBus.setMix(resolvedConfig.wetMix);
        this.currentEnvironment = resolvedConfig;
        this.logger.log(`Environment applied: wetMix=${resolvedConfig.wetMix}, reverb=${resolvedConfig.reverb}`);
    }
    /**
     * Smoothly transitions to a new environment over time.
     */
    async transitionToEnvironment(config, duration) {
        // Cancel any ongoing transition
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        // Resolve preset name to config
        let resolvedConfig;
        if (config === null) {
            resolvedConfig = null;
        }
        else if (typeof config === 'string') {
            resolvedConfig = ENVIRONMENT_PRESETS[config];
            if (!resolvedConfig) {
                throw new Error(`Unknown environment preset: "${config}"`);
            }
        }
        else {
            resolvedConfig = config;
        }
        const targetConfig = resolvedConfig || ENVIRONMENT_PRESETS.none;
        // Initialize effects bus if needed
        this.effectsBus.ensureInitialized();
        const durationSeconds = duration / 1000;
        // Load new reverb if needed (but don't apply yet for crossfade)
        if (targetConfig.reverb !== null && targetConfig.reverb !== this.effectsBus.getActiveReverb()) {
            await this.impulseLoader.loadIfNeeded(targetConfig.reverb);
        }
        // Get target values
        const targetWetMix = targetConfig.wetMix;
        const targetLowPass = targetConfig.lowPass || DEFAULT_LOW_PASS_CONFIG;
        const targetHighPass = targetConfig.highPass || DEFAULT_HIGH_PASS_CONFIG;
        // Start transitions
        this.effectsBus.transitionTo(targetWetMix, targetLowPass, targetHighPass, durationSeconds);
        // Apply reverb change at the midpoint for smoother crossfade
        const reverbChangeDelay = duration / 2;
        return new Promise((resolve) => {
            // Schedule reverb change at midpoint
            setTimeout(() => {
                if (!this.effectsBus.isInitialized()) {
                    return;
                }
                const convolver = this.effectsBus.getConvolverNode();
                if (convolver && targetConfig.reverb !== this.effectsBus.getActiveReverb()) {
                    if (targetConfig.reverb === null) {
                        convolver.buffer = null;
                        this.effectsBus.setActiveImpulseKey(null);
                    }
                    else {
                        const entry = this.impulseLoader.getEntry(targetConfig.reverb);
                        if (entry && entry.buffer) {
                            convolver.buffer = entry.buffer;
                            this.effectsBus.setActiveImpulseKey(targetConfig.reverb);
                        }
                    }
                }
            }, reverbChangeDelay);
            // Complete transition
            this.transitionTimeout = setTimeout(() => {
                if (!this.effectsBus.isInitialized()) {
                    resolve();
                    return;
                }
                this.effectsBus.updateWetMix(targetWetMix);
                this.currentEnvironment = resolvedConfig;
                this.transitionTimeout = null;
                this.logger.log(`Environment transition complete: wetMix=${targetWetMix}, reverb=${targetConfig.reverb}`);
                resolve();
            }, duration);
        });
    }
    /**
     * Destroys the environment manager.
     */
    destroy() {
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        this.currentEnvironment = null;
    }
}
//# sourceMappingURL=environment-manager.js.map