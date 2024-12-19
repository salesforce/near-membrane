import type {
    DistortionCallback,
    Instrumentation,
    LiveTargetCallback,
    SignSourceCallback,
} from '@locker/near-membrane-base';

export interface BrowserEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    defaultPolicy?: object;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
    liveTargetCallback?: LiveTargetCallback;
    maxPerfMode?: boolean;
    signSourceCallback?: SignSourceCallback;
}
