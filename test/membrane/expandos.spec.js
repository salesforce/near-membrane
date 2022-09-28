import createVirtualEnvironment from '@locker/near-membrane-dom';

class ExoticObject {
    constructor(source) {
        if (source) {
            Object.defineProperties(this, Object.getOwnPropertyDescriptors(source));
        }
    }
}

describe('Expandos', () => {
    it('should be settable for plain and exotic objects', () => {
        expect.assertions(6);

        window.plainObject = { x: 1 };
        window.exoticObject = new ExoticObject(window.plainObject);

        const env = createVirtualEnvironment(window, {
            // Provides plainObject & exoticObject
            globalObjectShape: window,
            liveTargetCallback(target) {
                return Reflect.getPrototypeOf(target) === Object.prototype;
            },
        });

        env.evaluate(`
            plainObject.y = 2;
            expect(plainObject).toEqual({ x: 1, y: 2 });
            exoticObject.y = 2;
            expect({ ...exoticObject }).toEqual({ x: 1, y: 2 });
        `);

        expect(window.plainObject).toEqual({ x: 1, y: 2 });
        expect({ ...window.exoticObject }).toEqual({ x: 1 });

        env.evaluate(`
            // Still be 2 during another evaluation.
            expect(plainObject).toEqual({ x: 1, y: 2 });
            expect({ ...exoticObject  }).toEqual({ x: 1, y: 2 });
        `);
    });
});
