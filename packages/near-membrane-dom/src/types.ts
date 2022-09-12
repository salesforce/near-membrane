import type {
    DistortionCallback,
    Instrumentation,
    LiveTargetCallback,
} from '@locker/near-membrane-base/types';

export interface BrowserEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
    keepAlive?: boolean;
    liveTargetCallback?: LiveTargetCallback;
}
