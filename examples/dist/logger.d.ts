export declare class Logger {
    private _enabled;
    get enabled(): boolean;
    set enabled(value: boolean);
    log(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
//# sourceMappingURL=logger.d.ts.map