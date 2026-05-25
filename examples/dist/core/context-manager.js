/**
 * Manages the Web Audio API AudioContext lifecycle.
 * Handles context creation, master gain, and suspend/resume.
 */
export class ContextManager {
    logger;
    audioContext = null;
    masterGain = null;
    masterVolume = 1.0;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Gets or creates the AudioContext.
     * Creates the master gain node on first call.
     */
    ensureContext() {
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
    getContext() {
        return this.audioContext;
    }
    /**
     * Gets the master gain node, or null if context not created.
     */
    getMasterGain() {
        return this.masterGain;
    }
    /**
     * Gets the current master volume level.
     */
    getMasterVolume() {
        return this.masterVolume;
    }
    /**
     * Sets the master volume that affects all audio output.
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        this.logger.log(`Set master volume to ${this.masterVolume}`);
    }
    /**
     * Initializes the AudioContext and resumes it if suspended.
     */
    async initAudio() {
        this.ensureContext();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.logger.log('Audio initialized, context state:', this.audioContext.state);
    }
    /**
     * Resumes a suspended AudioContext.
     */
    async resumeContext() {
        if (!this.audioContext) {
            this.ensureContext();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.logger.log('AudioContext resumed');
        }
    }
    /**
     * Suspends the AudioContext to save resources.
     */
    async suspendContext() {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
            this.logger.log('AudioContext suspended');
        }
    }
    /**
     * Checks if the AudioContext is initialized and running.
     */
    isReady() {
        return this.audioContext !== null && this.audioContext.state === 'running';
    }
    /**
     * Gets the current time from the AudioContext.
     */
    getCurrentTime() {
        return this.audioContext?.currentTime ?? 0;
    }
    /**
     * Disconnects the master gain from destination.
     * Used when setting up effects bus routing.
     */
    disconnectMasterFromDestination() {
        if (this.masterGain) {
            this.masterGain.disconnect();
        }
    }
    /**
     * Connects the master gain to a target node.
     */
    connectMasterTo(target) {
        if (this.masterGain) {
            this.masterGain.connect(target);
        }
    }
    /**
     * Destroys the context manager and releases resources.
     */
    destroy() {
        if (this.masterGain) {
            try {
                this.masterGain.disconnect();
            }
            catch (error) {
                this.logger.error('Failed to disconnect master gain', error);
            }
            this.masterGain = null;
        }
        if (this.audioContext) {
            try {
                this.audioContext.close();
            }
            catch (error) {
                this.logger.error('Failed to close AudioContext', error);
            }
            this.audioContext = null;
        }
    }
}
//# sourceMappingURL=context-manager.js.map