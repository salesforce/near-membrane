import createSecureEnvironment from '../../lib/browser-realm.js'

it('non-error objects thrown in red functions', () => {
    const evalScript = createSecureEnvironment(undefined, { expect })
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
    `)
})

it('non-error objects thrown in red constructors', () => {
    const evalScript = createSecureEnvironment(undefined, { expect })
    evalScript(`
        const errorObj = { foo: 'bar' }
        
        class Foo {
            constructor() {
                throw errorObj;
            }
        }

        try {
            new Foo()
        } catch(e) {
            expect(e.foo).toBe('bar')
            expect(e).toBe(errorObj)
            expect(e.message).toBe(undefined)
        }
    `)
})

it('non-error objects thrown in Promise', (done) => {
    const evalScript = createSecureEnvironment(undefined, { done, expect })
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
    `)
})

it('non-error objects thrown in Promise handled in blue', (done) => {
    let promise;

    function save(arg) {
        promise = arg;
    }

    const evalScript = createSecureEnvironment(undefined, { save })
    evalScript(`
        const error = { foo: 'bar' }
        const p = new Promise(() => {
            throw error
        })
        
        save(p);
    `)

    promise.catch((e) => {
        expect(e.foo).toBe(undefined)
        expect(e.message).toBe(undefined)
        done()
    })
})

it('unhandled promise rejections with non-error objects', (done) => {
    const evalScript = createSecureEnvironment(undefined, { done, expect })
    evalScript(`
        const errorObj = { foo: 'bar' }
        window.addEventListener("unhandledrejection", event => {
            expect(event.reason).toBe(errorObj)
            expect(event.reason.foo).toBe('bar')
            expect(event.reason.message).toBe(undefined)
            done()
        });

        new Promise((resolve, reject) => {
            throw errorObj
        });
    `)
})

it('unhandled promise rejections with non-error objects handled in blue', (done) => {
    window.addEventListener("unhandledrejection", event => {
        expect(event.reason.foo === undefined).toBe(true)
        expect(event.reason.message === undefined).toBe(true)
        done()
    });

    const evalScript = createSecureEnvironment(undefined, {})
    evalScript(`
        const errorObj = { foo: 'bar' }    
        new Promise((resolve, reject) => {
            throw errorObj
        });
    `)
})

it('non-error objects thrown in blue functions do not leak', () => {
    function foo() {
        throw { foo: 'bar' }
    }
    
    const evalScript = createSecureEnvironment(undefined, { foo, expect })
    evalScript(`
        try {
            foo()
        } catch (e) {
            // blue error own properties do not leak in red
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe(undefined)
        }
    `)
})

it('non-error objects thrown in blue constructors do not leak', () => {
    class Foo {
        constructor() {
            throw { foo: 'bar' }
        }
    }
    
    const evalScript = createSecureEnvironment(undefined, { Foo, expect })
    evalScript(`
        try {
            new Foo()
        } catch (e) {
            // blue error own properties on thrown object do not leak
            expect(e.message).toBe(undefined)
            expect(e.foo).toBe(undefined)
        }
    `)
})

it('non-error objects thrown in red functions do not leak', () => {
    let fn
    function save(arg) {
        fn = arg
    }

    const evalScript = createSecureEnvironment(undefined, { save })
    evalScript(`
        function foo() {
            throw { foo: 'bar' }
        }
        save(foo);
    `)

    try {
        fn()
    } catch(e) {
        expect(e.message).toBe(undefined)
        expect(e.foo).toBe(undefined);
    }
})

it('non-error objects thrown in red consturctors do not leak', () => {
    let ctor
    function save(arg) {
        ctor = arg
    }

    const evalScript = createSecureEnvironment(undefined, { save })
    evalScript(`
        class Foo {
            constructor() {
                throw { foo: 'bar' }
            }
        }
        save(Foo);
    `)

    try {
        new ctor()
    } catch(e) {
        expect(e.message).toBe(undefined)
        expect(e.foo).toBe(undefined)
    }
})

it('blue extended error objects preserve properties', () => {
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
            throw new CustomError('foo');
        }
    }
    
    const evalScript = createSecureEnvironment(undefined, { Foo, expect })
    evalScript(`
        try {
            new Foo()
        } catch (e) {
            expect(e.foo).toBe('bar')
            expect(e.bar).toBe('baz')
            expect(e.message).toBe('foo')
        }
    `)

})

it('red extended error objects to blue side', () => {
    let ctor
    function save(arg) {
        ctor = arg
    }

    const evalScript = createSecureEnvironment(undefined, { save })
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
                throw new CustomError('foo');
            }
        }

        save(Foo)
    `)

    try {
        new ctor()
    } catch(e) {
        expect(e.message).toBe('foo')
        expect(e.bar).toBe('baz')
        expect(e.foo).toBe('bar')
    }
})
