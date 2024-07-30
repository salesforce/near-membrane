expect(() => {
    crypto.getRandomValues(new Uint8Array(1));
}).not.toThrow();
async function f() {
    const algorithm = { name: 'RSA-OAEP' };
    const data = new Uint8Array([255]);
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );

    const encrypted = await crypto.subtle.encrypt(algorithm, keyPair.publicKey, data);

    const decrypted = await crypto.subtle.decrypt(algorithm, keyPair.privateKey, encrypted);
}

f().then(done);
