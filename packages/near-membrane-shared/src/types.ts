export type Getter = () => any;
export type NearMembraneSerializedValue = bigint | boolean | number | string | symbol;
export type ProxyTarget = CallableFunction | any[] | object;
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
