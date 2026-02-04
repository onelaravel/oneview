/**
 * Example Vite configuration with OneView
 * 
 * Copy this to your project root as vite.config.ts
 */

import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import oneview from 'oneview/vite';

export default defineConfig({
    plugins: [
        // Laravel Vite plugin (if using Laravel)
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
        }),

        // OneView plugin - compiles .one files before Vite build
        oneview({
            // Context to compile: 'admin', 'web', 'mobile', 'default', or 'all'
            context: 'default',
            
            // Minify HTML in template strings (default: true)
            minifyHtml: true,
            
            // Watch .one files in dev mode (default: true)
            watch: true,
        }),
    ],

    // Optional: Configure resolve aliases for cleaner imports
    resolve: {
        alias: {
            '@one': '/resources/js/one',
            '@views': '/resources/js/one/app/views',
        },
    },
});


/**
 * Alternative: Multiple contexts with separate entry points
 */
// export default defineConfig({
//     plugins: [
//         laravel({
//             input: [
//                 'resources/js/one/app.ts',      // Default context
//                 'resources/js/one/admin/app.ts', // Admin context (if separate)
//             ],
//             refresh: true,
//         }),
//         oneview({ context: 'all' }),
//     ],
// });
