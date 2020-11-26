import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export function rollupConfig(input, filePrefix, external = []) {
    const conf = {
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
    };
    console.log(JSON.stringify(conf, null, 4));
    return conf;
};
