// @ts-nocheck
import {
    createBlueConnector,
    createMembraneMarshall,
    createRedConnector,
    VirtualEnvironment,
} from '../../dist/index.mjs.js';

function createEnv(options = {}) {
    return new VirtualEnvironment({
        blueConnector: createBlueConnector(globalThis),
        redConnector: createRedConnector(globalThis.eval),
        ...options,
    });
}

describe('createMembraneMarshall', () => {
    it('returns a function (Connector)', () => {
        const connector = createMembraneMarshall(globalThis);
        expect(typeof connector).toBe('function');
    });
    it('returns a Connector that returns a HooksCallback', () => {
        const connector = createMembraneMarshall(globalThis);
        let hooksCalled = false;
        const result = connector('test', (...hooks) => {
            hooksCalled = true;
            expect(hooks.length).toBe(37);
        });
        expect(hooksCalled).toBe(true);
        expect(typeof result).toBe('function');
    });
    it('works without a globalObject argument', () => {
        expect(() => createMembraneMarshall()).not.toThrow();
    });
});

describe('Membrane proxy traps', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('get trap', () => {
        it('accesses properties on cross-realm objects', () => {
            const env = createEnv();
            globalThis.memTestGetObj = { x: 42, y: 'hello' };
            env.link('globalThis');
            expect(env.evaluate('memTestGetObj.x')).toBe(42);
            expect(env.evaluate('memTestGetObj.y')).toBe('hello');
            delete globalThis.memTestGetObj;
        });
        it('accesses nested properties', () => {
            const env = createEnv();
            globalThis.memTestNested = { a: { b: { c: 99 } } };
            env.link('globalThis');
            expect(env.evaluate('memTestNested.a.b.c')).toBe(99);
            delete globalThis.memTestNested;
        });
    });

    describe('set trap', () => {
        it('sets properties on cross-realm objects', () => {
            const env = createEnv({
                liveTargetCallback() {
                    return true;
                },
            });
            globalThis.memTestSetObj = { x: 1 };
            env.link('globalThis');
            env.evaluate('memTestSetObj.x = 100');
            expect(globalThis.memTestSetObj.x).toBe(100);
            delete globalThis.memTestSetObj;
        });
    });

    describe('has trap', () => {
        it('detects property existence with in operator', () => {
            const env = createEnv();
            globalThis.memTestHasObj = { present: true };
            env.link('globalThis');
            expect(env.evaluate('"present" in memTestHasObj')).toBe(true);
            expect(env.evaluate('"absent" in memTestHasObj')).toBe(false);
            delete globalThis.memTestHasObj;
        });
    });

    describe('deleteProperty trap', () => {
        it('deletes properties on cross-realm objects', () => {
            const env = createEnv({
                liveTargetCallback() {
                    return true;
                },
            });
            globalThis.memTestDelObj = { toDelete: 1, toKeep: 2 };
            env.link('globalThis');
            env.evaluate('delete memTestDelObj.toDelete');
            expect(globalThis.memTestDelObj.toDelete).toBeUndefined();
            expect(globalThis.memTestDelObj.toKeep).toBe(2);
            delete globalThis.memTestDelObj;
        });
    });

    describe('ownKeys trap', () => {
        it('returns own keys of cross-realm objects', () => {
            const env = createEnv();
            globalThis.memTestOwnKeysObj = { a: 1, b: 2, c: 3 };
            env.link('globalThis');
            const keys = env.evaluate('Object.keys(memTestOwnKeysObj)');
            expect(keys).toEqual(['a', 'b', 'c']);
            delete globalThis.memTestOwnKeysObj;
        });
    });

    describe('getOwnPropertyDescriptor trap', () => {
        it('returns descriptors for cross-realm objects', () => {
            const env = createEnv();
            globalThis.memTestGopdObj = {};
            Object.defineProperty(globalThis.memTestGopdObj, 'x', {
                value: 42,
                writable: false,
                enumerable: true,
                configurable: true,
            });
            env.link('globalThis');
            const desc = env.evaluate('Object.getOwnPropertyDescriptor(memTestGopdObj, "x")');
            expect(desc.value).toBe(42);
            expect(desc.writable).toBe(false);
            expect(desc.enumerable).toBe(true);
            expect(desc.configurable).toBe(true);
            delete globalThis.memTestGopdObj;
        });
    });

    describe('defineProperty trap', () => {
        it('defines properties on cross-realm objects', () => {
            const env = createEnv({
                liveTargetCallback() {
                    return true;
                },
            });
            globalThis.memTestDefObj = {};
            env.link('globalThis');
            env.evaluate(
                'Object.defineProperty(memTestDefObj, "defined", { value: 123, configurable: true })'
            );
            expect(globalThis.memTestDefObj.defined).toBe(123);
            delete globalThis.memTestDefObj;
        });
    });

    describe('getPrototypeOf trap', () => {
        it('returns prototype of cross-realm objects', () => {
            const env = createEnv();
            globalThis.memTestProtoObj = {};
            env.link('globalThis');
            expect(
                env.evaluate('Object.getPrototypeOf(memTestProtoObj) === Object.prototype')
            ).toBe(true);
            delete globalThis.memTestProtoObj;
        });
    });

    describe('isExtensible trap', () => {
        it('reports extensibility of cross-realm objects', () => {
            const env = createEnv();
            globalThis.memTestExtObj = {};
            env.link('globalThis');
            expect(env.evaluate('Object.isExtensible(memTestExtObj)')).toBe(true);
            delete globalThis.memTestExtObj;
        });
    });

    describe('apply trap', () => {
        it('calls functions across the membrane', () => {
            const env = createEnv();
            globalThis.memTestApplyFn = (a: number, b: number) => a + b;
            env.link('globalThis');
            expect(env.evaluate('memTestApplyFn(3, 4)')).toBe(7);
            delete globalThis.memTestApplyFn;
        });
        it('calls functions with 0 args', () => {
            const env = createEnv();
            globalThis.memTestNoArgsFn = () => 'zero';
            env.link('globalThis');
            expect(env.evaluate('memTestNoArgsFn()')).toBe('zero');
            delete globalThis.memTestNoArgsFn;
        });
        it('calls functions with 1 arg', () => {
            const env = createEnv();
            globalThis.memTestOneArgFn = (a: number) => a * 2;
            env.link('globalThis');
            expect(env.evaluate('memTestOneArgFn(5)')).toBe(10);
            delete globalThis.memTestOneArgFn;
        });
        it('calls functions with many args', () => {
            const env = createEnv();
            globalThis.memTestManyArgsFn = (...args: number[]) => args.reduce((s, n) => s + n, 0);
            env.link('globalThis');
            expect(env.evaluate('memTestManyArgsFn(1,2,3,4,5,6)')).toBe(21);
            delete globalThis.memTestManyArgsFn;
        });
    });

    describe('construct trap', () => {
        it('constructs instances across the membrane', () => {
            const env = createEnv();
            globalThis.memTestCtor = class {
                value: number;

                constructor(v: number) {
                    this.value = v;
                }
            };
            env.link('globalThis');
            const result = env.evaluate('new memTestCtor(42)');
            expect(result.value).toBe(42);
            delete globalThis.memTestCtor;
        });
    });

    describe('frozen objects across the membrane', () => {
        it('preserves frozen state', () => {
            const env = createEnv();
            globalThis.memTestFrozenObj = Object.freeze({ a: 1, b: 2 });
            env.link('globalThis');
            expect(env.evaluate('Object.isFrozen(memTestFrozenObj)')).toBe(true);
            expect(env.evaluate('memTestFrozenObj.a')).toBe(1);
            delete globalThis.memTestFrozenObj;
        });
    });

    describe('non-extensible objects across the membrane', () => {
        it('preserves non-extensible state', () => {
            const env = createEnv();
            globalThis.memTestNonExtObj = Object.preventExtensions({ a: 1 });
            env.link('globalThis');
            expect(env.evaluate('Object.isExtensible(memTestNonExtObj)')).toBe(false);
            delete globalThis.memTestNonExtObj;
        });
    });

    describe('sealed objects across the membrane', () => {
        it('preserves sealed state', () => {
            const env = createEnv();
            globalThis.memTestSealedObj = Object.seal({ a: 1 });
            env.link('globalThis');
            expect(env.evaluate('Object.isSealed(memTestSealedObj)')).toBe(true);
            delete globalThis.memTestSealedObj;
        });
    });

    describe('error propagation across traps', () => {
        it('propagates errors thrown in blue functions to red', () => {
            const env = createEnv();
            globalThis.memTestThrowFn = () => {
                throw new TypeError('blue error');
            };
            env.link('globalThis');
            expect(() => env.evaluate('memTestThrowFn()')).toThrow('blue error');
            delete globalThis.memTestThrowFn;
        });
        it('propagates errors thrown in red to blue', () => {
            const env = createEnv();
            expect(() => env.evaluate('throw new TypeError("red error")')).toThrow('red error');
        });
    });
});
