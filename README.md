# OneView - Modern TypeScript Framework for Laravel

OneView is a modern, TypeScript-first framework designed to create reactive single-page applications (SPAs) for Laravel projects. Built with performance, developer experience, and flexibility in mind.

## Features

- **⚡ TypeScript First**: Full TypeScript support with excellent type safety
- **🎨 Reactive Views**: Built-in reactive view system with automatic state management
- **📦 Modular Architecture**: Component-based architecture for scalable applications
- **🔄 Hot Module Replacement**: Development watch mode with automatic compilation
- **🚀 Laravel Integration**: Seamless integration with Laravel backends
- **📱 SSR Support**: Server-side rendering capabilities
- **🎯 Lightweight**: Minimal bundle size with tree-shaking support
- **🔧 Developer Friendly**: Excellent DX with CLI tools and build utilities

## Installation

```bash
npm install oneview
# or
yarn add oneview
# or
pnpm add oneview
```

## Quick Start

### Basic Setup

```typescript
import { OneApp, app, appContainer } from 'oneview';
import { ViewController } from 'oneview';

// Initialize your app
const app = new OneApp({
  el: '#app',
  debug: true
});

await app.init();
```

### Creating a View

```typescript
import { ViewBase, ViewController } from 'oneview';

export class HomeView extends ViewBase {
  constructor() {
    super('home', 'home-template');
  }

  onMount() {
    // Initialize view logic
  }
}

export class HomeController extends ViewController {
  view = HomeView;

  onLoad() {
    // Handle view data loading
  }
}
```

### Routing

```typescript
import { Router } from 'oneview';

const router = new Router();

router.register('home', HomeController);
router.register('about', AboutController);

router.navigate('home');
```

### State Management

```typescript
import { ViewState, StateManager } from 'oneview';

const state = new ViewState({
  count: 0,
  user: null
});

state.count = 5; // Trigger reactive updates
state.subscribe(newState => {
  console.log('State updated:', newState);
});
```

## API Reference

### Core Classes

#### Application
Main application entry point for initializing OneView.

```typescript
const app = new Application({
  el: string;           // DOM element selector
  debug?: boolean;      // Enable debug mode
  autoRoute?: boolean;  // Auto-load routes
});
```

#### ViewBase
Base class for creating views.

```typescript
class MyView extends ViewBase {
  constructor(name: string, templateId: string) {
    super(name, templateId);
  }

  onMount(): void { }
  onUnmount(): void { }
  onUpdate(): void { }
}
```

#### Router
Client-side router for managing routes.

```typescript
const router = new Router();

router.register(path: string, controller: Class);
router.navigate(path: string);
```

#### ViewManager
Manages view lifecycle and rendering.

```typescript
import { viewLoader } from 'oneview';

const manager = new ViewManager(container);
await manager.loadView('view-name');
```

### Utilities

#### Helper
Utility functions for common tasks.

```typescript
import { Helper } from 'oneview';

Helper.addClass(element, 'active');
Helper.removeClass(element, 'active');
Helper.hasClass(element, 'active');
```

#### API / AppAPI
Make HTTP requests to your backend.

```typescript
import { API } from 'oneview';

const response = await API.post('/api/users', { name: 'John' });
const data = await API.get('/api/users');
```

#### OneDOM / OneMarkup
DOM manipulation and template processing.

```typescript
import { OneDOM, OneMarkup } from 'oneview';

const element = OneDOM.query('#my-element');
const markup = new OneMarkup('<div>{{ name }}</div>');
```

## CLI Commands

### Build the Library
```bash
npm run build
```

### Watch Mode
```bash
npm run build:watch
```

### Type Checking
```bash
npm run type-check
```

### Build Views
```bash
npm run build:views
```

### Clean Build
```bash
npm run clean
```

## Configuration

### TypeScript Configuration

The project includes a `tsconfig.json` for TypeScript compilation. Key settings:

- **target**: ES2020
- **module**: ESNext
- **lib**: ES2020, DOM
- **strict**: true
- **declaration**: true
- **sourceMap**: true

### Package Exports

The package provides multiple entry points:

```json
{
  ".": "./index.js",
  "./plugins": "./plugins.js",
  "./core": "./dist/core/index.js"
}
```

## Project Structure

```
oneview/
├── src/
│   ├── core/
│   │   ├── app/               # Application & Container
│   │   ├── bootstrap/         # App initialization
│   │   ├── dom/               # DOM manipulation
│   │   ├── helpers/           # Utility helpers
│   │   ├── reactive/          # Reactivity system
│   │   ├── routers/           # Router implementation
│   │   ├── services/          # Core services
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   └── view/              # View system
│   └── plugins/               # Plugin system
├── dist/                      # Compiled output
├── index.ts                   # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Publishing to NPM

### 1. Update Version
```bash
npm version patch  # or minor, major
```

### 2. Build the Project
```bash
npm run build
```

### 3. Prepare for Publishing
Ensure all tests pass:
```bash
npm test
```

### 4. Login to NPM
```bash
npm login
```

### 5. Publish
```bash
npm publish
```

For scoped packages:
```bash
npm publish --access public
```

## Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# TypeScript compilation
npm run build:ts

# Watch mode
npm run build:watch

# Type checking
npm run type-check
```

### Testing

```bash
npm test
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📖 [Documentation](https://onelaravel.com/docs)
- 💬 [Discord Community](https://discord.gg/onelaravel)
- 🐛 [Issue Tracker](https://github.com/onelaravel/oneview/issues)
- 📧 [Email Support](mailto:support@onelaravel.com)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## Author

**OneLaravel** - Modern Laravel Framework
- Website: https://onelaravel.com
- GitHub: https://github.com/onelaravel

---

Made with ❤️ by the OneLaravel Team
