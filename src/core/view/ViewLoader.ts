/**
 * ViewLoader - Dynamic view module loading
 * V2 TypeScript - Optimized with caching
 */

import type { ViewConfig } from '../types/index.js';

export interface ViewModule {
    default?: any;
    [key: string]: any;
}

export class ViewLoader {
    private cache: Map<string, ViewModule> = new Map();
    private loading: Map<string, Promise<ViewModule>> = new Map();
    private registry: Map<string, any> = new Map();
    private basePath: string = '';
    private useAbsolutePath: boolean = false;

    /**
     * Set base path for views
     * Can be absolute URL or relative path
     */
    setBasePath(path: string, absolute: boolean = false): void {
        this.basePath = path.endsWith('/') ? path.slice(0, -1) : path;
        this.useAbsolutePath = absolute;
        console.log(`[ViewLoader] Base path: ${this.basePath} (absolute: ${absolute})`);
    }

    /**
     * Register view component
     */
    register(name: string, component: any): void {
        this.registry.set(name, component);
        console.log(`📦 View registered: ${name}`);
    }

    /**
     * Load view module dynamically
     */
    async load(name: string, config?: ViewConfig): Promise<ViewModule> {
        // Check registry first (pre-registered components)
        if (this.registry.has(name)) {
            const component = this.registry.get(name);
            return { default: component };
        }

        // Check cache
        if (this.cache.has(name)) {
            console.log(`🚀 View cache HIT: ${name}`);
            return this.cache.get(name)!;
        }

        // Check if already loading
        if (this.loading.has(name)) {
            console.log(`⏳ View loading in progress: ${name}`);
            return this.loading.get(name)!;
        }

        console.log(`🔍 View cache MISS: ${name}`);

        // Load module
        const loadPromise = this.loadModule(name, config);
        this.loading.set(name, loadPromise);

        try {
            const module = await loadPromise;
            this.cache.set(name, module);
            this.loading.delete(name);
            console.log(`✅ View loaded: ${name}`);
            return module;
        } catch (error) {
            this.loading.delete(name);
            console.error(`❌ View load failed: ${name}`, error);
            throw error;
        }
    }

    /**
     * Load module from path
     */
    private async loadModule(name: string, config?: ViewConfig): Promise<ViewModule> {
        // Convert name to path: 'web.home' -> '/views/web/home.js'
        const path = this.resolvePath(name, config);

        try {
            // Dynamic import
            const module = await import(/* @vite-ignore */ path);
            return module;
        } catch (error) {
            // Fallback to alternative paths
            const alternatives = this.getAlternativePaths(name, config);
            
            for (const altPath of alternatives) {
                try {
                    const module = await import(/* @vite-ignore */ altPath);
                    return module;
                } catch {
                    // Continue to next alternative
                }
            }

            throw new Error(`Failed to load view: ${name} (tried: ${path}, ${alternatives.join(', ')})`);
        }
    }

    /**
     * Resolve view name to module path
     */
    private resolvePath(name: string, config?: ViewConfig): string {
        if ((config as any)?.path) {
            return (config as any).path;
        }

        // Convert dot notation to path: 'web.home' -> 'web/home.js'
        const segments = name.split('.');
        const relativePath = `${segments.join('/')}.js`;

        // If basePath is absolute URL (http/https) or absolute path (starts with /)
        if (this.useAbsolutePath || this.basePath.startsWith('http') || this.basePath.startsWith('/')) {
            return `${this.basePath}/${relativePath}`;
        }

        // Otherwise treat as relative module path
        // User's build tool (Vite/Webpack) will resolve this
        return `${this.basePath}/${relativePath}`;
    }

    /**
     * Get alternative paths to try
     */
    private getAlternativePaths(name: string, _config?: ViewConfig): string[] {
        const alternatives: string[] = [];
        const segments = name.split('.');

        // Try with different extensions
        alternatives.push(`${this.basePath}/${segments.join('/')}.ts`);
        alternatives.push(`${this.basePath}/${segments.join('/')}/index.js`);
        alternatives.push(`${this.basePath}/${segments.join('/')}/index.ts`);

        // Try capitalized
        const capitalized = segments.map(s => s.charAt(0).toUpperCase() + s.slice(1));
        alternatives.push(`${this.basePath}/${capitalized.join('/')}.js`);
        alternatives.push(`${this.basePath}/${capitalized.join('/')}.ts`);

        return alternatives;
    }

    /**
     * Preload view (load but don't instantiate)
     */
    async preload(names: string | string[]): Promise<void> {
        const nameArray = Array.isArray(names) ? names : [names];
        
        await Promise.all(
            nameArray.map(name => this.load(name).catch(error => {
                console.warn(`[ViewLoader] Preload failed: ${name}`, error);
            }))
        );
    }

    /**
     * Clear cache
     */
    clearCache(name?: string): void {
        if (name) {
            this.cache.delete(name);
            console.log(`🗑️ View cache cleared: ${name}`);
        } else {
            this.cache.clear();
            console.log(`🗑️ View cache cleared: all`);
        }
    }

    /**
     * Get all cached view names
     */
    getCachedViews(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get all registered view names
     */
    getRegisteredViews(): string[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Check if view is registered
     */
    isRegistered(name: string): boolean {
        return this.registry.has(name);
    }

    /**
     * Check if view is cached
     */
    isCached(name: string): boolean {
        return this.cache.has(name);
    }
}

// Singleton instance
export const viewLoader = new ViewLoader();
export default viewLoader;
