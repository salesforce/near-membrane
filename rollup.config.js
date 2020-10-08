import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

function config(input, filePrefix, external = []) {
    return {
        input,
        output: [{
            file: `lib/${filePrefix}.js`,
            format: 'es',
            sourcemap: true,
        },
        {
            file: `lib/${filePrefix}.min.js`,
            format: 'es',
            sourcemap: true,
            plugins: [terser()]

        }],
        plugins: [typescript()],
        external
    }
};

export default [
    config('src/index.ts', 'index'),
    config('src/browser-realm.ts', 'browser-realm'),
    config('src/node-realm.ts', 'node-realm', ['vm'])
];