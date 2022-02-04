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

const endowments = {
    plainObject,
    exoticLiveObject,
    expect,
};
const env = createVirtualEnvironment(window, window, { endowments });

describe('a live red proxy', () => {
    it('should surface new expandos from blue realm', () => {
        expect.assertions(4);
        exoticLiveObject.x = 'uno';
        exoticLiveObject.y = 'dos';
        plainObject.x = 'uno';
        plainObject.y = 'dos';
        env.evaluate(`
            expect(exoticLiveObject.x).toBe('uno');
            expect(exoticLiveObject.y).toBe('dos');
            expect(plainObject.x).toBe('uno');
            expect(plainObject.y).toBe('dos');
        `);
    });
    it('should allow mutation from blue realm', () => {
        expect.assertions(8);
        exoticLiveObject.x = 'tres';
        exoticLiveObject.y = 'cuatro';
        plainObject.x = 'tres';
        plainObject.y = 'cuatro';
        env.evaluate(`
            expect(exoticLiveObject.x).toBe('tres');
            expect(exoticLiveObject.y).toBe('cuatro');
            expect(plainObject.x).toBe('tres');
            expect(plainObject.y).toBe('cuatro');
        `);
        expect(exoticLiveObject.x).toBe('tres');
        expect(exoticLiveObject.y).toBe('cuatro');
        expect(plainObject.x).toBe('tres');
        expect(plainObject.y).toBe('cuatro');
    });
    it('should allow mutation from within the sandbox', () => {
        expect.assertions(8);
        env.evaluate(`
            exoticLiveObject.x = 'cinco';
            exoticLiveObject.y = 'six';
            expect(exoticLiveObject.x).toBe('cinco');
            expect(exoticLiveObject.y).toBe('six');
            plainObject.x = 'cinco';
            plainObject.y = 'six';
            expect(plainObject.x).toBe('cinco');
            expect(plainObject.y).toBe('six');
        `);
        expect(exoticLiveObject.x).toBe('cinco');
        expect(exoticLiveObject.y).toBe('six');
        expect(plainObject.x).toBe('cinco');
        expect(plainObject.y).toBe('six');
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
        exoticLiveObject.w = new ExoticObject({ a: 1 });
        env.evaluate(`
            exoticLiveObject.z = 'siete';
            expect(exoticLiveObject.z).toBe('siete');
            expect(exoticLiveObject.w.a).toBe(1);
            exoticLiveObject.w.a = 2;
            expect(exoticLiveObject.w.a).toBe(2);
        `);
        expect(exoticLiveObject.z).toBe('siete');
        expect(exoticLiveObject.w.a).toBe(1);
    });
    it('should affect all plain object properties', () => {
        expect.assertions(5);
        plainObject.w = { a: 1 };
        env.evaluate(`
            plainObject.z = 'siete';
            expect(plainObject.z).toBe('siete');
            expect(plainObject.w.a).toBe(1);
            plainObject.w.a = 2;
            expect(plainObject.w.a).toBe(2);
        `);
        expect(plainObject.z).toBe('siete');
        expect(plainObject.w.a).toBe(2);
    });
});
