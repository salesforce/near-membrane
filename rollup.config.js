import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export function rollupConfig(input, filePrefix, external = []) {
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
        plugins: [typescript({ tsconfig: "tsconfig.rollup.json" })],
        external
    };
};
