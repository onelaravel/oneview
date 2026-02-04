/**
 * OneView Webpack Plugin
 */

import { Compiler } from 'webpack';

export interface OneViewWebpackPluginOptions {
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
     * Watch .one files for changes
     * @default true
     */
    watch?: boolean;
    
    /**
     * Custom path to one.config.json
     */
    configPath?: string;
}

/**
 * OneView Webpack Plugin
 */
declare class OneViewWebpackPlugin {
    constructor(options?: OneViewWebpackPluginOptions);
    apply(compiler: Compiler): void;
}

export default OneViewWebpackPlugin;
export { OneViewWebpackPlugin };
