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

// Mock AudioContext
class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime: number = 0;
    sampleRate: number = 44100;
    destination: MockAudioDestinationNode = new MockAudioDestinationNode();

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
    MockAudioBuffer,
    MockHTMLAudioElement,
    mockFetch
};
