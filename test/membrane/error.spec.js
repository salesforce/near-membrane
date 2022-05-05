/* eslint-disable no-throw-literal, no-new, class-methods-use-this */
import createVirtualEnvironment from '@locker/near-membrane-dom';

const onerrorHandler = (function (originalOnError) {
    return function onerror(...args) {
        const { 0: message } = args;
        // Suppress Jasmine's built-in unhandled promise rejection handling.
        if (!String(message).startsWith('Unhandled promise rejection:')) {
            Reflect.apply(originalOnError, globalThis, args);
        }
    };
})(globalThis.onerror);

it('[red] non-error objects thrown in red functions', () => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }
        function foo() {
            throw errorObj
        }

        try {
            foo()
        } catch(e) {
            expect(e.foo).toBe('bar')
            expect(e).toBe(errorObj)
            expect(e.message).toBe(undefined)
        }
    `);
});

it('[red] non-error objects thrown in red constructors', () => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }

        class Foo {
            constructor() {
                throw errorObj
            }
        }

        try {
            new Foo()
        } catch(e) {
            expect(e.foo).toBe('bar')
            expect(e).toBe(errorObj)
            expect(e.message).toBe(undefined)
        }
    `);
});

it('[red] non-error objects thrown in Promise', (done) => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ done, expect }),
    });

    env.evaluate(`
        const error = { foo: 'bar' }
        const p = new Promise(() => {
            throw error
        })
        p.catch((e) => {
            expect(e.foo).toBe('bar')
            expect(e).toBe(error)
            expect(e.message).toBe(undefined)
            done()
        })
    `);
});

it('[red] unhandled promise rejections with non-error objects and red listener', (done) => {
    globalThis.onerror = onerrorHandler;

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ done, expect }),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }

        function handler(event) {
            window.removeEventListener('unhandledrejection', handler)
            event.preventDefault()
            expect(event.reason).toBe(errorObj)
            expect(event.reason.foo).toBe('bar')
            expect(event.reason.message).toBe(undefined)
            done()
        }

        window.addEventListener('unhandledrejection', handler)

        new Promise((resolve, reject) => {
            throw errorObj
        })
    `);
});

it('[red] Promise.reject non-error objects', (done) => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ done, expect }),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }

        new Promise((resolve, reject) => {
            reject(errorObj)
        }).catch(e => {
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe('bar')
            done()
        })
    `);
});

it('[red] unhandled promise rejections and Promise.reject with non-error objects and red listener', (done) => {
    globalThis.onerror = onerrorHandler;

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ done, expect }),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }

        function handler(event) {
            window.removeEventListener('unhandledrejection', handler)
            event.preventDefault()
            expect(event.reason).toBe(errorObj)
            expect(event.reason.foo).toBe('bar')
            expect(event.reason.message).toBe(undefined)
            done()
        }

        window.addEventListener('unhandledrejection', handler)
        new Promise((resolve, reject) => {
            reject(errorObj)
        })
    `);
});

it('[red] non-error objects thrown in blue functions', () => {
    function foo() {
        throw { foo: 'bar' };
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, foo }),
    });

    env.evaluate(`
        try {
            foo()
        } catch (e) {
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe('bar')
        }
    `);
});

it('[red] non-error objects thrown in blue constructors', () => {
    class Foo {
        constructor() {
            throw { foo: 'bar' };
        }
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, Foo }),
    });

    env.evaluate(`
        try {
            new Foo()
        } catch (e) {
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe('bar')
        }
    `);
});

it('[red] blue extended error objects', () => {
    class CustomError extends Error {
        constructor(message) {
            super(message);
            this.bar = 'baz';
        }

        get foo() {
            return 'bar';
        }
    }

    class Foo {
        constructor() {
            throw new CustomError('foo');
        }
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, Foo }),
    });

    env.evaluate(`
        try {
            new Foo()
        } catch (e) {
            expect(e.foo).toBe('bar')
            expect(e.bar).toBe('baz')
            expect(e.message).toBe('foo')
        }
    `);
});

it('[red] .catch on blue promise', (done) => {
    const promise = new Promise(() => {
        throw { foo: 'bar' };
    });

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, done, expect, promise }),
    });

    env.evaluate(`
        promise.catch(e => {
            expect(e.foo).toBe('bar')
            expect(e.message).toBe(undefined)
            done()
        })
    `);
});

it('[red] non-error object with null proto', () => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
    });

    env.evaluate(`
        const errorObj = Object.create(null, {foo: {value: 'bar'}})
        try {
            throw errorObj
        } catch(e) {
            expect(errorObj).toBe(errorObj)
            expect(Reflect.getPrototypeOf(errorObj)).toBe(null)
            expect(errorObj.message).toBe(undefined)
            expect(errorObj.foo).toBe('bar')
        }
    `);
});

it('[red] non-error object with null proto from blue', () => {
    function foo() {
        throw Object.create(null, { foo: { value: 'bar' } });
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, foo }),
    });

    env.evaluate(`
        try {
            foo()
        } catch(e) {
            expect(Reflect.getPrototypeOf(e)).toBe(null)
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe('bar')
        }
    `);
});

it('[red] instanceof Error', () => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
    });

    env.evaluate(`
        try {
            throw new Error('foo')
        } catch(e) {
            expect(e instanceof Error).toBe(true)
            expect(e.message).toBe('foo')
        }
    `);
});

it('[red] instanceof extended Error objects', () => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect }),
    });

    env.evaluate(`
        class CustomError extends Error {}
        try {
            throw new CustomError('foo')
        } catch(e) {
            expect(e instanceof CustomError).toBe(true)
            expect(e.message).toBe('foo')
        }
    `);
});

it('[red] .catch instanceof Error', (done) => {
    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, done }),
    });

    env.evaluate(`
        new Promise((resolve, reject) => {
            reject(new Error('foo'))
        }).catch(e => {
            expect(e instanceof Error).toBe(true)
            expect(e.message).toBe('foo')
            done()
        })
    `);
});

it('[red] instanceof blue Error objects', () => {
    function foo() {
        throw new Error('foo');
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ expect, foo }),
    });

    env.evaluate(`
        try {
            foo()
        } catch(e) {
            expect(e instanceof Error).toBe(true)
            expect(e.message).toBe('foo')
        }
    `);
});

it('[red] .catch instanceof blue Error objects', (done) => {
    const promise = new Promise((resolve, reject) => {
        reject(new Error('foo'));
    });

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ done, expect, promise }),
    });

    env.evaluate(`
        promise.catch(e => {
            expect(e instanceof Error).toBe(true)
            expect(e.message).toBe('foo')
            done()
        })
    `);
});

it('[blue] .catch on red promise', (done) => {
    let promise;

    function save(arg) {
        promise = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        const error = { foo: 'bar' }
        const p = new Promise(() => {
            throw error
        })

        save(p)
    `);

    promise.catch((e) => {
        expect(e.foo).toBe('bar');
        expect(e.message).toBe(undefined);
        done();
    });
});

