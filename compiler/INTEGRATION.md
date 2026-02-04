# OneView Compiler Integration Guide

## Overview

OneView Compiler là một phần của thư viện **OneView** npm package. Khi người dùng cài đặt OneView, họ sẽ tự động có quyền truy cập vào compiler.

## Installation

### Cách 1: Thông qua OneView Package (Khuyến khích)
```bash
npm install oneview
```

Compiler sẽ tự động được tích hợp vào node_modules.

### Cách 2: Global Installation (Optional)
```bash
npm install -g oneview
```

Khi đó có thể sử dụng `onejs-build` từ bất kỳ đâu.

## Available Commands

### Via npm scripts (Khuyến khích)
```bash
npm run build:views              # Build all contexts
npm run build:views:web          # Build web context
npm run build:views:admin        # Build admin context
npm run build:views:mobile       # Build mobile context
npm run build:views:watch        # Watch all contexts
```

### Via npx
```bash
npx onejs-build web              # Build web context
npx onejs-build all              # Build all contexts
npx onejs-build web --watch      # Watch web context
```

### Via direct CLI (if installed globally)
```bash
onejs-build web
onejs-build admin --watch
```

## Setup in Laravel Project

### 1. Create Configuration File
Copy example config từ OneView package:
```bash
cp node_modules/oneview/compiler/one.config.example.json one.config.json
```

Edit `one.config.json` với đường dẫn của project:
```json
{
  "root": "resources/one/app",
  "output": {
    "base": "public/static/one",
    "contexts": {
      "web": "public/static/one/web",
      "admin": "public/static/one/admin"
    }
  },
  "contexts": {
    "web": {
      "name": "Web",
      "app": ["resources/one/app/web/app"],
      "views": {
        "web": "resources/one/app/web/views"
      },
      "blade": {
        "web": "resources/views/web"
      },
      "temp": {
        "views": "resources/one/js/temp/web/views",
        "registry": "resources/one/js/temp/web/registry.js"
      }
    }
  }
}
```

### 2. Add npm Scripts
Update `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:templates && npm run build:webpack",
    "build:templates": "onejs-build all",
    "build:templates:web": "onejs-build web",
    "build:templates:admin": "onejs-build admin",
    "build:templates:watch": "onejs-build all --watch",
    "dev": "npm run build:templates:watch",
    "dev:web": "onejs-build web --watch"
  }
}
```

### 3. Create Directory Structure
```bash
# Create source directories
mkdir -p resources/one/app/web/app
mkdir -p resources/one/app/web/views
mkdir -p resources/one/app/admin/app
mkdir -p resources/one/app/admin/views

# Create output directories
mkdir -p resources/views/web
mkdir -p resources/views/admin
mkdir -p resources/one/js/temp/web/views
mkdir -p resources/one/js/temp/admin/views
```

### 4. Run Compiler
```bash
# Build all templates
npm run build:templates

# Watch for changes during development
npm run dev

# Build specific context
npm run build:templates:web
```

## Integration with OneView Library

### Export from Main Package
Compiler được exported từ main OneView package:

```javascript
// In oneview package.json
"exports": {
  "./compiler": {
    "import": "./compiler/index.js",
    "require": "./compiler/index.js"
  }
}
```

### Usage in Node.js
```javascript
// Import compiler directly
const Compiler = require('oneview/compiler');

// Use programmatically
const compiler = new Compiler();
await compiler.run(['web']);

// Or build all contexts
await compiler.buildAllContexts(config, projectRoot);
```

## CLI in package.json Scripts

Compiler CLI được daftarkan sebagai `bin` di OneView package:

```json
"bin": {
  "onejs-build": "./compiler/cli.js"
}
```

Ini memastikan:
- `onejs-build` command tersedia dalam npm scripts
- Dapat dipanggil via `npx onejs-build` tanpa instalasi global
- Tersedia sebagai global command jika package diinstal globally

## Build Process

### Command Flow
```
npm run build:views
       ↓
onejs-build all
       ↓
node compiler/cli.js all
       ↓
Compiler.run(['all'])
       ↓
buildAllContexts()
       ↓
For each context:
  - Scan .one files
  - Parse → AST
  - Generate Blade + JS
  - Write output files
  - Generate registry.js
```

