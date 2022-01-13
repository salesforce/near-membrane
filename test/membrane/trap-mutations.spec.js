import createVirtualEnvironment from '@locker/near-membrane-dom';

class Base {
    // eslint-disable-next-line class-methods-use-this
    get x() {
        return 1;
    }
}

let bFromRed;
let getXFromRed;
let mutateInRed;
function save(arg1, arg2, arg3) {
    bFromRed = arg1;
    getXFromRed = arg2;
    mutateInRed = arg3;
}

const env = createVirtualEnvironment(window, window, { endowments: { Base, save } });
env.evaluate(`
    // overriding the behavior of a prototype in red.
    // since this proto obj does not have the marker,
    // it should be a local mutation to red only, and
    // blue should never see it.
    Reflect.defineProperty(Base.prototype, 'x', {
        get() {
            return 2;
        }
    });
    const red_b = new Base();
    save(
        // exposing a local instance
        red_b,
        // exposing a function that access property x from red
        (blue_b) => blue_b.x,
        // exposes a function to infuse an arbitrary mutation from red
        (blue_b) => delete blue_b.something
    );
`);

describe('trap mutations', () => {
    it('should not affect blue with red mutations in proto', () => {
        expect(bFromRed.x).toBe(1);
    });
    it('should allow red to make local mutations', () => {
        const o = new Base();
        expect(getXFromRed(o)).toBe(2);
    });

    it('should honor the marker coming from blue', () => {
        const o = new Base();
        o[Symbol.for('@@lockerLiveValue')] = undefined;
        expect(getXFromRed(o)).toBe(2);
        // the following line should force the instance of base to
        // not be ambigous anymore.
        mutateInRed(o);
        expect(o.x).toBe(1);
        expect(getXFromRed(o)).toBe(2);
    });
});
