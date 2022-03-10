import createVirtualEnvironment from '@locker/near-membrane-dom';

class ExoticObject {
    constructor(source) {
        Object.assign(this, source);
    }
}

describe('The membrane', () => {
    it('should allow global inside the sandbox', () => {
        expect.assertions(6);

        window.plainObject = { x: 1 };
        window.exoticObject = new ExoticObject(window.plainObject);

        const env = createVirtualEnvironment(window, window);

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
