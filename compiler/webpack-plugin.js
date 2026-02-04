/**
 * OneView Webpack Plugin
 * Integrates OneView compilation into Webpack build process
 * 
 * Usage in webpack.config.js:
 * 
 * const OneViewPlugin = require('oneview/webpack');
 * 
 * module.exports = {
 *   plugins: [
 *     new OneViewPlugin({
 *       context: 'admin',  // or 'all' for all contexts
 *       minifyHtml: true,  // minify HTML in templates (default: true)
 *       watch: true,       // watch .one files (default: true in watch mode)
 *     })
 *   ]
 * };
 */

const path = require('path');
const fs = require('fs');

class OneViewWebpackPlugin {
    constructor(options = {}) {
        this.options = {
            context: 'default',
            minifyHtml: true,
            watch: true,
            configPath: null,
            ...options
        };
        
        this.compiler = null;
        this.projectRoot = null;
        this.config = null;
        this.isWatching = false;
        this.watcher = null;
    }

    getCompiler() {
        if (!this.compiler) {
            const Compiler = require('./index');
            this.compiler = new Compiler();
        }
        return this.compiler;
    }

    loadConfig(root) {
        const ConfigManager = require('./config-manager');
        const searchPath = this.options.configPath || root;
        const result = ConfigManager.loadConfig(searchPath);
        this.projectRoot = result.projectRoot;
        this.config = result.config;
        return result;
    }

    apply(webpackCompiler) {
        const pluginName = 'OneViewWebpackPlugin';

        // Compile before Webpack starts
        webpackCompiler.hooks.beforeCompile.tapAsync(pluginName, async (params, callback) => {
            try {
                // Only compile on first run or if not watching
                if (!this.projectRoot) {
                    this.loadConfig(webpackCompiler.context || process.cwd());
                    
                    console.log('\n🔨 OneView: Compiling views...');
                    
                    const comp = this.getCompiler();
                    const { context } = this.options;
                    
                    if (context === 'all') {
                        await comp.buildAllContexts(this.config, this.projectRoot);
                    } else {
                        await comp.buildContext(this.config, this.projectRoot, context);
                    }

                    console.log('✅ OneView: Views compiled\n');
                }
                
                callback();
            } catch (error) {
                console.error('❌ OneView compilation error:', error.message);
                callback(error);
            }
        });

        // Setup file watching in watch mode
        webpackCompiler.hooks.watchRun.tapAsync(pluginName, async (watching, callback) => {
            if (this.isWatching) {
                callback();
                return;
            }

            this.isWatching = true;

            if (!this.options.watch) {
                callback();
                return;
            }

            // Setup chokidar watcher for .one files
            this.setupWatcher(webpackCompiler);
            callback();
        });

        // Clean up watcher on done
        webpackCompiler.hooks.watchClose.tap(pluginName, () => {
            if (this.watcher) {
                this.watcher.close();
                this.watcher = null;
            }
        });
    }

    setupWatcher(webpackCompiler) {
        const chokidar = require('chokidar');
        const { context } = this.options;

        // Get directories to watch
        const watchDirs = [];
        const contexts = context === 'all'
            ? Object.keys(this.config.contexts).filter(c => c !== 'default')
            : [context];

        const oneViewPath = path.join(this.projectRoot, this.config.paths.oneView || 'resources/one');

        for (const ctx of contexts) {
            const ctxConfig = this.config.contexts[ctx];
            if (ctxConfig?.views) {
                for (const [namespace, viewPath] of Object.entries(ctxConfig.views)) {
                    const fullPath = path.join(oneViewPath, viewPath);
                    if (fs.existsSync(fullPath)) {
                        watchDirs.push(fullPath);
                    }
                }
            }
        }

        if (watchDirs.length === 0) return;

        console.log('👀 OneView: Watching for .one file changes...');

        this.watcher = chokidar.watch(watchDirs, {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true,
        });

        let debounceTimer = null;

        const recompile = async (changedPath) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                console.log(`\n🔄 OneView: ${path.basename(changedPath)} changed, recompiling...`);
                try {
                    const comp = this.getCompiler();
                    if (context === 'all') {
                        await comp.buildAllContexts(this.config, this.projectRoot);
                    } else {
                        await comp.buildContext(this.config, this.projectRoot, context);
                    }
                    console.log('✅ OneView: Recompiled');
                    
                    // Invalidate webpack cache to trigger rebuild
                    webpackCompiler.watching?.invalidate();
                } catch (error) {
                    console.error('❌ OneView recompile error:', error.message);
                }
            }, 300);
        };

        this.watcher.on('change', recompile);
        this.watcher.on('add', recompile);
        this.watcher.on('unlink', recompile);
    }
}

/**
 * Webpack Loader for HTML template minification
 * 
 * Usage in webpack.config.js:
 * 
 * module.exports = {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.(ts|js)$/,
 *         use: ['oneview/webpack-loader'],
 *         include: /one\/.*views/  // Only process view files
 *       }
 *     ]
 *   }
 * };
 */
function oneviewLoader(source) {
    // Check if contains HTML templates
    if (!source.includes('`') || !/<[a-z]/i.test(source)) {
        return source;
    }

    try {
        const { processTemplateStrings } = require('./html-minify-plugin');
        return processTemplateStrings(source);
    } catch (error) {
        this.emitWarning(new Error(`OneView HTML minify warning: ${error.message}`));
        return source;
    }
}

module.exports = OneViewWebpackPlugin;
module.exports.OneViewWebpackPlugin = OneViewWebpackPlugin;
module.exports.oneviewLoader = oneviewLoader;
