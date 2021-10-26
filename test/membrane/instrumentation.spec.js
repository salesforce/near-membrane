import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Ensure instrumentation object usage in near-membrane', () => {
    let redProxy;
    const endowments = {
        setter(v) {
            redProxy = v;
        },
    };
    const mockInstrumentation = {
        startActivity: () => ({ stop: () => {}, error: () => {} }),
        log: () => {},
        error: () => {},
    };
    const code = `setter({foo: 'bar', fn: function(v) {}});`;

    it('Instrumentation object is passed to and used in near-membrane', () => {
        const startActivitySpy = spyOn(mockInstrumentation, 'startActivity').and.callThrough();
        const logSpy = spyOn(mockInstrumentation, 'log').and.callThrough();
        const errorSpy = spyOn(mockInstrumentation, 'error').and.callThrough();
        const ve = createVirtualEnvironment(window, window, {
            endowments,
            instrumentation: mockInstrumentation,
        });

        ve.evaluate(code);

        // eslint-disable-next-line no-unused-expressions
        redProxy.foo;
        expect(startActivitySpy).toHaveBeenCalledTimes(2);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        redProxy.foo = 1;
        expect(startActivitySpy).toHaveBeenCalledTimes(4);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        redProxy.fn();
        expect(startActivitySpy).toHaveBeenCalledTimes(6);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
