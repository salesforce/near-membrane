import createSecureEnvironment from '../../lib/browser-realm.js';

const LockerLiveValueMarkerSymbol = Symbol.for('@@lockerLiveValue');

const o = {
    x: 'uno'
};
Object.defineProperty(o, LockerLiveValueMarkerSymbol, {});

const endowments = {
    o,
    expect,
};
const evalScript = createSecureEnvironment(undefined, endowments);

describe('A Live Red Proxy', () => {
    it('should surface new expandos from blue realm', function() {
        // expect.assertions(2);
        o.x = 'uno';
        o.y = 'dos';
        evalScript(`
            expect(o.x).toBe('uno');
            expect(o.y).toBe('dos');
        `);
    });
    it('should allow mutation from blue realm', function() {
        // expect.assertions(4);
        o.x = 'tres';
        o.y = 'cuatro';
        evalScript(`
            expect(o.x).toBe('tres');
            expect(o.y).toBe('cuatro');
        `);
        expect(o.x).toBe('tres');
        expect(o.y).toBe('cuatro');
    });
    it('should allow mutation from within the sandbox', function() {
        // expect.assertions(4);
        evalScript(`
            o.x = 'cinco';
            o.y = 'six';
            expect(o.x).toBe('cinco');
            expect(o.y).toBe('six');
        `);
        expect(o.x).toBe('cinco');
        expect(o.y).toBe('six');
    });
    it('should allow expandos added form within the sandbox', function() {
        // expect.assertions(2);
        evalScript(`
            o.z = 'seven';
            expect(o.z).toBe('seven');
        `);
        expect(o.z).toBe('seven');
    });
    it('should only have effect on own properties', function() {
        // expect.assertions(3);
        o.w = { a: 1 };
        evalScript(`
            o.z = 'seven';
            expect(o.w.a).toBe(1);
            o.w.a = 2;
            expect(o.w.a).toBe(2);
        `);
        expect(o.w.a).toBe(1);
    });
});
