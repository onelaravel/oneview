/**
 * Application Core Module - V2 TypeScript
 * Optimized version with type safety and performance improvements
 */

import type { ApplicationConfig, AppEnvironment } from '../types/index.js';
import { HttpService } from '../services/HttpService.js';
import { Router } from '../routers/Router.js';
import { API } from '../helpers/API.js';
import { OneMarkup } from '../dom/OneMarkup.js';
import { Helper } from '../helpers/Helper.js';
import { StoreService } from '../services/StoreService.js';
import { EventService } from '../services/EventService.js';
import { ViewManager } from '../view/ViewManager.js';

export class Application {
    public readonly name: string = 'OneApp';
    public readonly StoreService = StoreService;
    public readonly Store: StoreService;
    public readonly EventService = EventService;
    public readonly Event: EventService;
    public readonly Helper: Helper;
    public readonly Router: Router;
    public readonly View: ViewManager;
    public readonly HttpService = HttpService;
    public readonly Http: HttpService;
    public readonly OneMarkup = OneMarkup;
    public readonly Api = API;
    public mode: 'development' | 'production' = 'development';
    public isInitialized: boolean = false;
    public env: AppEnvironment;

    constructor() {
        this.Store = StoreService.getInstance();
        this.Event = EventService.getInstance();
        this.Helper = new Helper(this);
        this.Router = new Router(this);
        this.View = new ViewManager(this);
        this.Http = new HttpService();
        
        this.env = {
            mode: 'web',
            debug: false,
            base_url: '/',
            csrf_token: '',
            router_mode: 'history',
        };
    }

    /**
     * Initialize application with config
     * Optimized: Single initialization, validates config
     */
    init(config?: ApplicationConfig): void {
        if (this.isInitialized) {
            console.warn('[OneJS] Application already initialized');
            return;
        }

        // Validate config
        if (!this._validateConfig()) {
            console.error('[OneJS] Invalid configuration');
            return;
        }

        // Init components
        this._initEnvironment(config);
        this._initViewManager(config);
        this._initHttpService(config);
        this._initRouter(config);

        this.isInitialized = true;
        console.log('[OneJS] ✅ Application initialized');
    }

    /**
     * Validate global config
     * @private
     */
    private _validateConfig(): boolean {
        if (typeof (window as any).APP_CONFIGS === 'undefined') {
            console.error('[OneJS] APP_CONFIGS not found! Please define window.APP_CONFIGS.');
            return false;
        }
        return true;
    }

    /**
     * Initialize environment settings
     * @private
     */
    private _initEnvironment(config?: ApplicationConfig): void {
        const globalConfig = (window as any).APP_CONFIGS || {};
        if (globalConfig?.env) {
            this.env = { ...this.env, ...globalConfig.env };
        }
        if (config?.env) {
            this.env = { ...this.env, ...config.env };
        }
    }

    /**
     * Initialize View Manager
     * Optimized: Detect SSR hydration
     * @private
     */
    private _initViewManager(config?: ApplicationConfig): void {
        const globalConfig = (window as any).APP_CONFIGS;
        const containerSelector = config?.container || globalConfig?.container;
        
        let container: HTMLElement | null = null;
        if (typeof containerSelector === 'string') {
            container = document.querySelector(containerSelector);
        } else if (containerSelector instanceof HTMLElement) {
            container = containerSelector;
        } else {
            container = document.body;
        }

        if (container) {
            this.View.setContainer(container);
        }

        // Set super view path (user's project views)
        // Default: relative to user's build output
        const viewConfig = config?.view || globalConfig?.view;
        const viewPath = (viewConfig as any)?.basePath || './views';
        const isAbsolute = (viewConfig as any)?.absolutePath || false;
        
        this.View.setSuperViewPath(viewPath, isAbsolute);

        // Init view config
        if (viewConfig) {
            this.View.init(viewConfig);
        }

        console.log('[ViewManager] Initialized for user project views');
    }

