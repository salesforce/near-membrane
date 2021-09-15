export interface Activity {
    start: () => Activity;
    stop: () => Activity;
}

export interface Instrumentation {
    activityBeacon: (activityName: string) => Activity;
    errorBeacon: (sandboxKey: string, e: Error) => void;
    logBeacon: (sandboxKey: string, message: string) => void;
}
