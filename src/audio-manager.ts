import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AudioSettings, AudioTrack, DEFAULT_AUDIO_SETTINGS } from './types';

export class AudioManager {
    private settings: { [group: string]: AudioSettings } = {};
    private tracks: { [key: string]: AudioTrack[] } = {};
    private trackSelector: { [key: string]: AudioTrack[] } = {};
    private continuousPlayback: {
        key: string;
        track: AudioTrack;
        isPlaying: boolean;
    } | null = null;
    private audioEnd$: Subject<void>;

    constructor() {
        this.audioEnd$ = new Subject<void>();
    }

    setAudioEnabled(group: string, enabled: boolean): void {
        this.settings[group] = this.settings[group] || { ...DEFAULT_AUDIO_SETTINGS };
        const wasEnabled = this.settings[group].enabled;
        this.settings[group].enabled = enabled;


        if (this.continuousPlayback && this.continuousPlayback.track.group == group) {
            if (!enabled && wasEnabled && this.continuousPlayback.isPlaying) {
                this.continuousPlayback.track.audio.pause();
                this.continuousPlayback.isPlaying = false;
            } else if (enabled && !wasEnabled && !this.continuousPlayback.isPlaying) {
                this.continuousPlayback.track.audio.volume = this.settings[group].volume;
                this.continuousPlayback.track.audio.play();
                this.continuousPlayback.isPlaying = true;
            }
        }
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
        this.audioEnd$.next();
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        const track = this.selectRandomTrack(key);
        if (track && this.settings[track.group]?.enabled) {
            track.audio.volume = this.settings[track.group].volume;
            track.audio.currentTime = 0;
            track.audio.play();
        }
    }

    playContinuous(key: string): void {
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
                }

                if (this.settings[track.group]?.enabled) {
                    track.audio.volume = this.settings[track.group].volume;
                    track.audio.play();
                    this.continuousPlayback.isPlaying = true;
                }

                let logCount = 0;
                const checkProgress = () => {
                    const progress = (track.audio.currentTime / track.audio.duration) * 100;
                    logCount++;
                    if (logCount % 10 === 0) {
                        // Just to prevent potential infinite loops
                        console.warn(`AudioManager: Checking progress for continuous playback of '${key}', attempt ${logCount}`);
                    }
                    if (progress >= 99.5) {
                        track.audio.removeEventListener('timeupdate', checkProgress);
                        this.onTrackEnded();
                    }
                };
                track.audio.addEventListener('timeupdate', checkProgress);
            }, 50);
        });
    }

    stopContinuous(): void {
        if (!this.continuousPlayback) {
            return;
        }

        this.audioEnd$.next();
        this.continuousPlayback.track.audio.pause();
        this.continuousPlayback.track.audio.currentTime = 0;
        this.continuousPlayback = null;
    }

    private selectRandomTrack(key: string): AudioTrack | null {
        this.trackSelector[key] = this.trackSelector[key]?.length ? this.trackSelector[key] : [...this.tracks[key]];
        return this.trackSelector[key].splice(Math.floor(Math.random() * this.trackSelector[key].length), 1)[0] || null;
    }

    private onTrackEnded(): void {
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
                this.continuousPlayback!.track = nextTrack;
                this.continuousPlayback!.isPlaying = true;
                let logCount = 0;
                const checkProgress = () => {
                    const progress = (nextTrack.audio.currentTime / nextTrack.audio.duration) * 100;
                    logCount++;
                    if (logCount % 10 === 0) {
                        // Just to prevent potential infinite loops
                        console.warn(`AudioManager: Checking progress for continuous playback of '${key}', attempt ${logCount}`);
                    }
                    if (progress >= 99.5) {
                        nextTrack.audio.removeEventListener('timeupdate', checkProgress);
                        this.onTrackEnded();
                    }
                };
                nextTrack.audio.addEventListener('timeupdate', checkProgress);
            }, 50);
        } else {
            this.continuousPlayback.isPlaying = false;
        }
    }
}