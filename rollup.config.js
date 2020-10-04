import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

function config(input, file, plugins) {
    return {
        input,
        output: {
            file,
            format: 'es',
            sourcemap: true,
            plugins

        },
        plugins: [typescript()]
    }
};

export default [
    config('src/index.ts', 'lib/index.js'),
    config('src/index.ts', 'lib/index.min.js', [terser()]),
    config('src/browser-realm.ts', 'lib/browser-realm.js'),
    config('src/browser-realm.ts', 'lib/browser-realm.min.js', [terser()])
];