// https://caniuse.com/bigint
export const SUPPORTS_BIG_INT = typeof BigInt === 'function';

export const BigIntProtoValueOf = SUPPORTS_BIG_INT
    ? BigInt.prototype.valueOf
    : /* istanbul ignore next: currently unreachable via tests */ undefined;
