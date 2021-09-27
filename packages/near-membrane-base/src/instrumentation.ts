export type InstrumentationDataType = object | string | number | boolean;

export interface InstrumentationHooks {
    startActivity(activityName: string, data?: InstrumentationDataType): Activity;
    log(data: InstrumentationDataType): void;
    error(data: InstrumentationDataType): void;
}

export interface Activity {
    stop(data?: InstrumentationDataType): void;
    error(data?: InstrumentationDataType): void;
}
