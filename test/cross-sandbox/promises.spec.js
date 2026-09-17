import { makeSandboxes } from './__util__/harness.js';

/**
 * AC3 -- promises / async-await across the double membrane (red-A -> blue -> red-B).
 *
 * A promise minted in one sandbox is relayed through blue into the other and
 * awaited there; the resolution/rejection value marshals across both membranes.
 * Values locked to observed `main` behavior -- all resolve/reject paths compose
 * cleanly across the double crossing, in both directions and on a round-trip.
 */
describe('cross-sandbox: promises / async-await across two membranes', () => {
    it('resolved promise minted in A is awaited by B', async () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const pA = a.evaluate('Promise.resolve("resolved-in-A")');
        const awaitInB = b.evaluate('(p) => p.then((v) => "B-saw:" + v)');
        const out = await awaitInB(pA);
        expect(out).toBe('B-saw:resolved-in-A');
    });

    it('async function minted in A is called and awaited by B', async () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const aAsyncFn = a.evaluate('async () => "from-A-async"');
        const callInB = b.evaluate('(fn) => fn().then((v) => "B-saw:" + v)');
        const out = await callInB(aAsyncFn);
        expect(out).toBe('B-saw:from-A-async');
    });

    it('rejected promise from A is caught by B with reason marshalled', async () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const rejFn = a.evaluate('() => Promise.reject(new Error("nope-A"))');
        const catchInB = b.evaluate(
            '(fn) => fn().then(() => "resolved?!", (e) => "B-caught:" + e.message + "|isError=" + (e instanceof Error))'
        );
        const out = await catchInB(rejFn);
        // Rejection reason crosses both membranes: message intact, re-branded as B's Error.
        expect(out).toBe('B-caught:nope-A|isError=true');
    });

    it('reverse: promise minted in B is awaited by A', async () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const pB = b.evaluate('Promise.resolve("resolved-in-B")');
        const awaitInA = a.evaluate('(p) => p.then((v) => "A-saw:" + v)');
        const out = await awaitInA(pB);
        expect(out).toBe('A-saw:resolved-in-B');
    });

    it('A->B->A round-trip: A seeds, B derives, A observes the composed value', async () => {
        expect.assertions(1);
        const { a, b } = makeSandboxes();
        const pA = a.evaluate('Promise.resolve("seed-A")');
        const deriveInB = b.evaluate('(p) => p.then((v) => v + "|touched-B")');
        const pB = deriveInB(pA);
        const awaitInA = a.evaluate('(p) => p.then((v) => v + "|back-in-A")');
        const out = await awaitInA(pB);
        expect(out).toBe('seed-A|touched-B|back-in-A');
    });
});
