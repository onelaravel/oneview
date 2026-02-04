/**
 * Example Webpack configuration with OneView
 * 
 * Copy this to your project root as webpack.config.js
 */

const path = require('path');
const OneViewPlugin = require('oneview/webpack');

module.exports = {
    mode: 'production',
    
    entry: {
        app: './resources/js/one/app.ts',
    },
    
    output: {
        path: path.resolve(__dirname, 'public/static/one'),
        filename: '[name].js',
        clean: true,
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@one': path.resolve(__dirname, 'resources/js/one'),
            '@views': path.resolve(__dirname, 'resources/js/one/app/views'),
        },
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            // Optional: Use oneview loader for HTML minification
            {
                test: /\.(ts|js)$/,
                use: ['oneview/webpack-loader'],
                include: /one\/.*views/,  // Only process view files
            },
        ],
    },
    
    plugins: [
        // OneView plugin - compiles .one files before Webpack build
        new OneViewPlugin({
            // Context to compile: 'admin', 'web', 'mobile', 'default', or 'all'
            context: 'default',
            
            // Minify HTML in template strings (default: true)
            minifyHtml: true,
            
            // Watch .one files in watch mode (default: true)
            watch: true,
        }),
    ],
    
    // Development settings
    devtool: 'source-map',
    
    // Watch mode settings
    watchOptions: {
        ignored: /node_modules/,
    },
};


/**
 * Multiple entry points for different contexts
 */
// module.exports = {
//     entry: {
//         admin: './resources/js/one/admin/app.ts',
//         web: './resources/js/one/web/app.ts',
//         mobile: './resources/js/one/mobile/app.ts',
//     },
//     output: {
//         path: path.resolve(__dirname, 'public/static/one'),
//         filename: '[name]/js/[name].js',
//     },
//     plugins: [
//         new OneViewPlugin({ context: 'all' }),
//     ],
// };
