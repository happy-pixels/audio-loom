import { vi } from 'vitest';

// Mock AudioParam
class MockAudioParam {
    value: number = 1;
    defaultValue: number = 1;
    minValue: number = 0;
    maxValue: number = 1;

    setValueAtTime(value: number, _time: number): MockAudioParam {
        this.value = value;
        return this;
    }

    linearRampToValueAtTime(value: number, _time: number): MockAudioParam {
        this.value = value;
        return this;
    }

    exponentialRampToValueAtTime(value: number, _time: number): MockAudioParam {
        this.value = value;
        return this;
    }

    cancelScheduledValues(_time: number): MockAudioParam {
        return this;
    }
}

// Mock GainNode
class MockGainNode {
    gain: MockAudioParam = new MockAudioParam();
    private connections: MockAudioNode[] = [];

    connect(destination: MockAudioNode): MockAudioNode {
        this.connections.push(destination);
        return destination;
    }

    disconnect(): void {
        this.connections = [];
    }
}

// Mock AudioNode base
class MockAudioNode {
    private connections: MockAudioNode[] = [];

    connect(destination: MockAudioNode): MockAudioNode {
        this.connections.push(destination);
        return destination;
    }

    disconnect(): void {
        this.connections = [];
    }
}

// Mock AudioBufferSourceNode
class MockAudioBufferSourceNode extends MockAudioNode {
    buffer: AudioBuffer | null = null;
    playbackRate: MockAudioParam = new MockAudioParam();
    onended: (() => void) | null = null;
    private started: boolean = false;

    start(_when?: number, _offset?: number, _duration?: number): void {
        this.started = true;
    }

    stop(_when?: number): void {
        this.started = false;
        if (this.onended) {
            this.onended();
        }
    }
}

// Mock MediaElementAudioSourceNode
class MockMediaElementAudioSourceNode extends MockAudioNode {
    mediaElement: HTMLMediaElement;

    constructor(mediaElement: HTMLMediaElement) {
        super();
        this.mediaElement = mediaElement;
    }
}

// Mock ConvolverNode
class MockConvolverNode extends MockAudioNode {
    buffer: AudioBuffer | null = null;
    normalize: boolean = true;
}

// Mock BiquadFilterNode
class MockBiquadFilterNode extends MockAudioNode {
    type: BiquadFilterType = 'lowpass';
    frequency: MockAudioParam = new MockAudioParam();
    Q: MockAudioParam = new MockAudioParam();
    gain: MockAudioParam = new MockAudioParam();
    detune: MockAudioParam = new MockAudioParam();

    constructor() {
        super();
        this.frequency.value = 350;
        this.frequency.defaultValue = 350;
        this.frequency.minValue = 0;
        this.frequency.maxValue = 24000;
        this.Q.value = 1;
        this.Q.defaultValue = 1;
        this.Q.minValue = 0.0001;
        this.Q.maxValue = 1000;
    }

    getFrequencyResponse(
        _frequencyArray: Float32Array,
        _magResponseOutput: Float32Array,
        _phaseResponseOutput: Float32Array
    ): void {}
}

// Mock PannerNode
class MockPannerNode extends MockAudioNode {
    positionX: MockAudioParam = new MockAudioParam();
    positionY: MockAudioParam = new MockAudioParam();
    positionZ: MockAudioParam = new MockAudioParam();
    orientationX: MockAudioParam = new MockAudioParam();
    orientationY: MockAudioParam = new MockAudioParam();
    orientationZ: MockAudioParam = new MockAudioParam();

    distanceModel: DistanceModelType = 'inverse';
    panningModel: PanningModelType = 'HRTF';
    refDistance: number = 1;
    maxDistance: number = 10000;
    rolloffFactor: number = 1;
    coneInnerAngle: number = 360;
    coneOuterAngle: number = 360;
    coneOuterGain: number = 0;

    constructor() {
        super();
        this.positionX.value = 0;
        this.positionY.value = 0;
        this.positionZ.value = 0;
        this.orientationX.value = 1;
        this.orientationY.value = 0;
        this.orientationZ.value = 0;
    }

    // Deprecated methods for fallback
    setPosition(x: number, y: number, z: number): void {
        this.positionX.value = x;
        this.positionY.value = y;
        this.positionZ.value = z;
    }

    setOrientation(x: number, y: number, z: number): void {
        this.orientationX.value = x;
        this.orientationY.value = y;
        this.orientationZ.value = z;
    }
}

// Mock StereoPannerNode
class MockStereoPannerNode extends MockAudioNode {
    pan: MockAudioParam = new MockAudioParam();

    constructor() {
        super();
        this.pan.value = 0;
        this.pan.defaultValue = 0;
        this.pan.minValue = -1;
        this.pan.maxValue = 1;
    }
}

// Mock AudioDestinationNode
class MockAudioDestinationNode extends MockAudioNode {
    maxChannelCount: number = 2;
}

// Mock AudioBuffer
class MockAudioBuffer {
    sampleRate: number;
    length: number;
    duration: number;
    numberOfChannels: number;

    constructor(options: { length: number; sampleRate: number; numberOfChannels?: number }) {
        this.length = options.length;
        this.sampleRate = options.sampleRate;
        this.numberOfChannels = options.numberOfChannels || 2;
        this.duration = this.length / this.sampleRate;
    }