### Output Structure
```
resources/views/
├── web/
│   ├── pages/
│   │   ├── Home.blade.php
│   │   └── About.blade.php
│   └── components/
│       └── Header.blade.php
└── admin/
    ├── Dashboard.blade.php
    └── Users.blade.php

resources/one/js/temp/
├── web/
│   ├── views/
│   │   ├── WebPagesHome.js
│   │   ├── WebPagesAbout.js
│   │   └── WebComponentsHeader.js
│   └── registry.js
└── admin/
    ├── views/
    │   ├── AdminDashboard.js
    │   └── AdminUsers.js
    └── registry.js

public/static/one/
├── web/
│   ├── main.bundle.js
│   ├── main.css
│   └── assets/
└── admin/
    ├── main.bundle.js
    ├── main.css
    └── assets/
```

## Watch Mode

Untuk development, gunakan watch mode:

```bash
# Watch web context
npm run dev:web

# Watch all contexts
npm run dev

# Or directly
onejs-build web --watch
onejs-build all --watch
```

Watch mode akan:
- Detect file changes dalam .one directories
- Automatically recompile affected files
- Preserve development experience
- Support hot reloading (if configured with webpack)

## Version Management

Compiler version selalu sama dengan OneView version:
- OneView package: v1.0.0
- Compiler module: v1.0.0

Update keduanya bersama-sama:
```bash
npm update oneview
```

## Troubleshooting

### Command not found: onejs-build
```bash
# Make sure OneView is installed
npm install oneview

# Or use npx
npx onejs-build web
```

### one.config.json not found
```bash
# Ensure config exists at project root
ls one.config.json

# Copy from template if missing
cp node_modules/oneview/compiler/one.config.example.json one.config.json
```

### No .one files found
Check:
1. Files exist in configured paths
2. Files have .one extension
3. Paths in one.config.json are correct
4. Directory structure matches config

### Permission denied on CLI
```bash
# Make CLI executable
chmod +x node_modules/oneview/compiler/cli.js

# Or use npx
npx onejs-build web
```

## Programmatic Usage

```javascript
const Compiler = require('oneview/compiler');

const compiler = new Compiler();

// Build single context
await compiler.buildContext(config, projectRoot, 'web');

// Build all contexts
await compiler.buildAllContexts(config, projectRoot);

// With watch mode
await compiler.run(['web', '--watch']);
```

## Files Included in Package

Thư viện OneView include:

```
node_modules/oneview/
├── compiler/
│   ├── cli.js                    # CLI executable
│   ├── index.js                  # Main Compiler class
│   ├── parser.js                 # Parser module
│   ├── blade-generator.js        # Blade generator
│   ├── js-generator.js           # JS generator
│   ├── config-manager.js         # Config manager
│   ├── test.js                   # Test suite
│   ├── package.json              # Compiler package info
│   ├── README.md                 # Compiler documentation
│   ├── ARCHITECTURE.md           # Technical docs
│   └── one.config.example.json   # Example config
├── dist/                         # Compiled TypeScript
├── package.json                  # Main package
└── ...
```

## Development Workflow

### Development
```bash
# Terminal 1: Watch TypeScript
npm run build:watch

# Terminal 2: Watch templates
npm run dev:web

# Terminal 3: Start Laravel dev server
php artisan serve
```

### Production
```bash
# Build everything
npm run build
npm run build:templates

# Webpack build
npm run build:webpack
```

## Integration with Build System

### Webpack Integration
```javascript
// webpack.config.js
const Compiler = require('oneview/compiler');

module.exports = {
  plugins: [
    // Plugin to trigger compiler during build
    new (class {
      apply(compiler) {
        compiler.hooks.beforeCompile.tapPromise(
          'OneViewCompiler',
          async () => {
            const ov = new Compiler();
            await ov.buildAllContexts(config, projectRoot);
          }
        );
      }
    })()
  ]
};
```

### Laravel Mix Integration
```javascript
// webpack.mix.js
const mix = require('laravel-mix');
const { execSync } = require('child_process');

mix.before(() => {
  execSync('onejs-build all', { stdio: 'inherit' });
});

mix.js('resources/js/app.js', 'public/js/app.js')
   .css('resources/css/app.css', 'public/css/app.css');
```

---

**OneView Compiler v1.0.0**  
**Part of OneView Framework**  
**Created: 2026-02-03**
