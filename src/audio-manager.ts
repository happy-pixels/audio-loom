import { AudioSettings, AudioTrack, DEFAULT_AUDIO_SETTINGS } from './types';

export class AudioManager {
    private settings: { [group: string]: AudioSettings } = {};
    private tracks: { [key: string]: AudioTrack[] } = {};
    private trackSelector: { [key: string]: AudioTrack[] } = {};

    constructor() { }

    setAudioEnabled(group: string, enabled: boolean): void {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].enabled = enabled;
        // TODO: Implementation to enable/disable audio playback for the group
    }

    setAudioVolume(group: string, volume: number): void {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].volume = volume;
    }

    addAudioTrack(key: string, group: string, path: string): void {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.tracks[key] = this.tracks[key] || [];
        const audioElement = new Audio(path);
        audioElement.preload = 'auto';
        const track: AudioTrack = { key, group, audio: audioElement };
        this.tracks[key].push(track);
    }

    playAudioTrack(key: string): void {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            return;
        }
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        const track = this.trackSelector[key].splice(Math.floor(Math.random() * this.trackSelector[key].length), 1)[0];
        if (this.settings[track.group]?.enabled) {
            track.audio.volume = this.settings[track.group].volume;
            track.audio.currentTime = 0;
            track.audio.play();
        }
    }
}