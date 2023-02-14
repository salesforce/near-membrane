import { ProxyCtor } from '../../dist/index.mjs.js';

describe('Proxy', () => {
    it('ProxyCtor', () => {
        expect(ProxyCtor).toBe(Proxy);
    });
});
