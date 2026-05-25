import { Logger } from '../logger';

/**
 * Manages the Web Audio API AudioContext lifecycle.
 * Handles context creation, master gain, and suspend/resume.
 */
export class ContextManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private masterVolume: number = 1.0;

    constructor(private readonly logger: Logger) {}

    /**
     * Gets or creates the AudioContext.
     * Creates the master gain node on first call.
     */
    ensureContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            this.logger.log('Created AudioContext and master gain node');
        }
        return this.audioContext;
    }

    /**
     * Gets the current AudioContext, or null if not created.
     */
    getContext(): AudioContext | null {
        return this.audioContext;
    }

    /**
     * Gets the master gain node, or null if context not created.
     */
    getMasterGain(): GainNode | null {
        return this.masterGain;
    }

    /**
     * Gets the current master volume level.
     */
    getMasterVolume(): number {
        return this.masterVolume;
    }

    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        this.logger.log(`Set master volume to ${this.masterVolume}`);
    }

    /**
     * Initializes the AudioContext and resumes it if suspended.
     */
    async initAudio(): Promise<void> {
        this.ensureContext();
        if (this.audioContext!.state === 'suspended') {
            await this.audioContext!.resume();
        }
        this.logger.log('Audio initialized, context state:', this.audioContext!.state);
    }

    /**
     * Resumes a suspended AudioContext.
     */
    async resumeContext(): Promise<void> {
        if (!this.audioContext) {
            this.ensureContext();
        }
        if (this.audioContext!.state === 'suspended') {
            await this.audioContext!.resume();
            this.logger.log('AudioContext resumed');
        }
    }

    /**
     * Suspends the AudioContext to save resources.
     */
    async suspendContext(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
            this.logger.log('AudioContext suspended');
        }
    }

    /**
     * Checks if the AudioContext is initialized and running.
     */
    isReady(): boolean {
        return this.audioContext !== null && this.audioContext.state === 'running';
    }

    /**
     * Gets the current time from the AudioContext.
     */
    getCurrentTime(): number {
        return this.audioContext?.currentTime ?? 0;
    }

    /**
     * Disconnects the master gain from destination.
     * Used when setting up effects bus routing.
     */
    disconnectMasterFromDestination(): void {
        if (this.masterGain) {
            this.masterGain.disconnect();
        }
    }

    /**
     * Connects the master gain to a target node.
     */
    connectMasterTo(target: AudioNode): void {
        if (this.masterGain) {
            this.masterGain.connect(target);
        }
    }

    /**
     * Destroys the context manager and releases resources.
     */
    destroy(): void {
        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            } catch (error) {
                this.logger.error('Failed to disconnect master gain', error);
            }
            this.masterGain = null;
        }

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (error) {
                this.logger.error('Failed to close AudioContext', error);
            }
            this.audioContext = null;
        }
    }
}
