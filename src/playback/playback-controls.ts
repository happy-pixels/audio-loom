import { Logger } from '../logger';
import { ContinuousPlayer } from './continuous-player';

const DEFAULT_CHANNEL = 'default';

/**
 * Handles playback rate, seeking, and time queries for continuous playback.
 */
export class PlaybackControls {
    constructor(
        private readonly continuous: ContinuousPlayer,
        private readonly logger: Logger
    ) {}

    /**
     * Sets the playback speed/rate for a channel.
     */
    setPlaybackRate(rate: number, channelId: string = DEFAULT_CHANNEL): void {
        const playback = this.continuous.getChannel(channelId);
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to set playback rate`);
            return;
        }

        // Clamp rate to valid range
        const clampedRate = Math.max(0.25, Math.min(4.0, rate));
        if (clampedRate !== rate) {
            this.logger.warn(`Playback rate clamped from ${rate} to ${clampedRate}`);
        }

        try {
            playback.mediaElement.playbackRate = clampedRate;
            this.logger.log(`Set playback rate to ${clampedRate} on channel "${channelId}"`);
        } catch (error) {
            this.logger.error(`Failed to set playback rate on channel "${channelId}"`, error);
        }
    }

    /**
     * Gets the current playback rate for a channel.
     */
    getPlaybackRate(channelId: string = DEFAULT_CHANNEL): number | null {
        const playback = this.continuous.getChannel(channelId);
        if (!playback) {
            return null;
        }
        return playback.mediaElement.playbackRate;
    }

    /**
     * Seeks to a specific time position in the current track.
     */
    seek(time: number, channelId: string = DEFAULT_CHANNEL): void {
        const playback = this.continuous.getChannel(channelId);
        if (!playback) {
            this.logger.warn(`No continuous playback on channel "${channelId}" to seek`);
            return;
        }

        const duration = playback.mediaElement.duration;
        if (isNaN(duration)) {
            this.logger.warn(`Cannot seek on channel "${channelId}": track duration not available`);
            return;
        }

        // Clamp time to valid range
        const clampedTime = Math.max(0, Math.min(duration, time));
        if (clampedTime !== time) {
            this.logger.warn(`Seek time clamped from ${time} to ${clampedTime}`);
        }

        try {
            playback.mediaElement.currentTime = clampedTime;
            this.logger.log(`Seeked to ${clampedTime}s on channel "${channelId}"`);
        } catch (error) {
            this.logger.error(`Failed to seek on channel "${channelId}"`, error);
        }
    }

    /**
     * Gets the current playback time in seconds.
     */
    getCurrentTime(channelId: string = DEFAULT_CHANNEL): number | null {
        const playback = this.continuous.getChannel(channelId);
        if (!playback) {
            return null;
        }
        return playback.mediaElement.currentTime;
    }

    /**
     * Gets the total duration of the current track in seconds.
     */
    getDuration(channelId: string = DEFAULT_CHANNEL): number | null {
        const playback = this.continuous.getChannel(channelId);
        if (!playback) {
            return null;
        }
        const duration = playback.mediaElement.duration;
        return isNaN(duration) ? null : duration;
    }
}