    /**
     * Initialize HTTP Service
     * Optimized: Single header merge
     * @private
     */
    private _initHttpService(config?: ApplicationConfig): void {
        const globalConfig = (window as any).APP_CONFIGS;
        const apiConfig = config?.api || globalConfig?.api;

        if (!apiConfig) return;

        if (apiConfig.baseUrl) {
            this.Http.setBaseUrl(apiConfig.baseUrl);
        }

        // Optimize: Merge headers once
        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (apiConfig.csrfToken || this.env.csrf_token) {
            defaultHeaders['X-CSRF-TOKEN'] = apiConfig.csrfToken || this.env.csrf_token;
        }

        this.Http.setDefaultHeaders(defaultHeaders);
        this.Http.setTimeout(apiConfig.timeout || 10000);
    }

    /**
     * Initialize Router
     * Optimized: Efficient route registration
     * @private
     */
    private _initRouter(config?: ApplicationConfig): void {
        const globalConfig = (window as any).APP_CONFIGS;
        const routerConfig = config?.router || globalConfig?.router;

        // Set router mode and base
        const mode = routerConfig?.mode || this.env.router_mode || 'history';
        const base = routerConfig?.base || this.env.base_url || '/';
        
        this.Router.setMode(mode as 'history' | 'hash');
        this.Router.setBase(base);

        // Set default route
        if (routerConfig?.defaultRoute) {
            this.Router.setDefaultRoute(routerConfig.defaultRoute);
        }

        // Add named routes
        if (routerConfig?.allRoutes) {
            this.Router.setAllRoutes(routerConfig.allRoutes);
        }

        // Get routes
        let routes = routerConfig?.routes || config?.routes || globalConfig?.routes;
        
        // Fallback default route
        if (!routes || !Array.isArray(routes) || routes.length === 0) {
            const scope = globalConfig?.appScope || config?.appScope || 'web';
            routes = [
                { path: `/${scope}`, view: `${scope}.home` },
            ];
        }

        // Register routes
        if (Array.isArray(routes) && routes.length > 0) {
            this.Router.addRoutes(routes);
        }

        // Setup navigation hooks
        this._setupRouterHooks(routerConfig);

        // Start router with SSR detection
        const container = this.View.getContainer() || document.querySelector<HTMLElement>('#spa-content, #app-root, #app');
        const isServerRendered = container?.getAttribute?.('data-server-rendered') === 'true';
        
        // Router.start(skipInitial): Pass true to skip initial route when SSR-hydrating
        this.Router.start(isServerRendered);
    }

    /**
     * Setup router navigation hooks
     * @private
     */
    private _setupRouterHooks(routerConfig?: any): void {
        // Before each hook
        if (routerConfig?.beforeEach) {
            this.Router.beforeEach(routerConfig.beforeEach);
        } else {
            // Default beforeEach: Update active nav
            this.Router.beforeEach((_to, _from, urlPath) => {
                console.log(`[Router] Navigating to: ${urlPath}`);
                return true;
            });
        }

        // After each hook
        if (routerConfig?.afterEach) {
            this.Router.afterEach(routerConfig.afterEach);
        } else {
            // Default afterEach: Update active nav links
            this.Router.afterEach((to, _from) => {
                this._updateActiveNav(to.path || to.view);
            });
        }
    }

    /**
     * Update active navigation links
     * @private
     */
    private _updateActiveNav(currentPath: string): void {
        // Remove active class from all nav links
        const links = document.querySelectorAll<HTMLElement>('[data-nav-link], a[href]');
        
        links.forEach(link => {
            const href = link.getAttribute('data-nav-link') || link.getAttribute('href');
            if (href) {
                if (href === currentPath || (currentPath && href !== '/' && currentPath.startsWith(href))) {
                    link.classList.add('active', 'router-link-active');
                } else {
                    link.classList.remove('active', 'router-link-active');
                }
            }
        });
    }

    /**
     * Destroy application instance
     * Optimization: Proper cleanup
     */
    destroy(): void {
        this.Router.destroy();
        this.View.destroy();
        this.isInitialized = false;
    }
}

