const ErrorCtor = Error;

export function validateRequiredObjects(
    globalObjectShape: object,
    globalObjectVirtualizationTarget: typeof globalThis
): undefined | never {
    if (!globalObjectShape) {
        throw new ErrorCtor(`Missing global object shape.`);
    }
    if (!globalObjectVirtualizationTarget) {
        throw new ErrorCtor(`Missing global object virtualization target.`);
    }
    return undefined;
}
