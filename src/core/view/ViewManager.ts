/**
 * ViewManager - Manage view lifecycle and rendering
 * V2 TypeScript - Optimized with caching and SSR support
 */

import type { ViewConfig, ViewProps } from '../types/index.js';
import type { ActiveRoute } from '../routers/Router.js';
import { ViewBase } from './ViewBase.js';
import { viewLoader } from './ViewLoader.js';
import { ViewController } from './ViewController.js';
import { EventService } from '../services/EventService.js';
import { SSRViewDataCollection, SSRViewDataParser } from './SSRViewDataParser.js';
import { OneDOM } from '../dom/OneDOM.js';

export interface ViewInstance {
    id: string;
    name: string;
    view: ViewBase;
    container: HTMLElement;
    config: ViewConfig;
}

export interface LoadResult {
    html: string | null;
    error: string | null;
    superView: ViewBase | null;
    ultraView: ViewBase | null;
    isSuperView: boolean;
    needInsert: boolean;
    isCached: boolean;
}

export class ViewManager {
    private container: HTMLElement | null = null;
    private instances: Map<string, ViewInstance> = new Map();
    private currentView: ViewInstance | null = null;
    private event: EventService;
    
    // View templates registry (V1 compatibility)
    public templates: Record<string, any> = {};
    public Engine: typeof ViewBase = ViewBase;
    
    // View registry (V2 - ESM imports mapped to view names)
    // Supports both sync factory functions and async imports
    private viewRegistry: Record<string, ((...args: any[]) => any) | (() => Promise<any>)> = {};
    
    // V1 compatibility
    public App: any = null;
    public CURRENT_SUPER_VIEW: ViewBase | null = null;
    public CURRENT_SUPER_VIEW_PATH: string | null = null;
    public CURRENT_SUPER_VIEW_MOUNTED: boolean = false;
    public PAGE_VIEW: ViewBase | null = null;
    public VIEW_MOUNTED_QUEUE: ViewBase[][] = [];
    public ALL_VIEW_STACK: ViewBase[] = [];
    public SUPER_VIEW_STACK: ViewBase[] = [];
    public renderTimes: number = -1;
    
    // SSR support
    public ssrViewManager: SSRViewDataCollection;
    public ssrData: any = {};
    
    // Section registry (for @section/@yield)
    private _sections: Record<string, string> = {};
    private _changedSections: string[] = [];
    private _stacks: Record<string, string[]> = {};

    constructor(_App: any = null) {
        this.event = EventService.getInstance();
        this.App = _App;
        this.ssrViewManager = new SSRViewDataCollection();
    }

    /**
     * Set container element
     */
    setContainer(container: HTMLElement): void {
        this.container = container;
        console.log('[ViewManager] Container set');
    }

    /**
     * Set view registry (V2 feature - maps view names to ESM module loaders)
     * @param registry - Map of view names to async module loaders
     * 
     * @example
     * const registry = {
     *   'web.home': () => import('./views/web/home.js'),
     *   'web.about': () => import('./views/web/about.js'),
     * };
     * viewManager.setViewRegistry(registry);
     */
    setViewRegistry(registry: Record<string, ((...args: any[]) => any) | (() => Promise<any>)>): void {
        this.viewRegistry = registry;
        console.log(`[ViewManager] View registry loaded with ${Object.keys(registry).length} views`);
    }

    /**
     * Set super view path (base path for views)
     * @param path - Base path to user's views (e.g., '/public/views', './src/views')
     * @param absolute - Whether path is absolute URL/path
     */
    setSuperViewPath(path: string, absolute: boolean = false): void {
        viewLoader.setBasePath(path, absolute);
        console.log(`[ViewManager] Super view path: ${path}`);
    }

    /**
     * Initialize view config
     */
    init(config: any): void {
        if (config?.basePath) {
            this.setSuperViewPath(config.basePath);
        }

        // Initialize SSR data if exists
        this.ssrData = config?.ssrData || {};
        this.ssrViewManager.setViews(this.ssrData);

        console.log('[ViewManager] Initialized');
    }

