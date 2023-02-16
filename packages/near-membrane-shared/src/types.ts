export type Getter = () => any;
export type NearMembraneSerializedValue = bigint | boolean | number | string | symbol | undefined;
// eslint-disable-next-line no-shadow
export const enum ProxyHandlerTraps {
    None,
    Apply = 1 << 0,
    Construct = 1 << 1,
    DefineProperty = 1 << 2,
    DeleteProperty = 1 << 3,
    Get = 1 << 4,
    GetOwnPropertyDescriptor = 1 << 5,
    GetPrototypeOf = 1 << 6,
    Has = 1 << 7,
    IsExtensible = 1 << 8,
    OwnKeys = 1 << 9,
    PreventExtensions = 1 << 10,
    Set = 1 << 11,
    SetPrototypeOf = 1 << 12,
}
export type ProxyTarget = CallableFunction | NewableFunction | any[] | object;
export interface ProxyTrapInvokers {
    // We can add more trap invokers as needed.
    apply?: typeof Reflect.apply;
    construct?: typeof Reflect.construct;
    defineProperty?: typeof Reflect.defineProperty;
    get?: <T extends object, P extends PropertyKey>(
        target: T,
        propertyKey: P,
        receiver?: unknown,
        handshake?: boolean
    ) => P extends keyof T ? T[P] : any;
    getOwnPropertyDescriptor?: typeof Reflect.getOwnPropertyDescriptor;
    has?: typeof Reflect.has;
    set?: typeof Reflect.set;
}
export type Setter = (value: any) => void;
// eslint-disable-next-line no-shadow
export const enum TargetTraits {
    None,
    IsArray = 1 << 0,
    IsArrayBufferView = 1 << 1,
    IsFunction = 1 << 2,
    IsArrowFunction = 1 << 3,
    IsObject = 1 << 4,
    IsTypedArray = 1 << 5,
    Revoked = 1 << 6,
}
