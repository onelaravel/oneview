/**
 * OneView Vite Plugin
 * Integrates OneView compilation into Vite build process
 * 
 * Usage in vite.config.ts:
 * 
 * import { defineConfig } from 'vite';
 * import oneview from 'oneview/vite';
 * 
 * export default defineConfig({
 *   plugins: [
 *     oneview({
 *       context: 'admin',  // or 'all' for all contexts
 *       minifyHtml: true,  // minify HTML in templates (default: true)
 *       watch: true,       // watch .one files in dev mode (default: true)
 *     })
 *   ]
 * });
 */

const path = require('path');
const fs = require('fs');

function oneviewPlugin(options = {}) {
    const {
        context = 'default',
        minifyHtml = true,
        watch = true,
        configPath = null, // Custom path to one.config.json
    } = options;

    let compiler = null;
    let projectRoot = null;
    let config = null;
    let isDevMode = false;

    // Lazy load compiler
    const getCompiler = () => {
        if (!compiler) {
            const Compiler = require('./index');
            compiler = new Compiler();
        }
        return compiler;
    };

    // Load OneView config
    const loadConfig = (root) => {
        const ConfigManager = require('./config-manager');
        const searchPath = configPath || root;
        const result = ConfigManager.loadConfig(searchPath);
        projectRoot = result.projectRoot;
        config = result.config;
        return result;
    };

    return {
        name: 'vite-plugin-oneview',
        
        // Run before Vite resolves config
        config(viteConfig, { command }) {
            isDevMode = command === 'serve';
        },

        // Run when Vite server starts or build begins
        async buildStart() {
            try {
                // Load config from project root
                const root = process.cwd();
                loadConfig(root);

                console.log('\n🔨 OneView: Compiling views...');
                
                const comp = getCompiler();
                
                if (context === 'all') {
                    await comp.buildAllContexts(config, projectRoot);
                } else {
                    await comp.buildContext(config, projectRoot, context);
                }

                console.log('✅ OneView: Views compiled\n');
            } catch (error) {
                console.error('❌ OneView compilation error:', error.message);
                throw error;
            }
        },

        // Watch .one files for changes in dev mode
        configureServer(server) {
            if (!watch || !isDevMode) return;
            
            // Ensure config is loaded
            if (!config) {
                try {
                    loadConfig(process.cwd());
                } catch (e) {
                    console.warn('⚠️ OneView: Could not load config for watch mode');
                    return;
                }
            }

            const chokidar = require('chokidar');

            // Get directories to watch
            const watchDirs = [];
            const contexts = context === 'all'
                ? Object.keys(config.contexts).filter(c => c !== 'default')
                : [context];

            const oneViewPath = path.join(projectRoot, config.paths.oneView || 'resources/one');

            for (const ctx of contexts) {
                const ctxConfig = config.contexts[ctx];
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

            const watcher = chokidar.watch(watchDirs, {
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
                        const comp = getCompiler();
                        if (context === 'all') {
                            await comp.buildAllContexts(config, projectRoot);
                        } else {
                            await comp.buildContext(config, projectRoot, context);
                        }
                        console.log('✅ OneView: Recompiled\n');
                        
                        // Trigger Vite HMR
                        server.ws.send({ type: 'full-reload' });
                    } catch (error) {
                        console.error('❌ OneView recompile error:', error.message);
                    }
                }, 300);
            };

            watcher.on('change', recompile);
            watcher.on('add', recompile);
            watcher.on('unlink', recompile);

            // Clean up on server close
            server.httpServer?.on('close', () => {
                watcher.close();
            });
        },

        // Transform to minify HTML in templates
        transform(code, id) {
            if (!minifyHtml) return null;
            if (!id.endsWith('.ts') && !id.endsWith('.js')) return null;
            if (!code.includes('`') || !/<[a-z]/i.test(code)) return null;

            try {
                const { processTemplateStrings } = require('./html-minify-plugin');
                const transformed = processTemplateStrings(code);
                
                if (transformed !== code) {
                    return {
                        code: transformed,
                        map: null
                    };
                }
            } catch (error) {
                // Ignore transform errors
            }

            return null;
        }
    };
}

module.exports = oneviewPlugin;
module.exports.default = oneviewPlugin;
