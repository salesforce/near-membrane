'use strict';

const {
    prototype: { toJSON: originalDateProtoToJSON },
} = Date;
const { stringify: originalJSONStringify } = JSON;

const defaultGlobalThisKeysLookup = new Set(Reflect.ownKeys(globalThis));

beforeEach(() => {
    // Restore original methods.
    // eslint-disable-next-line no-extend-native
    Date.prototype.toJSON = originalDateProtoToJSON;
    JSON.stringify = originalJSONStringify;
    // Cleanup global object pollution after each test.
    const ownKeys = Reflect.ownKeys(globalThis);
    for (const ownKey of ownKeys) {
        if (!defaultGlobalThisKeysLookup.has(ownKey)) {
            delete globalThis[ownKey];
        }
    }
});
