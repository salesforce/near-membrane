export type DataType = boolean | object | number | string;

export interface Instrumentation {
    startActivity(activityName: string, data?: DataType): Activity;
    log(data?: DataType): void;
    error(data?: DataType): void;
}

export interface Activity {
    stop(data?: DataType): void;
    error(data?: DataType): void;
}
