'use strict';

const fs = require('fs-extra');
const globby = require('globby');
const mergeOptions = require('merge-options');
const Module = require('node:module');
const path = require('node:path');

const rootPath = path.resolve(__dirname, '../../../');

const mergeOptionsConfig = {
    ignoreUndefined: true,
};

module.exports = {
    getBabelOutputPlugin(providedOptions) {
        const clonedOptions = { ...providedOptions };
        const { banner, footer } = clonedOptions;
        delete clonedOptions.banner;
        delete clonedOptions.footer;
        let babelOutputHooks;
        return {
            name: 'babel-output',
            async renderStart(outputOptions) {
                // Lazily initialize the getBabelOutputPlugin with a filename so that
                // presets, like @babel/preset-typescript, will work.
                if (!babelOutputHooks) {
                    // Clear CommonJS module cache.
                    // eslint-disable-next-line no-underscore-dangle
                    Module._cache = { __proto__: null };
                    // File extension look up order defined by Babel:
                    // https://github.com/babel/babel/blob/v7.15.6/packages/babel-core/src/config/files/configuration.ts#L24
                    const configPath =
                        // prettier-ignore
                        clonedOptions.configFile ??
                        (await globby([`${path.resolve('.babelrc')}{,.js,.cjs,.mjs,.json}`]))[0] ??
                        (await globby([`${path.resolve(rootPath, 'babel.config')}{.js,.cjs,.mjs,.json}`]))[0];
                    const config =
                        path.extname(configPath) === '.json'
                            ? await fs.readJSON(configPath)
                            : (await import(configPath)).default;
                    const mergedOptions = mergeOptions.call(
                        mergeOptionsConfig,
                        {
                            allowAllFormats: true,
                            babelrc: false,
                            filename: outputOptions.file,
                            plugins: [],
                            presets: [],
                        },
                        config,
                        clonedOptions,
                        {
                            configFile: false,
                        }
                    );
                    const { plugins, presets } = mergedOptions;
                    for (let i = 0, { length } = plugins; i < length; i += 1) {
                        const entry = plugins[i];
                        const name = Array.isArray(entry) ? entry[0] : entry;
                        if (name === '@babel/plugin-transform-modules-commonjs') {
                            // Don't transform ESM to CommonJS.
                            plugins.splice(i, 1);
                        }
                    }
                    for (let i = 0, { length } = presets; i < length; i += 1) {
                        const entry = presets[i];
                        if (Array.isArray(entry) && entry[0] === '@babel/preset-env') {
                            // Skip transforming module formats.
                            entry[1].modules = false;
                        }
                    }
                    const { getBabelOutputPlugin } = await import('@rollup/plugin-babel');
                    babelOutputHooks = getBabelOutputPlugin(mergedOptions);
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
