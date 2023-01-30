export function noop() {
    // No operation performed.
}

export function identity<T>(value: T): T {
    return value;
}
