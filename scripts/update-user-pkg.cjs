const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('/Users/doanln/Desktop/2026/Projects/onelaravel/package.json', 'utf8'));

// Add/Update OneView scripts
pkg.scripts['one:compile'] = 'one-compile default';
pkg.scripts['one:compile:all'] = 'one-compile all';
pkg.scripts['one:compile:admin'] = 'one-compile admin';
pkg.scripts['one:compile:web'] = 'one-compile web';
pkg.scripts['one:compile:mobile'] = 'one-compile mobile';

pkg.scripts['one:build'] = 'one-build default --minify';
pkg.scripts['one:build:all'] = 'one-build all --minify';
pkg.scripts['one:build:admin'] = 'one-build admin --minify';
pkg.scripts['one:build:web'] = 'one-build web --minify';
pkg.scripts['one:build:mobile'] = 'one-build mobile --minify';

pkg.scripts['one:dev'] = 'one-build default --watch';
pkg.scripts['one:dev:admin'] = 'one-build admin --watch';
pkg.scripts['one:dev:web'] = 'one-build web --watch';

// Vite with OneView
pkg.scripts['vite:build'] = 'vite build';
pkg.scripts['vite:dev'] = 'vite';

fs.writeFileSync('/Users/doanln/Desktop/2026/Projects/onelaravel/package.json', JSON.stringify(pkg, null, 4));
console.log('Updated package.json');
