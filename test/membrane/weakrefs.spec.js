import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('WeakRef', () => {
    it('behaves correctly with a red realm object', (done) => {
        const env = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({ done, expect }),
        });
        env.evaluate(`
            const referent = {};
            const wr = new WeakRef(referent);
            expect(wr.deref()).toBe(referent);
            done();
        `);
    });
});
