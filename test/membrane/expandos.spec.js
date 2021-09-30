import createVirtualEnvironment from '@locker/near-membrane-dom';

window.expandable = { x: 1 };

describe('The membrane', () => {
    it('should allow global inside the sandbox', () => {
        expect.assertions(4);
        const evalScript = createVirtualEnvironment(window);
        evalScript(`
            expandable.y = 2;
            expect(expandable.y).toBe(2);
        `);
        // eslint-disable-next-line no-undef
        expect(expandable.y).toBe(undefined);
        // eslint-disable-next-line no-undef
        expect(expandable.x).toBe(1);
        evalScript(`
            // still be 2 during another evaluation
            expect(expandable.y).toBe(2);
        `);
    });
});
