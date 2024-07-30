const content = `
<svg id="rectangle" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">
<circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="blue" />
</svg>`;

const blob = new Blob([content], { type: 'image/svg+xml' });
expect(() => {
    URL.createObjectURL(blob);
}).not.toThrow();
