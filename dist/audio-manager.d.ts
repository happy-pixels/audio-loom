export declare class AudioManager {
    private settings;
    private tracks;
    private trackSelector;
    constructor();
    setAudioEnabled(group: string, enabled: boolean): void;
    setAudioVolume(group: string, volume: number): void;
    addAutioTrack(key: string, group: string, path: string): void;
    playAudioTrack(key: string): void;
}
//# sourceMappingURL=audio-manager.d.ts.map