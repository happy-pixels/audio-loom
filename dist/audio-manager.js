import { Subject } from 'rxjs';
import { DEFAULT_AUDIO_SETTINGS } from './types';
export class AudioManager {
    settings = {};
    tracks = {};
    trackSelector = {};
    continuousPlayback = null;
    audioEnd$;
    constructor() {
        this.audioEnd$ = new Subject();
    }
    setAudioEnabled(group, enabled) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        const wasEnabled = this.settings[group].enabled;
        this.settings[group].enabled = enabled;
        if (this.continuousPlayback && this.continuousPlayback.track.group == group) {
            if (!enabled && wasEnabled && this.continuousPlayback.isPlaying) {
                this.continuousPlayback.track.audio.pause();
                this.continuousPlayback.isPlaying = false;
            }
            else if (enabled && !wasEnabled && !this.continuousPlayback.isPlaying) {
                this.continuousPlayback.track.audio.volume = this.settings[group].volume;
                this.continuousPlayback.track.audio.play();
                this.continuousPlayback.isPlaying = true;
            }
        }
    }
    setAudioVolume(group, volume) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.settings[group].volume = volume;
    }
    addAudioTrack(key, group, path) {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        this.tracks[key] = this.tracks[key] || [];
        const audioElement = new Audio(path);
        audioElement.preload = 'auto';
        const track = { key, group, audio: audioElement };
        this.tracks[key].push(track);
    }
    playAudioTrack(key) {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            return;
        }
        this.audioEnd$.next();
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        const track = this.selectRandomTrack(key);
        if (track && this.settings[track.group]?.enabled) {
            track.audio.volume = this.settings[track.group].volume;
            track.audio.currentTime = 0;
            track.audio.play();
        }
    }
    playContinuous(key) {
        if (!this.tracks[key] || this.tracks[key].length === 0) {
            return;
        }
        this.stopContinuous();
        const track = this.selectRandomTrack(key);
        if (!track) {
            return;
        }
        track.audio.currentTime = 0;
        track.audio.muted = true;
        track.audio.volume = 0;
        track.audio.play().then(() => {
            setTimeout(() => {
                if (this.continuousPlayback && this.continuousPlayback.key === key) {
                    return;
                }
                track.audio.pause();
                track.audio.currentTime = 0;
                track.audio.muted = false;
                track.audio.volume = this.settings[track.group].volume;
                this.continuousPlayback = {
                    key,
                    track,
                    isPlaying: false
                };
                if (this.settings[track.group]?.enabled) {
                    track.audio.volume = this.settings[track.group].volume;
                    track.audio.play();
                    this.continuousPlayback.isPlaying = true;
                }
                const checkProgress = () => {
                    const progress = (track.audio.currentTime / track.audio.duration) * 100;
                    if (progress >= 99.5) {
                        track.audio.removeEventListener('timeupdate', checkProgress);
                        this.onTrackEnded();
                    }
                };
                track.audio.addEventListener('timeupdate', checkProgress);
            }, 50);
        });
    }
    stopContinuous() {
        if (!this.continuousPlayback) {
            return;
        }
        this.audioEnd$.next();
        this.continuousPlayback.track.audio.pause();
        this.continuousPlayback.track.audio.currentTime = 0;
        this.continuousPlayback = null;
    }
    selectRandomTrack(key) {
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        return this.trackSelector[key].splice(Math.floor(Math.random() * this.trackSelector[key].length), 1)[0] || null;
    }
    onTrackEnded() {
        if (!this.continuousPlayback) {
            return;
        }
        this.audioEnd$.next();
        const { key, track } = this.continuousPlayback;
        const nextTrack = this.selectRandomTrack(key);
        if (nextTrack && this.settings[track.group]?.enabled) {
            nextTrack.audio.currentTime = 0;
            setTimeout(() => {
                nextTrack.audio.volume = this.settings[track.group].volume;
                nextTrack.audio.play();
                this.continuousPlayback.track = nextTrack;
                this.continuousPlayback.isPlaying = true;
                let logCount = 0;
                const checkProgress = () => {
                    const progress = (nextTrack.audio.currentTime / nextTrack.audio.duration) * 100;
                    if (progress >= 99.5) {
                        nextTrack.audio.removeEventListener('timeupdate', checkProgress);
                        this.onTrackEnded();
                    }
                };
                nextTrack.audio.addEventListener('timeupdate', checkProgress);
            }, 50);
        }
        else {
            this.continuousPlayback.isPlaying = false;
        }
    }
}
//# sourceMappingURL=audio-manager.js.map