import { ErrorCtor, TypeErrorCtor } from '../../dist/index.mjs.js';

describe('Error', () => {
    it('ErrorCtor', () => {
        expect(ErrorCtor).toBe(Error);
    });
    it('TypeErrorCtor', () => {
        expect(TypeErrorCtor).toBe(TypeError);
    });
});
