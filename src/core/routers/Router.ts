/**
 * Router - V2 TypeScript
 * Optimized SPA routing with history/hash modes, guards, and lazy loading
 */

import type { Route, RouteMatch, RouteDefinition } from '../types/index.js';

export class ActiveRoute {
    public readonly $route: Route;
    public readonly $urlPath: string;
    public readonly $params: Record<string, string>;
    public readonly $query: Record<string, string>;
    public readonly $fragment: Record<string, string>;
    public readonly $paramKeys: string[];

    constructor(
        route: Route,
        urlPath: string,
        params: Record<string, string> = {},
        query: Record<string, string> = {},
        fragment: Record<string, string> = {}
    ) {
        this.$route = route;
        this.$urlPath = urlPath;
        this.$params = params;
        this.$query = query;
        this.$fragment = fragment;
        this.$paramKeys = Object.keys(params);

        // Dynamic param access
        Object.keys(params).forEach(key => {
            Object.defineProperty(this, key, {
                get: () => this.$params[key],
                enumerable: true,
                configurable: false,
            });
        });
    }

    getPath(): string {
        return this.$urlPath;
    }

    getParams(): Record<string, string> {
        return this.$params;
    }

    getParam(name: string): string | null {
        return this.$params[name] || null;
    }

    getQuery(): Record<string, string> {
        return this.$query;
    }

    getFragment(): Record<string, string> {
        return this.$fragment;
    }
}

export class Router {
    public static activeRoute: ActiveRoute | null = null;
    public static containers: Record<string, ActiveRoute> = {};

    private App: any;
    private routes: Array<{ path: string; view: string; options: any }> = [];
    private currentRoute: ActiveRoute | null = null;
    private mode: 'history' | 'hash' = 'history';
    private base: string = '';
    private defaultRoute: string = '/';
    private routeConfigs: Record<string, RouteDefinition> = {};
    private currentUri: string;
    
    // V1 compatible: Single callback hooks (not arrays)
    private _beforeEach: ((to: any, from: any, urlPath: string) => boolean | Promise<boolean>) | null = null;
    private _afterEach: ((to: any, from: any) => void) | null = null;
    
    // Optimization: Route cache
    private routeCache: Map<string, RouteMatch | null> = new Map();
    private activeRouteCache: Map<string, ActiveRoute> = new Map();
    
    // State
    private isStarted: boolean = false;
    private isNavigating: boolean = false;

    constructor(App: any = null) {
        this.App = App;
        this.currentUri = window.location.pathname + window.location.search;
        
        // Bind methods
        this.handleRoute = this.handleRoute.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        this.handleAutoNavigation = this.handleAutoNavigation.bind(this);
    }

    setApp(app: any): this {
        this.App = app;
        return this;
    }

    /**
     * Add route (V1 compatible)
     */
    addRoute(path: string, view: string, options: any = {}): void {
        this.routes.push({ path, view, options });
        // Clear caches when routes change
        this.routeCache.clear();
        this.activeRouteCache.clear();
    }

    /**
     * Add route config for named routes (V1 compatible)
     */
    addRouteConfig(routeConfig: RouteDefinition): void {
        if (routeConfig.name) {
            this.routeConfigs[routeConfig.name] = routeConfig;
        }
    }

    /**
     * Set all routes at once (V1 compatible)
     */
    setAllRoutes(routes: RouteDefinition[]): void {
        for (const route of routes) {
            this.addRouteConfig(route);
        }
    }

    /**
     * Set router mode (V1 compatible)
     */
    setMode(mode: 'history' | 'hash'): void {
        this.mode = mode;
    }

    /**
     * Set base path (V1 compatible)
     */
    setBase(base: string): void {
        this.base = base;
    }

    /**
     * Set default route (V1 compatible)
     */
    setDefaultRoute(route: string): void {
        this.defaultRoute = route;
    }

    /**
     * Register before each hook (V1 compatible - single callback)
     */
    beforeEach(callback: (to: any, from: any, urlPath: string) => boolean | Promise<boolean>): void {
        this._beforeEach = callback;
    }

    /**
     * Register after each hook (V1 compatible - single callback)
     */
    afterEach(callback: (to: any, from: any) => void): void {
        this._afterEach = callback;
    }

