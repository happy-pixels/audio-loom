import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
        fromEvent(track.audio, 'loadedmetadata')
            .pipe(takeUntil(this.audioEnd$))
            .subscribe(() => {
            console.log(`AudioManager: Loaded track for continuous playback: ${track.audio.src}`);
            console.log(`AudioManager: ready state: ${track.audio.readyState}`);
            track.audio.currentTime = 0;
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
        });
        fromEvent(track.audio, 'ended')
            .pipe(takeUntil(this.audioEnd$))
            .subscribe(() => {
            console.log(`AudioManager: Track ended: ${track.audio.src}`);
            this.onTrackEnded();
        });
        track.audio.load();
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
        if (!nextTrack) {
            this.continuousPlayback.isPlaying = false;
            return;
        }
        fromEvent(nextTrack.audio, 'loadedmetadata')
            .pipe(takeUntil(this.audioEnd$))
            .subscribe(() => {
            nextTrack.audio.currentTime = 0;
            if (this.settings[nextTrack.group]?.enabled) {
                nextTrack.audio.volume = this.settings[nextTrack.group].volume;
                this.continuousPlayback = {
                    key,
                    track: nextTrack,
                    isPlaying: false
                };
                nextTrack.audio.play();
                this.continuousPlayback.isPlaying = true;
            }
        });
        fromEvent(nextTrack.audio, 'ended')
            .pipe(takeUntil(this.audioEnd$))
            .subscribe(() => {
            console.log(`AudioManager: Track ended: ${nextTrack.audio.src}`);
            this.onTrackEnded();
        });
        nextTrack.audio.load();
        this.continuousPlayback.isPlaying = false;
    }
}
//# sourceMappingURL=audio-manager.js.map