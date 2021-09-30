/* eslint-disable no-throw-literal, no-new, class-methods-use-this */
import createVirtualEnvironment from '@locker/near-membrane-dom';

it('[red] non-error objects thrown in red functions', () => {
    const evalScript = createVirtualEnvironment({ endowments: { expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { done, expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({
        endowments: Object.assign({}, window, { done, expect }),
    });
    evalScript(`
        const errorObj = { foo: 'bar' }

        function handler(event) {
            expect(event.reason).toBe(errorObj)
            expect(event.reason.foo).toBe('bar')
            expect(event.reason.message).toBe(undefined)
            window.removeEventListener('unhandledrejection', handler)
            done()
        }
        
        window.addEventListener("unhandledrejection", handler)

        new Promise((resolve, reject) => {
            throw errorObj
        })
    `);
});

it('[red] Promise.reject non-error objects', (done) => {
    const evalScript = createVirtualEnvironment({ endowments: { done, expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({
        endowments: Object.assign({}, window, { done, expect }),
    });
    evalScript(`
        const errorObj = { foo: 'bar' }

        function handler(event) {
            expect(event.reason).toBe(errorObj)
            expect(event.reason.foo).toBe('bar')
            expect(event.reason.message).toBe(undefined)
            window.removeEventListener('unhandledrejection', handler)
            done()
        }
        
        window.addEventListener("unhandledrejection", handler)
        new Promise((resolve, reject) => {
            reject(errorObj)
        })
    `);
});

it('[red] non-error objects thrown in blue functions', () => {
    function foo() {
        throw { foo: 'bar' };
    }

    const evalScript = createVirtualEnvironment({ endowments: { foo, expect } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { Foo, expect } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { Foo, expect } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { promise, expect, done } });
    evalScript(`
        promise.catch(e => {
            expect(e.foo).toBe('bar')
            expect(e.message).toBe(undefined)
            done()
        })
    `);
});

it('[red] non-error object with null proto', () => {
    const evalScript = createVirtualEnvironment({ endowments: { expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { foo, expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { expect } });
    evalScript(`
        try {
            throw new Error('foo')
        } catch(e) {
            expect(e instanceof Error).toBe(true)
            expect(e.message).toBe('foo')
        }
    `);
});

it('[red] instanceof extended Error objects', () => {
    const evalScript = createVirtualEnvironment({ endowments: { expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { done, expect } });
    evalScript(`
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
    const evalScript = createVirtualEnvironment({ endowments: { foo, expect } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { promise, expect, done } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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
    function handler(event) {
        expect(event.reason.foo).toBe('bar');
        expect(event.reason.message).toBe(undefined);
        window.removeEventListener('unhandledrejection', handler);
        done();
    }

    window.addEventListener('unhandledrejection', handler);

    const evalScript = createVirtualEnvironment({ endowments: window });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`    
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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

    const evalScript = createVirtualEnvironment({ endowments: { save } });
    evalScript(`
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
