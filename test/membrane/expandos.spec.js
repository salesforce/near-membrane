import createVirtualEnvironment from '@locker/near-membrane-dom';

class ExoticObject {
    constructor(source) {
        Object.assign(this, source);
    }
}

window.plainObject = { x: 1 };
window.exoticObject = new ExoticObject(window.plainObject);

describe('The membrane', () => {
    it('should allow global inside the sandbox', () => {
        expect.assertions(8);
        const env = createVirtualEnvironment(window, window);
        env.evaluate(`
            plainObject.y = 2;
            expect(plainObject.y).toBe(2);
            exoticObject.y = 2;
            expect(exoticObject.y).toBe(2);
        `);
        // eslint-disable-next-line no-undef
        expect(window.plainObject.y).toBe(2);
        expect('y' in window.exoticObject).toBe(false);
        // eslint-disable-next-line no-undef
        expect(window.exoticObject.x).toBe(1);
        expect(window.plainObject.x).toBe(1);
        env.evaluate(`
            // Still be 2 during another evaluation.
            expect(exoticObject.y).toBe(2);
            expect(plainObject.y).toBe(2);
        `);
    });
});
