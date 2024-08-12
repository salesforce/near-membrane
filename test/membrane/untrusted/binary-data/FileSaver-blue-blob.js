function blueBlobToRedBlob(blueBlob) {
    const reader = blueBlob.stream().getReader();
    let result = new Uint8Array(0);
    let resolve, reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    const handler = ({ done, value }) => {
        try {
            if (done) {
                const redBlob = new Blob([result.buffer], { type: blueBlob.type });
                resolve(redBlob);
                return;
            }
            const merge = new Uint8Array(result.length + value.length);
            merge.set(result);
            merge.set(value, result.length);
            result = merge;
            return reader.read().then(handler, reject);
        } catch (e) {
            reject(e);
        }
    };
    reader.read().then(handler, reject);
    return promise;
}

const blueBlob = getBlueBlob();

const blobToSavePromise = transferBlueBlob
    ? blueBlobToRedBlob(blueBlob)
    : Promise.resolve(blueBlob);

blobToSavePromise.then((blobToSave) => {
    if (expectedToThrow) {
        expect(() => {
            saveAs(blobToSave, 'blue-binary.txt');
        }).toThrow();
    } else {
        expect(() => {
            saveAs(blobToSave, 'blue-binary.txt');
        }).not.toThrow();
    }
    done();
});
