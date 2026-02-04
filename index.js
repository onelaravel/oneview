/**
 * OneJS V2 - Core Exports
 * 
 * Modern, type-safe, reactive framework for building SPAs
 */

// Core Application
export { Application } from './core/Application.js';

// View System
export { View } from './src/core/view/View.js';
export { ViewManager } from './src/core/view/ViewManager.js';
export { ViewBase } from './src/core/view/ViewBase.js';
export { ViewLoader } from './src/core/view/ViewLoader.js';

// Services
export { StorageService, storage } from './src/core/services/StorageService.js';
export { EventService } from './src/core/services/EventService.js';
export { HttpService } from './src/core/services/HttpService.js';
export { StoreService } from './src/core/services/StoreService.js';

// Core utilities
export { OneDOM } from './src/core/dom/OneDOM.js';
export { OneMarkup, OneMarkupService, OneMarkupModel } from './src/core/dom/OneMarkup.js';
export { Router, ActiveRoute } from './core/Router.js';

// Reactive System
export { Reactive } from './core/reactive/Reactive.js';

// Export default for convenience
import { Application } from './core/Application.js';
export default {
    Application
};
