import type {
    DistortionCallback,
    Instrumentation,
    LiveTargetCallback,
    SignSourceCallback,
} from '@locker/near-membrane-base';

export interface NodeEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    instrumentation?: Instrumentation;
    liveTargetCallback?: LiveTargetCallback;
    maxPerfMode?: boolean;
    signSourceCallback?: SignSourceCallback;
}
