import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

class Base {
    // eslint-disable-next-line class-methods-use-this
    get x() {
        return 1;
    }
}

class ExoticObject extends Base {
    // eslint-disable-next-line class-methods-use-this
    get y() {
        return 3;
    }
}

let plainInstanceFromRed;
let exoticInstanceFromRed;
let getPropFromRed;
let mutateInRed;
function save(arg1, arg2, arg3, arg4) {
    plainInstanceFromRed = arg1;
    exoticInstanceFromRed = arg2;
    getPropFromRed = arg3;
    mutateInRed = arg4;
}

const env = createVirtualEnvironment(window, {
    endowments: Object.getOwnPropertyDescriptors({ Base, ExoticObject, expect, save }),
});

env.evaluate(`
    // Overriding the behavior of a plain prototype object in red.
    // Since this prototype object is a plain object it is live, the mutation
    // should be reflected in blue.
    Reflect.defineProperty(Base.prototype, 'x', {
        get() {
            return 2;
        }
    });
    // Overriding the behavior of an exotic prototype object in red.
    // Since this prototype object is an exotic object and does not have a marker,
    // it should be a local mutation to red only, and blue should never see it.
    Reflect.defineProperty(ExoticObject.prototype, 'y', {
        get() {
            return 4;
        }
    });
    const plainInstanceFromRed = new Base();
    const exoticInstanceFromRed = new ExoticObject();
    save(
        // Expose local instances
        plainInstanceFromRed,
        exoticInstanceFromRed,
        // Expose an accessor function from red.
        (blueInstance, key) => blueInstance[key],
        // Expose a function from red to perform an object mutation.
        (blueInstance) => delete blueInstance.something
    );
`);

describe('trap mutations', () => {
    it('should not affect blue object instances with red prototype mutations', () => {
        expect(plainInstanceFromRed.x).toBe(1);
        expect(exoticInstanceFromRed.y).toBe(3);
    });
    it('should allow red to make local mutations', () => {
        const plainInstance = new Base();
        expect(getPropFromRed(plainInstance, 'x')).toBe(2);
        const exoticInstance = new ExoticObject();
        expect(getPropFromRed(exoticInstance, 'x')).toBe(2);
    });
    it('should honor the marker coming from blue', () => {
        const exoticInstance = new ExoticObject();
        exoticInstance[LOCKER_LIVE_VALUE_MARKER_SYMBOL] = undefined;
        expect(getPropFromRed(exoticInstance, 'y')).toBe(4);
        // The following mutation should trigger the instance of Base to
        // not be ambiguous anymore.
        mutateInRed(exoticInstance);
        expect(exoticInstance.y).toBe(3);
        expect(getPropFromRed(exoticInstance, 'y')).toBe(4);
    });
});
