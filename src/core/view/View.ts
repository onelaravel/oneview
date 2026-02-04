import { ViewConfig } from "../types/index.js";
import {ViewController} from "./ViewController.js";

/**
 * View - Basic View class
 * V2 TypeScript
 */
export class View{
    public __ctrl__!: ViewController;    
    [key: string]: any;
    constructor(path: string, viewType: 'view' | 'component' | 'layout', viewControllerClass?: any) {
        const controller = viewControllerClass ? new viewControllerClass(this, path, viewType) as ViewController : new ViewController(this, path, viewType);
        Object.defineProperty(this, '__ctrl__', {
            value: controller,
            writable: false,
            enumerable: false,
            configurable: false,
        });
        this._path = path;
        this._viewType = viewType;
    }

    $__setup__(__data__: Record<string, any>, systemData: Record<string, any>): void {
        // Override in subclass to setup view logic
    }

    get path(): string {
        return this._path;
    }
    get viewType(): 'view' | 'component' {
        return this._viewType;
    }
    get __(): ViewController {
        return this.__ctrl__;
    }
}