    /**
     * Mount view (normal SPA navigation - CSR mode)
     */
    async mountView(name: string, params: ViewProps = {}, route?: ActiveRoute): Promise<void> {
        try {
            console.log(`🚀 Mounting view: ${name}`);

            // Load view module - try registry first, then fallback to viewLoader
            let module: any;
            
            if (this.viewRegistry[name]) {
                // V2: Load from registry (ESM import)
                try {
                    module = await this.viewRegistry[name]();
                    console.log(`[ViewManager] Loaded view from registry: ${name}`);
                } catch (registryError) {
                    console.warn(`[ViewManager] Registry load failed for ${name}, falling back to viewLoader:`, registryError);
                    module = await viewLoader.load(name);
                }
            } else {
                // V1: Load from viewLoader (dynamic path-based import)
                module = await viewLoader.load(name);
            }
            
            const ViewClass = module.default || module[name] || ViewController;
            
            if (!this.templates[name]) {
                this.templates[name] = ViewClass;
            }

            // Load and render view using V1 logic
            const viewResult = await this.loadView(name, params, route?.$urlPath || '');
            
            if (viewResult.error) {
                console.error('View rendering error:', viewResult.error);
                return;
            }

            // Insert HTML if needed
            if (viewResult.needInsert && viewResult.html) {
                const container = this.getViewContainer();
                if (!container) {
                    throw new Error('[ViewManager] No container available');
                }
                OneDOM.setHTML(container, viewResult.html);
            }

            // Emit changed sections
            this.emitChangedSections();

            // Mount ultra view (outermost view)
            if (viewResult.ultraView) {
                const ultraView = viewResult.ultraView as any;
                if (ultraView.onMounted) {
                    await ultraView.onMounted();
                }
            }

            this.CURRENT_SUPER_VIEW_MOUNTED = true;

            // Emit event
            this.event.emit('view.mounted', { name });

            console.log(`✅ View mounted: ${name}`);
        } catch (error) {
            console.error(`❌ Failed to mount view: ${name}`, error);
            throw error;
        }
    }

    /**
     * Load and render view with super view handling (V1 compatibility)
     * @param name - View name
     * @param data - View data
     * @param urlPath - URL path
     * @returns LoadResult with html, superView, ultraView, etc.
     */
    async loadView(name: string, data: any = {}, urlPath: string = ''): Promise<LoadResult> {
        try {
            // Clear old state
            this.renderTimes++;
            this.CURRENT_SUPER_VIEW_MOUNTED = false;
            this.CURRENT_SUPER_VIEW = null;
            this.CURRENT_SUPER_VIEW_PATH = null;
            this.PAGE_VIEW = null;

            // Create view instance
            const view = this.view(name, data) as any;
            if (!view) {
                return {
                    html: null,
                    error: `Failed to create view '${name}'`,
                    superView: null,
                    ultraView: null,
                    isSuperView: false,
                    needInsert: false,
                    isCached: false,
                };
            }

            if (urlPath) {
                view.urlPath = urlPath;
            }

            this.PAGE_VIEW = view;
            let superView: ViewBase | null = null;
            let superViewPath: string | null = null;
            let result: any;
            let ultraView: ViewBase = view;
            let renderIndex = 0;
            let currentView: any = view;

            // Loop to render view with super view chain
            do {
                try {
                    if (currentView.__.hasSuperView) {
                        this.ALL_VIEW_STACK.unshift(currentView);
                        superViewPath = currentView.__.superViewPath;
                        result = this.renderOrScanView(currentView, null, 'csr');
                        currentView = result;
                        if (currentView && typeof currentView === 'object' && currentView instanceof ViewBase) {
                            (currentView as any).__.setIsSuperView?.(true);
                            superView = currentView;
                            ultraView = currentView;
                        }
                    } else if (currentView.__.isSuperView) {
                        if (superViewPath !== currentView.__.path) {
                            this.SUPER_VIEW_STACK.unshift(currentView);
                            superViewPath = currentView.__.path;
                        }
                        superView = currentView;
                        ultraView = currentView;
                        if (currentView.__.hasSuperView) {
                            result = this.renderOrScanView(currentView, renderIndex > 0 ? currentView.data : null, 'csr');
                            currentView = result;
                            if (currentView && typeof currentView === 'object' && currentView instanceof ViewBase) {
                                (currentView as any).__.setIsSuperView?.(true);
                                superView = currentView;
                                ultraView = currentView;
                            }
                        } else {
                            result = '';
                        }
                    } else {
                        this.ALL_VIEW_STACK.unshift(currentView);
                        result = this.renderOrScanView(currentView, renderIndex > 0 ? currentView.data : null, 'csr');
                        ultraView = currentView;
                    }
                } catch (error: any) {
                    return {
                        html: null,
                        error: `Error rendering view '${name}': ${error.message}`,
                        superView: null,
                        ultraView: null,
                        isSuperView: false,
                        needInsert: false,
                        isCached: false,
                    };
                }
                renderIndex++;
            } while (result && typeof result === 'object' && result instanceof ViewBase);

            let html = result as string;
            const needInsert = !(superViewPath && superViewPath === this.CURRENT_SUPER_VIEW_PATH);
            
            if (superViewPath) {
                if (!needInsert) {
                    this.CURRENT_SUPER_VIEW_MOUNTED = true;
                } else {
                    this.CURRENT_SUPER_VIEW_PATH = superViewPath;
                    this.CURRENT_SUPER_VIEW = superView;
                    // Render super view HTML
                    if (superView) {
                        const sv = superView as any;
                        if (sv.__ && typeof sv.__.render === 'function') {
                            html = sv.__.render();
                        }
                    }
                }
            }

            return {
                html,
                error: null,
                superView,
                ultraView,
                isSuperView: !!superViewPath,
                needInsert,
                isCached: false,
            };
        } catch (error: any) {
            return {
                html: null,
                error: `Critical error loading view '${name}': ${error.message}`,
                superView: null,
                ultraView: null,
                isSuperView: false,
                needInsert: false,
                isCached: false,
            };
        }
    }

