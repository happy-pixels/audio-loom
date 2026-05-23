import { Logger } from '../logger';
import { ContinuousPlayer } from './continuous-player';
/**
 * Handles playback rate, seeking, and time queries for continuous playback.
 */
export declare class PlaybackControls {
    private readonly continuous;
    private readonly logger;
    constructor(continuous: ContinuousPlayer, logger: Logger);
    /**
     * Sets the playback speed/rate for a channel.
     */
    setPlaybackRate(rate: number, channelId?: string): void;
    /**
     * Gets the current playback rate for a channel.
     */
    getPlaybackRate(channelId?: string): number | null;
    /**
     * Seeks to a specific time position in the current track.
     */
    seek(time: number, channelId?: string): void;
    /**
     * Gets the current playback time in seconds.
     */
    getCurrentTime(channelId?: string): number | null;
    /**
     * Gets the total duration of the current track in seconds.
     */
    getDuration(channelId?: string): number | null;
}
//# sourceMappingURL=playback-controls.d.ts.map