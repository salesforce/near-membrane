import createVirtualEnvironment from '@locker/near-membrane-dom';

const env = createVirtualEnvironment(window);

describe('@@lockerLiveValue', () => {
    it('applies to HTMLElement.prototype.style', () => {
        expect.assertions(2);

        const div = document.createElement('div');
        const id = 'marked-live';
        div.id = id;
        document.body.appendChild(div);

        Reflect.defineProperty(div.style, Symbol.for('@@lockerLiveValue'), {
            value: undefined,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        env.evaluate(`
        const div = document.querySelector('#${id}');
        div.style.color = 'red';
        expect(div.style.color).toBe('red');
        `);

        const styleAttributeValue = div.getAttribute('style');
        expect(styleAttributeValue).toBe('color: red;');
    });
});
