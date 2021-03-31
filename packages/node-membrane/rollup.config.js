import { rollupConfig } from '../../rollup.config';

export default rollupConfig({
    external: ['@locker/near-membrane', 'vm']
});
