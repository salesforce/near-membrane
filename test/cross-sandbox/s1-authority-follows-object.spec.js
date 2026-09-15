import { sandbox } from './__util__/harness.js';

/**
 * S1 -- Cookie-namespace isolation across two membranes.
 *
 * Models how LWS actually namespaces cookies (see @locker/distortion
 * Document/cookie-getter.ts): a single origin-wide cookie jar is shared by every
 * realm; each sandbox distorts the native `cookie` getter to one that reads that
 * shared jar and returns ONLY the entries carrying its own namespace marker. The
 * namespace is bound to the READING realm via the getter's closure key -- never
 * to the `document` object -- so the invariant near-membrane must uphold is:
 *
 *   reading `document.cookie` resolves the reader's own distorted getter, so a
 *   document relayed across sandboxes yields the READER's namespace and can never
 *   expose another realm's cookies.
 *
 * (A generic reader `readProp` defined in A therefore returns A's cookies even
 * when B hands it B's document -- that is A voluntarily using its own authority,
 * an app-level capability choice, not a membrane isolation failure. What MUST NOT
 * happen is A's read leaking B's namespaced cookies, or vice-versa.)
 */
const cookieGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').get;

// The shared, origin-wide jar the native getter would return: every namespace present.
const RAW_JAR = 'LSKey-A$sid=A-session; LSKey-B$sid=B-session; LSKey-A$theme=dark';

// Per-namespace distortion: read the shared jar, keep only this marker's entries,
// strip the marker -- exactly what @locker/distortion does, minus the real jar.
function namespacedCookieDistortion(marker) {
    const prefix = `LSKey-${marker}$`;
    const distortedGetter = function distortedCookieGetter() {
        return RAW_JAR.split('; ')
            .filter((entry) => entry.startsWith(prefix))
            .map((entry) => entry.slice(prefix.length))
            .join('; ');
    };
    return (value) => (value === cookieGetter ? distortedGetter : value);
}

function ns(marker) {
    return { distortionCallback: namespacedCookieDistortion(marker), globalObjectShape: window };
}

describe('cross-sandbox S1: cookie-namespace isolation', () => {
    it('each sandbox reading its own document sees only its own namespace', () => {
        expect.assertions(2);

        const a = sandbox({}, ns('A'));
        const b = sandbox({}, ns('B'));

        expect(a.evaluate('document.cookie')).toBe('sid=A-session; theme=dark');
        expect(b.evaluate('document.cookie')).toBe('sid=B-session');
    });

    it("A's reader handed B's document resolves A's namespace, never B's cookies", () => {
        expect.assertions(3);

        const a = sandbox({}, ns('A'));
        const b = sandbox({}, ns('B'));

        // A's generic reader (runs in A); B's document relayed A <- blue <- B.
        const readProp = a.evaluate('(o, k) => o[k]');
        const bDocument = b.evaluate('document');

        const crossRead = readProp(bDocument, 'cookie');

        // The read resolves A's distorted getter (reading-realm binding)...
        expect(crossRead).toBe('sid=A-session; theme=dark');
        // ...and MUST NOT expose B's namespaced cookie through B's document.
        expect(crossRead.includes('B-session')).toBe(false);

        // Symmetric direction: B's reader on A's document yields B's namespace, not A's.
        const readPropB = b.evaluate('(o, k) => o[k]');
        const aDocument = a.evaluate('document');
        expect(readPropB(aDocument, 'cookie')).toBe('sid=B-session');
    });
});
