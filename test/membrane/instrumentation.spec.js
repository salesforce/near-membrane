import createVirtualEnvironment from '@locker/near-membrane-dom';

describe('Ensure instrumentation object usage in near-membrane', () => {
    it('Instrumentation object is passed to and used in near-membrane', () => {
        let redProxy;
        const mockInstrumentation = {
            startActivity: () => ({ stop: () => {}, error: () => {} }),
            log: () => {},
            error: () => {},
        };
        const startActivitySpy = spyOn(mockInstrumentation, 'startActivity').and.callThrough();
        const logSpy = spyOn(mockInstrumentation, 'log').and.callThrough();
        const errorSpy = spyOn(mockInstrumentation, 'error').and.callThrough();
        const ve = createVirtualEnvironment(window, {
            endowments: Object.getOwnPropertyDescriptors({
                setter(v) {
                    redProxy = v;
                },
            }),
            instrumentation: mockInstrumentation,
        });
        ve.evaluate(`
            setter({foo: 'bar', fn: function(v) {}});
        `);
        // eslint-disable-next-line no-unused-expressions
        redProxy.foo;
        expect(startActivitySpy).toHaveBeenCalledTimes(1);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        redProxy.foo = 1;
        expect(startActivitySpy).toHaveBeenCalledTimes(2);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        redProxy.fn();
        expect(startActivitySpy).toHaveBeenCalledTimes(4);
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
