import { DistortionCallback, Instrumentation } from '@locker/near-membrane-base/types';

export interface BrowserEnvironmentOptions {
    distortionCallback?: DistortionCallback;
    endowments?: PropertyDescriptorMap;
    globalObjectShape?: object;
    keepAlive?: boolean;
    instrumentation?: Instrumentation;
}
