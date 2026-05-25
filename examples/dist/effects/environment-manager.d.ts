import { Logger } from '../logger';
import { EffectsBus } from './effects-bus';
import { ImpulseLoader } from '../loading/impulse-loader';
import { EnvironmentConfig, EnvironmentPreset } from '../types';
/**
 * Manages audio environments with presets and smooth transitions.
 */
export declare class EnvironmentManager {
    private readonly effectsBus;
    private readonly impulseLoader;
    private readonly logger;
    private currentEnvironment;
    private transitionTimeout;
    constructor(effectsBus: EffectsBus, impulseLoader: ImpulseLoader, logger: Logger);
    /**
     * Gets the current environment configuration.
     */
    getEnvironment(): EnvironmentConfig | null;
    /**
     * Applies an environment configuration or preset.
     */
    setEnvironment(config: EnvironmentConfig | EnvironmentPreset | null): Promise<void>;
    /**
     * Smoothly transitions to a new environment over time.
     */
    transitionToEnvironment(config: EnvironmentConfig | EnvironmentPreset | null, duration: number): Promise<void>;
    /**
     * Destroys the environment manager.
     */
    destroy(): void;
}
//# sourceMappingURL=environment-manager.d.ts.map