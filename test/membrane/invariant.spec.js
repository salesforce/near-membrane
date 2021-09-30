import createVirtualEnvironment from '@locker/near-membrane-dom';

// This emulates LWC LightningElement proto chain and freezing mechanism
class Base {}
Object.freeze(Base.prototype);
let FooClazz;
function saveFoo(arg) {
    Object.freeze(arg.prototype);
    FooClazz = arg;
}

const evalScript = createVirtualEnvironment(window, { endowments: { Base, saveFoo } });
evalScript(`
    class Foo extends Base {};
    saveFoo(Foo);
`);

describe('js invariants', () => {
    it('should be prserved for instanceof', () => {
        class Test extends FooClazz {}
        Object.freeze(Test.prototype);
        expect(Test.prototype instanceof Base).toBe(true);
    });
});
