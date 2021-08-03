import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export function rollupConfig({ input = 'src/index.ts', filePrefix = 'index', external = [] } = {}) {
    return {
        input,
        output: [
            {
                file: `lib/${filePrefix}.js`,
                format: 'es',
                sourcemap: true,
            },
            {
                file: `lib/${filePrefix}.min.js`,
                format: 'es',
                sourcemap: true,
                plugins: [terser()],
            },
        ],
        plugins: [typescript()],
        external,
    };
}