    /**
     * Get URL for named route (V1 compatible)
     */
    getURL(name: string, params: Record<string, any> = {}): string | null {
        const routeConfig = this.routeConfigs[name];
        if (!routeConfig) {
            return null;
        }
        let url = this.generateUrl(routeConfig.path, params);
        if (!(url.startsWith('/') || url.startsWith('http:') || url.startsWith('https:'))) {
            url = this.base + url;
        }
        return url;
    }

    /**
     * Generate URL with parameters (V1 compatible)
     */
    generateUrl(route: string, params: Record<string, any> = {}, extension: string = ''): string {
        let url = route;

        // Replace parameters
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, String(value));
        }

        // Add extension if provided
        if (extension && !url.endsWith(extension)) {
            url += extension;
        }

        return url;
    }

    /**
     * Add multiple routes
     * Optimization: Bulk route registration
     */
    addRoutes(routes: RouteDefinition[]): void {
        routes.forEach(route => {
            this.addRoute(route.path, route.view, route.meta);
            if (route.name) {
                this.addRouteConfig(route);
            }
        });
    }

    /**
     * Navigate to path (V1 compatible - main navigation method)
     */
    navigate(path: string): void {
        if (this.mode === 'history') {
            window.history.pushState({}, '', path);
            try {
                this.handleRoute(path);
                this.currentUri = path;
            } catch (error) {
                console.error('❌ Router.navigate handleRoute error:', error);
            }
        } else {
            // Hash mode
            window.location.hash = path;
            try {
                this.handleRoute(path);
                this.currentUri = path;
            } catch (error) {
                console.error('❌ Router.navigate handleRoute (hash mode) error:', error);
            }
        }
    }

    /**
     * Push route (alias for navigate, V2 style)
     */
    push(path: string): void {
        this.navigate(path);
    }

    /**
     * Navigate to named route (V1 compatible)
     */
    navigateTo(route: string, params: Record<string, any> = {}, extension: string = ''): void {
        const url = this.getURL(route, params);
        if (url) {
            if (extension && !url.endsWith(extension)) {
                this.navigate(url + extension);
            } else {
                this.navigate(url);
            }
        } else {
            console.error(`[Router] navigateTo: Route "${route}" not found`);
        }
    }

    /**
     * Match current route
     */
    match(path: string): RouteMatch | null {
        return this.matchRoute(path);
    }

    /**
     * Get current route
     */
    getCurrentRoute(): ActiveRoute | null {
        return this.currentRoute;
    }

    /**
     * Normalize path
     * Optimization: Consistent path format
     */
    private normalizePath(path: string): string {
        let normalized = path.startsWith('/') ? path : `/${path}`;
        
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        
        return normalized || '/';
    }

    /**
     * Match route pattern with path
     * Optimization: Cached pattern matching
     */
    private matchRoute(path: string): RouteMatch | null {
        // Normalize first for consistent cache keys
        const normalizedPath = this.normalizePath(path);
        
        // Check cache with normalized path
        if (this.routeCache.has(normalizedPath)) {
            const cached = this.routeCache.get(normalizedPath);
            console.log(`🚀 Router cache HIT: ${normalizedPath}`);
            return cached!;
        }

        console.log(`🔍 Router cache MISS: ${normalizedPath}`);

        for (const routeDef of this.routes) {
            const params = this.extractParams(routeDef.path, normalizedPath);
            if (params !== null) {
                const route: Route = {
                    path: routeDef.path,
                    view: routeDef.view,
                    params,
                    ...routeDef.options,
                };
                const match: RouteMatch = { route, params };
                
                // Cache result with normalized path
                this.routeCache.set(normalizedPath, match);
                console.log(`✅ Router cached: ${normalizedPath} -> ${route.view}`);
                return match;
            }
        }

        // Cache null result to avoid re-matching
        this.routeCache.set(normalizedPath, null);
        return null;
    }

    /**
     * Extract params from path pattern
     * Supports: {param}, {param?}, *
     * @private
     */
    private extractParams(pattern: string, path: string): Record<string, string> | null {
        // Handle wildcard
        if (pattern.includes('*') || pattern === '{any}') {
            return { wildcard: path };
        }

        // Convert pattern to regex
        let regexStr = pattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
            .replace(/\\\{([a-zA-Z0-9_]+)\\\?\\\}/g, '([^\\/]*)?') // Optional params
            .replace(/\\\{([a-zA-Z0-9_]+)\\\}/g, '([^\\/]+)'); // Required params

        const regex = new RegExp(`^${regexStr}$`);
        const match = path.match(regex);

        if (!match) {
            return null;
        }

        // Extract param names and values
        const params: Record<string, string> = {};
        const paramNames = [...pattern.matchAll(/\{([a-zA-Z0-9_]+)\??\}/g)].map(m => m[1]);
        
        paramNames.forEach((name, index) => {
            const value = match[index + 1];
            if (value !== undefined) {
                params[name] = value;
            }
        });

        return params;
    }

    /**
     * Parse query string
     * @private
     */
    private parseQuery(search: string): Record<string, string> {
        const params = new URLSearchParams(search);
        const query: Record<string, string> = {};
        params.forEach((value, key) => {
            query[key] = value;
        });
        return query;
    }

    /**
     * Handle popstate event (browser back/forward)
     * @private
     */
    private handlePopState(): void {
        const path = this.mode === 'history'
            ? window.location.pathname + window.location.search
            : window.location.hash.slice(1) || this.defaultRoute;
        this.handleRoute(path);
    }

    /**
     * Handle route navigation (V1 compatible - public method)
     */
    async handleRoute(path: string): Promise<void> {
        if (this.isNavigating) return;
        this.isNavigating = true;

        try {
            const normalizedPath = this.normalizePath(path);
            const query = this.parseQuery(window.location.search);
            const fragment = window.location.hash.substring(1);
            
            // Create cache key including query and fragment
            const cacheKey = `${normalizedPath}?${JSON.stringify(query)}#${fragment}`;
            
            // Check if we have cached ActiveRoute for exact same path+query+fragment
            if (this.activeRouteCache.has(cacheKey)) {
                const cachedActiveRoute = this.activeRouteCache.get(cacheKey)!;
                console.log(`🚀 ActiveRoute cache HIT: ${normalizedPath}`);
                
                // Update references
                Router.activeRoute = cachedActiveRoute;
                this.currentRoute = cachedActiveRoute;
                
                const from = this.currentRoute;
                
                // Call before hook
                if (this._beforeEach) {
                    const result = await this._beforeEach(cachedActiveRoute.$route, from, normalizedPath);
                    if (result === false) {
                        this.isNavigating = false;
                        return;
                    }
                }
                
                // Load view (view may need to remount even with cached route)
                if (this.App?.View && cachedActiveRoute.$route.view) {
                    await this.App.View.mountView(cachedActiveRoute.$route.view, cachedActiveRoute.$params, cachedActiveRoute);
                }
                
                // Call after hook
                if (this._afterEach) {
                    const toRoute = { ...cachedActiveRoute.$route, path: normalizedPath };
                    this._afterEach(toRoute, from);
                }
                
                this.isNavigating = false;
                return;
            }
            
            console.log(`🔍 ActiveRoute cache MISS: ${normalizedPath}`);
            
            const match = this.matchRoute(normalizedPath);

            if (!match) {
                console.warn(`[Router] No route matched for path: ${path}`);
                this.isNavigating = false;
                return;
            }

            const { route, params } = match;

            const from = this.currentRoute;
            const activeRoute = new ActiveRoute(
                route,
                normalizedPath,
                params,
                query,
                { fragment }
            );

            // Cache the ActiveRoute
            this.activeRouteCache.set(cacheKey, activeRoute);
            console.log(`✅ ActiveRoute cached: ${normalizedPath}`);

            // Set active route
            Router.addActiveRoute(route, normalizedPath, params, query, fragment);
            this.currentRoute = activeRoute;

            // Call before hook (V1 style)
            if (this._beforeEach) {
                const result = await this._beforeEach(route, from, normalizedPath);
                if (result === false) {
                    this.isNavigating = false;
                    return;
                }
            }

            // Load view
            if (this.App?.View && route.view) {
                await this.App.View.mountView(route.view, params, activeRoute);
            }

            // Call after hook (V1 style)
            if (this._afterEach) {
                const toRoute = { ...route, path: normalizedPath };
                this._afterEach(toRoute, from);
            }

        } catch (error) {
            console.error('[Router] Navigation error:', error);
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * Hydrate views for SSR (V1 compatible)
     */
    async hydrateViews(): Promise<void> {
        if (!this.App?.View) {
            console.error('❌ Router.hydrateViews: App.View not available');
            return;
        }

        const activeRoute = Router.activeRoute || this.currentRoute;
        if (!activeRoute) {
            return;
        }

        const { $route: route, $params: params, $urlPath: urlPath } = activeRoute;

        // Call before hook
        if (this._beforeEach) {
            const result = await this._beforeEach(route, params, urlPath);
            if (result === false) {
                return;
            }
        }

        // Handle view hydration
        if (route.view || (route as any).component) {
            try {
                const viewName = route.view || (route as any).component;
                await this.App.View.mountViewScan(viewName, params, activeRoute);

                // Call after hook
                if (this._afterEach) {
                    const toRoute = { ...route, path: urlPath };
                    this._afterEach(toRoute, this.currentRoute);
                }
            } catch (error) {
                console.error('❌ Router.hydrateViews: Error during hydration:', error);
            }
        }
    }

    /**
     * Set active route for current path (V1 compatible)
     */
    setActiveRouteForCurrentPath(path: string): void {
        const normalizedPath = this.normalizePath(path);
        const match = this.matchRoute(normalizedPath);

        if (match) {
            const { route, params } = match;
            const query = this.parseQuery(window.location.search);
            const fragment = window.location.hash.substring(1);

            Router.addActiveRoute(route, normalizedPath, params, query, fragment);
            this.currentRoute = Router.activeRoute;
        }
    }

    /**
     * Handle auto navigation from click events (V1 compatible)
     */
    handleAutoNavigation(e: MouseEvent): void {
        // Check for data-nav-link attribute first (highest priority)
        const target = e.target as HTMLElement;
        const oneNavElement = target.closest('[data-nav-link]') as HTMLElement;
        
        if (oneNavElement) {
            if (oneNavElement.hasAttribute('data-nav-disabled')) {
                return;
            }

            const navPath = oneNavElement.getAttribute('data-nav-link');
            if (navPath && navPath.trim() !== '') {
                e.preventDefault();
                if (navPath === this.currentUri) {
                    return;
                }
                this.navigate(navPath);
                return;
            }
        }

        // Check for data-navigate attribute
        const navigateElement = target.closest('[data-navigate]') as HTMLElement;
        if (navigateElement) {
            if (navigateElement.hasAttribute('data-nav-disabled')) {
                return;
            }

            const navPath = navigateElement.getAttribute('data-navigate');
            if (navPath && navPath.trim() !== '') {
                e.preventDefault();
                if (navPath === this.currentUri) {
                    return;
                }
                this.navigate(navPath);
                return;
            }
        }

        // Fallback to traditional <a> tag handling
        const link = target.closest('a[href]') as HTMLAnchorElement;
        if (!link) return;

        if (Router.isCurrentPath(link.href, this.mode)) {
            return;
        }

        if (this.mode !== 'hash' && link.href.startsWith('#')) {
            return;
        }

        // Skip if link has target="_blank"
        if (link.target === '_blank') {
            return;
        }

        // Skip if disabled
        if (link.dataset.nav === 'disabled' || link.dataset.nav === 'false') {
            return;
        }

        // Skip special protocols
        if (link.href.startsWith('mailto:') || link.href.startsWith('tel:') || link.href.startsWith('javascript:')) {
            return;
        }

        const href = link.href;

        // Check if it's an external URL
        try {
            const linkUrl = new URL(href);
            const currentUrl = new URL(window.location.href);

            if (linkUrl.host !== currentUrl.host) {
                return;
            }

            // Same domain, extract path for navigation
            if (href.startsWith('http://') || href.startsWith('https://')) {
                const path = linkUrl.pathname + linkUrl.search;
                e.preventDefault();
                if (path === this.currentUri) {
                    return;
                }
                this.navigate(path);
                return;
            }
        } catch (error) {
            // URL parsing failed, treat as internal
        }

        // Handle relative URLs
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
            e.preventDefault();
            if (href === this.currentUri) {
                return;
            }
            this.navigate(href);
        }
    }

    /**
     * Start router (V1 compatible with skipInitial param)
     */
    start(skipInitial: boolean = false): void {
        if (this.isStarted) {
            console.warn('[Router] Router already started');
            return;
        }

        // Detect if page has server-rendered content
        const container = this.App?.View?.container || document.querySelector('#spa-content, #app-root, #app');
        const isServerRendered = container?.getAttribute('data-server-rendered') === 'true';
        
        const initialPath = this.mode === 'history' 
            ? (window.location.pathname + window.location.search)
            : (window.location.hash.substring(1) || this.defaultRoute);

        this.setActiveRouteForCurrentPath(initialPath);

        // Add event listeners
        if (this.mode === 'history') {
            window.addEventListener('popstate', this.handlePopState);
            document.addEventListener('click', this.handleAutoNavigation);
        } else {
            window.addEventListener('hashchange', this.handlePopState);
            document.addEventListener('click', this.handleAutoNavigation);
        }

        // Handle initial route based on SSR and skipInitial flag
        if (isServerRendered) {
            console.log('🚀 Router.start: Starting SSR hydration...');
            this.hydrateViews();
            
            // Remove SSR marker after hydration
            setTimeout(() => {
                if (container) {
                    container.removeAttribute('data-server-rendered');
                }
            }, 100);
        } else if (!skipInitial) {
            // Normal start: handle initial route
            this.handleRoute(initialPath);
        } else {
            console.log('🔍 Router.start: Skipping initial route handling but activeRoute is set');
        }

        this.isStarted = true;
    }

    /**
     * Stop router
     */
    stop(): void {
        window.removeEventListener('popstate', this.handlePopState);
        window.removeEventListener('hashchange', this.handlePopState);
        document.removeEventListener('click', this.handleAutoNavigation);
        this.isStarted = false;
    }

    /**
     * Destroy router - cleanup
     */
    destroy(): void {
        this.stop();
        this.routes = [];
        this.routeConfigs = {};
        this.routeCache.clear();
        this.activeRouteCache.clear();
        this._beforeEach = null;
        this._afterEach = null;
    }

    // ========== Static Helper Methods (V1 compatible) ==========

    /**
     * Add active route to static containers
     */
    static addActiveRoute(
        route: Route,
        urlPath: string,
        params: Record<string, string>,
        query: Record<string, string>,
        fragment: string
    ): void {
        const activeRoute = new ActiveRoute(route, urlPath, params, query, { fragment });
        Router.activeRoute = activeRoute;
        
        // Store in containers by view name
        if (route.view) {
            Router.containers[route.view] = activeRoute;
        }
    }

    /**
     * Get active route (V1 compatible)
     */
    static getActiveRoute(): ActiveRoute | null {
        return Router.activeRoute;
    }

    /**
     * Get current route path (V1 compatible)
     */
    static getCurrentPath(): string {
        return window.location.pathname;
    }

    /**
     * Get current hash (V1 compatible)
     */
    static getCurrentHash(): string {
        return window.location.hash.substring(1);
    }

    /**
     * Get current query (V1 compatible)
     */
    static getCurrentQuery(): Record<string, string> {
        const params = new URLSearchParams(window.location.search);
        const query: Record<string, string> = {};
        params.forEach((value, key) => {
            query[key] = value;
        });
        return query;
    }

    /**
     * Get current fragment (V1 compatible)
     */
    static getCurrentFragment(): string {
        return window.location.hash.substring(1);
    }

    /**
     * Get URL parts (V1 compatible)
     */
    static getUrlParts(url?: string): { path: string; query: string; hash: string } {
        const urlString = url || window.location.href;
        try {
            const urlObj = new URL(urlString, window.location.origin);
            return {
                path: urlObj.pathname,
                query: urlObj.search.substring(1),
                hash: urlObj.hash.substring(1),
            };
        } catch {
            return { path: '/', query: '', hash: '' };
        }
    }

    /**
     * Check if current path matches (V1 compatible)
     */
    static isCurrentPath(url: string, mode: 'history' | 'hash' = 'history'): boolean {
        if (mode === 'history') {
            const currentPath = window.location.pathname;
            try {
                const urlObj = new URL(url, window.location.origin);
                return currentPath === urlObj.pathname;
            } catch {
                return currentPath === url;
            }
        } else {
            const currentHash = window.location.hash.substring(1);
            return currentHash === url || `#${currentHash}` === url;
        }
    }

    /**
     * Get current route (V1 compatible static method)
     */
    static getCurrentRoute(): ActiveRoute | null {
        return Router.activeRoute;
    }
}

// ========== Composables (V1 compatible exports) ==========

/**
 * Get current route
 */
export function useRoute(): ActiveRoute | null {
    return Router.getCurrentRoute();
}

/**
 * Get current route params
 */
export function useParams(): Record<string, string> {
    const route = useRoute();
    return route?.$params || {};
}

/**
 * Get current query params
 */
export function useQuery(): Record<string, string> {
    return Router.getCurrentQuery();
}

/**
 * Get current fragment
 */
export function useFragment(): string {
    return Router.getCurrentFragment();
}

export default Router;

