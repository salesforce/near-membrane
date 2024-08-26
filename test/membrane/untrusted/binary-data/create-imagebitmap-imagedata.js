// Create ImageData
const width = 100;
const height = 100;
const imageData = new ImageData(width, height);

// Create canvas and draw the ImageData
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
// ToDo: Do we need to Support all contextTypes?
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext#contexttype
const ctx = canvas.getContext('2d');
ctx.putImageData(imageData, 0, 0);

createImageBitmap(ctx.getImageData(0, 0, width, height))
    .then((output) => {
        done();
    })
    .catch((error) => {
        done(error);
    });
