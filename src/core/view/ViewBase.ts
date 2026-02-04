/**
 * ViewBase - Base class for all views
 * V2 TypeScript - Optimized with reactive state
 */

import type { ViewConfig, ViewProps } from '../types/index.js';
import { StoreService } from '../services/StoreService.js';
import { EventService } from '../services/EventService.js';
import { ViewTemplateManager } from './ViewTemplateManager.js';

export interface ViewLifecycle {
    onInit?(): void | Promise<void>;
    onMounted?(): void | Promise<void>;
    onUpdated?(): void | Promise<void>;
    onDestroy?(): void | Promise<void>;
}

export class ViewBase implements ViewLifecycle {
    public readonly id: string;
    public readonly name: string;
    public el: HTMLElement | null = null;
    public props: ViewProps;
    public config: ViewConfig;
    
    protected store: StoreService;
    protected event: EventService;
    protected isMounted: boolean = false;
    protected isDestroyed: boolean = false;

    // Template manager for sections/blocks
    public _templateManager: ViewTemplateManager;
    
    // V1 compatibility props
    public App: any = null;
    public path: string = '';
    public superView: any = null;
    public superViewPath: string | null = null;
    public hasSuperView: boolean = false;
    public rootElement: HTMLElement | null = null;
    public markup: any = null;

    constructor(name: string, props: ViewProps = {}, config: ViewConfig = {}) {
        this.id = this.generateId();
        this.name = name;
        this.path = name; // Alias for V1 compatibility
        this.props = props;
        this.config = config;
        
        this.store = StoreService.getInstance();
        this.event = EventService.getInstance();
        this._templateManager = new ViewTemplateManager(this);
    }

    /**
     * Generate unique view ID
     */
    protected generateId(): string {
        return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Lifecycle: Initialize view
     */
    async init(): Promise<void> {
        if (this.onInit) {
            await this.onInit();
        }
    }

    /**
     * Lifecycle: Mount view to DOM
     */
    async mount(container: HTMLElement): Promise<void> {
        if (this.isMounted) {
            console.warn(`[ViewBase] View ${this.name} already mounted`);
            return;
        }

        this.el = container;
        this.isMounted = true;

        if (this.onMounted) {
            await this.onMounted();
        }

        console.log(`✅ View mounted: ${this.name}`);
    }

    /**
     * Lifecycle: Update view
     */
    async update(props?: ViewProps): Promise<void> {
        if (props) {
            this.props = { ...this.props, ...props };
        }

        if (this.onUpdated) {
            await this.onUpdated();
        }
    }

    /**
     * Lifecycle: Destroy view
     */
    async destroy(): Promise<void> {
        if (this.isDestroyed) return;

        if (this.onDestroy) {
            await this.onDestroy();
        }

        this.el = null;
        this.isMounted = false;
        this.isDestroyed = true;

        console.log(`🗑️ View destroyed: ${this.name}`);
    }

    /**
     * Get view state
     */
    getState<T = any>(key: string, defaultValue?: T): T | undefined {
        return this.store.get(`view.${this.name}.${key}`) ?? defaultValue;
    }

    /**
     * Set view state
     */
    setState<T = any>(key: string, value: T): void {
        this.store.set(`view.${this.name}.${key}`, value);
    }

    /**
     * Emit event
     */
    emit(event: string, data?: any): void {
        this.event.emit(`view.${this.name}.${event}`, data);
    }

    /**
     * Listen to event
     */
    on(event: string, handler: (data?: any) => void): () => void {
        return this.event.on(`view.${this.name}.${event}`, handler);
    }

    // ============================================================
    // TEMPLATE METHODS (for compiled .one output)
    // ============================================================

    /**
     * Define a section
     */
    __section(name: string, content: string, type: 'string' | 'html' = 'html'): string {
        return this._templateManager.section(name, content, type);
    }

    /**
     * Yield a section from parent
     */
    __yield(name: string, defaultValue: string = ''): string {
        return this._templateManager.yieldSection(name, defaultValue);
    }

    /**
     * Yield content for attributes
     */
    __yieldContent(name: string, defaultValue: string = ''): string {
        return this._templateManager.yieldContent(name, defaultValue);
    }

    /**
     * Define a block (long-form content)
     */
    __block(name: string, attributes: Record<string, any> = {}, content: string): string {
        return this._templateManager.addBlock(name, attributes, content);
    }

    /**
     * Use a block (mount block content)
     */
    __useBlock(name: string, defaultValue: string = ''): string {
        return this._templateManager.useBlock(name, defaultValue);
    }

    /**
     * Start wrapper tag
     */
    startWrapper(tag: string | null = null, attributes: Record<string, string> = {}): string {
        return this._templateManager.startWrapper(tag, attributes);
    }

    /**
     * End wrapper tag
     */
    endWrapper(): string {
        return this._templateManager.endWrapper();
    }

    /**
     * Include another view - to be implemented in ViewController
     */
    __include(_path: string, _data: any = {}): any {
        throw new Error('__include must be implemented in ViewController');
    }

    /**
     * Extend a parent view - to be implemented in ViewController
     */
    __extends(_path: string, _data: any = {}): any {
        throw new Error('__extends must be implemented in ViewController');
    }

    // Lifecycle hooks (to be overridden)
    onInit?(): void | Promise<void>;
    onMounted?(): void | Promise<void>;
    onUpdated?(): void | Promise<void>;
    onDestroy?(): void | Promise<void>;
}

export default ViewBase;