    /**
     * Mount view with scan (SSR hydration)
     */
    async mountViewScan(name: string, params: ViewProps = {}, route?: ActiveRoute): Promise<void> {
        try {
            console.log(`🔍 Hydrating view: ${name}`);

            // Parse SSR data if not already loaded
            if (!this.ssrData || Object.keys(this.ssrData).length === 0) {
                if (SSRViewDataParser.hasSSRData()) {
                    const parsedData = SSRViewDataParser.parseDocument();
                    this.ssrViewManager.setViews(parsedData);
                    this.ssrData = parsedData;
                }
            }

            // Get SSR view data
            const viewData = this.ssrViewManager.scan(name);
            if (!viewData) {
                console.warn(`[ViewManager] No SSR data found for ${name}, falling back to normal mount`);
                return this.mountView(name, params, route);
            }

            // Merge SSR data with params
            const mergedData = {
                ...params,
                ...viewData.data,
                __SSR_VIEW_ID__: viewData.viewId,
                $route: route,
            };

            // Load and scan view
            const scanResult = await this.scanView(name, mergedData, route);
            
            if (scanResult.error) {
                console.error('❌ Scan error:', scanResult.error);
                return;
            }

            // Insert HTML if needed
            if (scanResult.needInsert && scanResult.html) {
                const container = this.getViewContainer();
                if (container) {
                    OneDOM.setHTML(container, scanResult.html);
                }
            }

            // Mount the ultra view (outermost view)
            if (scanResult.ultraView) {
                const ultraView = scanResult.ultraView as any;
                if (ultraView.onMounted) {
                    await ultraView.onMounted();
                }
            }

            this.CURRENT_SUPER_VIEW_MOUNTED = true;

            // Emit event
            this.event.emit('view.hydrated', { name });

            console.log(`✅ View hydrated: ${name}`);
        } catch (error) {
            console.error(`❌ Failed to hydrate view: ${name}`, error);
            throw error;
        }
    }

