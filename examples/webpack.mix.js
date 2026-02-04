/**
 * Example Laravel Mix configuration with OneView
 * 
 * Copy this to your project root as webpack.mix.js
 */

const mix = require('laravel-mix');
const OneViewPlugin = require('oneview/webpack');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 */

mix.ts('resources/js/one/app.ts', 'public/static/one/app.js')
   .sourceMaps();

// Add OneView plugin to compile .one files
mix.webpackConfig({
    plugins: [
        new OneViewPlugin({
            context: 'default',  // or 'all', 'admin', 'web', etc.
            minifyHtml: true,
            watch: true,
        }),
    ],
    resolve: {
        alias: {
            '@one': path.resolve(__dirname, 'resources/js/one'),
        },
    },
});

// Production: minify
if (mix.inProduction()) {
    mix.version();
}


/**
 * Multiple contexts example
 */
// mix.ts('resources/js/one/app.ts', 'public/static/one/app.js')
//    .ts('resources/js/one/admin/app.ts', 'public/static/one/admin/admin.js')
//    .webpackConfig({
//        plugins: [
//            new OneViewPlugin({ context: 'all' }),
//        ],
//    });