it('[blue] unhandled promise rejections listener with red non-error objects', (done) => {
    globalThis.onerror = onerrorHandler;

    function handler(event) {
        window.removeEventListener('unhandledrejection', handler);
        event.preventDefault();
        expect(event.reason.foo).toBe('bar');
        expect(event.reason.message).toBe(undefined);
        done();
    }

    window.addEventListener('unhandledrejection', handler);

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors(window),
    });

    env.evaluate(`
        const errorObj = { foo: 'bar' }
        new Promise((resolve, reject) => {
            throw errorObj
        })
    `);
});

it('[blue] non-error objects thrown in red functions', () => {
    let fn;
    function save(arg) {
        fn = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        function foo() {
            throw { foo: 'bar' }
        }
        save(foo)
    `);

    try {
        fn();
    } catch (e) {
        expect(e.message).toBe(undefined);
        expect(e.foo).toBe('bar');
    }
});

it('[blue] non-error objects thrown in red consturctors', () => {
    let ctor;
    function save(arg) {
        ctor = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        class Foo {
            constructor() {
                throw { foo: 'bar' }
            }
        }
        save(Foo)
    `);

    try {
        // eslint-disable-next-line no-new
        new ctor();
    } catch (e) {
        expect(e.message).toBe(undefined);
        expect(e.foo).toBe('bar');
    }
});

it('[blue] red extended error objects', () => {
    let ctor;
    function save(arg) {
        ctor = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        class CustomError extends Error {
            constructor(message) {
                super(message)
                this.bar = 'baz'
            }

            get foo() {
                return 'bar'
            }
        }

        class Foo {
            constructor() {
                throw new CustomError('foo')
            }
        }

        save(Foo)
    `);

    try {
        // eslint-disable-next-line no-new
        new ctor();
    } catch (e) {
        expect(e.message).toBe('foo');
        expect(e.bar).toBe('baz');
        expect(e.foo).toBe('bar');
    }
});

it('[blue] non-error objects with null proto from red', () => {
    let fn;
    function save(arg) {
        fn = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        function foo() {
            const errorObj = Object.create(null, {foo: {value: 'bar'}})
            throw errorObj
        }

        save(foo)
    `);

    try {
        fn();
    } catch (e) {
        expect(Reflect.getPrototypeOf(e)).toBe(null);
        expect(e.message).toBe(undefined);
        expect(e.foo).toBe('bar');
    }
});

it('[blue] instanceof red error', () => {
    let fn;
    function save(arg) {
        fn = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        function foo() {
            throw new Error('foo')
        }

        save(foo)
    `);

    try {
        fn();
    } catch (e) {
        expect(e instanceof Error).toBe(true);
        expect(e.message).toBe('foo');
    }
});

it('[blue] .catch instanceof red error', (done) => {
    let promise;
    function save(arg) {
        promise = arg;
    }

    const env = createVirtualEnvironment(window, {
        endowments: Object.getOwnPropertyDescriptors({ ...window, save }),
    });

    env.evaluate(`
        const promise = new Promise((resolve, reject) => {
            reject(new Error('foo'))
        })

        save(promise)
    `);

    promise.catch((e) => {
        expect(e instanceof Error).toBe(true);
        expect(e.message).toBe('foo');
        done();
    });
});
