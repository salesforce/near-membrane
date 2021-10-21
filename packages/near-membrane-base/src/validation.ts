const TypeErrorCtor = TypeError;

export function validateRequiredGlobalShapeAndVirtualizationObjects(
    globalObjectShape: object,
    globalObjectVirtualizationTarget: typeof globalThis
): undefined | never {
    if (!globalObjectShape) {
        throw new TypeErrorCtor('Missing global object shape.');
    }
    if (!globalObjectVirtualizationTarget) {
        throw new TypeErrorCtor('Missing global object virtualization target.');
    }
    return undefined;
}
