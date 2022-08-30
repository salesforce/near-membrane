'use strict';

const { nodeResolve } = require('@rollup/plugin-node-resolve');

function config(dir) {
    return {
        input: `${dir}/index.js`,
        output: {
            file: `${dir}/bundle.js`,
            format: 'cjs',
        },
        plugins: [
            nodeResolve({
                preferBuiltins: true,
            })
        ],
    };
}

module.exports = [
    config('custom-elements'),
    config('custom-events'),
    config('errors'),
    config('expandos'),
    config('getter-distortion'),
    config('invalid-fetch'),
    config('object-graph-mutations'),
    config('web-components'),
];