    getChannelData(_channel: number): Float32Array {
        return new Float32Array(this.length);
    }

    copyFromChannel(_destination: Float32Array, _channelNumber: number, _bufferOffset?: number): void {}
    copyToChannel(_source: Float32Array, _channelNumber: number, _bufferOffset?: number): void {}
}

// Mock AudioListener
class MockAudioListener {
    positionX: MockAudioParam = new MockAudioParam();
    positionY: MockAudioParam = new MockAudioParam();
    positionZ: MockAudioParam = new MockAudioParam();
    forwardX: MockAudioParam = new MockAudioParam();
    forwardY: MockAudioParam = new MockAudioParam();
    forwardZ: MockAudioParam = new MockAudioParam();
    upX: MockAudioParam = new MockAudioParam();
    upY: MockAudioParam = new MockAudioParam();
    upZ: MockAudioParam = new MockAudioParam();

    constructor() {
        // Initialize with default orientation (facing -Z, up is +Y)
        this.positionX.value = 0;
        this.positionY.value = 0;
        this.positionZ.value = 0;
        this.forwardX.value = 0;
        this.forwardY.value = 0;
        this.forwardZ.value = -1;
        this.upX.value = 0;
        this.upY.value = 1;
        this.upZ.value = 0;
    }

    // Deprecated methods for older browser fallback
    setPosition(x: number, y: number, z: number): void {
        this.positionX.value = x;
        this.positionY.value = y;
        this.positionZ.value = z;
    }

    setOrientation(
        forwardX: number, forwardY: number, forwardZ: number,
        upX: number, upY: number, upZ: number
    ): void {
        this.forwardX.value = forwardX;
        this.forwardY.value = forwardY;
        this.forwardZ.value = forwardZ;
        this.upX.value = upX;
        this.upY.value = upY;
        this.upZ.value = upZ;
    }
}

// Mock AudioContext
class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime: number = 0;
    sampleRate: number = 44100;
    destination: MockAudioDestinationNode = new MockAudioDestinationNode();
    listener: MockAudioListener = new MockAudioListener();

    private intervalId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Simulate time progression
        this.intervalId = setInterval(() => {
            this.currentTime += 0.01;
        }, 10);
    }

    createGain(): MockGainNode {
        return new MockGainNode();
    }

    createBufferSource(): MockAudioBufferSourceNode {
        return new MockAudioBufferSourceNode();
    }

    createMediaElementSource(mediaElement: HTMLMediaElement): MockMediaElementAudioSourceNode {
        return new MockMediaElementAudioSourceNode(mediaElement);
    }

    createConvolver(): MockConvolverNode {
        return new MockConvolverNode();
    }

    createBiquadFilter(): MockBiquadFilterNode {
        return new MockBiquadFilterNode();
    }

    createPanner(): MockPannerNode {
        return new MockPannerNode();
    }

    createStereoPanner(): MockStereoPannerNode {
        return new MockStereoPannerNode();
    }

    async decodeAudioData(audioData: ArrayBuffer): Promise<MockAudioBuffer> {
        return new MockAudioBuffer({
            length: audioData.byteLength,
            sampleRate: this.sampleRate
        });
    }

    async resume(): Promise<void> {
        this.state = 'running';
    }

    async suspend(): Promise<void> {
        this.state = 'suspended';
    }

    async close(): Promise<void> {
        this.state = 'closed';
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}

// Mock HTMLAudioElement
class MockHTMLAudioElement {
    src: string = '';
    currentTime: number = 0;
    duration: number = 0;
    volume: number = 1;
    playbackRate: number = 1;
    paused: boolean = true;
    readyState: number = 0;
    preload: string = 'auto';

    private eventListeners: Map<string, Set<EventListener>> = new Map();

    constructor(src?: string) {
        if (src) {
            this.src = src;
        }
    }

    addEventListener(type: string, listener: EventListener): void {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, new Set());
        }
        this.eventListeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: EventListener): void {
        this.eventListeners.get(type)?.delete(listener);
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(listener => listener(event));
        }
        return true;
    }

    play(): Promise<void> {
        this.paused = false;
        return Promise.resolve();
    }

    pause(): void {
        this.paused = true;
    }

    load(): void {
        this.readyState = 4;
        this.duration = 180; // 3 minutes default
        // Simulate loadedmetadata event
        setTimeout(() => {
            this.dispatchEvent(new Event('loadedmetadata'));
        }, 0);
    }

    // Helper to simulate track ending
    simulateEnded(): void {
        this.dispatchEvent(new Event('ended'));
    }

    // Helper to simulate error
    simulateError(): void {
        this.dispatchEvent(new Event('error'));
    }
}

// Mock fetch for audio loading
const mockFetch = vi.fn().mockImplementation(async (url: string) => {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => new ArrayBuffer(1024),
        url
    };
});

// Install global mocks
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('Audio', MockHTMLAudioElement);
vi.stubGlobal('fetch', mockFetch);

// Export mocks for test access
export {
    MockAudioContext,
    MockAudioParam,
    MockGainNode,
    MockAudioNode,
    MockAudioBufferSourceNode,
    MockMediaElementAudioSourceNode,
    MockConvolverNode,
    MockBiquadFilterNode,
    MockPannerNode,
    MockStereoPannerNode,
    MockAudioListener,
    MockAudioBuffer,
    MockHTMLAudioElement,
    mockFetch
};
