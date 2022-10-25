import { JSONStringify } from '../../dist/index';

describe('JSON', () => {
    it('JSONStringify', () => {
        expect(JSONStringify).toBe(JSON.stringify);
    });
});
