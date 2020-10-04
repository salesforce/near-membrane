import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

function config(input, filePrefix) {
    return {
        input,
        output: [{
            file: `lib/${filePrefix}.js`,
            format: 'es',
            sourcemap: true
        },
        {
            file: `lib/${filePrefix}.min.js`,
            format: 'es',
            sourcemap: false,
            plugins: [terser()]

        }],
        plugins: [typescript()]
    }
};

export default [
    config('src/index.ts', 'index'),
    config('src/browser-realm.ts', 'browser-realm')
];