import { JSONStringify } from '../../dist/index.mjs.js';

describe('JSON', () => {
    it('JSONStringify', () => {
        expect(JSONStringify).toBe(JSON.stringify);
    });
});
