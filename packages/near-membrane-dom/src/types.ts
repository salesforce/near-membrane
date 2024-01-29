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
    keepAlive?: boolean;
    liveTargetCallback?: LiveTargetCallback;
    remapTypedArrays?: boolean;
    signSourceCallback?: SignSourceCallback;
}
