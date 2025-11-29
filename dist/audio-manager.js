import { DEFAULT_AUDIO_SETTINGS } from './types';
export class AudioManager {
    settings = {};
    tracks = {};
    trackSelector = {};
    constructor() { }
    setAudioEnabled(group, enabled) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].enabled = enabled;
        // TODO: Implementation to enable/disable audio playback for the group
    }
    setAudioVolume(group, volume) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].volume = volume;
    }
    addAutioTrack(key, group, path) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.tracks[group] = this.tracks[group] || [];
        const audioElement = new Audio(path);
        audioElement.preload = 'auto';
        const track = { key, group, audio: audioElement };
        this.tracks[group].push(track);
    }
    playAudioTrack(key) {
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        const track = this.trackSelector[key].splice(Math.random() * this.trackSelector[key].length, 1)[0];
        if (this.settings[track.group]?.enabled) {
            track.audio.volume = this.settings[track.group].volume;
            track.audio.currentTime = 0;
            track.audio.play();
        }
    }
}
//# sourceMappingURL=audio-manager.js.map