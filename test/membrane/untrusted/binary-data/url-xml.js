const blob = new Blob(['<div><span>foo</span></div>'], { type: 'text/xml' });
expect(() => {
    URL.createObjectURL(blob);
}).not.toThrow();
