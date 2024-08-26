const req = new XMLHttpRequest();
req.open('POST', location.href);
req.send(new Uint8Array([1, 2, 3]));
