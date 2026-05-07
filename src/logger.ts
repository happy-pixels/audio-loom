export class Logger {
    private _enabled: boolean = false;

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    log(message: string, ...args: unknown[]): void {
        if (this._enabled) {
            console.log(`[AudioLoom] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this._enabled) {
            console.warn(`[AudioLoom] ${message}`, ...args);
        }
    }

    error(message: string, ...args: unknown[]): void {
        if (this._enabled) {
            console.error(`[AudioLoom] ${message}`, ...args);
        }
    }
}
