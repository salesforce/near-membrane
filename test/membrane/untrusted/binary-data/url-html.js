const blob = new Blob(['<h1>Hello World</h1>'], { type: 'text/html' });
expect(() => {
    URL.createObjectURL(blob);
}).not.toThrow();
