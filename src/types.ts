export interface AudioSettings {
    enabled: boolean;
    volume: number;
};

export interface AudioTrack {
    key: string;
    group: string;
    audio: HTMLAudioElement;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
    enabled: true,
    volume: 1.0,
};