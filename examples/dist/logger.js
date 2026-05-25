export class Logger {
    _enabled = false;
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
    }
    log(message, ...args) {
        if (this._enabled) {
            console.log(`[AudioLoom] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this._enabled) {
            console.warn(`[AudioLoom] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this._enabled) {
            console.error(`[AudioLoom] ${message}`, ...args);
        }
    }
}
//# sourceMappingURL=logger.js.map