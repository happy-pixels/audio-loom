import { Subject, Observable } from 'rxjs';
import {
    TrackStartEvent,
    TrackEndEvent,
    LoadCompleteEvent,
    AudioErrorEvent,
    PositionUpdateEvent,
    OrientationUpdateEvent,
    DistanceThresholdEvent
} from '../types';

/**
 * Centralized event emitter for audio events using RxJS.
 * All audio-related events flow through this class.
 */
export class EventEmitter {
    // Event subjects (private, for internal use)
    private readonly trackStartSubject = new Subject<TrackStartEvent>();
    private readonly trackEndSubject = new Subject<TrackEndEvent>();
    private readonly loadCompleteSubject = new Subject<LoadCompleteEvent>();
    private readonly errorSubject = new Subject<AudioErrorEvent>();
    private readonly positionUpdateSubject = new Subject<PositionUpdateEvent>();
    private readonly orientationUpdateSubject = new Subject<OrientationUpdateEvent>();
    private readonly distanceThresholdSubject = new Subject<DistanceThresholdEvent>();

    /**
     * Observable that emits when a track starts playing.
     */
    readonly onTrackStart$: Observable<TrackStartEvent> = this.trackStartSubject.asObservable();

    /**
     * Observable that emits when a track finishes playing.
     */
    readonly onTrackEnd$: Observable<TrackEndEvent> = this.trackEndSubject.asObservable();

    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     */
    readonly onLoadComplete$: Observable<LoadCompleteEvent> = this.loadCompleteSubject.asObservable();

    /**
     * Observable that emits when an audio error occurs.
     */
    readonly onError$: Observable<AudioErrorEvent> = this.errorSubject.asObservable();

    /**
     * Observable that emits when a 3D sound's position is updated.
     */
    readonly onPositionUpdate$: Observable<PositionUpdateEvent> = this.positionUpdateSubject.asObservable();

    /**
     * Observable that emits when a 3D sound's orientation is updated.
     */
    readonly onOrientationUpdate$: Observable<OrientationUpdateEvent> = this.orientationUpdateSubject.asObservable();

    /**
     * Observable that emits when a 3D sound crosses a distance threshold.
     */
    readonly onDistanceThreshold$: Observable<DistanceThresholdEvent> = this.distanceThresholdSubject.asObservable();

    /**
     * Emits a track start event.
     */
    emitTrackStart(event: TrackStartEvent): void {
        this.trackStartSubject.next(event);
    }

    /**
     * Emits a track end event.
     */
    emitTrackEnd(event: TrackEndEvent): void {
        this.trackEndSubject.next(event);
    }

    /**
     * Emits a load complete event.
     */
    emitLoadComplete(event: LoadCompleteEvent): void {
        this.loadCompleteSubject.next(event);
    }

    /**
     * Emits an error event.
     */
    emitError(event: AudioErrorEvent): void {
        this.errorSubject.next(event);
    }

    /**
     * Emits a position update event.
     */
    emitPositionUpdate(event: PositionUpdateEvent): void {
        this.positionUpdateSubject.next(event);
    }

    /**
     * Emits an orientation update event.
     */
    emitOrientationUpdate(event: OrientationUpdateEvent): void {
        this.orientationUpdateSubject.next(event);
    }

    /**
     * Emits a distance threshold event.
     */
    emitDistanceThreshold(event: DistanceThresholdEvent): void {
        this.distanceThresholdSubject.next(event);
    }

    /**
     * Completes all subjects and cleans up resources.
     */
    destroy(): void {
        this.trackStartSubject.complete();
        this.trackEndSubject.complete();
        this.loadCompleteSubject.complete();
        this.errorSubject.complete();
        this.positionUpdateSubject.complete();
        this.orientationUpdateSubject.complete();
        this.distanceThresholdSubject.complete();
    }
}
