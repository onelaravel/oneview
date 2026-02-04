/**
 * OneView Vite Plugin
 */

export interface OneViewVitePluginOptions {
    /**
     * Context to compile
     * @default 'default'
     */
    context?: string | 'all';
    
    /**
     * Minify HTML in template strings
     * @default true
     */
    minifyHtml?: boolean;
    
    /**
     * Watch .one files for changes in dev mode
     * @default true
     */
    watch?: boolean;
    
    /**
     * Custom path to one.config.json
     */
    configPath?: string;
}

/**
 * OneView Vite plugin
 * @param options Plugin options
 */
declare function oneviewPlugin(options?: OneViewVitePluginOptions): import('vite').Plugin;

export default oneviewPlugin;
export { oneviewPlugin };
