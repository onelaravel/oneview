/**
 * ViewController - View controller with lifecycle management
 * V2 TypeScript - Optimized reactive controller
 */

import { ViewState } from "./index.js";
import { View } from "./View.js";
export interface ControllerOptions {
    autoInit?: boolean;
    autoMount?: boolean;
}

export type ViewType = 'view' | 'component' | 'layout' | 'template';

export class ViewController {
    public view: View;
    protected config: Record<string, any>;
    protected __path: string = '';
    protected __viewType: ViewType = 'view';
    protected __App : any;
    public states: ViewState;
    protected ownProperties: Set<string> = new Set(['__ctrl__']);
    constructor(view: View, path: string = '', viewType: ViewType = 'view') {
        this.view = view;
        this.__path = path;
        this.__viewType = viewType;
        this.config = {};
        this.states = new ViewState(this);
    }

    setup(config: Record<string, any>): void {
        this.config = config;
    }

    setUserDefinedConfig(userConfig: Record<string, any>): void {
        Object.entries(userConfig).forEach(([key, value]) => {
            if (!this.ownProperties.has(key)) {
                (this.view as any)[key] = typeof value === "function" && value.bind && typeof value.bind === "function" ? value.bind(this.view) : value;
            }
        });
    }

    setApp(app: any): void {
        this.__App = app;
    }

    // ui functions

    __showError(message: string): void {
        console.error(`[ViewController Error] ${message} (View: ${this.__path})`);
    }

    get path(): string {
        return this.__path;
    }

    get type(): ViewType {
        return this.__viewType;
    }

    get App(): any {
        return this.__App;
    }
    set App(app: any) {
        console.warn('[OneJS] App property is read-only and cannot be modified directly.');
    }
}