    /**
     * Scan view for SSR hydration
     */
    async scanView(name: string, data: any, route?: ActiveRoute): Promise<LoadResult> {
        try {
            // Clear old layout info
            this.renderTimes++;
            this.CURRENT_SUPER_VIEW_MOUNTED = false;
            this.CURRENT_SUPER_VIEW = null;
            this.CURRENT_SUPER_VIEW_PATH = null;
            this.PAGE_VIEW = null;

            // Load view module and register in templates
            const module = await viewLoader.load(name);
            const ViewClass = module.default || module[name] || ViewController;
            
            // Register view in templates if not exists
            if (!this.templates[name]) {
                this.templates[name] = ViewClass;
            }
            
            // Create view instance using this.view() like V1
            const view = this.view(name, data) as any;
            if (!view) {
                return {
                    html: null,
                    error: `ViewManager.scanView: Failed to create view '${name}'`,
                    superView: null,
                    ultraView: null,
                    isSuperView: false,
                    needInsert: false,
                    isCached: false,
                };
            }
            view.App = this.App;
            
            if (route?.$urlPath) {
                view.urlPath = route.$urlPath;
            }

            this.PAGE_VIEW = view;
            
            let superView: ViewBase | null = null;
            let superViewPath: string | null = null;
            let result: any;
            let ultraView: ViewBase = view;
            let renderIndex = 0;

            // Loop to handle nested layouts
            do {
                try {
                    if (view.hasSuperView) {
                        // Has super view - scan it
                        this.ALL_VIEW_STACK.unshift(view);
                        superViewPath = view.superViewPath;
                        
                        result = this.scanRenderedView(view);
                        
                        if (result && typeof result === 'object') {
                            (result as any).isSuperView = true;
                            superView = result;
                            ultraView = result;
                            
                            // Get super view SSR data
                            const superViewData = this.ssrViewManager.scan(superViewPath!);
                            if (superViewData) {
                                // Scan super view DOM
                                // TODO: Implement __scan method
                            }
                        }
                    } else if ((view as any).isSuperView) {
                        // Is super view
                        if (superViewPath !== view.path) {
                            this.SUPER_VIEW_STACK.unshift(view);
                            superViewPath = view.path;
                        }
                        
                        superView = view;
                        ultraView = view;
                        
                        if (view.hasSuperView) {
                            result = await this.scanRenderedView(view);
                            if (result) {
                                result.isSuperView = true;
                                superView = result;
                                ultraView = result;
                            }
                        } else {
                            result = '';
                        }
                    } else {
                        // Normal view
                        this.ALL_VIEW_STACK.unshift(view);
                        result = this.scanRenderedView(view);
                        ultraView = view;
                    }
                } catch (error: any) {
                    return {
                        html: null,
                        error: `Error scanning view '${name}': ${error.message}`,
                        superView: null,
                        ultraView: null,
                        isSuperView: false,
                        needInsert: false,
                        isCached: false,
                    };
                }
                renderIndex++;
            } while (result && typeof result === 'object' && result instanceof ViewBase);

            // Determine if we need to insert HTML
            const needInsert = !(superViewPath && superViewPath === this.CURRENT_SUPER_VIEW_PATH);
            let html = result as string;

            if (superViewPath) {
                if (!needInsert) {
                    this.CURRENT_SUPER_VIEW_MOUNTED = true;
                } else {
                    this.CURRENT_SUPER_VIEW_PATH = superViewPath;
                    this.CURRENT_SUPER_VIEW = superView;
                    this.CURRENT_SUPER_VIEW_MOUNTED = false;
                    // Render super view using virtualRender (SSR mode)
                    if (superView) {
                        const sv = superView as any;
                        if (sv.__ && typeof sv.__.virtualRender === 'function') {
                            html = sv.__.virtualRender();
                        }
                    }
                }
            }

            // Mount all views bottom-up
            await this.mountAllViewsFromStack(this.renderTimes);

            return {
                html,
                error: null,
                superView,
                ultraView,
                isSuperView: !!superViewPath,
                needInsert,
                isCached: false,
            };
        } catch (error: any) {
            return {
                html: null,
                error: `Critical error scanning view '${name}': ${error.message}`,
                superView: null,
                ultraView: null,
                isSuperView: false,
                needInsert: false,
                isCached: false,
            };
        }
    }

    /**
     * Scan rendered view (virtualRender mode for SSR)
     * Calls view's virtualRender/virtualPrerender methods
     */
    private scanRenderedView(view: any, variableData: any = null): any {
        return this.renderOrScanView(view, variableData, 'ssr');
    }

