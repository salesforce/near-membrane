import { rollupConfig } from '../../rollup.config';

export default rollupConfig('src/index.ts', 'index', ['@locker/near-membrane', 'vm']);
