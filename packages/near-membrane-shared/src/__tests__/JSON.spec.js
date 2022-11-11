import { JSONParse, JSONStringify } from '../../dist/index.mjs.js';

describe('JSON', () => {
    it('JSONParse', () => {
        expect(JSONParse).toBe(JSON.parse);
    });
    it('JSONStringify', () => {
        expect(JSONStringify).toBe(JSON.stringify);
    });
});
