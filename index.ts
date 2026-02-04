/**
 * OneJS V2 - Main Export
 * TypeScript Core with Optimizations
 */

// Core
export { Application } from './src/core/app/Application.js';
export { Container } from './src/core/app/Container.js';
export { initApp, updateActiveNav } from './src/core/bootstrap/init.js';
export { Helper } from './src/core/helpers/Helper.js';
export { Router, ActiveRoute, useRoute, useParams, useQuery, useFragment } from './src/core/routers/Router.js';
export { API, AppAPI } from './src/core/helpers/API.js';
export { OneMarkup, OneMarkupModel, OneMarkupService } from './src/core/dom/OneMarkup.js';
export { OneDOM } from './src/core/dom/OneDOM.js';
// export { TemplateEngine } from './core/TemplateEngine';

// Bootstrap & Utilities
export { App } from './src/core/bootstrap/app.js';
export { app, appContainer } from './src/core/utils/app.js';

// View System
export { 
    View,
    ViewBase, 
    ViewController, 
    ViewManager, 
    ViewLoader, 
    viewLoader,
    ViewTemplateManager,
    ViewState,
    StateManager,
    SSRViewDataParser,
    SSRViewDataCollection,
    SSRViewData
} from './src/core/view/index.js';
export type { 
    ViewLifecycle, 
    ControllerOptions, 
    ViewInstance, 
    ViewModule,
    LoadResult,
    WrapperConfig,
    SectionMetadata,
    SSRViewDataItem
} from './src/core/view/index.js';