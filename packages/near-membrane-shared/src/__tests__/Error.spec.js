import { ErrorCtor, TypeErrorCtor } from '../../dist/index';

describe('Error', () => {
    it('ErrorCtor', () => {
        expect(ErrorCtor).toBe(Error);
    });
    it('TypeErrorCtor', () => {
        expect(TypeErrorCtor).toBe(TypeError);
    });
});
