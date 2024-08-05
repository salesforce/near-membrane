const f = new File(
    ['<p>PEW</p><script src="http://localhost:9876/resource/test"></script>'],
    'foo.txt'
);
expect(() => {
    URL.createObjectURL(f);
}).not.toThrow();
