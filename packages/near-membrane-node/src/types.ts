import type {
    DistortionCallback,
    Instrumentation,
    LiveTargetCallback,
} from '@locker/near-membrane-base/types';

export interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
    liveTargetCallback?: LiveTargetCallback;
}