    /**
     * Unified render/scan method (V1 compatibility)
     * Handles both CSR (render) and SSR (virtualRender) modes
     * 
     * @param view - View instance
     * @param variableData - Additional data
     * @param mode - 'csr' for render(), 'ssr' for virtualRender()
     */
    private renderOrScanView(view: any, variableData: any = null, mode: 'csr' | 'ssr' = 'csr'): any {
        // Determine methods based on mode
        const renderMethod = mode === 'ssr' ? 'virtualRender' : 'render';
        const prerenderMethod = mode === 'ssr' ? 'virtualPrerender' : 'prerender';

        // Update variable data if provided
        if (variableData && view && view.__ && typeof view.__.updateVariableData === 'function') {
            view.__.updateVariableData({ ...variableData });
        }

        // Check for async data (V1: view.__.hasAwaitData)
        const hasAsyncData = (view.__ && (view.__.hasAwaitData || view.__.hasFetchData));

        // CASE 1: No async data - simple render
        if (!hasAsyncData) {
            if (view.__ && view.__[renderMethod] && typeof view.__[renderMethod] === 'function') {
                return view.__[renderMethod]();
            }
            return '';
        }

        // CASE 2: Has async data - show prerender first
        if (view.__ && view.__[prerenderMethod] && typeof view.__[prerenderMethod] === 'function') {
            return view.__[prerenderMethod]();
        }

        // Fallback to render
        if (view.__ && view.__[renderMethod] && typeof view.__[renderMethod] === 'function') {
            return view.__[renderMethod]();
        }

        return '';
    }

