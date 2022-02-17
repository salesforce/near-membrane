import createVirtualEnvironment from '@locker/near-membrane-dom';

const LOCKER_LIVE_VALUE_MARKER_SYMBOL = Symbol.for('@@lockerLiveValue');

class ExoticObject {
    constructor(source) {
        Object.assign(this, source);
    }
}

const plainObject = {
    x: 'uno',
};

const exoticLiveObject = new ExoticObject(plainObject);
Reflect.defineProperty(exoticLiveObject, LOCKER_LIVE_VALUE_MARKER_SYMBOL, {});

const env = createVirtualEnvironment(window, window, {
    endowments: {
        exoticLiveObject,
        expect,
        jasmine,
        plainObject,
    },
});

describe('a live red proxy', () => {
    it('should surface new expandos from blue realm', () => {
        expect.assertions(2);

        exoticLiveObject.x = 'uno';
        exoticLiveObject.y = 'dos';
        plainObject.x = 'uno';
        plainObject.y = 'dos';
        env.evaluate(`
            expect(exoticLiveObject).toEqual(jasmine.objectContaining({ x: 'uno', y: 'dos' }));
            expect(plainObject).toEqual(jasmine.objectContaining({ x: 'uno', y: 'dos' }));
        `);
    });
    it('should allow mutation from blue realm', () => {
        expect.assertions(4);

        exoticLiveObject.x = 'tres';
        exoticLiveObject.y = 'cuatro';
        plainObject.x = 'tres';
        plainObject.y = 'cuatro';
        env.evaluate(`
            expect(exoticLiveObject).toEqual(jasmine.objectContaining({ x: 'tres', y: 'cuatro' }));
            expect(plainObject).toEqual(jasmine.objectContaining({ x: 'tres', y: 'cuatro' }));
        `);
        expect(exoticLiveObject).toEqual(jasmine.objectContaining({ x: 'tres', y: 'cuatro' }));
        expect(plainObject).toEqual(jasmine.objectContaining({ x: 'tres', y: 'cuatro' }));
    });
    it('should allow mutation from within the sandbox', () => {
        expect.assertions(4);

        env.evaluate(`
            exoticLiveObject.x = 'cinco';
            exoticLiveObject.y = 'six';
            expect(exoticLiveObject).toEqual(jasmine.objectContaining({ x: 'cinco', y: 'six' }));
            plainObject.x = 'cinco';
            plainObject.y = 'six';
            expect(plainObject).toEqual(jasmine.objectContaining({ x: 'cinco', y: 'six' }));
        `);
        expect(exoticLiveObject).toEqual(jasmine.objectContaining({ x: 'cinco', y: 'six' }));
        expect(plainObject).toEqual(jasmine.objectContaining({ x: 'cinco', y: 'six' }));
    });
    it('should allow expandos added form within the sandbox', () => {
        expect.assertions(4);

        env.evaluate(`
            exoticLiveObject.z = 'seven';
            expect(exoticLiveObject.z).toBe('seven');
            plainObject.z = 'seven';
            expect(plainObject.z).toBe('seven');
        `);
        expect(exoticLiveObject.z).toBe('seven');
        expect(plainObject.z).toBe('seven');
    });
    it('should affect own properties of live objects', () => {
        expect.assertions(5);

        exoticLiveObject.w = new ExoticObject({ x: 1 });
        env.evaluate(`
            exoticLiveObject.z = 'siete';
            expect(exoticLiveObject.z).toBe('siete');
            expect({ ...exoticLiveObject.w }).toEqual({ x: 1 });
            exoticLiveObject.w.x = 2;
            expect({ ...exoticLiveObject.w }).toEqual({ x: 2 });
        `);
        expect(exoticLiveObject.z).toBe('siete');
        expect(exoticLiveObject.w).toEqual(new ExoticObject({ x: 1 }));
    });
    it('should affect all plain object properties', () => {
        expect.assertions(5);

        plainObject.w = { x: 1 };
        env.evaluate(`
            plainObject.z = 'siete';
            expect(plainObject.z).toBe('siete');
            expect(plainObject.w).toEqual({ x: 1 });
            plainObject.w.x = 2;
            expect(plainObject.w).toEqual({ x: 2 });
        `);
        expect(plainObject.z).toBe('siete');
        expect(plainObject.w).toEqual({ x: 2 });
    });
});
