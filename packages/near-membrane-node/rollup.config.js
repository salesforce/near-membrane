import { rollupConfig } from '../../rollup.config';

export default rollupConfig({
    external: ['@locker/near-membrane-base', 'vm'],
});