    /**
     * Mount all views from stack (bottom-up)
     */
    private async mountAllViewsFromStack(renderTimes: number): Promise<void> {
        if (!this.VIEW_MOUNTED_QUEUE[renderTimes] || this.VIEW_MOUNTED_QUEUE[renderTimes].length === 0) {
            return;
        }

        // Wait for super view to be ready
        if (!this.CURRENT_SUPER_VIEW_MOUNTED) {
            await new Promise<void>(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.CURRENT_SUPER_VIEW_MOUNTED) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            });
        }

        // Mount super views first
        for (let i = this.SUPER_VIEW_STACK.length - 1; i >= 0; i--) {
            const view = this.SUPER_VIEW_STACK[i] as any;
            try {
                if (view.onMounted) {
                    await view.onMounted();
                }
            } catch (error) {
                console.error(`Error mounting super view ${view.path}:`, error);
            }
        }

        // Then mount page views
        for (let i = this.ALL_VIEW_STACK.length - 1; i >= 0; i--) {
            const view = this.ALL_VIEW_STACK[i] as any;
            
            // Skip if already mounted as super view
            if (this.SUPER_VIEW_STACK.includes(view)) {
                continue;
            }
            
            try {
                if (view.onMounted) {
                    await view.onMounted();
                }
            } catch (error) {
                console.error(`Error mounting view ${view.path}:`, error);
            }
        }

        // Clear stacks
        this.ALL_VIEW_STACK = [];
        this.SUPER_VIEW_STACK = [];
        this.VIEW_MOUNTED_QUEUE[renderTimes] = [];
    }

    /**
     * Unmount view
     */
    async unmountView(id: string): Promise<void> {
        const instance = this.instances.get(id);
        if (!instance) return;

        try {
            await instance.view.destroy();
            this.instances.delete(id);

            if (this.currentView?.id === id) {
                this.currentView = null;
            }

            // Emit event
            this.event.emit('view.unmounted', { name: instance.name, id });

            console.log(`🗑️ View unmounted: ${instance.name}`);
        } catch (error) {
            console.error(`❌ Failed to unmount view: ${instance.name}`, error);
        }
    }

    /**
     * Get view container
     */
    private getViewContainer(): HTMLElement | null {
        if (this.container) {
            return this.container;
        }

        // Try common selectors
        const selectors = ['#spa-content', '#app-root', '#app', '[data-view-container]'];
        
        for (const selector of selectors) {
            const el = document.querySelector<HTMLElement>(selector);
            if (el) {
                this.container = el;
                return el;
            }
        }

        return null;
    }

    /**
     * Get view instance by ID
     */
    getInstance(id: string): ViewInstance | null {
        return this.instances.get(id) || null;
    }

    /**
     * Get view instance by name
     */
    getInstanceByName(name: string): ViewInstance | null {
        for (const instance of this.instances.values()) {
            if (instance.name === name) {
                return instance;
            }
        }
        return null;
    }

    /**
     * Get current view
     */
    getCurrentView(): ViewInstance | null {
        return this.currentView;
    }

    /**
     * Get container element (public accessor for V1 compatibility)
     */
    getContainer(): HTMLElement | null {
        return this.container;
    }

    /**
     * Get all active instances
     */
    getAllInstances(): ViewInstance[] {
        return Array.from(this.instances.values());
    }

    /**
     * Preload views
     */
    async preload(names: string | string[]): Promise<void> {
        await viewLoader.preload(names);
    }

    /**
     * Clear view cache
     */
    clearCache(name?: string): void {
        viewLoader.clearCache(name);
    }

    /**
     * Destroy all views
     */
    async destroy(): Promise<void> {
        // Destroy all instances
        const instances = Array.from(this.instances.values());
        for (const instance of instances) {
            await instance.view.destroy();
        }

        this.instances.clear();
        this.currentView = null;
        this.container = null;

        console.log('[ViewManager] Destroyed');
    }

    // ============================================================
    // SECTION REGISTRY (for @section/@yield directives)
    // ============================================================

    /**
     * Register a section with content
     */
    section(name: string, content: string, _type: 'string' | 'html' = 'html'): string {
        if (!this._sections[name]) {
            this._sections[name] = content;
            if (!this._changedSections.includes(name)) {
                this._changedSections.push(name);
            }
        }
        return '';
    }

    /**
     * Yield a section (get content from child view)
     */
    yield(name: string, defaultValue: string = ''): string {
        return this._sections[name] ?? defaultValue;
    }

    /**
     * Yield content (for attribute bindings)
     */
    yieldContent(name: string, defaultValue: string = ''): string {
        return this.yield(name, defaultValue);
    }

    /**
     * Start a stack (for @push/@stack directives)
     */
    startStack(name: string): void {
        if (!this._stacks[name]) {
            this._stacks[name] = [];
        }
    }

    /**
     * Push to stack
     */
    push(name: string, content: string): void {
        if (!this._stacks[name]) {
            this._stacks[name] = [];
        }
        this._stacks[name].push(content);
    }

    /**
     * Get stack content
     */
    stack(name: string): string {
        return (this._stacks[name] || []).join('\n');
    }

    /**
     * Clear sections for next render
     */
    clearSections(): void {
        this._sections = {};
        this._changedSections = [];
        this._stacks = {};
    }

    /**
     * Emit changed sections (for reactive updates)
     */
    emitChangedSections(): void {
        if (this._changedSections.length > 0) {
            this.event.emit('sections.changed', this._changedSections);
            this._changedSections = [];
        }
    }

    /**
     * Check if section exists
     */
    hasSection(name: string): boolean {
        return name in this._sections;
    }

    /**
     * Get list of changed sections
     */
    getChangedSections(): string[] {
        return [...this._changedSections];
    }

    /**
     * Reset changed sections list
     */
    resetChangedSections(): void {
        this._changedSections = [];
    }

    /**
     * Render all sections (for debugging)
     */
    renderSections(): Record<string, string> {
        return { ...this._sections };
    }

    /**
     * Check if view exists in loader
     */
    exists(name: string): boolean {
        return viewLoader.isRegistered(name) || !!this.templates[name];
    }

    /**
     * Get view from templates registry (V1 compatibility)
     * @param name - View name
     * @returns View template function or null
     */
    getView(name: string): any {
        if (this.templates[name]) {
            return this.templates[name];
        }
        return null;
    }

    /**
     * Create view instance from templates (V1 compatibility)
     * @param name - View name
     * @param data - View data
     * @returns View instance or null
     */
    view(name: string, data: any = null): ViewBase | null {
        try {
            // Check if view exists in templates
            if (!this.templates[name]) {
                console.warn(`[ViewManager] View '${name}' not found in templates`);
                return null;
            }

            // Check if view is valid function
            if (typeof this.templates[name] !== 'function') {
                console.warn(`[ViewManager] View '${name}' is not a valid function`);
                return null;
            }

            // Create view instance by calling template function
            const viewWrapper = this.templates[name];
            const view = viewWrapper(data ? { ...data } : {}, { 
                App: this.App, 
                View: this 
            });

            if (!view) {
                console.error(`[ViewManager] Failed to create view instance: ${name}`);
                return null;
            }

            // Set App reference
            if (view && typeof view === 'object' && 'App' in view) {
                (view as any).App = this.App;
            }

            return view;
        } catch (error) {
            console.error(`[ViewManager] Error creating view '${name}':`, error);
            return null;
        }
    }

    /**
     * Generate unique view ID
     */
    generateViewId(): string {
        return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Execute function safely
     */
    execute(fn: Function, defaultValue: any = ''): any {
        try {
            return fn();
        } catch (error) {
            console.error('[ViewManager] Execute error:', error);
            return defaultValue;
        }
    }

    /**
     * Get text for preloader/error messages
     */
    text(key: string): string {
        const texts: Record<string, string> = {
            loading: 'Loading...',
            error: 'Error occurred',
            not_found: 'Not found',
            unauthorized: 'Unauthorized',
        };
        return texts[key] || key;
    }

    /**
     * Render view by name (for @include directive)
     */
    renderView(view: any, _data: any = null, _isScan: boolean = false): string {
        // If view is already a string, return it
        if (typeof view === 'string') {
            return view;
        }

        // If view is a ViewBase instance, call its render method
        if (view && typeof view === 'object') {
            // TODO: Implement render() method in ViewBase/ViewController
            return '';
        }

        return '';
    }

    // ============================================================
    // AUTHENTICATION & AUTHORIZATION
    // ============================================================

    /**
     * Check if user is authenticated (@auth directive)
     */
    isAuth(): boolean {
        return this.App?.isAuth?.() ?? false;
    }

    /**
     * Check user permission (@can directive)
     */
    can(permission: string): boolean {
        return this.App?.can?.(permission) ?? false;
    }

    /**
     * Get CSRF token
     */
    csrfToken(): string {
        return this.App?.csrfToken?.() ?? '';
    }

    // ============================================================
    // VALIDATION ERRORS
    // ============================================================

    /**
     * Check if field has validation error
     */
    hasError(field: string): boolean {
        return this.App?.hasError?.(field) ?? false;
    }

    /**
     * Get first error message for field
     */
    firstError(field: string): string {
        return this.App?.firstError?.(field) ?? '';
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Generate route URL (@route directive)
     */
    route(name: string, params: Record<string, any> = {}): string {
        return this.App?.route?.(name, params) ?? '';
    }

    /**
     * Include partial view (@include directive)
     */
    include(viewName: string, data: any = {}): string {
        try {
            const view = this.view(viewName, data);
            if (view && (view as any).__ && typeof (view as any).__.render === 'function') {
                return (view as any).__.render();
            }
            return '';
        } catch (error) {
            console.error(`[ViewManager] include error: ${viewName}`, error);
            return '';
        }
    }

    /**
     * Conditional include (@includeIf directive)
     */
    includeIf(condition: boolean, viewName: string, data: any = {}): string {
        return condition ? this.include(viewName, data) : '';
    }

    /**
     * Set App reference
     */
    setApp(app: any): void {
        this.App = app;
    }

    /**
     * Update system data
     */
    updateSystemData(data: Record<string, any> = {}): void {
        this.ssrData = { ...this.ssrData, ...data };
    }

    /**
     * Extend view with mixin properties
     */
    extendView(view: any, mixins: Record<string, any>): any {
        if (!view || typeof view !== 'object') return view;
        return Object.assign(view, mixins);
    }

    // ============================================================
    // EVENT SYSTEM
    // ============================================================

    /**
     * Register event listener
     */
    on(event: string, callback: (...args: any[]) => void): void {
        this.event.on(event, callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback: (...args: any[]) => void): void {
        this.event.off(event, callback);
    }

    /**
     * Emit custom event
     */
    emit(event: string, data?: any): void {
        this.event.emit(event, data);
    }

    /**
     * Listen to event once
     */
    once(event: string, callback: (...args: any[]) => void): void {
        this.event.once(event, callback);
    }
}

export default ViewManager;
