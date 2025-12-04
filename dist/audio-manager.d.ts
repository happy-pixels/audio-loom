export declare class AudioManager {
    private settings;
    private tracks;
    private trackSelector;
    private continuousPlayback;
    private audioEnd$;
    constructor();
    setAudioEnabled(group: string, enabled: boolean): void;
    setAudioVolume(group: string, volume: number): void;
    addAudioTrack(key: string, group: string, path: string): void;
    playAudioTrack(key: string): void;
    playContinuous(key: string): void;
    stopContinuous(): void;
    private selectRandomTrack;
    private onTrackEnded;
}
//# sourceMappingURL=audio-manager.d.ts.map