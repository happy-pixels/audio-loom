import { Subject, from, fromEvent } from 'rxjs';
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
        // this.audioEnd$.next();
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
                }
                if (this.settings[track.group]?.enabled) {
                    track.audio.volume = this.settings[track.group].volume;
                    track.audio.play();
                    this.continuousPlayback!.isPlaying = true;
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
                    }
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
        nextTrack.audio.load();  this.continuousPlayback.isPlaying = false;
    }
}