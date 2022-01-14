import createVirtualEnvironment from '@locker/near-membrane-dom';

const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');

const o = {
    x: 'uno',
};

Reflect.defineProperty(o, LockerLiveValueMarkerSymbol, {});

const endowments = {
    o,
    expect,
};
const env = createVirtualEnvironment(window, window, { endowments });

describe('a live Red proxy', () => {
    it('should surface new expandos from blue realm', () => {
        expect.assertions(2);
        o.x = 'uno';
        o.y = 'dos';
        env.evaluate(`
            expect(o.x).toBe('uno');
            expect(o.y).toBe('dos');
        `);
    });
    it('should allow mutation from blue realm', () => {
        expect.assertions(4);
        o.x = 'tres';
        o.y = 'cuatro';
        env.evaluate(`
            expect(o.x).toBe('tres');
            expect(o.y).toBe('cuatro');
        `);
        expect(o.x).toBe('tres');
        expect(o.y).toBe('cuatro');
    });
    it('should allow mutation from within the sandbox', () => {
        expect.assertions(4);
        env.evaluate(`
            o.x = 'cinco';
            o.y = 'six';
            expect(o.x).toBe('cinco');
            expect(o.y).toBe('six');
        `);
        expect(o.x).toBe('cinco');
        expect(o.y).toBe('six');
    });
    it('should allow expandos added form within the sandbox', () => {
        expect.assertions(2);
        env.evaluate(`
            o.z = 'seven';
            expect(o.z).toBe('seven');
        `);
        expect(o.z).toBe('seven');
    });
    it('should only have effect on own properties', () => {
        expect.assertions(3);
        o.w = { a: 1 };
        env.evaluate(`
            o.z = 'seven';
            expect(o.w.a).toBe(1);
            o.w.a = 2;
            expect(o.w.a).toBe(2);
        `);
        expect(o.w.a).toBe(1);
    });
});
