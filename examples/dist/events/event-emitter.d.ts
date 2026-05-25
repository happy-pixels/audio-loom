import { Observable } from 'rxjs';
import { TrackStartEvent, TrackEndEvent, LoadCompleteEvent, AudioErrorEvent, PositionUpdateEvent, OrientationUpdateEvent, DistanceThresholdEvent } from '../types';
/**
 * Centralized event emitter for audio events using RxJS.
 * All audio-related events flow through this class.
 */
export declare class EventEmitter {
    private readonly trackStartSubject;
    private readonly trackEndSubject;
    private readonly loadCompleteSubject;
    private readonly errorSubject;
    private readonly positionUpdateSubject;
    private readonly orientationUpdateSubject;
    private readonly distanceThresholdSubject;
    /**
     * Observable that emits when a track starts playing.
     */
    readonly onTrackStart$: Observable<TrackStartEvent>;
    /**
     * Observable that emits when a track finishes playing.
     */
    readonly onTrackEnd$: Observable<TrackEndEvent>;
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     */
    readonly onLoadComplete$: Observable<LoadCompleteEvent>;
    /**
     * Observable that emits when an audio error occurs.
     */
    readonly onError$: Observable<AudioErrorEvent>;
    /**
     * Observable that emits when a 3D sound's position is updated.
     */
    readonly onPositionUpdate$: Observable<PositionUpdateEvent>;
    /**
     * Observable that emits when a 3D sound's orientation is updated.
     */
    readonly onOrientationUpdate$: Observable<OrientationUpdateEvent>;
    /**
     * Observable that emits when a 3D sound crosses a distance threshold.
     */
    readonly onDistanceThreshold$: Observable<DistanceThresholdEvent>;
    /**
     * Emits a track start event.
     */
    emitTrackStart(event: TrackStartEvent): void;
    /**
     * Emits a track end event.
     */
    emitTrackEnd(event: TrackEndEvent): void;
    /**
     * Emits a load complete event.
     */
    emitLoadComplete(event: LoadCompleteEvent): void;
    /**
     * Emits an error event.
     */
    emitError(event: AudioErrorEvent): void;
    /**
     * Emits a position update event.
     */
    emitPositionUpdate(event: PositionUpdateEvent): void;
    /**
     * Emits an orientation update event.
     */
    emitOrientationUpdate(event: OrientationUpdateEvent): void;
    /**
     * Emits a distance threshold event.
     */
    emitDistanceThreshold(event: DistanceThresholdEvent): void;
    /**
     * Completes all subjects and cleans up resources.
     */
    destroy(): void;
}
//# sourceMappingURL=event-emitter.d.ts.map