import { Subject } from 'rxjs';
/**
 * Centralized event emitter for audio events using RxJS.
 * All audio-related events flow through this class.
 */
export class EventEmitter {
    // Event subjects (private, for internal use)
    trackStartSubject = new Subject();
    trackEndSubject = new Subject();
    loadCompleteSubject = new Subject();
    errorSubject = new Subject();
    positionUpdateSubject = new Subject();
    orientationUpdateSubject = new Subject();
    distanceThresholdSubject = new Subject();
    /**
     * Observable that emits when a track starts playing.
     */
    onTrackStart$ = this.trackStartSubject.asObservable();
    /**
     * Observable that emits when a track finishes playing.
     */
    onTrackEnd$ = this.trackEndSubject.asObservable();
    /**
     * Observable that emits when a track's metadata is loaded and ready to play.
     */
    onLoadComplete$ = this.loadCompleteSubject.asObservable();
    /**
     * Observable that emits when an audio error occurs.
     */
    onError$ = this.errorSubject.asObservable();
    /**
     * Observable that emits when a 3D sound's position is updated.
     */
    onPositionUpdate$ = this.positionUpdateSubject.asObservable();
    /**
     * Observable that emits when a 3D sound's orientation is updated.
     */
    onOrientationUpdate$ = this.orientationUpdateSubject.asObservable();
    /**
     * Observable that emits when a 3D sound crosses a distance threshold.
     */
    onDistanceThreshold$ = this.distanceThresholdSubject.asObservable();
    /**
     * Emits a track start event.
     */
    emitTrackStart(event) {
        this.trackStartSubject.next(event);
    }
    /**
     * Emits a track end event.
     */
    emitTrackEnd(event) {
        this.trackEndSubject.next(event);
    }
    /**
     * Emits a load complete event.
     */
    emitLoadComplete(event) {
        this.loadCompleteSubject.next(event);
    }
    /**
     * Emits an error event.
     */
    emitError(event) {
        this.errorSubject.next(event);
    }
    /**
     * Emits a position update event.
     */
    emitPositionUpdate(event) {
        this.positionUpdateSubject.next(event);
    }
    /**
     * Emits an orientation update event.
     */
    emitOrientationUpdate(event) {
        this.orientationUpdateSubject.next(event);
    }
    /**
     * Emits a distance threshold event.
     */
    emitDistanceThreshold(event) {
        this.distanceThresholdSubject.next(event);
    }
    /**
     * Completes all subjects and cleans up resources.
     */
    destroy() {
        this.trackStartSubject.complete();
        this.trackEndSubject.complete();
        this.loadCompleteSubject.complete();
        this.errorSubject.complete();
        this.positionUpdateSubject.complete();
        this.orientationUpdateSubject.complete();
        this.distanceThresholdSubject.complete();
    }
}
//# sourceMappingURL=event-emitter.js.map