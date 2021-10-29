'use strict';

const globby = require('globby');
const Module = require('module');
const path = require('path');

const rootPath = path.resolve(__dirname, '../../../');

const defaultPluginOptions = {
    allowAllFormats: true,
    configFile:
        // File extension look up order defined by Babel:
        // https://github.com/babel/babel/blob/v7.15.6/packages/babel-core/src/config/files/configuration.ts#L24
        globby.sync([`${path.resolve('.babelrc')}{,.js,.cjs,.mjs,.json}`])[0] ||
        globby.sync([`${path.resolve(rootPath, 'babel.config')}{.js,.cjs,.mjs,.json}`])[0],
};

module.exports = {
    getBabelOutputPlugin(providedOptions = {}) {
        const options = {
            ...defaultPluginOptions,
            ...providedOptions,
        };
        const { banner, footer, format = 'auto' } = options;
        delete options.banner;
        delete options.footer;
        delete options.format;
        let babelOutputHooks;
        return {
            renderStart(outputOptions) {
                // Lazily initialize the getBabelOutputPlugin with a filename so that
                // presets, like @babel/preset-typescript, will work.
                if (!babelOutputHooks) {
                    // Clear CommonJS module cache.
                    // eslint-disable-next-line no-underscore-dangle
                    Module._cache = Object.create(null);
                    // Set environment variable BABEL_PRESET_ENV_MODULES so that it can be
                    // picked up by .babelrc.cjs configs.
                    process.env.BABEL_PRESET_ENV_MODULES = format === 'es' ? 'false' : format;
                    // eslint-disable-next-line global-require
                    const { getBabelOutputPlugin } = require('@rollup/plugin-babel');
                    babelOutputHooks = getBabelOutputPlugin({
                        ...options,
                        filename: outputOptions.file,
                    });
                }
                return babelOutputHooks.renderStart(outputOptions);
            },
            async renderChunk(code, chunk, outputOptions) {
                // Transpile code with Babel.
                const result = await babelOutputHooks.renderChunk(code, chunk, outputOptions);
                // Wrap transpiled code with optional banner and footer strings.
                const optionalBanner = banner ? `${banner}\n` : '';
                const optionalFooter = footer ? `\n${footer}` : '';
                result.code = optionalBanner + result.code + optionalFooter;
                return result;
            },
        };
    },
};
